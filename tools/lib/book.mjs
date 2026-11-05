// Bind a story into a read-along storybook (HTML), a printable PDF, a cover
// image for the chat preview, and a story video (MP4).
//
// A story folder holds story.json:
//   { "title": "...", "for": "Mia", "pages": [{ "text": "...", "image": "p1.png" }],
//     "audio": "story.mp3", "timings": "timings.json" }
// `audio` and `timings` are optional (added by the narrator).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { htmlToPdf, htmlToPng, closeBrowser } from './render.mjs';
import { CAST, avatar, capybara, svgDoc, moon, stars } from './capykit.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTS = join(ROOT, 'art', 'fonts');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const b64 = async (file, mime) => `data:${mime};base64,${(await readFile(file)).toString('base64')}`;

async function fontCss() {
  const nunito = await b64(join(FONTS, 'Nunito.ttf'), 'font/ttf');
  const baloo = await b64(join(FONTS, 'Baloo2.ttf'), 'font/ttf');
  return `@font-face{font-family:'Nunito';src:url(${nunito}) format('truetype');font-weight:200 1000}
@font-face{font-family:'Baloo 2';src:url(${baloo}) format('truetype');font-weight:400 800}`;
}

export async function loadStory(dir) {
  const story = JSON.parse(await readFile(join(dir, 'story.json'), 'utf8'));
  if (!story.title || !Array.isArray(story.pages) || story.pages.length === 0) {
    throw new Error('story.json needs a title and at least one page.');
  }
  const timingsFile = story.timings && join(dir, story.timings);
  story._timings = timingsFile && existsSync(timingsFile) ? JSON.parse(await readFile(timingsFile, 'utf8')) : null;
  return story;
}

function wordsHtml(text, timing) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const words = timing?.words;
  const aligned = words && words.length === tokens.length;
  return tokens.map((t, i) => aligned
    ? `<span class="w" data-s="${words[i].start.toFixed(3)}" data-e="${words[i].end.toFixed(3)}">${esc(t)}</span>`
    : `<span class="w">${esc(t)}</span>`).join(' ');
}

const castLine = Object.values(CAST).map((c) => `${c.name} the ${c.role}`).join(' · ');

/** storybook.html: self-contained, read-along when narration exists. */
export async function buildHtml(dir, story) {
  const avatars = await Promise.all(Object.keys(CAST).map(async (k) =>
    `<figure><img src="${await b64(join(ROOT, 'art', 'avatars', `${k}.png`), 'image/png')}" alt=""><figcaption>${CAST[k].name}<small>${CAST[k].role}</small></figcaption></figure>`));
  const pages = await Promise.all(story.pages.map(async (p, i) => {
    const img = p.image && existsSync(join(dir, p.image)) ? await b64(join(dir, p.image), 'image/png') : null;
    return `<section class="page story" data-page="${i}">
      ${img ? `<img class="art" src="${img}" alt="Illustration for page ${i + 1}">` : '<div class="art placeholder"></div>'}
      <p class="text">${wordsHtml(p.text, story._timings?.pages?.[i])}</p>
      <span class="num">${i + 1}</span>
    </section>`;
  }));
  const sleepy = svgDoc(440, 300, stars(440, 300, 14, 4) + moon({ x: 360, y: 70, r: 34 }) +
    capybara({ x: 200, y: 285, scale: 1.4, mood: 'sleepy', hat: 'nightcap' }));
  const audio = story.audio && existsSync(join(dir, story.audio)) ? await b64(join(dir, story.audio), 'audio/mpeg') : null;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(story.title)}</title>
