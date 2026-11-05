// Edit the recorded demo into the submission video (1920x1080, ~2.5 min):
// title card, captioned beats cut from the live recording (long waits sped up
// and labelled), the story video Tofu posted, a how-it-works card and an
// outro, with a voiceover by ElevenLabs (Jessica, as Yuzu).
//
//   node demo/build-video.mjs demo/out
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { narratePages } from '../tools/lib/narrate.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'demo', 'out');
const WORK = join(OUT, 'build');
mkdirSync(WORK, { recursive: true });
// Voiceover clips are cached by their text, so rebuilding costs no ElevenLabs credits.
const VO_CACHE = join(ROOT, 'demo', '.vo-cache');
mkdirSync(VO_CACHE, { recursive: true });
const W = 1920, H = 1080, FPS = 30;

// Settings from the repo's .env (the ElevenLabs key) and stack/.env (accounts).
const readEnv = (f) => existsSync(f) ? Object.fromEntries(readFileSync(f, 'utf8').split('\n')
  .filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])) : {};
for (const [k, v] of Object.entries(readEnv(join(ROOT, '.env')))) process.env[k] ??= v;
const stackEnv = readEnv(join(ROOT, 'stack', '.env'));

function loadPlaywright() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* global */ }
  for (const dir of [...(process.env.NODE_PATH || '').split(':').filter(Boolean), '/opt/node-tools/node_modules']) {
    if (existsSync(join(dir, 'playwright', 'package.json'))) return require(join(dir, 'playwright'));
  }
  throw new Error('Playwright not found');
}

const CARDS_ONLY = process.argv.includes('--cards-only');
const { events } = CARDS_ONLY ? { events: [] } : JSON.parse(readFileSync(join(OUT, 'events.json'), 'utf8'));
const ev = Object.fromEntries(events.map((e) => [e.name, e]));
const t = (name) => { if (!ev[name]) throw new Error(`missing event ${name}`); return ev[name].t; };
const has = (name) => Boolean(ev[name]);

const b64 = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
const font = (f) => `data:font/ttf;base64,${readFileSync(join(ROOT, 'art', 'fonts', f)).toString('base64')}`;
const FONTS = `@font-face{font-family:'Nunito';src:url(${font('Nunito.ttf')})}@font-face{font-family:'Baloo 2';src:url(${font('Baloo2.ttf')})}`;
const AV = Object.fromEntries(['yuzu', 'mochi', 'pebble', 'tofu'].map((k) => [k, b64(join(ROOT, 'art', 'avatars', `${k}.png`))]));

