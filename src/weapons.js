import * as THREE from 'three';
import { metalTextures, glowTexture } from './textures.js';

const MAT = {
  body: new THREE.MeshStandardMaterial({ color: 0x232a2e, roughness: 0.52, metalness: 0.78 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0f1316, roughness: 0.66, metalness: 0.55 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x191d1f, roughness: 0.82, metalness: 0.12 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xff9d2e, emissiveIntensity: 2.6, roughness: 0.4, metalness: 0.3 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x061a20, emissive: 0x63e8ff, emissiveIntensity: 3.2, roughness: 0.35, metalness: 0.2 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x1b211f, roughness: 0.92, metalness: 0.03 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x252b2a, roughness: 0.95, metalness: 0.02 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x7d5a45, roughness: 0.85, metalness: 0.02 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x9e7432, roughness: 0.35, metalness: 0.9 }),
};

let metalMap = null;
try { metalMap = metalTextures().map; } catch { /* texture is optional */ }
if (metalMap) {
  MAT.body.map = metalMap;
  MAT.body.needsUpdate = true;
}

function box(mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  return m;
}

function cyl(mat, r1, r2, len, x, y, z, rx = 0, ry = 0, rz = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function capsule(mat, r, len, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

export const WEAPON_DEFS = [
  {
    id: 'rifle', name: 'VK-9 VANGUARD', class: 'ASSAULT RIFLE', auto: true,
    damage: 26, headMult: 2.15, rate: 0.083, mag: 30, reserve: 210, reload: 1.75,
    spread: 0.0068, adsSpread: 0.0012, pellets: 1, range: 150, recoil: 0.0085,
    sound: 'rifle', color: '#e0a64a',
  },
  {
    id: 'shotgun', name: 'S-12 BREACHER', class: 'COMBAT SHOTGUN', auto: false,
    damage: 11.5, headMult: 1.35, rate: 0.68, mag: 8, reserve: 56, reload: 2.45,
    spread: 0.055, adsSpread: 0.042, pellets: 9, range: 48, recoil: 0.032,
    sound: 'shotgun', color: '#e0a64a',
  },
  {
    id: 'pistol', name: 'P-9 SIDEWINDER', class: 'SIDEARM', auto: false,
    damage: 39, headMult: 2.0, rate: 0.15, mag: 15, reserve: 180, reload: 1.3,
    spread: 0.0085, adsSpread: 0.0018, pellets: 1, range: 120, recoil: 0.014,
    sound: 'pistol', color: '#e0a64a',
  },
];

function buildRifle() {
  const g = new THREE.Group();
  // receiver
  g.add(box(MAT.body, 0.105, 0.135, 0.5, 0, 0, -0.02));
  g.add(box(MAT.polymer, 0.11, 0.055, 0.42, 0, -0.075, 0.02));
  // top rail
  g.add(box(MAT.dark, 0.07, 0.028, 0.44, 0, 0.082, -0.05));
  for (let i = 0; i < 7; i++) {
    g.add(box(MAT.dark, 0.078, 0.014, 0.018, 0, 0.099, -0.24 + i * 0.055));
  }
  // barrel and handguard
  g.add(box(MAT.dark, 0.088, 0.085, 0.28, 0, 0.01, -0.4));
  for (let i = 0; i < 5; i++) {
    g.add(box(MAT.body, 0.1, 0.016, 0.024, 0, 0.012, -0.31 - i * 0.045));
  }
  g.add(cyl(MAT.dark, 0.021, 0.021, 0.34, 0, 0.015, -0.62, Math.PI / 2, 0, 0, 12));
  g.add(cyl(MAT.body, 0.035, 0.03, 0.09, 0, 0.015, -0.78, Math.PI / 2, 0, 0, 12));
  g.add(cyl(MAT.dark, 0.043, 0.043, 0.06, 0, 0.015, -0.83, Math.PI / 2, 0, 0, 12));
  // gas block
  g.add(box(MAT.body, 0.055, 0.07, 0.08, 0, 0.045, -0.48));
  // stock
  g.add(box(MAT.polymer, 0.09, 0.115, 0.26, 0, -0.005, 0.36));
  g.add(box(MAT.dark, 0.1, 0.15, 0.055, 0, -0.015, 0.5));
  g.add(box(MAT.dark, 0.06, 0.04, 0.18, 0, 0.055, 0.32));
  // grip
  g.add(box(MAT.polymer, 0.062, 0.17, 0.1, 0, -0.135, 0.14, 0.32));
  g.add(box(MAT.dark, 0.055, 0.02, 0.1, 0, -0.215, 0.17, 0.32));
  // trigger guard
  g.add(box(MAT.dark, 0.045, 0.012, 0.13, 0, -0.1, 0.055));
  g.add(box(MAT.dark, 0.045, 0.055, 0.012, 0, -0.078, -0.01));
  // magazine
  const mag = new THREE.Group();
  mag.add(box(MAT.dark, 0.065, 0.21, 0.115, 0, -0.11, 0, -0.1));
  mag.add(box(MAT.body, 0.07, 0.03, 0.12, 0, -0.215, -0.012, -0.1));
  mag.position.set(0, -0.1, -0.02);
  g.add(mag);
  // handguard side rails + accent
  g.add(box(MAT.accent, 0.006, 0.02, 0.14, 0.051, 0.01, -0.37));
  g.add(box(MAT.accent, 0.006, 0.02, 0.14, -0.051, 0.01, -0.37));
  g.add(box(MAT.cyan, 0.012, 0.01, 0.03, 0.055, 0.07, 0.1));
  // charging handle
  g.add(box(MAT.dark, 0.04, 0.025, 0.09, -0.07, 0.05, 0.04));
  // ejection port
  g.add(box(MAT.dark, 0.012, 0.055, 0.1, 0.055, 0.025, -0.05));
  // sights
  g.add(box(MAT.dark, 0.055, 0.055, 0.04, 0, 0.135, 0.06));
  g.add(box(MAT.dark, 0.05, 0.03, 0.028, 0, 0.125, -0.22));
  g.add(box(MAT.cyan, 0.012, 0.012, 0.006, 0, 0.155, 0.085));
  g.add(box(MAT.cyan, 0.006, 0.02, 0.006, 0, 0.15, -0.235));
  // muzzle flash mount
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.88);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.07, 0.035, -0.03);
  g.add(eject);
  addArms(g, 'rifle');
  g.userData = { muzzle, eject, mag, magBaseY: mag.position.y };
  return g;
}

