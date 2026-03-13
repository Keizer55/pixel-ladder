# Project Architecture

Pixel Ladder is built as a highly performant, client-side heavy application.

## 1. The Neural Engine (`UpscaleEngine.ts`)

The heart of the application is the `useUpscaleEngine` hook. It manages the lifecycle of the AI model:
- **Web Workers**: To prevent the UI from freezing during heavy computation, the ONNX inference runs in a dedicated background worker.
- **ONNX Runtime Web**: We use `@microsoft/onnxruntime-web` to execute `.onnx` models. This allows us to leverage the user's GPU (via WebGL/WebGPU) or CPU (via WASM).

## 2. State Management

The application uses standard React state for UI transitions but handles large image data carefully:
- **Object URLs**: Instead of storing massive base64 strings in state, we use `URL.createObjectURL` to handle image previews efficiently.
- **Canvas API**: The final upscaled result is rendered to an offscreen canvas before being converted to a downloadable blob.

## 3. The Print Logic (`PrintCalculator.ts`)

The math behind the print studio is simple but critical:
- `Pixels = Inches * DPI`
- `Inches = CM / 2.54`

By centralizing this logic, we ensure that the Crop Studio and the Calculator always stay in sync.

## 4. Styling System

We use a custom Tailwind configuration that defines "Pixel Borders" using multiple box-shadows. This avoids the "blurry" look of standard CSS borders and maintains the 8-bit theme.
