// Narration with ElevenLabs: one request per page, with word timings, then
// joined into a single MP3 with a short pause between pages.
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const run = promisify(execFile);

// Jessica: a premade, young, warm American female voice every ElevenLabs
// account can use. Override with CAPY_VOICE_ID.
export const DEFAULT_VOICE = 'cgSgspJ2msm6clMCkdW9';
const MODEL = process.env.CAPY_TTS_MODEL || 'eleven_multilingual_v2';
const PAUSE_SECONDS = 0.7;

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set. Put it in .env (never commit it).');
  return key;
}

async function speak(text, { voice, previous, next }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      previous_text: previous || undefined,
      next_text: next || undefined,
      // Calm and warm for bedtime: steady delivery, a little expressiveness.
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.92 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return { audio: Buffer.from(body.audio_base64, 'base64'), alignment: body.alignment };
}

/** Group character timings into word timings: [{ word, start, end }]. */
export function wordsFrom(alignment, offset = 0) {
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = alignment;
  const words = [];
  let cur = null;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) {
      if (cur) words.push(cur);
      cur = null;
    } else if (!cur) {
      cur = { word: ch[i], start: st[i] + offset, end: en[i] + offset };
    } else {
      cur.word += ch[i];
      cur.end = en[i] + offset;
    }
  }
  if (cur) words.push(cur);
  return words;
}

async function duration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(stdout.trim());
}

/**
 * Narrate pages of text into `outMp3`. Returns timings:
 *   { voice, model, pages: [{ start, end, words: [{word,start,end}] }], duration }
 */
export async function narratePages(pages, outMp3, { voice = process.env.CAPY_VOICE_ID || DEFAULT_VOICE } = {}) {
  const work = join(tmpdir(), `capy-narrate-${process.pid}-${Date.now()}`);
  await mkdir(work, { recursive: true });
  await mkdir(dirname(outMp3), { recursive: true });
  const silence = join(work, 'pause.mp3');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(PAUSE_SECONDS), '-c:a', 'libmp3lame', '-b:a', '128k', silence]);

  const parts = [];
  const timings = [];
  let t = 0;
  for (let i = 0; i < pages.length; i++) {
    const { audio, alignment } = await speak(pages[i], { voice, previous: pages[i - 1], next: pages[i + 1] });
    const file = join(work, `page-${String(i).padStart(2, '0')}.mp3`);
    await writeFile(file, audio);
    const d = await duration(file);
    timings.push({ start: t, end: t + d, words: wordsFrom(alignment, t) });
    parts.push(file);
    t += d;
    if (i < pages.length - 1) { parts.push(silence); t += PAUSE_SECONDS; }
  }
  const list = join(work, 'list.txt');
  await writeFile(list, parts.map((p) => `file '${p}'`).join('\n'));
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'libmp3lame', '-b:a', '128k', outMp3]);
  await rm(work, { recursive: true, force: true });
  return { voice, model: MODEL, pages: timings, duration: await duration(outMp3) };
}