function buildShotgun() {
  const g = new THREE.Group();
  g.add(box(MAT.body, 0.12, 0.14, 0.42, 0, 0, 0));
  g.add(box(MAT.polymer, 0.115, 0.06, 0.3, 0, -0.085, 0.06));
  g.add(cyl(MAT.dark, 0.035, 0.035, 0.58, 0, 0.035, -0.44, Math.PI / 2, 0, 0, 12));
  g.add(cyl(MAT.dark, 0.024, 0.024, 0.54, 0, -0.025, -0.42, Math.PI / 2, 0, 0, 10));
  // pump
  g.add(box(MAT.polymer, 0.1, 0.09, 0.24, 0, -0.015, -0.36));
  for (let i = 0; i < 6; i++) g.add(box(MAT.dark, 0.105, 0.012, 0.016, 0, -0.012, -0.27 - i * 0.035));
  // stock
  g.add(box(MAT.polymer, 0.1, 0.13, 0.3, 0, -0.01, 0.35));
  g.add(box(MAT.dark, 0.11, 0.16, 0.06, 0, -0.02, 0.51));
  // grip
  g.add(box(MAT.polymer, 0.065, 0.17, 0.1, 0, -0.14, 0.17, 0.3));
  // trigger guard
  g.add(box(MAT.dark, 0.05, 0.012, 0.14, 0, -0.115, 0.07));
  // shell carrier / accent
  g.add(box(MAT.accent, 0.07, 0.025, 0.12, 0.065, 0.02, 0.02));
  g.add(box(MAT.cyan, 0.012, 0.01, 0.04, 0.064, 0.08, -0.08));
  // top rail and bead sight
  g.add(box(MAT.dark, 0.06, 0.025, 0.26, 0, 0.085, -0.08));
  g.add(box(MAT.dark, 0.02, 0.025, 0.02, 0, 0.12, -0.46));
  g.add(box(MAT.accent, 0.012, 0.012, 0.006, 0, 0.135, -0.46));
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.035, -0.73);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.07, 0.02, -0.02);
  g.add(eject);
  addArms(g, 'shotgun');
  g.userData = { muzzle, eject, mag: null, magBaseY: 0 };
  return g;
}

