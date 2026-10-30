---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(git remote show:*), Read, Glob, Grep, LS, Task
description: Security review of the pending changes (uncommitted work and commits not yet pushed)
---

<!--
Adapted from anthropics/claude-code-security-review (.claude/commands/security-review.md, MIT),
pinned at 0c6a49f1fa56a1d472575da86a94dbc1edb78eda. Changes for the dicetamer project standard:
works without a remote (falls back to uncommitted changes), and adds project-specific rules
under "PROJECT RULES". Keep the upstream sections intact so future syncs stay easy.
-->

You are a senior security engineer conducting a focused security review of the pending changes in this repository.

GIT STATUS:

```
!`git status`
```

FILES MODIFIED (unpushed commits, or uncommitted changes when there is no remote):

```
!`git diff --name-only origin/HEAD... 2>/dev/null || git diff --name-only HEAD`
```

COMMITS:

```
!`git log --no-decorate origin/HEAD... 2>/dev/null || git log --no-decorate -5`
```

DIFF CONTENT:

```
!`git diff --merge-base origin/HEAD 2>/dev/null || git diff HEAD`
```

Review the complete diff above.

OBJECTIVE:
Perform a security-focused code review to identify HIGH-CONFIDENCE security vulnerabilities that could have real exploitation potential. This is not a general code review - focus ONLY on security implications newly added by these changes. Do not comment on existing security concerns (those are covered by the full-repo `/security-audit` run from dicetamer).

CRITICAL INSTRUCTIONS:
1. MINIMIZE FALSE POSITIVES: Only flag issues where you're >80% confident of actual exploitability
2. AVOID NOISE: Skip theoretical issues, style concerns, or low-impact findings
3. FOCUS ON IMPACT: Prioritize vulnerabilities that could lead to unauthorized access, data breaches, or system compromise
4. EXCLUSIONS: Do NOT report denial of service, rate limiting or resource exhaustion issues.

SECURITY CATEGORIES TO EXAMINE:

**Input Validation:** SQL injection, command injection, XXE, template injection, NoSQL injection, path traversal.

**Authentication & Authorization:** authentication bypass, privilege escalation, session management flaws, JWT issues, authorization logic bypasses.

**Crypto & Secrets:** hardcoded API keys, passwords or tokens; weak crypto; improper key storage; insecure randomness; certificate validation bypasses.

**Injection & Code Execution:** deserialization RCE, pickle injection, unsafe YAML loading, eval injection, XSS (reflected, stored, DOM-based).

**Data Exposure:** sensitive data logging, PII handling violations, API endpoint data leakage, debug information exposure.

Even if something is only exploitable from the local network, it can still be a HIGH severity issue.

PROJECT RULES (dicetamer standard):
- **Secrets in client bundles**: a server-only key (Supabase `service_role`, OpenRouter, Anthropic, any non-`NEXT_PUBLIC_`/`VITE_` secret) reachable from client code or a public env prefix is HIGH. Keys that are public by design (Web3Forms, Supabase `anon` with RLS, Umami website id) are not findings.
- **Supabase**: a new table without RLS, or a policy/RPC that lets `anon` read or write beyond its intent, is a finding.
- **LLM output that drives actions**: model output executed as code, SQL, shell or file paths without validation is a finding. User content inside a prompt is not (upstream exclusion 14 still applies).
- **Health and personal data** (e.g. pay-taxes-forever): writing it to logs, telemetry, prompts sent to a cloud model, or anywhere inside the repo is a finding.
- **Local panels without auth** (FastAPI/Streamlit/Jinja dashboards): binding to `0.0.0.0` or adding them to a deploy config without authentication is a finding.
- **Deploy configs**: `ports:` publishing a database or admin service to the host, or `latest` images in Coolify compose files, are MEDIUM findings.
- **`.env` access**: code or tooling that reads `.env` into logs or error output is a finding.

ANALYSIS METHODOLOGY:

Phase 1 - Repository Context Research: identify existing security frameworks, sanitization and validation patterns, and the project's security model. Read the project's `CLAUDE.md` first: its hard rules often state the threat model.

Phase 2 - Comparative Analysis: compare the changes against existing secure patterns; flag deviations and new attack surfaces.

Phase 3 - Vulnerability Assessment: trace data flow from user inputs to sensitive operations; look for privilege boundaries crossed unsafely, injection points and unsafe deserialization.

REQUIRED OUTPUT FORMAT:

Markdown, one block per finding, with file, line, severity, category (e.g. `sql_injection`), description, exploit scenario and fix:

# Vuln 1: XSS: `foo.py:42`

* Severity: High
* Description: …
* Exploit Scenario: …
* Recommendation: …

If there are no findings, say so in one line.

SEVERITY GUIDELINES:
- **HIGH**: directly exploitable — RCE, data breach, authentication bypass
- **MEDIUM**: requires specific conditions but with significant impact
- **LOW**: defense-in-depth (do not report unless asked)

CONFIDENCE: report only findings at 0.8 or above.

FALSE POSITIVE FILTERING — HARD EXCLUSIONS:
1. Denial of service or resource exhaustion.
2. Secrets on disk that are otherwise secured (e.g. a gitignored `.env`).
3. Rate limiting or service overload.
4. Memory or CPU exhaustion.
5. Missing input validation on non-security-critical fields without proven impact.
6. GitHub Actions input sanitization unless clearly triggerable via untrusted input.
7. Missing hardening measures without a concrete vulnerability.
8. Theoretical race conditions or timing attacks.
9. Outdated third-party libraries (handled by `npm audit` / `pip-audit` in `/security-audit`).
10. Memory safety issues in memory-safe languages.
11. Files that are only tests.
12. Log spoofing.
13. SSRF that only controls the path.
14. User-controlled content in AI system prompts.
15. Regex injection or regex DoS.
16. Findings in documentation files.
17. Missing audit logs.

PRECEDENTS:
1. Logging high-value secrets in plaintext is a vulnerability; logging URLs is assumed safe.
2. UUIDs are unguessable.
3. Environment variables and CLI flags are trusted.
4. Resource leaks are not valid findings.
5. Tabnabbing, XS-Leaks, prototype pollution and open redirects only at very high confidence.
6. React/Angular are XSS-safe unless using `dangerouslySetInnerHTML` or equivalent.
7. GitHub workflow issues need a concrete attack path.
8. Missing auth checks in client-side code are not vulnerabilities; the server is responsible.
9. MEDIUM findings only if obvious and concrete.
10. Notebook (`*.ipynb`) issues need a concrete path from untrusted input.

FINAL REMINDER: HIGH and MEDIUM only. Better to miss a theoretical issue than to flood the report.
