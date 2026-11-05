// Render SVG or HTML to PNG/PDF with headless Chromium (Playwright).
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Resolve Playwright from tools/node_modules or, failing that, a global install
// (NODE_PATH), so `npm install` in tools/ is optional where it is preinstalled.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

let browserPromise;
async function browser() {
  browserPromise ??= chromium.launch();
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
}

function sizeOf(svg) {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  return m ? [Math.round(+m[1]), Math.round(+m[2])] : [1200, 800];
}

/** SVG markup -> PNG file. `scale` multiplies the pixel size (2 = retina). */
export async function svgToPng(svg, outPath, { scale = 1 } = {}) {
  const [w, h] = sizeOf(svg);
  const page = await (await browser()).newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.locator('svg').first().screenshot({ path: outPath, omitBackground: true });
  await page.close();
  return outPath;
}

/** HTML file -> PDF (A4 landscape storybook pages). */
export async function htmlToPdf(htmlPath, outPath) {
  const page = await (await browser()).newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.pdf({ path: outPath, width: '1200px', height: '800px', printBackground: true, preferCSSPageSize: true });
  await page.close();
  return outPath;
}

/** HTML file -> PNG screenshot of the full page, e.g. a title card. */
export async function htmlToPng(htmlPath, outPath, { width = 1920, height = 1080, scale = 1 } = {}) {
  const page = await (await browser()).newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath });
  await page.close();
  return outPath;
}

export async function svgFileToPng(svgPath, outPath, opts) {
  return svgToPng(await readFile(svgPath, 'utf8'), outPath, opts);
}
