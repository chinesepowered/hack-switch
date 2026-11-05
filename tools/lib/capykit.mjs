// capykit: a tiny SVG kit for drawing cute capybaras and bedtime scenes.
// Every function returns an SVG fragment string. Characters are drawn in a
// local 220x160 frame (facing right) and placed with translate/scale.

const C = {
  fur: '#B97C4D',
  furDark: '#9A6239',
  furLight: '#D9A577',
  outline: '#6B4026',
  nose: '#4A2C1C',
  blush: '#F29C9C',
  eye: '#2B1A10',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function eyes(mood) {
  switch (mood) {
    case 'sleepy':
      return `<path d="M152 62 Q159 67 166 62" fill="none" stroke="${C.eye}" stroke-width="3.2" stroke-linecap="round"/>`;
    case 'giggle':
      return `<path d="M152 64 Q159 56 166 64" fill="none" stroke="${C.eye}" stroke-width="3.2" stroke-linecap="round"/>`;
    case 'surprised':
      return `<ellipse cx="159" cy="60" rx="6" ry="7" fill="${C.eye}"/><circle cx="161" cy="57.5" r="2.2" fill="#fff"/>`;
    case 'worried':
      return `<ellipse cx="159" cy="62" rx="4.5" ry="5" fill="${C.eye}"/><circle cx="160.5" cy="60.5" r="1.6" fill="#fff"/>` +
        `<path d="M151 52 L165 55" stroke="${C.outline}" stroke-width="2.6" stroke-linecap="round"/>`;
    default: // happy
      return `<ellipse cx="159" cy="61" rx="5" ry="5.6" fill="${C.eye}"/><circle cx="160.8" cy="59" r="1.9" fill="#fff"/>`;
  }
}

function mouth(mood) {
  if (mood === 'surprised') return `<ellipse cx="183" cy="86" rx="3.4" ry="4" fill="${C.nose}"/>`;
  if (mood === 'worried') return `<path d="M178 88 Q183 85 188 88" fill="none" stroke="${C.nose}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `<path d="M177 84 Q182 89 188 85" fill="none" stroke="${C.nose}" stroke-width="2.4" stroke-linecap="round"/>`;
}

const ACCESSORIES = {
  yuzu: () => `
    <g>
      <circle cx="140" cy="27" r="14" fill="#F8C630" stroke="#E0A11A" stroke-width="2.5"/>
      <circle cx="135" cy="22" r="3.5" fill="#FFE68A"/>
      <path d="M141 13 C147 5 156 6 158 9 C152 13 146 14 141 13 Z" fill="#6CBF4A" stroke="#4E9634" stroke-width="1.5"/>
    </g>`,
  nightcap: () => `
    <g>
      <path d="M112 44 C118 22 150 14 166 38 C150 34 128 36 112 44 Z" fill="#6D8BE8" stroke="#4A63B8" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M150 22 C138 8 120 6 104 18" fill="none" stroke="#6D8BE8" stroke-width="12" stroke-linecap="round"/>
      <circle cx="102" cy="20" r="8" fill="#FFFFFF" stroke="#D8DEF0" stroke-width="2"/>
      <path d="M111 45 C128 37 150 35 167 39" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
    </g>`,
  beret: () => `
    <g>
      <ellipse cx="140" cy="36" rx="30" ry="11" fill="#E2574C" stroke="#B83E35" stroke-width="2.5" transform="rotate(-10 140 36)"/>
      <path d="M140 25 q2 -7 6 -8" fill="none" stroke="#B83E35" stroke-width="3" stroke-linecap="round"/>
    </g>`,
  glasses: () => `
    <g fill="none" stroke="#3A3A48" stroke-width="2.6">
      <circle cx="159" cy="61" r="10"/>
      <path d="M149 59 L126 52"/>
    </g>`,
  pencil: () => `
    <g transform="rotate(-35 118 40)">
      <rect x="96" y="35" width="40" height="9" rx="2" fill="#F6C945" stroke="#C99A1E" stroke-width="1.6"/>
      <rect x="92" y="35" width="7" height="9" rx="2" fill="#F49AB0" stroke="#C97088" stroke-width="1.6"/>
      <path d="M136 35 L146 39.5 L136 44 Z" fill="#F3D9B1" stroke="#C99A1E" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M142.5 38 L146 39.5 L142.5 41 Z" fill="#3A3A48"/>
    </g>`,
  crown: () => `
    <path d="M118 40 L122 18 L133 32 L141 14 L149 32 L160 18 L163 40 Z" fill="#FFD25A" stroke="#D9A21E" stroke-width="2.5" stroke-linejoin="round"/>`,
  flower: () => `
    <g>
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="134" cy="30" rx="5" ry="8" fill="#FF9FC6" transform="rotate(${a} 134 38)"/>`).join('')}
      <circle cx="134" cy="38" r="4.5" fill="#FFD25A"/>
    </g>`,
  scarf: () => `
    <g>
      <path d="M128 96 C145 108 175 106 186 96 L188 106 C172 118 140 118 126 106 Z" fill="#7BC6A4" stroke="#4E9A78" stroke-width="2.2"/>
      <path d="M140 108 L134 132 L146 130 L150 110 Z" fill="#7BC6A4" stroke="#4E9A78" stroke-width="2.2" stroke-linejoin="round"/>
    </g>`,
};

const HELD = {
  book: () => `
    <g>
      <rect x="166" y="104" width="34" height="26" rx="3" fill="#5B8DEF" stroke="#3B66C4" stroke-width="2.2" transform="rotate(-8 183 117)"/>
      <path d="M171 110 L195 106" stroke="#DDE7FF" stroke-width="2" transform="rotate(-8 183 117)"/>
    </g>`,
  brush: () => `
    <g transform="rotate(25 186 112)">
      <rect x="182" y="96" width="6" height="32" rx="3" fill="#C98B4E" stroke="#8E5B2C" stroke-width="1.6"/>
      <path d="M181 96 C181 86 189 86 189 96 Z" fill="#7E57C2" stroke="#5A3C93" stroke-width="1.6"/>
    </g>`,
  lantern: () => `
    <g>
      <path d="M186 92 L186 100" stroke="#6B4026" stroke-width="2"/>
      <rect x="176" y="100" width="20" height="26" rx="6" fill="#FFE08A" stroke="#E0A11A" stroke-width="2.2"/>
      <circle cx="186" cy="113" r="5" fill="#FFB84D"/>
    </g>`,
  mic: () => `
    <g>
      <rect x="181" y="106" width="5" height="22" rx="2.5" fill="#55575F"/>
      <rect x="176" y="92" width="15" height="18" rx="7.5" fill="#8A8D98" stroke="#55575F" stroke-width="2"/>
    </g>`,
};

/**
 * A capybara. Options: x, y (feet centre), scale, facing ('right'|'left'),
 * mood ('happy'|'sleepy'|'giggle'|'surprised'|'worried'), hat (key of
 * ACCESSORIES), hold (key of HELD), fur (colour override), kid (rounder, smaller).
 */
export function capybara(o = {}) {
  const { x = 0, y = 0, scale = 1, facing = 'right', mood = 'happy', hat, hold, fur = C.fur, kid = false, swim = false } = o;
  const s = kid ? scale * 0.62 : scale;
  const flip = facing === 'left' ? -1 : 1;
  // local frame: feet line at y=148, centre x=118
  const tf = `translate(${x} ${y}) scale(${flip * s} ${s}) translate(-118 -148)`;
  const furDark = shade(fur, -0.16);
  const furLight = shade(fur, 0.22);
  const legs = swim ? '' : `
      <rect x="46" y="116" width="18" height="32" rx="8" fill="${furDark}" stroke="${C.outline}" stroke-width="2.5"/>
      <rect x="70" y="120" width="18" height="28" rx="8" fill="${furDark}" stroke="${C.outline}" stroke-width="2.5"/>
      <rect x="116" y="120" width="18" height="28" rx="8" fill="${furDark}" stroke="${C.outline}" stroke-width="2.5"/>
      <rect x="140" y="116" width="18" height="32" rx="8" fill="${furDark}" stroke="${C.outline}" stroke-width="2.5"/>`;
  const zzz = mood === 'sleepy' && !o.noZ
    ? `<g fill="#9FB4FF" font-family="Baloo 2, Nunito, Arial Rounded MT Bold, sans-serif" font-weight="800">
         <text x="184" y="34" font-size="16">z</text><text x="196" y="20" font-size="21">z</text><text x="211" y="4" font-size="26">Z</text></g>`
    : '';
  return `
  <g transform="${tf}">
    ${legs}
    <path d="M30 96 C30 58 70 44 112 46 C150 48 168 70 168 98 C168 128 140 138 100 138 C58 138 30 128 30 96 Z"
      fill="${fur}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M52 118 C70 132 120 134 150 120" fill="none" stroke="${furLight}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
    <path d="M60 70 q6 -5 12 0 M78 62 q6 -5 12 0 M96 58 q6 -5 12 0" fill="none" stroke="${furDark}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>
    <path d="M116 46 C130 36 170 34 188 50 C200 60 203 78 198 90 C193 102 176 106 158 104 C136 102 118 96 112 80 C108 66 108 54 116 46 Z"
      fill="${fur}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="128" cy="42" rx="10" ry="8" fill="${furDark}" stroke="${C.outline}" stroke-width="2.5"/>
    <ellipse cx="128" cy="43" rx="5" ry="4" fill="${shade(fur, -0.32)}"/>
    <ellipse cx="185" cy="83" rx="14" ry="13" fill="${furLight}" opacity="0.6"/>
    <path d="M188 64 C196 63 201 68 200 74 C197 79 189 79 185 75 C182 71 183 65 188 64 Z" fill="${C.nose}"/>
    ${eyes(mood)}
    <ellipse cx="166" cy="80" rx="9" ry="5.5" fill="${C.blush}" opacity="0.65"/>
    ${mouth(mood)}
    ${hat && ACCESSORIES[hat] ? ACCESSORIES[hat]() : ''}
    ${hold && HELD[hold] ? HELD[hold]() : ''}
    ${zzz}
  </g>`;
}

/** Lighten (amt>0) or darken (amt<0) a #rrggbb colour. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return '#' + ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// ---------- scenery ----------

const SKIES = {
  night: ['#1E2457', '#3B3F8C', '#6D6FB8'],
  dusk: ['#3B3F8C', '#C9739B', '#FFB38A'],
  day: ['#8FD3FF', '#BDE6FF', '#E8F7FF'],
  dawn: ['#FFC9A8', '#FFE3C2', '#FFF4E0'],
};

let uid = 0;
const id = (p) => `${p}${++uid}`;

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function sky(w, h, time = 'night') {
  const g = id('sky');
  const [a, b, c] = SKIES[time] || SKIES.night;
  return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#${g})"/>`;
}

export function stars(w, h, n = 40, seed = 7) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * 0.55, s = 1 + r() * 2.4;
    out += r() > 0.8
      ? `<path d="M${x} ${y - s * 2.6} L${x + s * 0.8} ${y - s * 0.8} L${x + s * 2.6} ${y} L${x + s * 0.8} ${y + s * 0.8} L${x} ${y + s * 2.6} L${x - s * 0.8} ${y + s * 0.8} L${x - s * 2.6} ${y} L${x - s * 0.8} ${y - s * 0.8} Z" fill="#FFF6C9"/>`
      : `<circle cx="${x}" cy="${y}" r="${s}" fill="#FFF6C9" opacity="${0.6 + r() * 0.4}"/>`;
  }
  return out;
}

export function moon({ x = 0, y = 0, r = 50, face = true } = {}) {
  const glow = id('glow');
  return `<defs><radialGradient id="${glow}"><stop offset="0.55" stop-color="#FFF3B0" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${x}" cy="${y}" r="${r * 2}" fill="url(#${glow})"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#FFF1A8" stroke="#F2D46B" stroke-width="3"/>
    <circle cx="${x - r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.14}" fill="#F4DE85"/>
    <circle cx="${x + r * 0.3}" cy="${y - r * 0.32}" r="${r * 0.1}" fill="#F4DE85"/>
    ${face ? `<path d="M${x - r * 0.32} ${y - r * 0.02} q${r * 0.1} ${r * 0.1} ${r * 0.2} 0 M${x + r * 0.12} ${y - r * 0.02} q${r * 0.1} ${r * 0.1} ${r * 0.2} 0" fill="none" stroke="#C9A440" stroke-width="${Math.max(2, r * 0.06)}" stroke-linecap="round"/>
      <path d="M${x - r * 0.12} ${y + r * 0.22} q${r * 0.12} ${r * 0.12} ${r * 0.24} 0" fill="none" stroke="#C9A440" stroke-width="${Math.max(2, r * 0.06)}" stroke-linecap="round"/>` : ''}`;
}

export function hills(w, h, { color = '#5E9E6E', y = 0.7, seed = 3 } = {}) {
  const r = rng(seed);
  const base = h * y;
  let d = `M0 ${h} L0 ${base}`;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x1 = (w / n) * (i + 0.5), x2 = (w / n) * (i + 1);
    d += ` Q${x1} ${base - 40 - r() * 70} ${x2} ${base - r() * 20}`;
  }
  d += ` L${w} ${h} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

export function ground(w, h, { color = '#7DBB7A', y = 0.78 } = {}) {
  return `<rect x="0" y="${h * y}" width="${w}" height="${h * (1 - y)}" fill="${color}"/>`;
}

export function onsen({ x = 0, y = 0, w = 500, h = 140, yuzus = 5, seed = 11, night = true } = {}) {
  const g = id('water');
  const r = rng(seed);
  let fruit = '';
  for (let i = 0; i < yuzus; i++) {
    const fx = x - w * 0.38 + r() * w * 0.76, fy = y - h * 0.12 + r() * h * 0.28, fr = 9 + r() * 5;
    fruit += `<circle cx="${fx}" cy="${fy}" r="${fr}" fill="#F8C630" stroke="#E0A11A" stroke-width="2"/><circle cx="${fx - fr * 0.35}" cy="${fy - fr * 0.35}" r="${fr * 0.25}" fill="#FFE68A"/>`;
  }
  const steam = [0, 1, 2, 3].map((i) => {
    const sx = x - w * 0.3 + i * w * 0.2;
    return `<path d="M${sx} ${y - h * 0.45} c-14 -18 14 -30 0 -50 c-14 -18 14 -30 0 -50" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.45"/>`;
  }).join('');
  return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${night ? '#7FC4E8' : '#9EE0F5'}"/><stop offset="1" stop-color="${night ? '#3E7FB8' : '#5BB3DD'}"/></linearGradient></defs>
    <ellipse cx="${x}" cy="${y + 10}" rx="${w / 2 + 22}" ry="${h / 2 + 16}" fill="#A7A39B" stroke="#7E7A72" stroke-width="3"/>
    ${[...Array(10)].map((_, i) => { const a = (Math.PI * 2 * i) / 10; return `<ellipse cx="${x + Math.cos(a) * (w / 2 + 14)}" cy="${y + 10 + Math.sin(a) * (h / 2 + 10)}" rx="26" ry="16" fill="#BDB8AE" stroke="#7E7A72" stroke-width="2.5"/>`; }).join('')}
    <ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="url(#${g})"/>
    <path d="M${x - w * 0.3} ${y - h * 0.05} q20 -8 40 0 M${x + w * 0.1} ${y + h * 0.12} q20 -8 40 0" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" opacity="0.5"/>
    ${fruit}
    ${steam}`;
}

export function tree({ x = 0, y = 0, scale = 1, color = '#4F9A62' } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="-12" y="-90" width="24" height="90" rx="8" fill="#8B5A3C"/>
    <circle cx="0" cy="-120" r="56" fill="${color}"/>
    <circle cx="-40" cy="-92" r="38" fill="${shade(color, -0.08)}"/>
    <circle cx="40" cy="-96" r="40" fill="${shade(color, 0.08)}"/>
  </g>`;
}

export function cloud({ x = 0, y = 0, scale = 1, color = '#FFFFFF', opacity = 0.9 } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${color}" opacity="${opacity}">
    <circle cx="-40" cy="0" r="28"/><circle cx="0" cy="-16" r="38"/><circle cx="42" cy="0" r="30"/><rect x="-68" y="0" width="140" height="28" rx="14"/>
  </g>`;
}

export function duckling({ x = 0, y = 0, scale = 1, facing = 'right' } = {}) {
  const f = facing === 'left' ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${f * scale} ${scale})">
    <ellipse cx="0" cy="-16" rx="22" ry="16" fill="#FFD84D" stroke="#D9A21E" stroke-width="2.5"/>
    <circle cx="16" cy="-36" r="13" fill="#FFD84D" stroke="#D9A21E" stroke-width="2.5"/>
    <path d="M27 -36 L38 -33 L27 -29 Z" fill="#FF9A3C"/>
    <circle cx="19" cy="-39" r="2.6" fill="#2B1A10"/>
    <path d="M-8 -20 q8 6 16 0" fill="none" stroke="#D9A21E" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}

export function turtle({ x = 0, y = 0, scale = 1, facing = 'right' } = {}) {
  const f = facing === 'left' ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${f * scale} ${scale})">
    <ellipse cx="34" cy="-14" rx="12" ry="10" fill="#8FCB7A" stroke="#5E9E4E" stroke-width="2.5"/>
    <circle cx="38" cy="-17" r="2.4" fill="#2B1A10"/>
    <rect x="-24" y="-8" width="12" height="10" rx="5" fill="#8FCB7A"/><rect x="10" y="-8" width="12" height="10" rx="5" fill="#8FCB7A"/>
    <path d="M-32 -6 C-30 -40 26 -40 28 -6 Z" fill="#6FAF5B" stroke="#4C8A3E" stroke-width="2.5"/>
    <path d="M-14 -30 L-2 -20 L10 -30 M-2 -20 L-2 -7" fill="none" stroke="#4C8A3E" stroke-width="2.2"/>
  </g>`;
}

export function bird({ x = 0, y = 0, scale = 1, color = '#7EC8F0', facing = 'right' } = {}) {
  const f = facing === 'left' ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${f * scale} ${scale})">
    <ellipse cx="0" cy="-14" rx="16" ry="13" fill="${color}" stroke="${shade(color, -0.3)}" stroke-width="2.2"/>
    <path d="M-4 -18 q-10 8 -2 12" fill="${shade(color, -0.12)}"/>
    <path d="M14 -16 L22 -13 L14 -10 Z" fill="#FF9A3C"/>
    <circle cx="8" cy="-18" r="2.2" fill="#2B1A10"/>
  </g>`;
}

export function flowers(w, h, { n = 14, y = 0.86, seed = 5 } = {}) {
  const r = rng(seed);
  const cols = ['#FF9FC6', '#FFD25A', '#FFFFFF', '#B9A6FF'];
  let out = '';
  for (let i = 0; i < n; i++) {
    const fx = r() * w, fy = h * y + r() * h * 0.1, c = cols[Math.floor(r() * cols.length)];
    out += `<g transform="translate(${fx} ${fy})"><path d="M0 0 L0 -16" stroke="#4E9634" stroke-width="2.5"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-22" rx="3.6" ry="6" fill="${c}" transform="rotate(${a} 0 -16)"/>`).join('')}<circle cx="0" cy="-16" r="3" fill="#FFB84D"/></g>`;
  }
  return out;
}

export function house({ x = 0, y = 0, scale = 1, color = '#F6D7B0', roof = '#D9725B', lit = true } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="-80" y="-110" width="160" height="110" rx="6" fill="${color}" stroke="#9C6B4A" stroke-width="3"/>
    <path d="M-100 -106 L0 -180 L100 -106 Z" fill="${roof}" stroke="#9C4A3A" stroke-width="3" stroke-linejoin="round"/>
    <rect x="-56" y="-80" width="40" height="36" rx="4" fill="${lit ? '#FFE08A' : '#9FB4D8'}" stroke="#9C6B4A" stroke-width="3"/>
    <rect x="16" y="-62" width="36" height="62" rx="4" fill="#B97C4D" stroke="#7E4E2C" stroke-width="3"/>
    <circle cx="44" cy="-30" r="3" fill="#FFD25A"/>
  </g>`;
}

export function bed({ x = 0, y = 0, scale = 1, quilt = '#F3A6B8' } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="-150" y="-70" width="300" height="56" rx="14" fill="${quilt}" stroke="#C47A8C" stroke-width="3"/>
    <rect x="-170" y="-120" width="22" height="120" rx="8" fill="#B97C4D" stroke="#7E4E2C" stroke-width="3"/>
    <rect x="148" y="-90" width="22" height="90" rx="8" fill="#B97C4D" stroke="#7E4E2C" stroke-width="3"/>
    <rect x="-140" y="-96" width="70" height="30" rx="12" fill="#FFFFFF" stroke="#D8DEF0" stroke-width="3"/>
    ${[...Array(5)].map((_, i) => `<circle cx="${-110 + i * 55}" cy="-44" r="6" fill="#FFFFFF" opacity="0.7"/>`).join('')}
  </g>`;
}

export function lilypad({ x = 0, y = 0, scale = 1 } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0 m-30 0 a30 14 0 1 0 60 0 a30 14 0 1 0 -60 0 Z" fill="#6CBF4A" stroke="#4E9634" stroke-width="2.5"/><path d="M0 0 L26 -6" stroke="#4E9634" stroke-width="2.5"/></g>`;
}

export function textLabel({ x = 0, y = 0, text = '', size = 36, color = '#FFFFFF', anchor = 'middle', weight = 800, stroke } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}"
    font-family="Baloo 2, Nunito, Arial Rounded MT Bold, Helvetica, sans-serif"${stroke ? ` stroke="${stroke}" stroke-width="${size / 9}" paint-order="stroke"` : ''}>${esc(text)}</text>`;
}

const ELEMENTS = { capybara, moon, onsen, tree, cloud, duckling, turtle, bird, house, bed, lilypad, text: textLabel };

/**
 * Build a full scene from a spec:
 *   { size: [w, h], sky: 'night'|'dusk'|'day'|'dawn', stars: true, hills: true,
 *     ground: true, flowers: true, elements: [{ type: 'capybara', ... }, ...] }
 * Elements are drawn in order (first = furthest back).
 */
export function scene(spec) {
  const [w, h] = spec.size || [1200, 800];
  const time = spec.sky || 'night';
  let body = sky(w, h, time);
  if (spec.stars ?? (time === 'night')) body += stars(w, h, spec.starCount || 50, spec.seed || 7);
  for (const el of (spec.elements || []).filter((e) => e.layer === 'sky')) body += draw(el);
  if (spec.hills ?? true) body += hills(w, h, { color: time === 'night' ? '#3E6E63' : '#6FB27E', y: 0.66, seed: spec.seed || 3 });
  if (spec.ground ?? true) body += ground(w, h, { color: time === 'night' ? '#4F8A6A' : '#86C77F', y: 0.76 });
  if (spec.flowers ?? false) body += flowers(w, h, { seed: spec.seed || 5 });
  for (const el of (spec.elements || []).filter((e) => e.layer !== 'sky')) body += draw(el);
  return svgDoc(w, h, body);
}

function draw(el) {
  const f = ELEMENTS[el.type];
  if (!f) throw new Error(`Unknown scene element "${el.type}". Known: ${Object.keys(ELEMENTS).join(', ')}`);
  return f(el);
}

export function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}

/** Round avatar: one capybara head-and-shoulders on a soft coloured disc. */
export function avatar({ bg = '#FFE7C7', ring = '#FFFFFF', ...capy } = {}) {
  const size = 512;
  const body = `
    <defs><clipPath id="disc"><circle cx="256" cy="256" r="248"/></clipPath></defs>
    <circle cx="256" cy="256" r="252" fill="${ring}"/>
    <g clip-path="url(#disc)">
      <circle cx="256" cy="256" r="248" fill="${bg}"/>
      ${capybara({ x: 134, y: 490, scale: 2.9, ...capy, noZ: true })}
    </g>`;
  return svgDoc(size, size, body);
}

export const CAST = {
  yuzu: { name: 'Yuzu', role: 'narrator', hat: 'yuzu', bg: '#D8F3E4', mood: 'happy' },
  mochi: { name: 'Mochi', role: 'writer', hat: 'pencil', bg: '#E9E1FF', mood: 'giggle' },
  pebble: { name: 'Pebble', role: 'artist', hat: 'beret', bg: '#FFE1D6', mood: 'happy' },
  tofu: { name: 'Tofu', role: 'librarian', hat: 'glasses', bg: '#DCEBFF', mood: 'happy', hold: 'book' },
};
