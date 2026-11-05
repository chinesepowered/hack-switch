// Build the CapyTales art: mascot, agent avatars and a sample scene.
//   node tools/scripts/build-art.mjs [outDir]
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avatar, scene, svgDoc, capybara, CAST } from '../lib/capykit.mjs';
import { svgToPng, closeBrowser } from '../lib/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = process.argv[2] || join(root, 'art');
await mkdir(join(out, 'avatars'), { recursive: true });

for (const [key, c] of Object.entries(CAST)) {
  const svg = avatar({ bg: c.bg, hat: c.hat, mood: c.mood, hold: c.hold });
  await writeFile(join(out, 'avatars', `${key}.svg`), svg);
  await svgToPng(svg, join(out, 'avatars', `${key}.png`));
}

// The mascot: Yuzu, full body, with a yuzu on her head.
const mascot = svgDoc(440, 340, capybara({ x: 220, y: 320, scale: 1.9, hat: 'yuzu', mood: 'happy' }));
await writeFile(join(out, 'mascot.svg'), mascot);
await svgToPng(mascot, join(out, 'mascot.png'), { scale: 2 });

const sample = scene({
  size: [1200, 800], sky: 'night', seed: 9,
  elements: [
    { type: 'moon', layer: 'sky', x: 980, y: 150, r: 70 },
    { type: 'cloud', layer: 'sky', x: 260, y: 170, scale: 1.1, opacity: 0.35 },
    { type: 'tree', x: 130, y: 640, scale: 1.2 },
    { type: 'onsen', x: 640, y: 630, w: 640, h: 170 },
    { type: 'capybara', x: 560, y: 655, scale: 1.25, mood: 'sleepy', hat: 'yuzu', swim: true },
    { type: 'capybara', x: 760, y: 650, scale: 1.1, mood: 'giggle', kid: true, swim: true, facing: 'left' },
    { type: 'duckling', x: 900, y: 600, scale: 1.1, facing: 'left' },
    { type: 'turtle', x: 1060, y: 720, scale: 1.2, facing: 'left' },
  ],
});
await writeFile(join(out, 'sample-scene.svg'), sample);
await svgToPng(sample, join(out, 'sample-scene.png'));
await closeBrowser();
console.log(`Art written to ${out}`);