// ---------- the script ----------
const beats = CARDS_ONLY ? [] : [
  { card: 'title', vo: "Hi! I'm Yuzu. Welcome to CapyTales: a bedtime story studio that lives in your family's chat." },
  { from: t('room_open') - 1, to: t('room_open') + 6, who: 'yuzu', caption: 'One Switch room: Sam, Mia and Nana, plus four capybara agents',
    vo: 'Mia\'s family and four capybara agents share one Switch room. Mochi writes, Pebble draws, I read aloud, and Tofu makes the book.' },
  { from: t('nana_memory') - 0.5, to: t('mia_request') + 3, who: 'mochi', caption: 'Nana shares a memory. Mia asks @capy-mochi for a story',
    vo: 'Nana shares a memory, and Mia asks Mochi for a story.' },
  { from: t('mia_request') + 3, to: t('mochi_story') + 5, who: 'mochi', caption: 'Mochi reads the Story bible and writes eight pages',
    vo: 'Mochi checks our story bible, writes eight little pages, and hands them to Pebble, right in the chat.' },
  { from: t('mochi_story') + 5, to: t('pebble_art') + 3, who: 'pebble', caption: 'Pebble draws every page with the CapyTales art kit',
    vo: 'Pebble paints every page with our art kit,' },
  ...(has('art_preview_start') ? [{ from: t('art_preview_start') - 0.2, to: t('art_preview_end'), who: 'pebble', maxSpeed: 1.4,
    caption: "Pebble's pages, straight from the family chat", vo: 'and posts them for the grown-ups to see.' }] : []),
  { from: t('mia_tries_yuzu') - 1, to: has('thread_closed') ? t('thread_closed') : (has('switch_blocks') ? t('switch_blocks') : t('mia_tries_yuzu') + 3) + 4,
    who: 'yuzu', maxSpeed: 1.6, caption: 'Switch addressing policy: only a grown-up can ask Yuzu to read',
    vo: 'Mia tries to skip ahead! But Switch only lets a grown-up tell me to read.' },
  { from: t('sam_typing') - 0.5, to: t('sam_approves') + 2, who: 'yuzu', caption: 'Sam reads it and approves', maxSpeed: 1.6,
    vo: 'So Sam reads it first, and says yes.' },
  { from: t('sam_approves') + 2, to: t('yuzu_reads') + 4, who: 'yuzu', caption: 'Yuzu narrates it with ElevenLabs',
    vo: 'Then I read it aloud, in my ElevenLabs voice,' },
  { from: t('yuzu_reads') + 4, to: (has('tofu_book') ? t('tofu_book') : t('tofu_video')) + 2.5, who: 'tofu',
    caption: 'Tofu binds a read-along storybook, a PDF and a story video',
    vo: 'and Tofu binds a read-along book, and a story video.' },
  ...(has('video_open') ? [{ from: t('video_open') - 0.3, to: t('video_open') + 3.5, who: 'tofu', caption: "Tofu's story video, playing in the family chat" }] : []),
  { story: true, start: 1.2, dur: 27 },
  ...(has('bible_updated') ? [{ from: t('bible_updated') - 1, to: t('bible_updated') + 5, who: 'tofu',
    caption: 'Tofu updates the Story bible, a Switch room document', vo: 'Tofu writes it all down in our story bible,' }] : []),
  ...(has('mochi_remembers') ? [{ from: t('mia_next_night') - 0.5, to: t('mochi_remembers') + 6, who: 'mochi',
    caption: 'The next night, the room remembers', vo: 'so the next night, Mochi already knows Bean and Little Turtle.' }] : []),
  { card: 'how', vo: 'Under the hood, one Switch template creates the room, four Claude Code agents, and who may talk to whom. Switch carries every hand-off, picture and recording between them.' },
  { card: 'outro', vo: 'CapyTales. Built on Switch. Sweet capybara dreams!' },
];

// ---------- helpers ----------
async function ff(args) { await run('ffmpeg', ['-y', '-v', 'error', ...args], { maxBuffer: 64 * 1024 * 1024 }); }
async function dur(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(stdout);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
async function png(html, out, transparent = false) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;font-family:'Nunito',sans-serif;color:#4A2E1E;${transparent ? 'background:transparent' : ''}}
    </style></head><body>${html}</body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: out, omitBackground: transparent });
  await page.close();
  return out;
}

function captionHtml(beat, speed) {
  return `<div style="position:absolute;left:40px;bottom:34px;display:flex;align-items:center;gap:18px;padding:14px 30px 14px 14px;
      background:rgba(74,46,30,.92);border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25)">
      <img src="${AV[beat.who]}" style="width:64px;height:64px;border-radius:50%">
      <span style="font-family:'Baloo 2';font-weight:700;font-size:36px;color:#FFF3E0">${beat.caption}</span></div>
    ${speed > 1.05 ? `<div style="position:absolute;right:40px;top:30px;padding:8px 20px;border-radius:999px;background:rgba(74,46,30,.85);
      color:#FFE38A;font-family:'Baloo 2';font-weight:800;font-size:30px">⏩ sped up ${Math.round(speed)}×</div>` : ''}`;
}