function buildPistol() {
  const g = new THREE.Group();
  g.add(box(MAT.body, 0.075, 0.1, 0.36, 0, 0.015, -0.08));
  g.add(box(MAT.dark, 0.07, 0.055, 0.32, 0, 0.075, -0.1));
  g.add(box(MAT.polymer, 0.065, 0.17, 0.11, 0, -0.12, 0.03, 0.22));
  g.add(box(MAT.dark, 0.07, 0.02, 0.1, 0, -0.205, 0.055, 0.22));
  g.add(box(MAT.accent, 0.008, 0.012, 0.08, 0.04, 0.02, -0.08));
  g.add(box(MAT.cyan, 0.008, 0.008, 0.02, 0.041, 0.055, 0.01));
  g.add(cyl(MAT.dark, 0.018, 0.018, 0.06, 0, 0.02, -0.27, Math.PI / 2, 0, 0, 10));
  // sights
  g.add(box(MAT.dark, 0.012, 0.02, 0.02, 0, 0.108, -0.2));
  g.add(box(MAT.dark, 0.04, 0.018, 0.02, 0, 0.108, 0.06));
  g.add(box(MAT.cyan, 0.008, 0.008, 0.006, 0, 0.119, -0.2));
  // trigger guard
  g.add(box(MAT.dark, 0.05, 0.012, 0.08, 0, -0.045, 0.04));
  // magazine base
  const mag = box(MAT.dark, 0.062, 0.018, 0.1, 0, -0.224, 0.06, 0.22);
  g.add(mag);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, -0.31);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.045, 0.055, -0.05);
  g.add(eject);
  addArms(g, 'pistol');
  g.userData = { muzzle, eject, mag, magBaseY: mag.position.y };
  return g;
}

function addArms(g, type) {
  // right forearm / glove on grip
  const gripZ = type === 'pistol' ? 0.03 : type === 'shotgun' ? 0.16 : 0.14;
  const gripY = type === 'pistol' ? -0.13 : -0.12;
  const rightHand = new THREE.Group();
  rightHand.add(box(MAT.glove, 0.085, 0.1, 0.16, 0, 0, 0, 0.2));
  rightHand.add(box(MAT.glove, 0.035, 0.075, 0.085, 0.045, 0.045, -0.02, 0.2));
  rightHand.add(box(MAT.dark, 0.018, 0.012, 0.05, -0.02, 0.05, -0.06));
  rightHand.position.set(0.005, gripY, gripZ + 0.01);
  g.add(rightHand);
  const rightArm = capsule(MAT.sleeve, 0.052, 0.3, 0.09, gripY - 0.16, gripZ + 0.25, 1.18, 0.2, -0.35);
  g.add(rightArm);
  const rightWrist = capsule(MAT.glove, 0.042, 0.06, 0.05, gripY - 0.07, gripZ + 0.11, 1.1, 0.2, -0.2);
  g.add(rightWrist);
  // left forearm on handguard / slide
  let leftY = type === 'pistol' ? -0.055 : -0.015;
  let leftZ = type === 'pistol' ? -0.13 : type === 'shotgun' ? -0.35 : -0.37;
  const leftHand = new THREE.Group();
  leftHand.add(box(MAT.glove, 0.08, 0.085, 0.15, 0, 0, 0, -0.2));
  leftHand.add(box(MAT.glove, 0.028, 0.06, 0.07, -0.04, 0.035, -0.015, -0.2));
  leftHand.position.set(-0.012, leftY, leftZ);
  g.add(leftHand);
  const leftArm = capsule(MAT.sleeve, 0.048, 0.34, -0.16, leftY - 0.17, leftZ + 0.28, 1.5, -0.12, 0.62);
  g.add(leftArm);
  // sleeve cuffs
  g.add(cyl(MAT.dark, 0.058, 0.054, 0.05, 0.075, gripY - 0.09, gripZ + 0.16, 1.15, 0.2, -0.3));
  // small forearm light
  if (type !== 'pistol') {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.035), MAT.cyan);
    light.position.set(-0.11, leftY + 0.02, leftZ + 0.1);
    g.add(light);
  }
}

function makeFlash() {
  const group = new THREE.Group();
  const tex = glowTexture('rgba(255,190,100,1)');
  for (let i = 0; i < 2; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex, color: 0xffcf8a, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.95, rotation: i * Math.PI / 2,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(0.3, 0.3, 1);
    group.add(s);
  }
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,255,255,1)'), color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
  }));
  core.scale.set(0.14, 0.14, 1);
  group.add(core);
  group.visible = false;
  return group;
}

export class WeaponRig {
  constructor(camera, scene, audio, effects) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.models = [buildRifle(), buildShotgun(), buildPistol()];
    this.flashes = [];
    this.root = new THREE.Group();
    this.root.renderOrder = 10;
    this.mount = new THREE.Group();
    this.root.add(this.mount);
    this.camera.add(this.root);

