// Record the CapyTales demo: Sam's Mattermost window while a bedtime story
// happens live in the Switch room. Nana and Mia post through the API; Sam types
// in the browser. Every step's time is written to events.json for the edit.
//
//   node demo/record.mjs demo/out
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'demo', 'out');
// Must match Mattermost's SiteURL (localhost), or its WebSocket refuses the
// page's origin and the window stops receiving new messages.
const MM = process.env.MM_URL || 'http://localhost:8065';
const ROOM = 'capy-bedtime';
const VIEW = { width: 1440, height: 900 };
mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* global */ }
  for (const dir of [...(process.env.NODE_PATH || '').split(':').filter(Boolean), '/opt/node-tools/node_modules']) {
    if (existsSync(join(dir, 'playwright', 'package.json'))) return require(join(dir, 'playwright'));
  }
  throw new Error('Playwright not found');
}

const env = Object.fromEntries(readFileSync(join(ROOT, 'stack', '.env'), 'utf8').split('\n')
  .filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const ACCOUNTS = {
  sam: [env.MATTERMOST_USER, env.MATTERMOST_USER_PASSWORD],
  mia: ['mia', env.MIA_PASSWORD],
  nana: ['nana', env.NANA_PASSWORD],
};

const tokens = {};
async function login(who) {
  if (tokens[who]) return tokens[who];
  const [login_id, password] = ACCOUNTS[who];
  const res = await fetch(`${MM}/api/v4/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id, password }) });
  if (!res.ok) throw new Error(`login ${who}: ${res.status}`);
  return (tokens[who] = res.headers.get('token'));
}
async function api(who, path, init = {}) {
  const res = await fetch(`${MM}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await login(who)}`, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

let channelId;
const usernames = {};
async function roomId() {
  const me = await api('sam', '/api/v4/users/me');
  const team = await api('sam', `/api/v4/teams/name/${env.MATTERMOST_TEAM_NAME}`);
  const chans = await api('sam', `/api/v4/users/${me.id}/teams/${team.id}/channels`);
  return chans.find((c) => c.name === ROOM || c.display_name === ROOM).id;
}
async function nameOf(userId) {
  usernames[userId] ??= (await api('sam', `/api/v4/users/${userId}`)).username;
  return usernames[userId];
}
async function posts() {
  const data = await api('sam', `/api/v4/channels/${channelId}/posts?per_page=200`);
  return data.order.map((id) => data.posts[id]).sort((a, b) => a.create_at - b.create_at);
}
async function post(who, message) {
  return (await api(who, '/api/v4/posts', { method: 'POST', body: JSON.stringify({ channel_id: channelId, message }) })).id;
}
/** Wait until `sender` posts after `afterTs` (optionally with files / containing text). */
async function waitFor(sender, afterTs, { files = false, contains, timeout = 900 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout * 1000) {
    for (const p of await posts()) {
      if (p.create_at <= afterTs) continue;
      if (!(await nameOf(p.user_id)).includes(sender)) continue;
      if (files && !(p.metadata?.files?.length)) continue;
      if (contains && !p.message.toLowerCase().includes(contains.toLowerCase())) continue;
      return p;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`timed out waiting for ${sender}`);
}

const { chromium } = loadPlaywright();
const events = [];
let t0;
const mark = (name, extra = {}) => {
  const t = (Date.now() - t0) / 1000;
  events.push({ name, t, ...extra });
  console.log(`${t.toFixed(1).padStart(7)}s  ${name}`);
};

channelId = await roomId();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW, recordVideo: { dir: OUT, size: VIEW } });
const [samUser, samPass] = ACCOUNTS.sam;
await ctx.request.post(`${MM}/api/v4/users/login`, { data: { login_id: samUser, password: samPass }, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
const page = await ctx.newPage();
t0 = Date.now();
await page.goto(`${MM}/${env.MATTERMOST_TEAM_NAME}/channels/${ROOM}`);
await page.waitForTimeout(2000);
if (page.url().includes('/landing')) {
  await page.getByText('Remember my preference').click().catch(() => {});
  await page.getByText('View in Browser').click();
}
await page.waitForSelector('#post_textbox', { timeout: 60000 });
await page.locator('.announcement-bar__close, .announcement-bar button[aria-label*="lose"]').first().click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(1500);
mark('room_open');
await page.waitForTimeout(5000);

const T = () => Date.now();
let since = T();
await post('nana', 'Mia and Grandpa watched a turtle family at the lake last summer. She still talks about the littlest turtle 🐢');
mark('nana_memory');
await page.waitForTimeout(4000);
since = T();
await post('mia', '@capy-mochi can I have a story about a baby capybara who is scared of the big hot spring? with the little turtle from the lake please!!');
mark('mia_request');

const story = await waitFor('capy-mochi', since, { files: true });
mark('mochi_story', { post: story.id });
since = story.create_at;
const art = await waitFor('capy-pebble', since, { files: true });
mark('pebble_art', { post: art.id });
await page.waitForTimeout(6000);
await waitFor('capy-pebble', art.create_at, { contains: 'yuzu', timeout: 60 }).then(() => mark('pebble_ready')).catch(() => {});
await page.waitForTimeout(2000);

// Flip through Pebble's pages in Mattermost's preview.
try {
  const artPost = page.locator(`#post_${art.id}`);
  await artPost.scrollIntoViewIfNeeded();
  await artPost.getByText(/p1\.png/).first().click();
  mark('art_preview_start');
  await page.waitForTimeout(2600);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2200); }
  await page.keyboard.press('Escape');
  mark('art_preview_end');
} catch (e) {
  console.log('preview skipped:', e.message.split('\n')[0]);
  await page.keyboard.press('Escape').catch(() => {});
}
await page.waitForTimeout(1500);

