import * as THREE from 'three';
import { glowTexture } from './textures.js';

const ENEMY_TYPES = {
  sentinel: {
    name: 'SENTINEL', hp: 105, speed: 2.9, radius: 0.42, scale: 1, score: 100,
    preferred: [8, 17], fireRate: [1.7, 2.6], damage: 9, projectileSpeed: 26,
    armor: 0x343b42, accent: 0xff5a2e, dark: 0x121619, eye: 0xff3a22,
  },
  stalker: {
    name: 'STALKER', hp: 72, speed: 4.9, radius: 0.36, scale: 0.94, score: 125,
    preferred: [0.8, 2.0], fireRate: [99, 99], damage: 14, melee: true,
    armor: 0x2a2728, accent: 0xff2f18, dark: 0x0d0d0f, eye: 0xff2418,
  },
  juggernaut: {
    name: 'JUGGERNAUT', hp: 290, speed: 1.95, radius: 0.58, scale: 1.22, score: 250,
    preferred: [7, 15], fireRate: [2.0, 2.8], damage: 15, burst: 3, projectileSpeed: 24,
    armor: 0x3d3a33, accent: 0xffa228, dark: 0x17140f, eye: 0xff8a20,
  },
  warden: {
    name: 'WARDEN PRIME', hp: 1700, speed: 1.7, radius: 1.0, scale: 2.0, score: 2000,
    preferred: [9, 20], fireRate: [1.3, 1.9], damage: 20, burst: 5, projectileSpeed: 22,
    armor: 0x403a30, accent: 0xffb42e, dark: 0x16120c, eye: 0xffc23a, boss: true,
  },
};

const SPHERE = new THREE.SphereGeometry(1, 10, 8);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);

function box(mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}

function cylinder(mat, r, len, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(CYL, mat);
  m.scale.set(r, len, r);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}

export class Enemy {
  constructor(type, position, world, effects, audio) {
    this.type = type;
    this.def = ENEMY_TYPES[type];
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.hp = this.def.hp;
    this.maxHp = this.hp;
    this.alive = true;
    this.dying = false;
    this.deathTimer = 0;
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.radius = this.def.radius;
    this.cooldown = 0.8 + Math.random() * 1.4;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 1 + Math.random() * 2;
    this.stuckTimer = 0;
    this.flash = 0;
    this.spawnTimer = 0.75;
    this.alerted = false;
    this.walkTime = Math.random() * 10;
    this.hitCooldown = 0;
    this.telegraph = 0;
    this.mats = [];
    this.build();
    this.root.position.copy(this.position);
    this.root.scale.setScalar(0.01);
  }

