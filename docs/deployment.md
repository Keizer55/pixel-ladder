# Deployment Guide: VPS with Coolify 🚀

This guide explains how to deploy **Pixel Ladder** to a VPS using **Coolify**. Since this is a Vite-based project, we will focus on a static site deployment (highly recommended for performance and security).

## 📋 Prerequisites

1.  **A VPS**: (DigitalOcean, Hetzner, AWS, etc.) with Ubuntu/Debian.
2.  **Coolify Installed**: Follow the [official Coolify installation guide](https://coolify.io/docs/installation) if you haven't yet.
3.  **Git Repository**: Your code must be pushed to a provider like GitHub, GitLab, or Gitea.

---

## 🛠 1. Dependency Installation

When you deploy on Coolify, you don't need to manually run `npm install`. Coolify uses **Nixpacks** (or Docker) to detect your `package.json` and automatically handle dependencies.

> [!IMPORTANT]
> **No Server-Side AI Libraries Needed**: Since the AI engine (ONNX Runtime Web) runs entirely in the user's browser, you do **not** need to install GPU drivers or Python on your VPS. The server only needs to serve the `.onnx` files and the static Javascript bundle.

In your `package.json`, ensure you have the necessary libraries:
- `@microsoft/onnxruntime-web` (Required for the neural engine)
- `vite` (For building the static assets)

Coolify will execute:
```bash
npm install
npm run build
```

---

## 🚢 2. Deploying on Coolify

### Step A: Create a New Application
1.  Open your Coolify dashboard.
2.  Click **Sources** and ensure your GitHub/GitLab account is connected.
3.  Go to **Projects** -> Your Project -> **New Resource**.
4.  Select **Public Repository** or **Private Repository (GitHub App)**.
5.  Paste your repository URL (e.g., `https://github.com/youruser/pixel-ladder`).

### Step B: Configuration Settings
Coolify should automatically detect it as a **Vite / Static** project. If not, set these manually in the **Configuration** tab:

| Setting | Value |
| :--- | :--- |
| **Build Pack** | Nixpacks (Recommended) |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |
| **Output Directory** | `dist` |
| **Static Site** | **Checked/True** ✅ |

---

## 🧠 3. Handling AI Models (.onnx)

Since your models reside in the `public/models` folder:
1.  **Include in Git**: If your models are small (quantized), you can push them directly to Git.
2.  **Large Files**: If they are heavy, it is better to download them during the build process or mount a volume in Coolify to keep them persistent without bloating your repo.

**Recommendation**: Store them in `/public/models/`. Vite will automatically include them in the `dist` folder during the build.

---

## 🌐 4. Domain & SSL
1.  Under the **Settings** tab of your application in Coolify, find the **Domains** field.
2.  Enter your domain: `https://pixel-ladder.yourdomain.com`.
3.  Coolify will automatically handle **SSL certificates** via Let's Encrypt.

---

## 🔄 5. Continuous Deployment
Every time you `git push` to your main branch, Coolify will:
1.  Pull the latest code.
2.  Install dependencies.
3.  Build the project.
4.  Switch the traffic to the new version with zero downtime.

---

> [!NOTE]
> If you encounter issues with ONNX memory limits on a small VPS, consider enabling **Swap** memory on your server to prevent the build process from crashing.
