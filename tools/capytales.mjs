#!/usr/bin/env node
// capytales: the tools the CapyTales capybaras use in their Switch room.
//
//   capytales scene <spec.json> <out.png>    Pebble: draw a scene from a JSON spec
//   capytales elements                       Pebble: list what a scene can contain
//   capytales narrate <story-dir>            Yuzu: read story.json aloud (ElevenLabs)
//   capytales bind <story-dir>               Tofu: storybook.html + .pdf + cover.png + story.mp4
//   capytales check <story-dir>              Anyone: validate story.json and its files
//
// Reads ELEVENLABS_API_KEY (and optional CAPY_VOICE_ID) from the environment,
// the repository's .env, or ~/.config/capytales/env. Never commit those files.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Agents run with a minimal environment, so settings can also live in a file:
// the repository's .env, or ~/.config/capytales/env for the whole machine.
function loadDotEnv() {
  const files = [join(ROOT, '.env'), join(process.env.HOME || '', '.config', 'capytales', 'env')];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const usage = `usage:
  capytales scene <spec.json> <out.png>
  capytales elements
  capytales narrate <story-dir>
  capytales bind <story-dir>
  capytales check <story-dir>`;

async function main([cmd, ...args]) {
  loadDotEnv();
  switch (cmd) {
    case 'scene': {
      const [specPath, out] = args;
      if (!specPath || !out) throw new Error(usage);
      const { scene } = await import('./lib/capykit.mjs');
      const { svgToPng, closeBrowser } = await import('./lib/render.mjs');
      const svg = scene(JSON.parse(await readFile(specPath, 'utf8')));
      await mkdir(dirname(resolve(out)), { recursive: true });
      if (out.endsWith('.svg')) await writeFile(out, svg);
      else { await svgToPng(svg, out); await closeBrowser(); }
      console.log(`scene written: ${out}`);
      break;
    }
    case 'elements': {
      console.log(`Scene spec: { "size": [1200, 800], "sky": "night|dusk|day|dawn", "seed": 1,
  "stars": true, "hills": true, "ground": true, "flowers": false,
  "elements": [ ...drawn back to front... ] }
Elements (x, y are where the thing stands; scale 1 = a grown-up capybara about 200px long):
  capybara  { x, y, scale, facing: right|left, mood: happy|sleepy|giggle|surprised|worried,
              hat: yuzu|nightcap|beret|glasses|pencil|crown|flower|scarf, hold: book|brush|lantern|mic,
              kid: true (smaller), swim: true (no legs, for water), fur: "#B97C4D" }
  moon      { x, y, r, face: true, layer: "sky" }     cloud { x, y, scale, opacity, layer: "sky" }
  onsen     { x, y, w, h, yuzus }   (a hot spring pool with steam and floating yuzu)
  tree      { x, y, scale, color }  house { x, y, scale, lit }  bed { x, y, scale, quilt }
  duckling  { x, y, scale, facing } turtle { x, y, scale, facing } bird { x, y, scale, color, facing }
  lilypad   { x, y, scale }         text { x, y, text, size, color, stroke }
Canvas is 1200x800; the ground starts at y=608. Put things that stand on the ground at y 640-780.
Make the page's main characters big and close to the middle: scale 1.4-1.9 for grown-ups, and kid: true
with scale 1.6-2.2 for little ones (kids are drawn at 62%). Side characters can be smaller.
Keep the top 170px for sky only: the page's words are printed there.`);
      break;
    }
    case 'narrate': {
      const [dir] = args;
      if (!dir) throw new Error(usage);
      const { loadStory } = await import('./lib/book.mjs');
      const { narratePages } = await import('./lib/narrate.mjs');
      const story = await loadStory(dir);
      const timings = await narratePages(story.pages.map((p) => p.text), join(dir, 'story.mp3'));
      await writeFile(join(dir, 'timings.json'), JSON.stringify(timings, null, 1));
      story.audio = 'story.mp3';
      story.timings = 'timings.json';
      delete story._timings;
      await writeFile(join(dir, 'story.json'), JSON.stringify(story, null, 2));
      console.log(`narrated ${story.pages.length} pages, ${timings.duration.toFixed(1)}s: ${join(dir, 'story.mp3')}`);
      break;
    }
    case 'bind': {
      const [dir] = args;
      if (!dir) throw new Error(usage);
      const { bind } = await import('./lib/book.mjs');
      const out = await bind(dir);
      for (const [k, v] of Object.entries(out)) console.log(`${k}: ${v}`);
      break;
    }
    case 'check': {
      const [dir] = args;
      if (!dir) throw new Error(usage);
      const { loadStory } = await import('./lib/book.mjs');
      const story = await loadStory(dir);
      const problems = [];
      story.pages.forEach((p, i) => {
        if (!p.text?.trim()) problems.push(`page ${i + 1} has no text`);
        if (p.image && !existsSync(join(dir, p.image))) problems.push(`page ${i + 1} image ${p.image} is missing`);
        if (!p.image) problems.push(`page ${i + 1} has no image yet`);
      });
      const words = story.pages.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
      console.log(`${story.title}: ${story.pages.length} pages, ${words} words, about ${Math.round(words / 2.3)}s read aloud`);
      console.log(problems.length ? `problems:\n- ${problems.join('\n- ')}` : 'ready to narrate and bind');
      break;
    }
    default:
      console.log(usage);
      process.exitCode = cmd ? 1 : 0;
  }
}

main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