  makeMat(color, metalness = 0.72, roughness = 0.42) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    this.mats.push(m);
    return m;
  }

  build() {
    const d = this.def;
    // Model is authored at 1x; the whole rig is scaled by def.scale at spawn.
    const s = 1;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    const armor = this.makeMat(d.armor);
    const dark = this.makeMat(d.dark, 0.55, 0.65);
    const accent = new THREE.MeshStandardMaterial({
      color: 0x1a0d08, emissive: d.accent, emissiveIntensity: 2.8, roughness: 0.35, metalness: 0.3,
    });
    this.mats.push(accent);
    const eyeMat = new THREE.MeshBasicMaterial({ color: d.eye, toneMapped: false });
    this.eyeMat = eyeMat;
    this.accentMat = accent;
    this.armorMat = armor;
    this.darkMat = dark;

    const torsoW = d.boss ? 1.05 : d.type === 'juggernaut' ? 0.78 : 0.62;
    const torsoH = d.boss ? 0.9 : 0.68;
    const torsoD = d.boss ? 0.62 : 0.38;
    // torso
    const torso = box(armor, torsoW, torsoH, torsoD, 0, 1.22 * s, 0);
    this.body.add(torso);
    // chest plate
    this.body.add(box(dark, torsoW * 0.72, torsoH * 0.62, torsoD + 0.07, 0, 1.25 * s, 0.03));
    // chest core
    const core = new THREE.Mesh(SPHERE, eyeMat);
    core.scale.setScalar(d.boss ? 0.12 : 0.055);
    core.position.set(0, 1.28 * s, torsoD / 2 + 0.08);
    this.body.add(core);
    // abdomen
    this.body.add(box(dark, torsoW * 0.58, 0.28, torsoD * 0.76, 0, 0.9 * s, 0));
    // belt accents
    this.body.add(box(accent, torsoW * 0.62, 0.035, torsoD * 0.82, 0, 0.82 * s, 0));
    // head
    const head = new THREE.Mesh(SPHERE, dark);
    head.scale.set(d.boss ? 0.24 : 0.16, d.boss ? 0.25 : 0.18, d.boss ? 0.24 : 0.17);
    head.position.set(0, 1.72 * s, 0);
    head.castShadow = true;
    this.body.add(head);
    const visor = box(eyeMat, d.boss ? 0.32 : 0.22, d.boss ? 0.055 : 0.04, 0.04, 0, 1.73 * s, d.boss ? 0.2 : 0.14);
    this.body.add(visor);
    // helmet
    const helm = box(armor, d.boss ? 0.42 : 0.28, d.boss ? 0.18 : 0.12, d.boss ? 0.38 : 0.26, 0, 1.83 * s, -0.02);
    this.body.add(helm);
    // antenna
    if (d.boss || d.type === 'sentinel') {
      this.body.add(box(accent, 0.012, 0.22, 0.012, 0.11 * s, 1.97 * s, 0));
    }

    // shoulders
    this.body.add(box(armor, torsoW * 0.38, 0.22, torsoD * 0.9, -torsoW * 0.58, 1.48 * s, 0, 0, 0, 0.12));
    this.body.add(box(armor, torsoW * 0.38, 0.22, torsoD * 0.9, torsoW * 0.58, 1.48 * s, 0, 0, 0, -0.12));

    // arms
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-torsoW * 0.62, 1.42 * s, 0);
    this.body.add(this.leftArm);
    this.leftArm.add(box(armor, 0.16, 0.52, 0.18, 0, -0.28, 0));
    this.leftArm.add(box(dark, 0.14, 0.2, 0.16, 0, -0.59, 0.02));
    const leftHand = new THREE.Mesh(SPHERE, dark);
    leftHand.scale.setScalar(0.075);
    leftHand.position.set(0, -0.72, 0.03);
    this.leftArm.add(leftHand);
    if (d.melee) {
      for (let i = 0; i < 3; i++) {
        const claw = box(accent, 0.022, 0.26, 0.03, -0.04 + i * 0.04, -0.83, 0.06, 0.1, 0, 0);
        this.leftArm.add(claw);
      }
    }

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(torsoW * 0.62, 1.42 * s, 0);
    this.body.add(this.rightArm);
    this.rightArm.add(box(armor, 0.16, 0.52, 0.18, 0, -0.28, 0));
    this.rightArm.add(box(dark, 0.14, 0.2, 0.16, 0, -0.59, 0.02));
    // weapon
    this.gunTip = new THREE.Object3D();
    this.gunTip.position.set(0.06, 1.33 * s, 0.46);
    if (!d.melee) {
      const gun = new THREE.Group();
      gun.position.set(0.16, -0.6, 0.18);
      gun.add(box(dark, 0.1, 0.12, 0.72, 0, 0, 0.16));
      gun.add(cylinder(dark, 0.035, 0.32, 0, 0.02, 0.56, Math.PI / 2));
      gun.add(box(accent, 0.02, 0.03, 0.2, 0.055, 0.03, 0.16));
      this.rightArm.add(gun);
    } else {
      for (let i = 0; i < 3; i++) {
        this.rightArm.add(box(accent, 0.022, 0.26, 0.03, -0.04 + i * 0.04, -0.83, 0.06, 0.1, 0, 0));
      }
    }
    this.body.add(this.gunTip);

    // legs
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-torsoW * 0.24, 0.86 * s, 0);
    this.body.add(this.leftLeg);
    this.leftLeg.add(box(armor, 0.2, 0.52, 0.22, 0, -0.3, 0));
    this.leftLeg.add(box(dark, 0.18, 0.24, 0.22, 0, -0.63, 0.04));
    this.leftLeg.add(box(armor, 0.22, 0.1, 0.34, 0, -0.66, 0.08));
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(torsoW * 0.24, 0.86 * s, 0);
    this.body.add(this.rightLeg);
    this.rightLeg.add(box(armor, 0.2, 0.52, 0.22, 0, -0.3, 0));
    this.rightLeg.add(box(dark, 0.18, 0.24, 0.22, 0, -0.63, 0.04));
    this.rightLeg.add(box(armor, 0.22, 0.1, 0.34, 0, -0.66, 0.08));

    // backpack
    this.body.add(box(dark, torsoW * 0.6, torsoH * 0.65, 0.2, 0, 1.25 * s, -torsoD * 0.62));
    this.body.add(box(accent, 0.06, 0.16, 0.02, 0, 1.3 * s, -torsoD * 0.62 - 0.11));

    // boss extras: shoulder cannons and crown
    if (d.boss) {
      for (const side of [-1, 1]) {
        this.body.add(box(armor, 0.3, 0.26, 0.52, side * torsoW * 0.7, 1.62 * s, -0.05));
        this.body.add(cylinder(dark, 0.08, 0.36, side * torsoW * 0.7, 1.64 * s, 0.28, Math.PI / 2));
        this.body.add(box(accent, 0.05, 0.05, 0.3, side * torsoW * 0.7, 1.75 * s, 0.1));
      }
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 20), accent);
      crown.position.set(0, 1.95 * s, 0);
      crown.rotation.x = Math.PI / 2;
      this.body.add(crown);
    }
    // glow
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,90,45,1)'), color: d.eye, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
    }));
    glow.position.set(0, 1.3 * s, torsoD / 2 + 0.12);
    glow.scale.setScalar(d.boss ? 2.2 : 0.8);
    this.body.add(glow);
    this.glow = glow;
  }

  get eye() {
    return new THREE.Vector3(this.position.x, 1.65 * this.def.scale, this.position.z);
  }

  hitTest(origin, dir, maxDist) {
    if (!this.alive || this.spawnTimer > 0) return null;
    const s = this.def.scale;
    // head
    const headCenter = new THREE.Vector3(this.position.x, 1.73 * s, this.position.z);
    const headHit = this.raySphere(origin, dir, headCenter, (this.def.boss ? 0.26 : 0.18) * s);
    const bodyCenter = new THREE.Vector3(this.position.x, 1.1 * s, this.position.z);
    const bodyHit = this.raySphere(origin, dir, bodyCenter, (this.def.boss ? 0.82 : 0.46) * s);
    let hit = null;
    if (headHit !== null && headHit < maxDist) hit = { distance: headHit, headshot: true };
    if (bodyHit !== null && bodyHit < maxDist && (!hit || bodyHit < hit.distance)) hit = { distance: bodyHit, headshot: false };
    if (!hit) return null;
    hit.point = origin.clone().addScaledVector(dir, hit.distance);
    hit.enemy = this;
    return hit;
  }

  raySphere(origin, dir, center, radius) {
    const oc = origin.clone().sub(center);
    const b = oc.dot(dir);
    const c = oc.dot(oc) - radius * radius;
    const h = b * b - c;
    if (h < 0) return null;
    const t = -b - Math.sqrt(h);
    return t >= 0 ? t : null;
  }

  takeDamage(amount, headshot, hitPoint, dir) {
    if (!this.alive) return 0;
    this.hp -= amount;
    this.flash = 1;
    this.hitCooldown = 0.12;
    this.effects.enemyHit(hitPoint, dir);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(headshot);
      return 1;
    }
    return 0;
  }

  die(headshot) {
    if (this.dying) return;
    this.alive = false;
    this.dying = true;
    this.deathTimer = 1.9;
    this.velocity.set(0, 0, 0);
    const p = new THREE.Vector3(this.position.x, 1.1 * this.def.scale, this.position.z);
    this.effects.enemyDeath(p, this.def.boss);
    this.audio.explosion(this.position.distanceTo(new THREE.Vector3()));
  }

  update(dt, player, others, manager) {
    this.walkTime += dt;
    if (this.dying) {
      this.deathTimer -= dt;
      const k = Math.max(0, this.deathTimer / 1.9);
      this.root.rotation.x += dt * (this.def.boss ? 0.9 : 2.6);
      this.root.position.y -= dt * 0.45;
      const fade = Math.min(1, k * 2.5);
      for (const m of this.mats) {
        m.transparent = true;
        m.opacity = fade;
      }
      this.eyeMat.opacity = fade;
      this.eyeMat.transparent = true;
      this.root.scale.setScalar(Math.max(0.01, this.def.scale * (0.4 + k * 0.6)));
      if (this.deathTimer <= 0) this.remove = true;
      return;
    }

    if (!this.alive) return;

    // spawn animation
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      const t = 1 - Math.max(0, this.spawnTimer / 0.75);
      const ease = 1 - Math.pow(1 - t, 3);
      this.root.scale.setScalar(Math.max(0.01, this.def.scale * ease));
      this.root.position.y = (1 - ease) * -1.4;
      if (this.spawnTimer <= 0) {
        this.root.position.y = 0;
        this.root.scale.setScalar(this.def.scale);
        manager.onSpawned?.(this);
      }
      return;
    }

    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 7);
      this.armorMat.emissive.setRGB(this.flash * 0.7, this.flash * 0.35, this.flash * 0.15);
      this.armorMat.emissiveIntensity = this.flash * 1.5;
    } else {
      this.armorMat.emissive.setRGB(0, 0, 0);
    }

    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.cooldown -= dt;
    this.telegraph = Math.max(0, this.telegraph - dt);

    const eye = this.eye;
    const playerEye = player.eyePosition;
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    const los = this.world.lineOfSight(eye, playerEye);
    if (!this.alerted && los && dist < 30) {
      this.alerted = true;
      this.audio.enemyAlert();
      this.glow.material.opacity = 0.8;
    }

    // desired movement
    let moveX = 0;
    let moveZ = 0;
    const toLen = Math.max(0.001, dist);
    const nx = dx / toLen, nz = dz / toLen;
    if (this.def.melee) {
      if (dist > 1.25) { moveX = nx; moveZ = nz; }
    } else {
      const [near, far] = this.def.preferred;
      if (dist > far) { moveX = nx; moveZ = nz; }
      else if (dist < near) { moveX = -nx; moveZ = -nz; }
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) { this.strafe *= -1; this.strafeTimer = 1.4 + Math.random() * 2.5; }
      if (dist < far + 3) {
        moveX += -nz * this.strafe * 0.55;
        moveZ += nx * this.strafe * 0.55;
      }
      if (!los) { moveX = nx; moveZ = nz; }
    }

    // obstacle avoidance probe
    if (moveX || moveZ) {
      const ml = Math.hypot(moveX, moveZ);
      if (ml > 0) { moveX /= ml; moveZ /= ml; }
      const probe = new THREE.Vector3(this.position.x + moveX * (this.radius + 0.8), 0.8, this.position.z + moveZ * (this.radius + 0.8));
      if (this.world.pointBlocked(probe)) {
        const side = this.strafe;
        const tx = -moveZ * side, tz = moveX * side;
        moveX = moveX * 0.25 + tx;
        moveZ = moveZ * 0.25 + tz;
      }
    }

    // separation
    let sepX = 0, sepZ = 0;
    if (others) {
      for (const o of others) {
        if (o === this || !o.alive || o.dying) continue;
        const ox = this.position.x - o.position.x;
        const oz = this.position.z - o.position.z;
        const d2 = ox * ox + oz * oz;
        const min = this.radius + o.radius + 0.25;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          sepX += (ox / d) * (min - d) * 2.2;
          sepZ += (oz / d) * (min - d) * 2.2;
        }
      }
    }

    const spd = this.def.speed * (this.telegraph > 0 ? 0.2 : 1);
    const desiredX = (moveX + sepX) * spd;
    const desiredZ = (moveZ + sepZ) * spd;
    this.velocity.x += (desiredX - this.velocity.x) * Math.min(1, dt * 8);
    this.velocity.z += (desiredZ - this.velocity.z) * Math.min(1, dt * 8);
    const beforeX = this.position.x, beforeZ = this.position.z;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.world.collide(this.position, this.radius, 0);
    const moved = Math.hypot(this.position.x - beforeX, this.position.z - beforeZ);
    if (moved < 0.002 && (Math.abs(desiredX) + Math.abs(desiredZ)) > 0.5) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.35) { this.strafe *= -1; this.stuckTimer = 0; }
    } else this.stuckTimer = 0;

    // face player
    const targetYaw = Math.atan2(dx, dz);
    let yawDiff = targetYaw - this.root.rotation.y;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.root.rotation.y += yawDiff * Math.min(1, dt * 7);
    this.root.position.x = this.position.x;
    this.root.position.z = this.position.z;

    // walk cycle
    const speedNorm = Math.min(1, Math.hypot(this.velocity.x, this.velocity.z) / this.def.speed);
    const step = Math.sin(this.walkTime * (this.def.melee ? 11 : 7.5)) * 0.5 * speedNorm;
    this.leftLeg.rotation.x = step * 0.7;
    this.rightLeg.rotation.x = -step * 0.7;
    this.body.position.y = Math.abs(Math.sin(this.walkTime * (this.def.melee ? 11 : 7.5))) * 0.045 * speedNorm;
    if (this.def.melee) {
      this.leftArm.rotation.x = -0.7 + step * 0.9;
      this.rightArm.rotation.x = -0.7 - step * 0.9;
    } else {
      this.leftArm.rotation.x = -0.9 + step * 0.18;
      this.rightArm.rotation.x = -0.95 - step * 0.18;
    }

    // attack
    if (this.telegraph > 0) {
      const p = 1 - this.telegraph / 0.45;
      this.glow.material.opacity = 0.5 + p * 0.5;
      this.glow.scale.setScalar((this.def.boss ? 2.2 : 0.8) * (1 + p * 0.7));
      if (this.telegraph <= dt) this.attack(player, dist, los);
      return;
    }
    if (this.def.melee) {
      if (dist < 1.75 && this.cooldown <= 0) {
        this.telegraph = 0.36;
        this.cooldown = 0.9 + Math.random() * 0.4;
        this.audio.enemyAlert();
      }
    } else if (los && dist < this.def.preferred[1] + 6 && this.cooldown <= 0) {
      this.telegraph = 0.38;
      this.cooldown = this.def.fireRate[0] + Math.random() * (this.def.fireRate[1] - this.def.fireRate[0]);
      this.audio.shot('charge');
    }
  }

  attack(player, dist, los) {
    const d = this.def;
    const eye = this.eye;
    if (d.melee) {
      this.effects.burst(new THREE.Vector3(this.position.x, 1.2, this.position.z), null, 0xff5a2e, 10, 5, 0.04, 0.3, 4);
      if (dist < 2.4) player.damage(d.damage, this.position.clone());
      this.cooldown = Math.min(this.cooldown, 0.7);
      return;
    }
    if (!los) return;
    const p = player.eyePosition;
    const baseDir = p.clone().sub(eye).normalize();
    const count = d.burst || 1;
    const projectiles = [];
    for (let i = 0; i < count; i++) {
      const dir = baseDir.clone();
      dir.x += (Math.random() - 0.5) * 0.06;
      dir.y += (Math.random() - 0.5) * 0.045;
      dir.z += (Math.random() - 0.5) * 0.06;
      dir.normalize();
      projectiles.push(dir);
    }
    const gun = this.gunTip.getWorldPosition(new THREE.Vector3());
    this.audio.shot('enemy');
    this.effects.flashLight(gun, 0xff6a2a, 12, 0.08);
    for (let i = 0; i < count; i++) {
      const delay = i * 0.08;
      this.manager.spawnProjectile(gun, projectiles[i], d.damage, d.projectileSpeed, delay);
    }
  }

  dispose(scene) {
    scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry !== SPHERE && o.geometry !== BOX && o.geometry !== CYL) o.geometry.dispose();
    });
    for (const m of this.mats) m.dispose();
    this.eyeMat.dispose();
  }
}

