# Diagrams — sources, rendering, and what is committed

Two diagrams, one per question that actually gets asked about this project. The
**typed JSON in this folder is the source** — edit that, never the HTML. The
rendered `.html` beside it is self-contained and interactive, and is committed as
well: it is the reference you compare against when a diagram has to change.

| Diagram | Answers | Source |
|---|---|---|
| Module map | What talks to what, and which box is which file | [`architecture.architecture.json`](architecture.architecture.json) |
| Upscale pipeline | Where a dropped image goes, tile by tile, until a PNG comes out | [`upscale-pipeline.dataflow.json`](upscale-pipeline.dataflow.json) |

The captures embedded in the [README](../../README.md#architecture-and-processes)
live in [`../assets/`](../assets), two per diagram, light and dark.

> **If the code changes, the diagrams do not follow on their own.**
> A renamed component, a new studio, a changed worker protocol means editing the
> matching JSON and re-rendering. The module map is the one that fails loudly: it
> pins its file references to a commit and verifies them against git, so a path
> that no longer exists stops the render. The pipeline describes behaviour, and
> only a person can tell when that has drifted.

All commands below are run **from the repository root**.

## Installing archify

archify is a Node.js agent skill, not an npm dependency of this app — nothing in
`src/` imports it, and the Vite build doesn't know it exists. The rendered pages
ship with the repo, so it is only needed when a diagram changes — which is why it
is not vendored here: `.claude/*` is gitignored and the ~7.5 MB of third-party
code stays out. Install it when you need it (no `npm install` — its only
dependencies are for developing archify itself):

```bash
git clone --filter=blob:none --sparse --depth 1 https://github.com/tt-a1i/archify.git /tmp/archify && git -C /tmp/archify sparse-checkout set archify && cp -r /tmp/archify/archify .claude/skills/archify
```

## Validating and rendering

```bash
node .claude/skills/archify/bin/archify.mjs validate architecture docs/diagrams/architecture.architecture.json --quality showcase --repo-root .
```

```bash
node .claude/skills/archify/bin/archify.mjs deliver architecture docs/diagrams/architecture.architecture.json docs/diagrams/architecture.html --quality showcase --repo-root .
```

The data-flow diagram doesn't carry file references, so it skips `--repo-root`
(archify only supports that flag for architecture diagrams):

```bash
node .claude/skills/archify/bin/archify.mjs validate dataflow docs/diagrams/upscale-pipeline.dataflow.json --quality showcase
node .claude/skills/archify/bin/archify.mjs deliver dataflow docs/diagrams/upscale-pipeline.dataflow.json docs/diagrams/upscale-pipeline.html --quality showcase
```

`--repo-root` is what verifies the module map's `SRC` file references; drop it
and a diagram that declares `meta.repository` refuses to render. The `showcase`
profile is strict about layout — it rejects labels that overlap a node, unrelated
edges that share a corridor, and text that would fall below 6px on a 1440px
screen — so expect to move a label or two after any edit.

## Capturing the README images

The README images are made by a small script of ours, not by archify:

```bash
python docs/diagrams/capture.py
```

It lifts the inline `<svg>` and the stylesheet out of each rendered page, drops
them into a minimal page sized to the SVG's own viewBox, screenshots that with
headless Chrome in both themes, and trims whatever uniform border is left. What
comes out is the diagram and nothing else. It needs Chrome and Pillow
(`pip install pillow`).

The alternative — archify's own `visual-check` PNGs — are screenshots of the
whole viewer: a toolbar, a guided-views bar, a floating zoom control and a ~280px
empty column down the left. None of it can be clicked in a README, and the
buttons promise an interactivity a still image does not have. The one thing lost
by going around the viewer is the legend's per-kind counts, which its JavaScript
injects at runtime.

Both themes share one crop box, so the pair keeps identical dimensions — different
sizes would make the page jump when `<picture>` swaps them as the reader's theme
changes. Chrome does not render byte-identically between runs, so expect a small
binary churn even when nothing changed: unlike `archify deliver`, which is
deterministic to the sha256, the capture step is not.

## Checking layout

`visual-check` is still worth running, as a check rather than as a source of
images:

```bash
node .claude/skills/archify/bin/archify.mjs visual-check docs/diagrams/architecture.html
```

## What is committed, and what is not

| Path | In git | Why |
|---|---|---|
| `docs/diagrams/*.json` | yes | The source, and a diff you can actually read |
| `docs/diagrams/*.html` | yes | A few hundred KB on disk but small packed, and the last render is the reference the next edit is compared against. `.gitattributes` marks it binary so it stays out of your way |
| `docs/assets/*.png` | yes | GitHub renders nothing else. Two per diagram, light and dark, picked by `prefers-color-scheme`, produced by `docs/diagrams/capture.py`. Binary, so they never bloat a text diff |
| `docs/diagrams/*.visual-check.*` | no | Gitignored. Screenshots of the whole viewer, useful as a check, not as a source of images |
| `.claude/skills/archify/` | no | Third-party, ~7.5 MB, restored by the install command above |
