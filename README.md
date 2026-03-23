# Pixel Ladder 🐷🪜
> *AI-powered image upscaler & print tools — runs entirely in your browser, no image uploads ever.*

[![Try it Online](https://img.shields.io/badge/🔴%20Try%20it%20Online-pixel--ladder.zikzero.com-brightgreen?style=for-the-badge)](https://www.pixel-ladder.zikzero.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX%20Runtime-Web-FF6900?style=flat-square)](https://onnxruntime.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

---

![Pixel Ladder Demo](./public/pixel-ladder-demo.gif)

---

## 🐷 Why I Built This

I needed to upscale images for large-format printing — and I couldn't find a simple site to do it in an easy, private way. Existing tools were either slow, cost money, or sent your images to a server.

So I built **Pixel Ladder**: a fully client-side tool that runs AI models directly in your browser. Your images never leave your device.

---

## 🚀 Key Features

### 1. 🔍 Quick Scale — Neural Upscaling
- **In-Browser Inference** — Uses ONNX Runtime Web to run AI models locally
- **Privacy First** — No images are ever uploaded to a server
- **4 Modes** — `x2`, `x4`, `x4 Anime` (Real-ESRGAN) + `Pixel Art` (crisp nearest-neighbor x4)
- **Pixel-Perfect Preview** — Sharp, crisp before/after comparison

### 2. 🖨️ Print Studio — DPI Calculator + Crop Studio
- Convert physical dimensions (CM / Inches) to required pixel counts
- Resolution presets: **150 DPI** (Draft), **300 DPI** (Standard), **600 DPI** (High Quality)
- Smart aspect ratio calculator for your target print size
- Built-in guided cropping to match the exact aspect ratio for your print
- Visual crop selection with real-time feedback

### 3. 🖼️ Wall Setup Studio
- Define your wall's physical dimensions to create a **scaled virtual space**
- Drag & drop frames of specific sizes to plan your gallery wall
- Each frame auto-calculates the **required pixel resolution** for a 300 DPI print
- Load your own images into the virtual frames to visualize the final result

---

## 🔒 Privacy

- **Images stay local** — Your images are processed on your device and are never uploaded by the app.
- **Optional analytics** — The hosted site can load Microsoft Clarity only after you accept the cookie/analytics consent prompt.
- **Normal web assets** — Like most websites, the hosted app may fetch third-party assets (for example, Google Fonts).

---

## 🤖 AI Models

Pixel Ladder uses **[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)** models by [Xintao Wang (xinntao)](https://github.com/xinntao), converted to ONNX format for browser inference.

| Mode | Model | Size |
|---|---|---|
| **x2** | `RealESRGAN_x2plus` | 64 MB |
| **x4** | `RealESRGAN_x4plus` | 32 MB |
| **x4 Anime** | `RealESRGAN_x4plus_anime_6B` | 18 MB |
| **Pixel Art** | Nearest-neighbor (no model needed) | — |

> Models are not bundled in the repository due to their size. See [docs/deployment.md](./docs/deployment.md) for setup instructions.

---

## 🧠 Notes & Limitations

- First use may take a moment while the browser downloads the ONNX model (~18–64 MB depending on the mode).
- Upscaling runs on your device via WebAssembly — speed depends on your hardware and image size.
- Large images are automatically processed in tiles (128 px with 8 px overlap) to prevent out-of-memory errors.

---

## ⚡ Quick Start

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Clone the repository
git clone https://github.com/Keizer55/pixel-ladder.git
cd pixel-ladder

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> See [docs/running-locally.md](./docs/running-locally.md) for more detailed setup instructions.

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| AI Engine | ONNX Runtime Web |
| AI Models | Real-ESRGAN (x2, x4, x4 Anime) + Pixel Art (nearest-neighbor scaling) |
| Image Handling | React Image Crop |
| Icons | Lucide React |
| Animations | Motion (formerly Framer Motion) |

---

## 📚 Documentation

More detailed docs are available in the [`docs/`](./docs) folder:

- [Architecture](./docs/architecture.md)
- [Running Locally](./docs/running-locally.md)
- [Usage Guide](./docs/usage.md)
- [Philosophy](./docs/philosophy.md)

---

## 📄 License

MIT License © 2026 Keizer55 — see [LICENSE](./LICENSE) for details.

---

<p align="center">Made with 🐷 by Keizer55</p>
