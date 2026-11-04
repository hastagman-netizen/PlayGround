import * as THREE from 'three';
import { glowTexture, softParticleTexture, bulletHoleTexture } from './textures.js';

const PARTICLE_VERT = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (280.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;
const PARTICLE_FRAG = `
  uniform sampler2D uTex;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uTex, gl_PointCoord);
    gl_FragColor = vec4(vColor, tex.a * vAlpha);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

export class Effects {
  constructor(scene, camera, world, audio) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.audio = audio;
    this.time = 0;
    this._initParticles();
    this._initTracers();
    this._initSmoke();
    this._initRings();
    this._initLights();
    this._initDecals();
  }

  _initParticles() {
    this.maxParticles = 900;
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(this.maxParticles * 3);
    this.pCol = new Float32Array(this.maxParticles * 3);
    this.pSize = new Float32Array(this.maxParticles);
    this.pAlpha = new Float32Array(this.maxParticles);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.pAlpha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: softParticleTexture() } },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.particles = Array.from({ length: this.maxParticles }, () => ({
      life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 9, drag: 0.98, size: 0.05,
    }));
    this.pCursor = 0;
  }

  _initTracers() {
    this.tracers = [];
    for (let i = 0; i < 28; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffcf8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      this.scene.add(line);
      this.tracers.push({ line, life: 0, maxLife: 1 });
    }
    this.tracerCursor = 0;
  }

  _initSmoke() {
    this.smoke = [];
    const tex = softParticleTexture();
    for (let i = 0; i < 34; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex, color: 0x4f5a60, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      s.scale.set(1, 1, 1);
      this.scene.add(s);
      this.smoke.push({ sprite: s, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grow: 1 });
    }
    this.smokeCursor = 0;
  }

  _initRings() {
    this.rings = [];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffc06a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, life: 0, maxLife: 0.5, maxScale: 4 });
    }
    this.ringCursor = 0;
  }

  _initLights() {
    this.flashLights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffb060, 0, 18, 2);
      l.visible = false;
      this.scene.add(l);
      this.flashLights.push({ light: l, life: 0, maxLife: 0.1, maxIntensity: 30 });
    }
    this.lightCursor = 0;
  }

  _initDecals() {
    const geo = new THREE.PlaneGeometry(0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({
      map: bulletHoleTexture(), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, opacity: 0.95,
    });
    this.decals = [];
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 2;
      this.scene.add(m);
      this.decals.push(m);
    }
    this.decalCursor = 0;
  }

  spawnParticle(x, y, z, vx, vy, vz, color, size, life, grav = 9, drag = 0.98) {
    const i = this.pCursor;
    this.pCursor = (this.pCursor + 1) % this.maxParticles;
    const p = this.particles[i];
    p.life = life; p.maxLife = life; p.vx = vx; p.vy = vy; p.vz = vz;
    p.grav = grav; p.drag = drag; p.size = size;
    this.pPos[i * 3] = x; this.pPos[i * 3 + 1] = y; this.pPos[i * 3 + 2] = z;
    this.pCol[i * 3] = color.r; this.pCol[i * 3 + 1] = color.g; this.pCol[i * 3 + 2] = color.b;
    this.pSize[i] = size;
    this.pAlpha[i] = 1;
  }

  burst(point, normal, color, count = 10, speed = 5, size = 0.055, life = 0.6, grav = 10) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
      ).normalize();
      if (normal) dir.add(normal.clone().multiplyScalar(1.1)).normalize();
      const sp = speed * (0.25 + Math.random() * 0.9);
      this.spawnParticle(
        point.x, point.y, point.z,
        dir.x * sp, dir.y * sp, dir.z * sp,
        c, size * (0.5 + Math.random()), life * (0.5 + Math.random()), grav,
      );
    }
  }

  tracer(from, to, color = 0xffcf8a, life = 0.06) {
    const t = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % this.tracers.length;
    const arr = t.line.geometry.attributes.position.array;
    arr[0] = from.x; arr[1] = from.y; arr[2] = from.z;
    arr[3] = to.x; arr[4] = to.y; arr[5] = to.z;
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.material.color.set(color);
    t.line.material.opacity = 0.8;
    t.line.visible = true;
    t.life = life; t.maxLife = life;
  }

  flashLight(pos, color = 0xffb060, intensity = 22, life = 0.08) {
    const f = this.flashLights[this.lightCursor];
    this.lightCursor = (this.lightCursor + 1) % this.flashLights.length;
    f.light.position.copy(pos);
    f.light.color.set(color);
    f.light.intensity = intensity;
    f.light.visible = true;
    f.life = life; f.maxLife = life; f.maxIntensity = intensity;
  }

  smokePuff(pos, count = 2, color = 0x4f5a60, spread = 0.35, life = 1.2, scale = 1.2) {
    for (let i = 0; i < count; i++) {
      const s = this.smoke[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % this.smoke.length;
      s.sprite.position.set(
        pos.x + (Math.random() - 0.5) * spread,
        pos.y + (Math.random() - 0.5) * spread,
        pos.z + (Math.random() - 0.5) * spread,
      );
      s.sprite.material.color.set(color);
      s.sprite.material.opacity = 0.24;
      s.sprite.scale.setScalar(scale * 0.5);
      s.sprite.visible = true;
      s.vx = (Math.random() - 0.5) * 0.4;
      s.vy = 0.35 + Math.random() * 0.5;
      s.vz = (Math.random() - 0.5) * 0.4;
      s.life = life; s.maxLife = life; s.grow = scale;
    }
  }

  ring(pos, color = 0xffb060, maxScale = 4, life = 0.45) {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.mesh.position.set(pos.x, Math.max(0.06, pos.y), pos.z);
    r.mesh.material.color.set(color);
    r.mesh.material.opacity = 0.7;
    r.mesh.scale.setScalar(0.4);
    r.mesh.visible = true;
    r.life = life; r.maxLife = life; r.maxScale = maxScale;
  }

  bulletHole(point, normal) {
    const d = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % this.decals.length;
    d.position.copy(point).addScaledVector(normal, 0.012);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    d.rotation.z += Math.random() * Math.PI * 2;
    d.scale.setScalar(0.7 + Math.random() * 0.7);
    d.visible = true;
  }

  impact(point, normal, kind = 'concrete') {
    const color = kind === 'metal' ? 0xffd18a : 0xffbb7a;
    this.burst(point, normal, color, 9, 4.5, 0.04, 0.5, 12);
    this.burst(point, normal, 0xffffff, 3, 7, 0.025, 0.18, 3);
    this.smokePuff(point, 1, kind === 'metal' ? 0x6f7478 : 0x6b6257, 0.2, 0.9, 0.7);
    this.bulletHole(point, normal);
    this.flashLight(point.clone().addScaledVector(normal, 0.2), 0xffa050, 5, 0.06);
    this.audio.impact();
  }

  enemyHit(point, dir) {
    this.burst(point, dir.clone().negate(), 0xff7a2e, 12, 6, 0.045, 0.5, 9);
    this.burst(point, dir.clone().negate(), 0x6fe5ff, 4, 4, 0.03, 0.35, 3);
    this.smokePuff(point, 1, 0x2a2420, 0.2, 0.7, 0.6);
  }

  enemyDeath(point, big = false) {
    const n = big ? 75 : 34;
    this.burst(point, null, 0xff8a3c, n, big ? 12 : 7, big ? 0.09 : 0.055, big ? 1.1 : 0.8, 8);
    this.burst(point, null, 0x7fe9ff, Math.floor(n * 0.35), big ? 10 : 6, 0.04, 0.7, 4);
    this.burst(point, null, 0x2a2a2a, 12, 2.5, 0.12, 1.2, 2);
    this.smokePuff(point, big ? 6 : 3, 0x343a3e, 0.8, 1.8, big ? 2.2 : 1.3);
    this.ring(point, 0xff7a32, big ? 8 : 3.5, big ? 0.7 : 0.4);
    this.flashLight(point.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xff7a32, big ? 45 : 18, big ? 0.25 : 0.12);
    this.audio.explosion(point.distanceTo(this.camera.position) * 0.4);
  }

  explosion(point, radius = 5) {
    this.burst(point, null, 0xffd48a, 80, 15, 0.12, 1.2, 6);
    this.burst(point, null, 0xff6a22, 70, 11, 0.14, 1, 4);
    this.burst(point, null, 0x2b2b2b, 26, 4, 0.18, 2, 2);
    this.smokePuff(point, 8, 0x30302e, 1.4, 2.3, 2.8);
    this.ring(point, 0xffb060, radius * 1.6, 0.65);
    this.flashLight(point.clone().add(new THREE.Vector3(0, 1, 0)), 0xff9a4a, 80, 0.32);
    this.audio.explosion(point.distanceTo(this.camera.position));
  }

  pickupBurst(point) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.1 + Math.random() * 0.4;
      this.spawnParticle(
        point.x + Math.cos(a) * r, point.y + Math.random() * 0.8, point.z + Math.sin(a) * r,
        Math.cos(a) * 2.4, 2 + Math.random() * 3, Math.sin(a) * 2.4,
        0x8ff4ff, 0.04, 0.7, -1, 0.96,
      );
    }
  }

  update(dt) {
    this.time += dt;
    // particles
    let any = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.life <= 0) { this.pAlpha[i] = 0; continue; }
      p.life -= dt;
      any = true;
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag; p.vz *= drag;
      p.vy = p.vy * drag - p.grav * dt;
      this.pPos[i * 3] += p.vx * dt;
      this.pPos[i * 3 + 1] += p.vy * dt;
      this.pPos[i * 3 + 2] += p.vz * dt;
      if (this.pPos[i * 3 + 1] < 0.02) {
        this.pPos[i * 3 + 1] = 0.02;
        p.vy *= -0.25; p.vx *= 0.6; p.vz *= 0.6;
      }
      const t = Math.max(0, p.life / p.maxLife);
      this.pAlpha[i] = t * t;
      this.pSize[i] = p.size * (0.7 + t * 0.5);
    }
    if (any || this._hadParticles) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.alpha.needsUpdate = true;
      this.points.geometry.attributes.size.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
    this._hadParticles = any;

    // tracers
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / t.maxLife) * 0.9;
      if (t.life <= 0) t.line.visible = false;
    }

    // smoke
    for (const s of this.smoke) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = s.life / s.maxLife;
      s.sprite.position.x += s.vx * dt;
      s.sprite.position.y += s.vy * dt;
      s.sprite.position.z += s.vz * dt;
      s.vy *= 0.995;
      s.sprite.scale.setScalar(s.grow * (0.5 + (1 - k) * 1.4));
      s.sprite.material.opacity = Math.max(0, k * k) * 0.3;
      if (s.life <= 0) s.sprite.visible = false;
    }

    // rings
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife);
      r.mesh.scale.setScalar(0.4 + k * r.maxScale);
      r.mesh.material.opacity = Math.max(0, (1 - k) * 0.8);
      if (r.life <= 0) r.mesh.visible = false;
    }

    // flash lights
    for (const f of this.flashLights) {
      if (f.life <= 0) continue;
      f.life -= dt;
      const k = Math.max(0, f.life / f.maxLife);
      f.light.intensity = f.maxIntensity * k * k;
      if (f.life <= 0) f.light.visible = false;
    }
  }
}
