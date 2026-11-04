// Fully procedural audio: no external samples.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.noise = null;
    this.started = false;
    this.volume = 0.8;
    this.heartbeatTimer = 0;
    this.tension = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.5;
    this.ambientGain.connect(this.master);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.38;
    this.musicGain.connect(this.master);
    this.noise = this.makeNoise(2.4);
    this.startAmbience();
    this.started = true;
  }

  makeNoise(seconds = 2) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2 + white * 0.32;
      }
    }
    return buffer;
  }

  noiseSource(duration, loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    if (!loop) src.start(this.ctx.currentTime, Math.random() * 1.5, duration);
    return src;
  }

  env(node, peak, attack, decay, when = 0) {
    const t = this.ctx.currentTime + when;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    node.connect(g);
    return g;
  }

  tone({ type = 'sine', freq = 220, endFreq = null, dur = 0.2, gain = 0.2, when = 0, dest = null, slide = 0.25 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur * slide + 0.01);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  burst({ dur = 0.2, gain = 0.2, freq = 800, q = 0.8, type = 'lowpass', when = 0, dest = null, sweep = true }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = this.noiseSource(dur + 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t, Math.random() * 1.2, dur + 0.1);
    src.stop(t + dur + 0.1);
  }

  startAmbience() {
    const ctx = this.ctx;
    // Rain bed
    const rain = this.noiseSource(2.4, true);
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.value = 900;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.value = 6200;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.075;
    rain.connect(rainHp); rainHp.connect(rainLp); rainLp.connect(rainGain); rainGain.connect(this.ambientGain);
    rain.start();
    // Wind
    const wind = this.noiseSource(2.4, true);
    const windLp = ctx.createBiquadFilter();
    windLp.type = 'lowpass';
    windLp.frequency.value = 260;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.16;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.09;
    lfo.connect(lfoGain); lfoGain.connect(windGain.gain);
    wind.connect(windLp); windLp.connect(windGain); windGain.connect(this.ambientGain);
    wind.start(); lfo.start();
    // Low facility drone
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    droneGain.connect(this.ambientGain);
    [41.2, 55, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = i * 4 - 5;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.22 : 0.6;
      o.connect(g); g.connect(droneGain);
      o.start();
    });
    // distant electrical hum
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 120;
    const humLp = ctx.createBiquadFilter();
    humLp.type = 'lowpass';
    humLp.frequency.value = 240;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.006;
    hum.connect(humLp); humLp.connect(humGain); humGain.connect(this.ambientGain);
    hum.start();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setTension(v) {
    if (!this.ctx) return;
    this.tension = v;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(0.28 + v * 0.32, this.ctx.currentTime, 0.5);
  }

  shot(kind = 'rifle') {
    if (!this.ctx) return;
    if (kind === 'rifle') {
      this.burst({ dur: 0.16, gain: 0.5, freq: 3400, q: 0.7, type: 'highpass' });
      this.burst({ dur: 0.11, gain: 0.34, freq: 1200, q: 1.1, type: 'bandpass' });
      this.tone({ type: 'triangle', freq: 150, endFreq: 48, dur: 0.16, gain: 0.55 });
      this.tone({ type: 'square', freq: 72, endFreq: 38, dur: 0.09, gain: 0.12 });
      this.burst({ dur: 0.45, gain: 0.08, freq: 700, q: 0.4 });
    } else if (kind === 'shotgun') {
      this.burst({ dur: 0.32, gain: 0.65, freq: 2200, q: 0.5 });
      this.tone({ type: 'sine', freq: 110, endFreq: 32, dur: 0.3, gain: 0.8 });
      this.tone({ type: 'triangle', freq: 190, endFreq: 50, dur: 0.2, gain: 0.3 });
      this.burst({ dur: 0.7, gain: 0.12, freq: 520, q: 0.4 });
    } else if (kind === 'pistol') {
      this.burst({ dur: 0.1, gain: 0.46, freq: 4200, q: 0.8, type: 'highpass' });
      this.burst({ dur: 0.13, gain: 0.28, freq: 1700, q: 1.2, type: 'bandpass' });
      this.tone({ type: 'triangle', freq: 210, endFreq: 60, dur: 0.12, gain: 0.42 });
    } else if (kind === 'enemy') {
      this.burst({ dur: 0.12, gain: 0.15, freq: 2400, q: 3 });
      this.tone({ type: 'sawtooth', freq: 520, endFreq: 160, dur: 0.12, gain: 0.08 });
    } else if (kind === 'charge') {
      this.tone({ type: 'sawtooth', freq: 180, endFreq: 900, dur: 0.5, gain: 0.07, slide: 0.9 });
    }
  }

  dryFire() {
    if (!this.ctx) return;
    this.burst({ dur: 0.04, gain: 0.18, freq: 2600, q: 2, type: 'bandpass' });
    this.tone({ type: 'square', freq: 1200, endFreq: 400, dur: 0.03, gain: 0.04 });
  }

  reload(duration = 1.8) {
    if (!this.ctx) return;
    const beats = [0.02, duration * 0.22, duration * 0.55, duration * 0.8];
    beats.forEach((b, i) => {
      this.burst({ dur: 0.055, gain: i === 3 ? 0.24 : 0.16, freq: 1800 + i * 400, q: 2.4, type: 'bandpass', when: b });
      this.tone({ type: 'square', freq: 320 + i * 90, endFreq: 120, dur: 0.05, gain: 0.025, when: b });
    });
  }

  step(sprint = false) {
    if (!this.ctx) return;
    this.burst({ dur: 0.09, gain: sprint ? 0.2 : 0.12, freq: 380, q: 0.8 });
    this.tone({ type: 'sine', freq: 90, endFreq: 42, dur: 0.08, gain: 0.08 });
  }

  jump() {
    if (!this.ctx) return;
    this.burst({ dur: 0.12, gain: 0.1, freq: 500, q: 0.8 });
  }

  land() {
    if (!this.ctx) return;
    this.burst({ dur: 0.18, gain: 0.24, freq: 300, q: 0.6 });
    this.tone({ type: 'sine', freq: 80, endFreq: 35, dur: 0.15, gain: 0.16 });
  }

  hitmarker(headshot = false, kill = false) {
    if (!this.ctx) return;
    this.tone({ type: 'square', freq: headshot ? 1750 : 1350, endFreq: headshot ? 1300 : 980, dur: 0.045, gain: 0.06 });
    if (kill) this.tone({ type: 'sine', freq: 880, endFreq: 440, dur: 0.16, gain: 0.05, when: 0.03 });
    if (headshot) this.tone({ type: 'sine', freq: 2600, endFreq: 1900, dur: 0.09, gain: 0.035 });
  }

  impact() {
    if (!this.ctx) return;
    this.burst({ dur: 0.06, gain: 0.1, freq: 3200, q: 1.2, type: 'bandpass' });
  }

  explosion(distance = 0) {
    if (!this.ctx) return;
    const att = Math.max(0.15, 1 - distance / 60);
    this.burst({ dur: 1.1, gain: 0.6 * att, freq: 900, q: 0.6 });
    this.tone({ type: 'sine', freq: 90, endFreq: 22, dur: 0.9, gain: 0.55 * att });
    this.burst({ dur: 0.3, gain: 0.35 * att, freq: 4000, q: 0.7, type: 'highpass' });
    this.tone({ type: 'sawtooth', freq: 160, endFreq: 40, dur: 0.3, gain: 0.12 * att });
  }

  damage() {
    if (!this.ctx) return;
    this.burst({ dur: 0.25, gain: 0.3, freq: 500, q: 0.6 });
    this.tone({ type: 'sine', freq: 65, endFreq: 30, dur: 0.28, gain: 0.3 });
    this.tone({ type: 'sawtooth', freq: 240, endFreq: 90, dur: 0.15, gain: 0.04 });
  }

  heartbeat() {
    if (!this.ctx) return;
    this.tone({ type: 'sine', freq: 58, endFreq: 38, dur: 0.2, gain: 0.18 });
    this.tone({ type: 'sine', freq: 52, endFreq: 34, dur: 0.18, gain: 0.12, when: 0.2 });
  }

  pickup() {
    if (!this.ctx) return;
    [660, 880, 1180].forEach((f, i) => this.tone({ type: 'sine', freq: f, endFreq: f * 1.04, dur: 0.11, gain: 0.05, when: i * 0.05 }));
  }

  enemyAlert() {
    if (!this.ctx) return;
    this.tone({ type: 'square', freq: 420, endFreq: 720, dur: 0.09, gain: 0.03 });
    this.tone({ type: 'square', freq: 680, endFreq: 420, dur: 0.12, gain: 0.025, when: 0.09 });
  }

  waveStart(n = 1) {
    if (!this.ctx) return;
    this.tone({ type: 'sawtooth', freq: 55, endFreq: 34, dur: 1.2, gain: 0.2 });
    this.tone({ type: 'sine', freq: 110, endFreq: 55, dur: 1, gain: 0.12 });
    for (let i = 0; i < 3; i++) {
      this.tone({ type: 'square', freq: 880 - i * 80, endFreq: 420, dur: 0.2, gain: 0.03, when: 0.5 + i * 0.18 });
    }
    this.burst({ dur: 0.9, gain: 0.05, freq: 300, q: 0.5 });
  }

  waveClear() {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) => this.tone({ type: 'triangle', freq: f, endFreq: f, dur: 0.28, gain: 0.06, when: i * 0.11 }));
  }

  victory() {
    if (!this.ctx) return;
    [220, 277, 330, 440, 554].forEach((f, i) => this.tone({ type: 'sawtooth', freq: f, endFreq: f, dur: 0.7, gain: 0.05, when: i * 0.12 }));
    this.tone({ type: 'sine', freq: 110, endFreq: 55, dur: 2, gain: 0.16 });
  }

  defeat() {
    if (!this.ctx) return;
    [220, 185, 147, 110].forEach((f, i) => this.tone({ type: 'sawtooth', freq: f, endFreq: f * 0.97, dur: 0.6, gain: 0.06, when: i * 0.18 }));
    this.tone({ type: 'sine', freq: 55, endFreq: 26, dur: 2.2, gain: 0.18 });
  }

  ui(kind = 'click') {
    if (!this.ctx) return;
    if (kind === 'hover') {
      this.tone({ type: 'sine', freq: 1200, endFreq: 1500, dur: 0.03, gain: 0.015 });
    } else if (kind === 'click') {
      this.tone({ type: 'square', freq: 740, endFreq: 520, dur: 0.05, gain: 0.03 });
      this.burst({ dur: 0.03, gain: 0.03, freq: 2600, q: 1 });
    } else if (kind === 'back') {
      this.tone({ type: 'square', freq: 420, endFreq: 260, dur: 0.07, gain: 0.03 });
    }
  }

  update(dt, state) {
    if (!this.ctx) return;
    if (state && state.heartbeat) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeat();
        this.heartbeatTimer = 0.85;
      }
    } else {
      this.heartbeatTimer = 0;
    }
  }
}