since = T();
const gate = await post('mia', '@capy-yuzu read it to me now pleeease!!');
mark('mia_tries_yuzu');
await waitFor('capy-yuzu', since, { timeout: 60 }).then(() => mark('switch_blocks')).catch(() => mark('switch_blocks_timeout'));
await page.waitForTimeout(1500);
// Switch's answer is a threaded reply: open the thread to show it.
try {
  await page.locator(`#post_${gate}`).getByText(/\d+ repl/).first().click();
  mark('thread_open');
  await page.waitForTimeout(5000);
  await page.locator('#rhsCloseButton, button[aria-label*="Close"]').first().click({ timeout: 3000 }).catch(() => page.keyboard.press('Escape'));
  mark('thread_closed');
} catch (e) {
  console.log('thread skipped:', e.message.split('\n')[0]);
}
await page.waitForTimeout(2500);

// Sam approves, typed in the browser.
const box = page.locator('#post_textbox');
await box.click();
mark('sam_typing');
await box.pressSequentially('@capy-yuzu ', { delay: 70 });
await page.keyboard.press('Escape'); // close the mention autocomplete
await box.pressSequentially('This one is perfect for tonight. Please read it to Mia 💛', { delay: 45 });
since = T();
await page.keyboard.press('Enter');
mark('sam_approves');

const audio = await waitFor('capy-yuzu', since, { files: true });
mark('yuzu_reads', { post: audio.id });
const movie = await waitFor('capy-tofu', audio.create_at, { files: true, timeout: 1200 });
mark('tofu_video', { post: movie.id });
const book = await waitFor('capy-tofu', movie.create_at, { files: true, timeout: 300 }).catch(() => null);
if (book) mark('tofu_book', { post: book.id });
await page.waitForTimeout(2500);
// Play Tofu's story video right in the chat (muted: the edit uses its audio).
try {
  const moviePost = page.locator(`#post_${movie.id}`);
  await moviePost.scrollIntoViewIfNeeded();
  await moviePost.getByText(/story\.mp4/).first().click();
  await page.waitForTimeout(1500);
  await page.locator('video').first().evaluate((el) => { el.muted = true; el.currentTime = 0; return el.play(); }).catch(() => {});
  mark('video_open');
  await page.waitForTimeout(7000);
  await page.keyboard.press('Escape');
  mark('video_close');
} catch (e) {
  console.log('video skipped:', e.message.split('\n')[0]);
  await page.keyboard.press('Escape').catch(() => {});
}
await waitFor('capy-tofu', (book || movie).create_at, { contains: 'bible', timeout: 300 })
  .then((p) => mark('bible_updated', { post: p.id })).catch(() => mark('bible_timeout'));
await page.waitForTimeout(6000);

// The next night: Mochi remembers.
since = T();
await post('mia', '@capy-mochi can Bean and Little Turtle have another adventure tomorrow?');
mark('mia_next_night');
const remember = await waitFor('capy-mochi', since, { contains: 'bean', timeout: 300 }).catch(() => null);
mark(remember ? 'mochi_remembers' : 'mochi_remembers_timeout', remember ? { post: remember.id } : {});
await page.waitForTimeout(8000);
mark('end');

const video = page.video();
await ctx.close();
await browser.close();
const raw = await video.path();
renameSync(raw, join(OUT, 'raw.webm'));
writeFileSync(join(OUT, 'events.json'), JSON.stringify({ t0, view: VIEW, events }, null, 1));
console.log(`recording: ${join(OUT, 'raw.webm')}`);
