// Records the README / portfolio demo against a production build.
//
//   npm run build && npm run preview      (in another terminal)
//   node scripts/record-demo.mjs [outDir]
//
// Writes raw.webm plus markers.json (seconds from the start of the video for
// each beat) to outDir, which defaults to a temp folder, never the repo. The
// markers are what the ffmpeg cut uses to drop the inference wait.
import { chromium } from 'playwright';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_URL = process.env.DEMO_URL ?? 'http://localhost:4173';
const outDir = resolve(process.argv[2] ?? join(tmpdir(), 'pixel-ladder-demo'));
const source = fileURLToPath(new URL('../docs/demo/pixel-ladder-demo-source.png', import.meta.url));
mkdirSync(outDir, { recursive: true });

// Headless video has no cursor: draw one that follows the mouse, with a ripple on click.
const cursorScript = () => {
  window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
      #demo-cursor { position: fixed; z-index: 2147483647; pointer-events: none;
        width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
        background: rgba(62,39,35,.85); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4);
        left: -40px; top: -40px; }
      .demo-ripple { position: fixed; z-index: 2147483646; pointer-events: none;
        width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
        border: 3px solid rgba(139,90,43,.9); animation: demo-ripple .5s ease-out forwards; }
      @keyframes demo-ripple { from { transform: scale(.2); opacity: 1 } to { transform: scale(1); opacity: 0 } }`;
    document.head.appendChild(style);
    const dot = document.createElement('div');
    dot.id = 'demo-cursor';
    document.body.appendChild(dot);
    document.addEventListener('mousemove', (e) => {
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = 'demo-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, true);
  });
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  // English copy and the light theme, whatever the recording machine prefers.
  locale: 'en-US',
  colorScheme: 'light',
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
await context.addInitScript(cursorScript);
const page = await context.newPage();
const t0 = Date.now();
const markers = {};
const mark = (name) => { markers[name] = (Date.now() - t0) / 1000; };

const center = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const moveTo = async (locator, steps = 25) => {
  const { x, y } = await center(locator);
  await page.mouse.move(x, y, { steps });
  return { x, y };
};
const click = async (locator, pause = 600) => {
  await moveTo(locator);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(pause);
};
const scrollBy = async (dy, ticks = 8) => {
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, dy / ticks);
    await page.waitForTimeout(30);
  }
};

await page.goto(APP_URL, { waitUntil: 'networkidle' });
await page.mouse.move(900, 700);
// Analytics consent: decline.
await click(page.getByRole('button', { name: 'Decline' }), 400);
await page.mouse.move(640, 320, { steps: 15 });
mark('land');
await page.waitForTimeout(1500);

// Load the low-res image through the drop zone.
const dropZone = page.getByText('Click or drag an image here');
await moveTo(dropZone);
await page.waitForTimeout(200);
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.mouse.down().then(() => page.mouse.up())]);
await chooser.setFiles(source);
mark('loaded');
await page.waitForTimeout(1200);

await click(page.locator('label').filter({ has: page.locator('input[value="x4"]') }), 600);
await click(page.getByRole('button', { name: 'Upscale now' }), 0);
mark('processStart');
const resultImg = page.getByAltText('Upscaled high-resolution result from Pixel Ladder AI');
await resultImg.waitFor({ timeout: 300_000 });
mark('processEnd');
await page.waitForTimeout(500);

// Bring the 8x detail comparison into view, then sweep across the result.
await page.mouse.move(640, 600, { steps: 10 });
await scrollBy(330);
await page.waitForTimeout(400);
const box = await resultImg.boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
let p = at(0.12, 0.3);
await page.mouse.move(p.x, p.y, { steps: 20 });
mark('sweepStart');
for (const [fx, fy, steps] of [[0.88, 0.3, 70], [0.88, 0.62, 25], [0.5, 0.78, 45], [0.66, 0.84, 25]]) {
  p = at(fx, fy);
  await page.mouse.move(p.x, p.y, { steps });
  await page.waitForTimeout(80);
}
mark('hold');
await page.waitForTimeout(2800);
mark('holdEnd');

// Print Studio beat: send the result over (no re-upload), enter a print size,
// read the required pixels and the low-resolution warning.
await page.mouse.move(640, 300, { steps: 10 });
await scrollBy(-200);
await page.waitForTimeout(300);
mark('printStart');
await click(page.getByRole('button', { name: 'Use in Print Studio →' }), 700);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await page.waitForTimeout(700);
for (const [input, value] of [[page.locator('#print-width'), '50'], [page.locator('#print-height'), '40']]) {
  await click(input, 150);
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value, { delay: 90 });
  await page.waitForTimeout(400);
}
await moveTo(page.getByText('Required pixels'), 20);
mark('printHold');
await page.waitForTimeout(2200);

// Language beat: switch the interface to Spanish.
await click(page.getByRole('button', { name: 'ES', exact: true }), 0);
mark('langHold');
await page.waitForTimeout(2000);
mark('end');

const video = page.video();
await context.close();
await browser.close();
renameSync(await video.path(), join(outDir, 'raw.webm'));
writeFileSync(join(outDir, 'markers.json'), JSON.stringify(markers, null, 2));
console.log(outDir, markers);