const cream = 'background:radial-gradient(circle at 50% 35%,#FFF6E4,#F6DDB8 70%,#EFCB98)';
function cardHtml(kind) {
  const mascot = b64(join(ROOT, 'art', 'mascot.png'));
  const avatars = ['mochi', 'pebble', 'yuzu', 'tofu'].map((k) => `<div style="text-align:center"><img src="${AV[k]}" style="width:150px;height:150px;border-radius:50%;box-shadow:0 6px 18px rgba(0,0,0,.15)">
    <div style="font-family:'Baloo 2';font-weight:700;font-size:34px;margin-top:6px">${k[0].toUpperCase() + k.slice(1)}</div></div>`).join('');
  if (kind === 'title') return `<div style="position:absolute;inset:0;${cream};display:flex;flex-direction:column;align-items:center;justify-content:center">
      <img src="${mascot}" style="width:400px"><div style="font-family:'Baloo 2';font-weight:800;font-size:150px;line-height:1;color:#6B4026">CapyTales</div>
      <div style="font-size:46px;font-weight:800;color:#9A6239;margin:10px 0 34px">A bedtime-story studio in your family chat</div>
      <div style="display:flex;gap:46px">${avatars}</div>
      <div style="position:absolute;bottom:36px;font-size:30px;font-weight:700;opacity:.75">Built on Switch · Flip the Switch hackathon</div></div>`;
  if (kind === 'outro') return `<div style="position:absolute;inset:0;background:linear-gradient(#1E2457,#3B3F8C);color:#FFF6C9;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <img src="${mascot}" style="width:360px"><div style="font-family:'Baloo 2';font-weight:800;font-size:130px;line-height:1">CapyTales</div>
      <div style="font-size:44px;font-weight:800;color:#FFE38A;margin:14px 0 28px">Sweet capybara dreams 🌙</div>
      <div style="font-size:34px;font-weight:700">github.com/chinesepowered/hack-switch</div>
      <div style="font-size:28px;font-weight:700;opacity:.8;margin-top:10px">Built with Switch · Claude Code · ElevenLabs</div></div>`;
  const box = (title, lines, extra = '') => `<div style="background:#FFFCF6;border-radius:28px;padding:26px 30px;box-shadow:0 10px 26px rgba(74,46,30,.16);${extra}">
      <div style="font-family:'Baloo 2';font-weight:800;font-size:40px;color:#6B4026;margin-bottom:8px">${title}</div>
      ${lines.map((l) => `<div style="font-size:27px;font-weight:700;line-height:1.5">${l}</div>`).join('')}</div>`;
  const arrow = '<svg width="64" height="40" viewBox="0 0 64 40"><path d="M4 20 H52 M38 6 L56 20 L38 34" fill="none" stroke="#B97C4D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const capy = ['mochi', 'pebble', 'yuzu', 'tofu'].map((k) => `<img src="${AV[k]}" style="width:78px;height:78px;border-radius:50%">`).join('');
  const step = (img, label) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:190px">
      ${img.startsWith('data:') ? `<img src="${img}" style="width:84px;height:84px;border-radius:50%">` : `<div style="width:84px;height:84px;border-radius:50%;background:#F8C630;display:grid;place-items:center;font-size:44px">${img}</div>`}
      <div style="font-size:24px;font-weight:800;text-align:center;line-height:1.2">${label}</div></div>`;
  const small = '<svg width="34" height="24" viewBox="0 0 34 24"><path d="M3 12 H27 M19 4 L29 12 L19 20" fill="none" stroke="#B97C4D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return `<div style="position:absolute;inset:0;${cream};padding:56px 70px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:44px">
      <div style="font-family:'Baloo 2';font-weight:800;font-size:76px;color:#6B4026;line-height:1">How CapyTales uses Switch</div>
      <div style="display:flex;align-items:center;gap:22px">
        ${box('The family', ['Sam, Mia, Nana', 'in Mattermost', '(or Slack, Discord,', 'Telegram, Teams)'], 'width:320px')}
        ${arrow}
        ${box('Switch room', ['• Room bridged to the chat', '• Addressing policy: kids ask,', '&nbsp;&nbsp;only a grown-up approves', '• Hand-offs by @-mention', '• Files as room attachments', '• Story bible room document', '• One template sets it all up'], 'width:530px;border:4px solid #F8C630')}
        ${arrow}
        ${box('Four agents', [`<div style="display:flex;gap:10px;margin:6px 0 10px">${capy}</div>`, 'Claude Code, run by', "Switch's agent controller", 'with the capytales tools:', 'art kit · ElevenLabs · book'], 'width:440px')}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,252,246,.7);border-radius:28px;padding:22px 10px">
        ${step('💬', 'Mia asks')}${small}${step(AV.mochi, 'Mochi writes')}${small}${step(AV.pebble, 'Pebble draws')}${small}
        ${step('👍', 'A grown-up approves')}${small}${step(AV.yuzu, 'Yuzu reads')}${small}${step(AV.tofu, 'Tofu binds')}
      </div></div>`;
}

if (CARDS_ONLY) {
  for (const kind of ['title', 'how', 'outro']) console.log(await png(cardHtml(kind), join(WORK, `preview-${kind}.png`)));
  await png(captionHtml({ who: 'pebble', caption: 'Pebble draws every page with the CapyTales art kit' }, 14), join(WORK, 'preview-caption.png'), true);
  await browser.close();
  process.exit(0);
}

// ---------- build ----------
const segs = [];
let n = 0;
for (const beat of beats) {
  const id = String(n++).padStart(2, '0');
  const seg = join(WORK, `seg${id}.mp4`);
  if (beat.story) {
    const storyPath = join(OUT, 'story.mp4');
    if (!existsSync(storyPath)) { console.log('no story.mp4, skipping playback'); continue; }
    const tag = await png(`<div style="position:absolute;right:40px;top:30px;display:flex;align-items:center;gap:14px;padding:10px 24px 10px 10px;border-radius:999px;background:rgba(74,46,30,.88)">
      <img src="${AV.tofu}" style="width:54px;height:54px;border-radius:50%"><span style="font-family:'Baloo 2';font-weight:700;font-size:30px;color:#FFF3E0">The story video Tofu posted, read by Yuzu</span></div>`, join(WORK, `tag${id}.png`), true);
    await ff(['-ss', String(beat.start), '-t', String(beat.dur), '-i', storyPath, '-i', tag, '-filter_complex',
      `[0:v]fps=${FPS},scale=${W}:${H},setsar=1[v];[v][1:v]overlay=0:0,format=yuv420p[out];[0:a]aresample=44100,aformat=channel_layouts=stereo[a]`,
      '-map', '[out]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', seg]);
    segs.push(seg);
    console.log(`seg ${id}: story playback ${beat.dur}s`);
    continue;
  }
  // Voiceover for this beat (a beat without one plays at normal speed, silent).
  const vo = beat.vo ? join(VO_CACHE, `${createHash('sha1').update(`${process.env.CAPY_VOICE_ID || ''}|${beat.vo}`).digest('hex').slice(0, 16)}.mp3`) : join(WORK, `vo${id}.mp3`);
  if (beat.vo) {
    if (!existsSync(vo)) await narratePages([beat.vo], vo);
  } else {
    await ff(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(beat.to - beat.from), '-c:a', 'libmp3lame', vo]);
  }
  const voDur = await dur(vo);
  const target = beat.vo ? Math.max(voDur + 0.9, beat.card ? 4.5 : 3.5) : voDur;
  // A recording beat can run longer than its line (a speed cap); pad the audio
  // to the clip's real length so every segment's audio and video match.
  const raw = beat.card ? 0 : beat.to - beat.from;
  const speed = beat.card ? 1 : Math.min(Math.max(raw / target, 1), beat.maxSpeed ?? 40);
  const shown = beat.card ? target : raw / speed;
  const length = Math.max(target, shown);
  const audio = join(WORK, `a${id}.wav`);
  await ff(['-i', vo, '-af', `adelay=350|350,apad,aresample=44100,aformat=channel_layouts=stereo`, '-t', length.toFixed(2), audio]);

  if (beat.card) {
    const img = await png(cardHtml(beat.card), join(WORK, `card${id}.png`));
    await ff(['-loop', '1', '-i', img, '-i', audio, '-vf', `fps=${FPS},scale=${W}:${H},format=yuv420p`, '-t', length.toFixed(2),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '160k', '-shortest', seg]);
  } else {
    const hold = Math.max(0, length - shown);
    const cap = await png(captionHtml(beat, speed), join(WORK, `cap${id}.png`), true);
    await ff(['-ss', beat.from.toFixed(2), '-to', beat.to.toFixed(2), '-i', join(OUT, 'raw.webm'), '-i', cap, '-i', audio, '-filter_complex',
      `[0:v]setpts=(PTS-STARTPTS)/${speed.toFixed(3)},fps=${FPS},scale=${W}:${Math.round(W * 900 / 1440)}:flags=lanczos,` +
      `crop=${W}:${H}:0:${Math.round((W * 900 / 1440 - H) / 2)},tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)},setsar=1[v];` +
      `[v][1:v]overlay=0:0,format=yuv420p[out]`, '-map', '[out]', '-map', '2:a', '-t', length.toFixed(2),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', seg]);
    console.log(`seg ${id}: ${raw.toFixed(1)}s of recording at ${speed.toFixed(1)}x -> ${length.toFixed(1)}s`);
  }
  segs.push(seg);
}
await browser.close();

const list = join(WORK, 'segs.txt');
writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
const final = join(OUT, 'capytales-demo.mp4');
await ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', final]);
console.log(`demo video: ${final} (${(await dur(final)).toFixed(1)}s)`);