export class EnemyManager {
  constructor(scene, world, effects, audio, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.callbacks = callbacks;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.pickupGeometries = {
      health: new THREE.BoxGeometry(0.5, 0.18, 0.5),
      ammo: new THREE.BoxGeometry(0.45, 0.3, 0.32),
    };
    this.boltGeo = new THREE.SphereGeometry(0.075, 8, 6);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xff7a2e, toneMapped: false });
    this.boltGlowMat = new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,120,50,1)'), color: 0xff9a4a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    });
  }

  spawn(type, position) {
    const e = new Enemy(type, position, this.world, this.effects, this.audio);
    e.manager = this;
    this.scene.add(e.root);
    this.enemies.push(e);
    this.effects.burst(new THREE.Vector3(position.x, 0.5, position.z), null, 0xff5a2e, 26, 4, 0.06, 0.7, 3);
    this.effects.ring(new THREE.Vector3(position.x, 0.1, position.z), 0xff5a2e, 3.5, 0.5);
    this.effects.flashLight(new THREE.Vector3(position.x, 1.2, position.z), 0xff4a2a, 18, 0.2);
    return e;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      const hit = e.hitTest(origin, dir, maxDist);
      if (hit && (!best || hit.distance < best.distance)) best = hit;
    }
    return best;
  }

  damageEnemy(e, damage, headshot, point, dir, source) {
    const died = e.takeDamage(damage, headshot, point, dir);
    if (died) {
      this.callbacks.onKill?.(e, headshot, source);
      this.maybeDrop(e);
    } else {
      this.callbacks.onHit?.(e, headshot, damage);
    }
  }

  maybeDrop(e) {
    const roll = Math.random();
    if (e.def.boss) {
      this.spawnPickup(e.position.clone(), 'health');
      this.spawnPickup(e.position.clone().add(new THREE.Vector3(1.2, 0, 0)), 'ammo');
      return;
    }
    if (roll < 0.18) this.spawnPickup(e.position.clone(), 'health');
    else if (roll < 0.34) this.spawnPickup(e.position.clone(), 'ammo');
  }

  spawnPickup(position, type) {
    const group = new THREE.Group();
    const color = type === 'health' ? 0x64f0c4 : 0xffb43c;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x121a18, metalness: 0.6, roughness: 0.35,
      emissive: color, emissiveIntensity: 0.9,
    });
    const base = new THREE.Mesh(this.pickupGeometries[type], mat);
    base.position.y = 0.36;
    group.add(base);
    if (type === 'health') {
      const crossMat = new THREE.MeshBasicMaterial({ color: 0x9fffe6, toneMapped: false });
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.1), crossMat);
      c1.position.y = 0.36;
      group.add(c1);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.1), crossMat);
      c2.position.y = 0.36;
      group.add(c2);
    } else {
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffca70, toneMapped: false });
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.34), stripeMat);
      s.position.y = 0.36;
      group.add(s);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(type === 'health' ? 'rgba(90,255,215,1)' : 'rgba(255,180,60,1)'),
      color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55,
    }));
    halo.position.y = 0.5;
    halo.scale.setScalar(1.4);
    group.add(halo);
    const light = new THREE.PointLight(color, 1.6, 4, 2);
    light.position.y = 0.6;
    group.add(light);
    group.position.copy(position);
    group.position.y = 0.01;
    this.scene.add(group);
    this.pickups.push({ group, type, life: 28, baseY: 0.01, halo, spin: Math.random() * 6 });
  }

  spawnProjectile(origin, dir, damage, speed, delay = 0) {
    if (delay > 0) {
      const p = new THREE.Vector3();
      // simple delayed spawn using timer entries
      this.projectiles.push({ delayed: true, delay, origin: origin.clone(), dir: dir.clone(), damage, speed });
      return;
    }
    const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
    mesh.position.copy(origin);
    const glow = new THREE.Sprite(this.boltGlowMat.clone());
    glow.scale.setScalar(1.1);
    mesh.add(glow);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh, origin: origin.clone(), dir: dir.clone(), damage, speed, life: 4, trail: 0,
    });
  }

  update(dt, player, active = true) {
    // enemies
    for (const e of this.enemies) {
      if (e.remove) {
        e.dispose(this.scene);
        continue;
      }
      if (active) e.update(dt, player, this.enemies, this);
      else if (e.dying) e.update(dt, player, this.enemies, this);
    }
    this.enemies = this.enemies.filter(e => !e.remove);

    // projectiles
    for (const p of this.projectiles) {
      if (p.delayed) {
        p.delay -= dt;
        if (p.delay <= 0) {
          p.delayed = false;
          const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
          mesh.position.copy(p.origin);
          const glow = new THREE.Sprite(this.boltGlowMat.clone());
          glow.scale.setScalar(1.1);
          mesh.add(glow);
          this.scene.add(mesh);
          p.mesh = mesh;
          p.life = 4;
          p.trail = 0;
        }
        continue;
      }
      if (!p.mesh) continue;
      p.life -= dt;
      const step = p.speed * dt;
      p.mesh.position.addScaledVector(p.dir, step);
      p.trail -= dt;
      if (p.trail <= 0) {
        p.trail = 0.03;
        this.effects.spawnParticle(
          p.mesh.position.x, p.mesh.position.y, p.mesh.position.z,
          (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3,
          0xff7a2e, 0.045, 0.18, 0, 0.9,
        );
      }
      const pp = p.mesh.position;
      if (this.world.pointBlocked(pp) || pp.y < 0.02) {
        this.effects.burst(pp, new THREE.Vector3(0, 1, 0), 0xff7a2e, 8, 3, 0.04, 0.35, 8);
        this.effects.smokePuff(pp, 1, 0x3a2c24, 0.1, 0.4, 0.5);
        p.mesh.parent?.remove(p.mesh);
        p.dead = true;
        continue;
      }
      if (player.alive) {
        const toPlayer = player.position.clone().setY(player.position.y + 1.05);
        toPlayer.sub(pp);
        if (toPlayer.length() < (player.radius || 0.5)) {
          player.damage(p.damage, pp.clone());
          this.effects.burst(pp, null, 0xff6a2a, 12, 4, 0.05, 0.4, 5);
          p.mesh.parent?.remove(p.mesh);
          p.dead = true;
          continue;
        }
      }
      if (p.life <= 0) {
        p.mesh.parent?.remove(p.mesh);
        p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);

    // pickups
    for (const p of this.pickups) {
      p.life -= dt;
      p.spin += dt * 1.8;
      p.group.rotation.y = p.spin;
      p.group.position.y = p.baseY + Math.sin(p.spin * 1.5) * 0.08 + 0.06;
      p.halo.material.opacity = 0.4 + Math.sin(p.spin * 2) * 0.18;
      if (player.alive) {
        const dx = player.position.x - p.group.position.x;
        const dz = player.position.z - p.group.position.z;
        if (dx * dx + dz * dz < 1.8 && Math.abs(player.position.y - p.group.position.y) < 2.2) {
          p.collected = true;
          this.callbacks.onPickup?.(p.type);
          this.effects.pickupBurst(p.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
          this.audio.pickup();
        }
      }
      if (p.life <= 0) p.collected = true;
      if (p.collected) this.scene.remove(p.group);
    }
    this.pickups = this.pickups.filter(p => !p.collected);
  }

  get aliveCount() {
    return this.enemies.filter(e => e.alive).length;
  }

  clear() {
    for (const e of this.enemies) e.dispose(this.scene);
    for (const p of this.projectiles) if (p.mesh) this.scene.remove(p.mesh);
    for (const p of this.pickups) this.scene.remove(p.group);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
  }
}
