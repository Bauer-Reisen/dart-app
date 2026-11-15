// Erzeugt die App-Icons (Dartscheibe) als PNG ohne Zusatzpakete.
// Aufruf: node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x11, 0x11, 0x11];
const HELL = [0xf2, 0xe6, 0xc8];
const DUNKEL = [0x22, 0x22, 0x22];
const ROT = [0xd6, 0x3a, 0x2f];
const GRUEN = [0x1f, 0x8a, 0x4c];
const GELB = [0xff, 0xd2, 0x3f];

// Zeichnung im 512er-Raster, Mitte 256/256. Rückgabe: Farbe oder null (= Hintergrund)
function farbe(x, y) {
  const dx = x - 256, dy = y - 256;
  const r = Math.hypot(dx, dy);
  const seg = Math.floor((((Math.atan2(dx, -dy) * 180) / Math.PI + 369) % 360) / 18);
  const gerade = seg % 2 === 0;
  if (r <= 18) return ROT;
  if (r <= 38) return GRUEN;
  if (r <= 120) return gerade ? DUNKEL : HELL;
  if (r <= 146) return gerade ? ROT : GRUEN;
  if (r <= 196) return gerade ? DUNKEL : HELL;
  if (r <= 222) return gerade ? ROT : GRUEN;
  if (r <= 236) return DUNKEL;
  if (r <= 244) return GELB;
  return null;
}
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, rand = 0) {
  const SS = 3;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const scale = (512 + 2 * rand) / size;
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) * scale - rand;
        const y = (py + (sy + 0.5) / SS) * scale - rand;
        const f = farbe(x, y) || BG;
        r += f[0]; g += f[1]; b += f[2];
      }
      const o = py * (size * 3 + 1) + 1 + px * 3;
      raw[o] = r / (SS * SS); raw[o + 1] = g / (SS * SS); raw[o + 2] = b / (SS * SS);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icons/apple-touch-icon.png', png(180, 30));
writeFileSync('public/icons/icon-192.png', png(192, 20));
writeFileSync('public/icons/icon-512.png', png(512, 40));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 110));
console.log('Icons erstellt.');