<style>
${await fontCss()}
:root{--cream:#FFF8EC;--ink:#4A2E1E;--accent:#F8C630;--soft:#FBE7C6;--hi:#FFE38A}
*{box-sizing:border-box}
html,body{margin:0;background:#EFE4D0;color:var(--ink);font-family:'Nunito',sans-serif}
.page{width:1200px;height:800px;margin:24px auto;background:var(--cream);border-radius:28px;position:relative;overflow:hidden;
  box-shadow:0 10px 30px rgba(74,46,30,.18);page-break-after:always;break-after:page}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:radial-gradient(circle at 50% 35%,#FFF3D6 0,#FBE2B8 60%,#F6CF96 100%)}
.cover h1{font-family:'Baloo 2';font-size:76px;line-height:1.05;margin:0 60px 8px;color:#6B4026}
.cover .for{font-size:30px;margin:0 0 34px;font-weight:700;color:#9A6239}
.cast{display:flex;gap:26px}
.cast figure{margin:0;width:150px}
.cast img{width:128px;height:128px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.12)}
.cast figcaption{font-family:'Baloo 2';font-size:24px;font-weight:700}
.cast small{display:block;font-family:'Nunito';font-size:16px;font-weight:600;opacity:.75}
.story .art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.story .placeholder{background:linear-gradient(#3B3F8C,#6D6FB8)}
.story .text{position:absolute;left:48px;right:48px;bottom:36px;margin:0;padding:22px 30px;border-radius:24px;
  background:rgba(255,248,236,.93);font-size:31px;line-height:1.45;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.15)}
.w{border-radius:8px;padding:0 2px;transition:background .12s}
.w.on{background:var(--hi)}
.num{position:absolute;top:22px;right:28px;width:48px;height:48px;border-radius:50%;background:var(--accent);
  font-family:'Baloo 2';font-weight:800;font-size:24px;display:grid;place-items:center;color:#6B4026}
.end{display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(#1E2457,#3B3F8C);color:#FFF6C9;text-align:center}
.end h2{font-family:'Baloo 2';font-size:84px;margin:0}
.end p{font-size:32px;font-weight:700;margin:6px 0 22px}
.end svg{width:440px;height:300px}
.credits{font-size:18px;opacity:.8}
.player{position:sticky;bottom:0;display:flex;justify-content:center;gap:14px;align-items:center;padding:14px;background:rgba(239,228,208,.95)}
.player button{font-family:'Baloo 2';font-size:22px;font-weight:700;border:0;border-radius:999px;padding:10px 26px;background:var(--accent);color:#6B4026;cursor:pointer}
@media print{html,body{background:none}.page{margin:0;border-radius:0;box-shadow:none}.player{display:none}}
@page{size:1200px 800px;margin:0}
</style></head><body>
<section class="page cover">
  <h1>${esc(story.title)}</h1>
  <p class="for">A bedtime story${story.for ? ` for ${esc(story.for)}` : ''}</p>
  <div class="cast">${avatars.join('')}</div>
</section>
${pages.join('\n')}
<section class="page end">
  <h2>The End</h2>
  <p>Goodnight${story.for ? `, ${esc(story.for)}` : ''}. Sweet capybara dreams.</p>
  ${sleepy}
  <p class="credits">${esc(castLine)} · made in a Switch room</p>
</section>
${audio ? `<div class="player"><button id="play">▶ Read it to me</button><audio id="voice" src="${audio}"></audio></div>
<script>
const a=document.getElementById('voice'),b=document.getElementById('play'),ws=[...document.querySelectorAll('.w[data-s]')];
b.onclick=()=>{if(a.paused){a.play();b.textContent='❚❚ Pause'}else{a.pause();b.textContent='▶ Read it to me'}};
let last=null;a.ontimeupdate=()=>{const t=a.currentTime;const w=ws.find(x=>t>=+x.dataset.s&&t<+x.dataset.e+0.15);
if(w&&w!==last){last?.classList.remove('on');w.classList.add('on');last=w;w.closest('.page').scrollIntoView({behavior:'smooth',block:'center'})}};
a.onended=()=>{last?.classList.remove('on');b.textContent='▶ Read it again'};
</script>` : ''}
</body></html>`;
  const out = join(dir, 'storybook.html');
  await writeFile(out, html);
  return out;
}

async function frameHtml(dir, story, kind, i) {
  const css = `${await fontCss()}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;font-family:'Nunito',sans-serif;color:#4A2E1E}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#FFF3D6,#F3D3A3)}
.art{position:absolute;left:150px;top:0;width:1620px;height:1080px;object-fit:cover;border-radius:0}
.cap{position:absolute;left:230px;right:230px;bottom:48px;padding:26px 40px;border-radius:30px;background:rgba(255,248,236,.94);
  font-size:42px;line-height:1.4;font-weight:800;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.18)}
h1{font-family:'Baloo 2';font-size:110px;line-height:1.05;margin:0;color:#6B4026}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.sub{font-size:44px;font-weight:800;color:#9A6239;margin-top:12px}`;
  let body;
  if (kind === 'cover') {
    const a = await b64(join(ROOT, 'art', 'mascot.png'), 'image/png');
    body = `<div class="bg"></div><div class="center"><img src="${a}" style="width:420px"><h1>${esc(story.title)}</h1>
      <div class="sub">A bedtime story${story.for ? ` for ${esc(story.for)}` : ''}</div></div>`;
  } else if (kind === 'end') {
    const sleepy = svgDoc(560, 380, stars(560, 380, 18, 4) + moon({ x: 460, y: 80, r: 42 }) +
      capybara({ x: 250, y: 365, scale: 1.8, mood: 'sleepy', hat: 'nightcap' }));
    body = `<div class="bg" style="background:linear-gradient(#1E2457,#3B3F8C)"></div><div class="center" style="color:#FFF6C9">
      ${sleepy}<h1 style="color:#FFF6C9">The End</h1><div class="sub" style="color:#FFE38A">Goodnight${story.for ? `, ${esc(story.for)}` : ''}</div></div>`;
  } else {
    const p = story.pages[i];
    const img = p.image && existsSync(join(dir, p.image)) ? await b64(join(dir, p.image), 'image/png') : '';
    body = `<div class="bg"></div>${img ? `<img class="art" src="${img}">` : ''}<div class="cap">${esc(p.text)}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

/** story.mp4: cover, one gently zooming shot per page in time with the narration, end card. */
export async function buildMovie(dir, story) {
  const t = story._timings;
  if (!t || !story.audio) throw new Error('Narrate the story first: the video follows the narration timings.');
  const work = join(dir, '.frames');
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  const COVER = 3.5, END = 4.5, FPS = 30;
  const shots = [{ kind: 'cover', dur: COVER }];
  t.pages.forEach((p, i) => {
    const next = t.pages[i + 1];
    shots.push({ kind: 'page', i, dur: (next ? next.start : p.end + 0.6) - p.start });
  });
  shots.push({ kind: 'end', dur: END });

  const clips = [];
  for (const [n, s] of shots.entries()) {
    const html = join(work, `f${n}.html`), png = join(work, `f${n}.png`), mp4 = join(work, `c${n}.mp4`);
    await writeFile(html, await frameHtml(dir, story, s.kind, s.i));
    await htmlToPng(html, png, { width: 1920, height: 1080, scale: 1.25 });
    const frames = Math.max(1, Math.round(s.dur * FPS));
    await run('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-i', png, '-vf',
      `scale=2400:1350,zoompan=z='min(zoom+0.0004,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=${FPS},format=yuv420p`,
      '-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', mp4]);
    clips.push(mp4);
  }
  const list = join(work, 'clips.txt');
  await writeFile(list, clips.map((c) => `file '${c}'`).join('\n'));
  const silent = join(work, 'video.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  const out = join(dir, 'story.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', join(dir, story.audio), '-filter_complex',
    `[1:a]adelay=${COVER * 1000}|${COVER * 1000},apad[a]`, '-map', '0:v', '-map', '[a]', '-shortest',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out]);
  await rm(work, { recursive: true, force: true });
  return out;
}

/** Everything the librarian posts: storybook.html, storybook.pdf, cover.png, story.mp4 (if narrated). */
export async function bind(dir) {
  const story = await loadStory(dir);
  const html = await buildHtml(dir, story);
  const pdf = await htmlToPdf(html, join(dir, 'storybook.pdf'));
  const coverHtml = join(dir, '.cover.html');
  await writeFile(coverHtml, await frameHtml(dir, story, 'cover'));
  const cover = await htmlToPng(coverHtml, join(dir, 'cover.png'), { width: 1920, height: 1080 });
  await rm(coverHtml, { force: true });
  const outputs = { html, pdf, cover };
  if (story._timings && story.audio) outputs.movie = await buildMovie(dir, story);
  await closeBrowser();
  return outputs;
}