    this.models.forEach((m, i) => {
      m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      const f = makeFlash();
      f.position.copy(m.userData.muzzle.position);
      m.add(f);
      this.flashes.push(f);
      this.mount.add(m);
      m.visible = i === 0;
    });

    const light = new THREE.PointLight(0xbfd6e8, 2.2, 2.6, 2);
    light.position.set(0.18, 0.28, 0.15);
    this.camera.add(light);

    this.ammo = WEAPON_DEFS.map(w => ({ mag: w.mag, reserve: w.reserve }));
    this.current = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 1;
    this.cooldown = 0;
    this.kick = 0;
    this.kickVel = 0;
    this.ads = 0;
    this.adsTarget = 0;
    this.switchTimer = 0;
    this.switchTarget = 0;
    this.switchPending = -1;
    this.time = 0;
    this.lastShotTime = -10;
    this.shotCount = 0;
    this.bobTime = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.flashTimer = 0;
    this.cameraKick = { pitch: 0, yaw: 0 };
    this.basePos = new THREE.Vector3(0.3, -0.275, -0.5);
    this.adsPos = [new THREE.Vector3(0.0, -0.115, -0.36), new THREE.Vector3(0.0, -0.115, -0.4), new THREE.Vector3(0.0, -0.12, -0.38)];
    this.root.position.copy(this.basePos);
    this.root.rotation.set(0.015, 0.045, 0.008);
  }

  get weapon() { return WEAPON_DEFS[this.current]; }
  get ammoState() { return this.ammo[this.current]; }
  get totalReserve() { return this.ammo.reduce((a, b) => a + b.reserve, 0); }

  switchTo(index) {
    if (index === this.current || index < 0 || index > 2 || this.switchTimer > 0) return;
    this.audio.ui('click');
    this.switchTimer = 0.3;
    this.switchTarget = 1;
    this.switchPending = index;
    this.reloading = false;
    this.adsTarget = 0;
  }

  reload() {
    const w = this.weapon;
    const a = this.ammoState;
    if (this.reloading || a.mag >= w.mag || a.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = w.reload;
    this.reloadDuration = w.reload;
    this.audio.reload(w.reload);
  }

  tryFire(now) {
    if (this.reloading || this.cooldown > 0 || this.switchTimer > 0) return null;
    const a = this.ammoState;
    if (a.mag <= 0) {
      if (now - this.lastShotTime > 0.3) this.audio.dryFire();
      this.lastShotTime = now;
      return { empty: true };
    }
    const w = this.weapon;
    a.mag--;
    this.cooldown = w.rate;
    this.lastShotTime = now;
    this.shotCount++;
    this.kick += 1;
    this.kickVel += 0.35;
    this.flashTimer = 0.055;
    this.flashes[this.current].visible = true;
    this.flashes[this.current].rotation.z = Math.random() * Math.PI;
    this.flashes[this.current].scale.setScalar(0.8 + Math.random() * 0.45);
    this.audio.shot(w.sound);
    // shell casing
    const eject = this.models[this.current].userData.eject;
    const p = new THREE.Vector3();
    eject.getWorldPosition(p);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.effects.spawnParticle(
      p.x, p.y, p.z,
      right.x * (1.2 + Math.random()) + (Math.random() - 0.5) * 0.5,
      1.6 + Math.random() * 1.8,
      right.z * (1.2 + Math.random()) + (Math.random() - 0.5) * 0.5,
      0xd1a354, 0.028, 0.8, 12, 0.99,
    );
    const muzzle = this.models[this.current].userData.muzzle;
    const mp = new THREE.Vector3();
    muzzle.getWorldPosition(mp);
    this.effects.flashLight(mp, 0xffb060, 24, 0.07);
    this.effects.smokePuff(mp, 1, 0x5f6266, 0.1, 0.55, 0.5);
    const spread = this.ads > 0.6 ? w.adsSpread : w.spread * (this.isMoving ? 1.35 : 1);
    this.cameraKick.pitch = w.recoil * (0.75 + Math.random() * 0.5) * (1 - this.ads * 0.35);
    this.cameraKick.yaw = (Math.random() - 0.5) * w.recoil * 0.9;
    return { weapon: w, spread, muzzle: mp };
  }

  consumeCameraKick() {
    const k = { ...this.cameraKick };
    this.cameraKick.pitch *= 0.2;
    this.cameraKick.yaw *= 0.2;
    return k;
  }

  addAmmo(percent = 0.4) {
    for (let i = 0; i < this.ammo.length; i++) {
      const w = WEAPON_DEFS[i];
      this.ammo[i].reserve = Math.min(w.reserve, this.ammo[i].reserve + Math.ceil(w.reserve * percent));
    }
  }

  refill() {
    for (let i = 0; i < this.ammo.length; i++) {
      this.ammo[i].mag = WEAPON_DEFS[i].mag;
      this.ammo[i].reserve = WEAPON_DEFS[i].reserve;
    }
  }

  update(dt, state) {
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.isMoving = state.moving;
    this.adsTarget = state.ads ? 1 : 0;
    this.ads += (this.adsTarget - this.ads) * Math.min(1, dt * 14);
    this.swayX += (state.swayX * 0.0018 - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (state.swayY * 0.0018 - this.swayY) * Math.min(1, dt * 8);

    if (this.switchTimer > 0) {
      this.switchTimer -= dt;
      if (this.switchTarget === 1 && this.switchTimer <= 0.15 && this.switchPending >= 0) {
        this.mount.children.forEach((m, i) => { m.visible = i === this.switchPending; });
        this.current = this.switchPending;
        this.switchPending = -1;
        this.switchTarget = 0;
        this.switchTimer = 0.15;
      }
    }

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const w = this.weapon;
        const a = this.ammoState;
        const need = w.mag - a.mag;
        const take = Math.min(need, a.reserve);
        a.mag += take;
        a.reserve -= take;
        this.reloading = false;
        // small action slam
        this.kick += 0.3;
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashes[this.current].visible = false;
    }

    // weapon spring
    this.kickVel += (-this.kick * 110 - this.kickVel * 15) * dt;
    this.kick += this.kickVel * dt;

    // bob
    const speedBob = state.moving ? (state.sprinting ? 1.5 : 1) : 0;
    this.bobTime += dt * (state.moving ? (state.sprinting ? 13 : 9) : 2.5);
    const bobAmp = (0.012 * speedBob) * (1 - this.ads * 0.8);
    const bobX = Math.cos(this.bobTime) * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobAmp * 0.9;

    const target = this.adsPos[this.current];
    const p = new THREE.Vector3().lerpVectors(this.basePos, target, this.ads);
    p.x += bobX + this.swayX * (1 - this.ads * 0.7);
    p.y += bobY + this.swayY * (1 - this.ads * 0.7);
    p.z += this.kick * 0.05 - this.switchTimer * 0.7;
    this.root.position.lerp(p, Math.min(1, dt * 18));
    const rotX = 0.015 - this.kick * 0.06 + this.swayY * 2.2 + (this.reloading ? 0.35 : 0) + this.switchTimer * 0.9;
    const rotY = 0.045 + this.swayX * 2.2 - this.ads * 0.045;
    const rotZ = 0.008 + this.swayX * 1.5 + (this.reloading ? 0.25 : 0) - this.ads * 0.008;
    this.root.rotation.x += (rotX - this.root.rotation.x) * Math.min(1, dt * 14);
    this.root.rotation.y += (rotY - this.root.rotation.y) * Math.min(1, dt * 14);
    this.root.rotation.z += (rotZ - this.root.rotation.z) * Math.min(1, dt * 14);
    // viewmodel sits deeper when running
    this.root.position.y -= state.sprinting ? 0.03 : 0;

    // reload pose
    if (this.reloading) {
      const t = 1 - this.reloadTimer / this.reloadDuration;
      const dip = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      this.root.position.y -= dip * 0.16 * (1 - this.ads * 0.6);
      this.root.rotation.x -= dip * 0.45;
      this.root.rotation.z += dip * 0.16;
      const mag = this.models[this.current].userData.mag;
      if (mag) {
        const base = this.models[this.current].userData.magBaseY;
        const drop = Math.sin(Math.max(0, Math.min(1, (t - 0.12) / 0.55)) * Math.PI);
        mag.position.y = base - drop * 0.28;
        mag.visible = !(t > 0.68);
      }
    } else {
      const mag = this.models[this.current].userData.mag;
      if (mag) {
        mag.visible = true;
        mag.position.y += (this.models[this.current].userData.magBaseY - mag.position.y) * Math.min(1, dt * 12);
      }
    }
  }

  reset() {
    this.ammo = WEAPON_DEFS.map(w => ({ mag: w.mag, reserve: w.reserve }));
    this.current = 0;
    this.mount.children.forEach((m, i) => { m.visible = i === 0; });
    this.reloading = false;
    this.cooldown = 0;
    this.kick = 0;
    this.kickVel = 0;
    this.switchTimer = 0;
    this.switchPending = -1;
    this.ads = 0;
    this.root.position.copy(this.basePos);
    this.root.rotation.set(0.015, 0.045, 0.008);
  }
}
