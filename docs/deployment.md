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

## 🧠 3. AI Model Files (.onnx)

The app uses **[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)** models by [Xintao Wang (xinntao)](https://github.com/xinntao), converted to ONNX.  
**These are NOT included in the Git repository** (too large). You must download them into `public/` before building.

| Filename | Size | Source |
|---|---|---|
| `RealESRGAN_x2plus.onnx` | 64 MB | [tidus2102/Real-ESRGAN](https://huggingface.co/tidus2102/Real-ESRGAN) |
| `RealESRGAN_x4plus.onnx` | 32 MB (fp16) | [OwlMaster/AllFilesRope](https://huggingface.co/OwlMaster/AllFilesRope) |
| `RealESRGAN_x4plus_anime_6B.onnx` | 18 MB | [deepghs/imgutils-models](https://huggingface.co/deepghs/imgutils-models) |

```bash
# Download all models to public/ (run from the project root)
curl -L "https://huggingface.co/tidus2102/Real-ESRGAN/resolve/main/Real-ESRGAN_x2plus.onnx" -o public/RealESRGAN_x2plus.onnx
curl -L "https://huggingface.co/OwlMaster/AllFilesRope/resolve/main/RealESRGAN_x4plus.fp16.onnx" -o public/RealESRGAN_x4plus.onnx
curl -L "https://huggingface.co/deepghs/imgutils-models/resolve/main/real_esrgan/RealESRGAN_x4plus_anime_6B.onnx" -o public/RealESRGAN_x4plus_anime_6B.onnx
```

> [!IMPORTANT]
> Models are served as static assets. Vite includes everything in `public/` in the `dist/` output automatically — no extra configuration needed.

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

## ⚙️ 6. ONNX Runtime WASM Files (self-hosted)

The ONNX Runtime Web library requires a set of `.wasm` and `.mjs` files to be served alongside the app. In production (e.g. Coolify with nginx), loading these from a CDN fails with:

```
TypeError: error loading dynamically imported module: https://cdn.jsdelivr.net/.../ort-wasm-simd-threaded.jsep.mjs
```

This is caused by strict **COEP/CORP** headers that block cross-origin module loading.

**The fix is already in place**: a `prebuild` npm script (`scripts/copy-ort-wasm.mjs`) automatically copies these files from `node_modules/onnxruntime-web/dist/` into `public/ort/` before every build, so they are served from the same origin as the app. No extra configuration is needed — `npm run build` handles everything.

---

## 🛡️ 7. Content-Security-Policy (CSP)
If your Docker container or Nginx proxy enforces a strict **Content-Security-Policy (CSP)**, you must allow WebAssembly compilation or the browser will throw this error:
```
RuntimeError: Aborted(CompileError: call to WebAssembly.instantiate() blocked by CSP)
```

**To fix this**: Ensure your `script-src` directive includes `'wasm-unsafe-eval'`.
Example Nginx header:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:;";
```
*(The `<meta>` tag in `index.html` has already been updated with these permissions).*

---

> [!NOTE]
> If you encounter issues with ONNX memory limits on a small VPS, consider enabling **Swap** memory on your server to prevent the build process from crashing.
