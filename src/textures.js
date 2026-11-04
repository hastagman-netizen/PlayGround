import * as THREE from 'three';

const TEX_CACHE = new Map();

function canvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function rnd(a = 0, b = 1) {
  return a + Math.random() * (b - a);
}

function grain(ctx, size, amount = 22, alpha = 0.35) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalAlpha = 1;
}

function stains(ctx, size, count, tone, maxR = 90) {
  for (let i = 0; i < count; i++) {
    const x = rnd(0, size);
    const y = rnd(0, size);
    const r = rnd(12, maxR);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tone},${rnd(0.04, 0.16)})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cracks(ctx, size, count, color = 'rgba(8,10,12,0.45)') {
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    let x = rnd(0, size);
    let y = rnd(0, size);
    let a = rnd(0, Math.PI * 2);
    ctx.lineWidth = rnd(0.5, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = Math.floor(rnd(3, 9));
    for (let s = 0; s < segs; s++) {
      a += rnd(-0.9, 0.9);
      const len = rnd(4, 26);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function scratchLines(ctx, size, count, color, maxLen = 80) {
  for (let i = 0; i < count; i++) {
    const x = rnd(0, size);
    const y = rnd(0, size);
    const a = rnd(0, Math.PI * 2);
    const len = rnd(4, maxLen);
    ctx.strokeStyle = `rgba(${color},${rnd(0.04, 0.2)})`;
    ctx.lineWidth = rnd(0.4, 1.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

function toTexture(c, { repeat = 1, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

export function concreteTextures(seed = 0) {
  const key = `concrete-${seed}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = seed % 2 ? '#5b6064' : '#54595d';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, 34);
  stains(ctx, size, 26, '22,24,26', 120);
  stains(ctx, size, 10, '140,132,108', 60);
  cracks(ctx, size, 26);
  scratchLines(ctx, size, 70, '220,228,232', 44);
  // aggregate speckles
  for (let i = 0; i < 2200; i++) {
    const l = rnd(30, 120);
    ctx.fillStyle = `rgba(${l},${l},${l},${rnd(0.08, 0.3)})`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(0.6, 2.2), rnd(0.6, 2.2));
  }
  // form-tie holes
  for (let x = 64; x < size; x += 128) {
    for (let y = 64; y < size; y += 128) {
      ctx.fillStyle = 'rgba(18,20,22,0.55)';
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,150,150,0.15)';
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const rc = canvas(256);
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#9a9a9a';
  rctx.fillRect(0, 0, 256, 256);
  grain(rctx, 256, 50);
  stains(rctx, 256, 18, '30,30,30', 80);
  cracks(rctx, 256, 8, 'rgba(20,20,20,0.5)');
  const map = toTexture(c, { repeat: 1 });
  const rough = toTexture(rc, { repeat: 1, srgb: false });
  const result = { map, rough, bump: map.clone() };
  result.bump.colorSpace = THREE.NoColorSpace;
  result.bump.needsUpdate = true;
  TEX_CACHE.set(key, result);
  return result;
}

export function floorTextures() {
  if (TEX_CACHE.has('floor')) return TEX_CACHE.get('floor');
  const size = 1024;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3f4448';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, 30);
  // concrete slabs 4x4
  ctx.strokeStyle = 'rgba(10,12,14,0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(150,158,162,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size + 2;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  stains(ctx, size, 44, '16,18,20', 160);
  stains(ctx, size, 12, '96,82,52', 70);
  cracks(ctx, size, 30);
  scratchLines(ctx, size, 140, '210,216,220', 100);
  // painted lane markings, worn
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = 'rgba(190,150,58,0.5)';
  ctx.lineWidth = 12;
  ctx.setLineDash([80, 50]);
  ctx.beginPath(); ctx.arc(0, 0, 285, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,150,58,0.23)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 306, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(205,170,80,0.4)';
  ctx.font = '700 58px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H-07', 0, 150);
  ctx.font = '600 25px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(205,170,80,0.3)';
  ctx.fillText('BLACKSITE // AUTHORIZED PERSONNEL', 0, 184);
  // direction chevrons
  for (let i = 0; i < 3; i++) {
    const y = -120 + i * 46;
    ctx.strokeStyle = 'rgba(140,150,155,0.28)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-24, y + 14); ctx.lineTo(0, y - 8); ctx.lineTo(24, y + 14);
    ctx.stroke();
  }
  ctx.restore();
  // hazard strip near one edge
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = x % 128 === 0 ? 'rgba(178,132,38,0.38)' : 'rgba(22,24,26,0.48)';
    ctx.save();
    ctx.translate(x, size - 34);
    ctx.rotate(-0.5);
    ctx.fillRect(0, 0, 34, 64);
    ctx.restore();
  }
  grain(ctx, size, 16);
  const rc = canvas(512);
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#6f6f6f';
  rctx.fillRect(0, 0, 512, 512);
  grain(rctx, 512, 60);
  stains(rctx, 512, 30, '15,15,15', 130);
  const map = toTexture(c, { repeat: 1 });
  const rough = toTexture(rc, { repeat: 1, srgb: false });
  TEX_CACHE.set('floor', { map, rough });
  return TEX_CACHE.get('floor');
}

export function metalTextures() {
  if (TEX_CACHE.has('metal')) return TEX_CACHE.get('metal');
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#464d53';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, 24);
  // brushed streaks
  for (let i = 0; i < 800; i++) {
    ctx.strokeStyle = `rgba(200,210,216,${rnd(0.015, 0.07)})`;
    ctx.lineWidth = rnd(0.4, 1.4);
    const y = rnd(0, size);
    ctx.beginPath();
    ctx.moveTo(rnd(0, size * 0.4), y);
    ctx.lineTo(rnd(size * 0.6, size), y + rnd(-1, 1));
    ctx.stroke();
  }
  // panel seams
  ctx.strokeStyle = 'rgba(12,15,18,0.8)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size;
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(170,180,186,0.13)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size + 3;
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
  }
  // rivets
  for (let x = 20; x < size; x += 64) {
    for (let y = 20; y < size; y += 64) {
      ctx.fillStyle = 'rgba(195,205,210,0.28)';
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(8,10,12,0.4)';
      ctx.beginPath(); ctx.arc(x + 0.8, y + 0.8, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  scratchLines(ctx, size, 90, '215,222,228', 70);
  stains(ctx, size, 18, '10,12,14', 90);
  const rc = canvas(256);
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#6d6d6d';
  rctx.fillRect(0, 0, 256, 256);
  grain(rctx, 256, 45);
  rctx.fillStyle = 'rgba(30,30,30,0.35)';
  rctx.fillRect(115, 115, 30, 30);
  const map = toTexture(c);
  const rough = toTexture(rc, { srgb: false });
  const result = { map, rough };
  TEX_CACHE.set('metal', result);
  return result;
}

export function crateTextures() {
  if (TEX_CACHE.has('crate')) return TEX_CACHE.get('crate');
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#555d61';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, 26);
  // outer frame
  ctx.strokeStyle = '#252a2e';
  ctx.lineWidth = 34;
  ctx.strokeRect(17, 17, size - 34, size - 34);
  ctx.strokeStyle = 'rgba(160,170,176,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, size - 68, size - 68);
  // corner plates
  for (const [x, y] of [[0, 0], [size - 90, 0], [0, size - 90], [size - 90, size - 90]]) {
    ctx.fillStyle = '#3a4145';
    ctx.fillRect(x, y, 90, 90);
    ctx.strokeStyle = 'rgba(12,14,16,0.6)';
    ctx.strokeRect(x + 4, y + 4, 82, 82);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = 'rgba(180,190,194,0.3)';
        ctx.beginPath(); ctx.arc(x + 18 + i * 26, y + 18 + j * 26, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // center panel with stencil
  ctx.fillStyle = 'rgba(20,24,27,0.29)';
  ctx.fillRect(120, 160, 272, 192);
  ctx.strokeStyle = 'rgba(190,145,50,0.6)';
  ctx.lineWidth = 4;
  ctx.strokeRect(120, 160, 272, 192);
  ctx.fillStyle = 'rgba(210,170,80,0.77)';
  ctx.font = '700 66px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUPPLY', 256, 230);
  ctx.font = '600 24px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(190,200,205,0.55)';
  ctx.fillText('SECTOR 07 // CLASS C', 256, 270);
  ctx.fillStyle = 'rgba(190,145,50,0.7)';
  ctx.fillRect(214, 292, 84, 7);
  ctx.fillRect(232, 306, 48, 4);
  ctx.strokeStyle = 'rgba(190,145,50,0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(142, 342); ctx.lineTo(158, 326); ctx.lineTo(174, 342); ctx.stroke();
  scratchLines(ctx, size, 120, '220,228,232', 80);
  stains(ctx, size, 16, '8,10,12', 70);
  // hazard stripe bottom
  for (let x = 40; x < size - 40; x += 44) {
    if ((x / 44) % 2 < 1) {
      ctx.fillStyle = 'rgba(186,140,42,0.65)';
      ctx.save(); ctx.translate(x, size - 62); ctx.rotate(-0.55); ctx.fillRect(0, 0, 24, 40); ctx.restore();
    }
  }
  grain(ctx, size, 18);
  const map = toTexture(c);
  TEX_CACHE.set('crate', { map });
  return TEX_CACHE.get('crate');
}

export function hazardTexture() {
  if (TEX_CACHE.has('hazard')) return TEX_CACHE.get('hazard');
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#171a1c';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  for (let i = -size; i < size * 2; i += 56) {
    ctx.fillStyle = '#b98a2c';
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 28, 0); ctx.lineTo(i + 28 - size, size); ctx.lineTo(i - size, size);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  grain(ctx, size, 28);
  const map = toTexture(c);
  TEX_CACHE.set('hazard', { map });
  return TEX_CACHE.get('hazard');
}

export function signTexture(title, sub = '', accent = '#d9a54a') {
  const key = `sign-${title}-${sub}-${accent}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const w = 512, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b0f12';
  ctx.fillRect(0, 0, w, h);
  grain(ctx, 128, 12);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 7, h);
  ctx.fillRect(w - 7, 0, 7, h);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = '700 56px Rajdhani, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 30, sub ? 50 : 66);
  if (sub) {
    ctx.fillStyle = accent;
    ctx.font = '400 24px "Share Tech Mono", monospace';
    ctx.fillText(sub, 32, 94);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  TEX_CACHE.set(key, t);
  return t;
}

export function glowTexture(color = 'rgba(255,180,90,1)') {
  const key = `glow-${color}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const c = canvas(128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.16, color);
  g.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.19)'));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE.set(key, t);
  return t;
}

export function softParticleTexture() {
  if (TEX_CACHE.has('soft')) return TEX_CACHE.get('soft');
  const c = canvas(64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.32)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE.set('soft', t);
  return t;
}

export function bulletHoleTexture() {
  if (TEX_CACHE.has('hole')) return TEX_CACHE.get('hole');
  const c = canvas(64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(5,6,7,0.95)');
  g.addColorStop(0.32, 'rgba(12,14,16,0.8)');
  g.addColorStop(0.55, 'rgba(40,44,48,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // crack rays
  ctx.strokeStyle = 'rgba(100,105,110,0.24)';
  for (let i = 0; i < 8; i++) {
    const a = rnd(0, Math.PI * 2);
    ctx.lineWidth = rnd(0.5, 1.4);
    ctx.beginPath();
    ctx.moveTo(32 + Math.cos(a) * 5, 32 + Math.sin(a) * 5);
    ctx.lineTo(32 + Math.cos(a) * rnd(12, 28), 32 + Math.sin(a) * rnd(12, 28));
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE.set('hole', t);
  return t;
}

export function screenNoiseTexture() {
  const c = canvas(256);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

export function windowTexture(seed = 0) {
  const key = `windows-${seed}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const c = canvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#070a0e';
  ctx.fillRect(0, 0, 256, 256);
  const cols = 16, rows = 24;
  const colors = ['rgba(210,160,80,', 'rgba(120,180,190,', 'rgba(155,170,185,'];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() < 0.24) {
        const col = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = col + rnd(0.25, 0.9) + ')';
        ctx.fillRect(4 + x * 15.5, 4 + y * 10.3, rnd(3, 9), 3);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE.set(key, t);
  return t;
}
