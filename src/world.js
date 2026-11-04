import * as THREE from 'three';
import {
  concreteTextures, floorTextures, metalTextures, crateTextures, hazardTexture,
  signTexture, glowTexture, windowTexture, softParticleTexture,
} from './textures.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);
const TORUS = new THREE.TorusGeometry(1, 0.035, 8, 64);

function cloneTex(t, rx = 1, ry = 1) {
  const c = t.clone();
  c.needsUpdate = true;
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  return c;
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.colliders = [];
    this.spawns = [];
    this.animated = [];
    this.rainDrops = [];
    this.portals = [];
    this.quality = 'high';
    this.time = 0;
    this._buildMaterials();
    this._buildSky();
    this._buildArena();
    this._buildStructures();
    this._buildProps();
    this._buildAtmosphere();
    this._buildPortals();
    this._buildRain();
  }

  _buildMaterials() {
    const conc = concreteTextures();
    const metal = metalTextures();
    const crate = crateTextures();
    const hazard = hazardTexture();

    this.matConcrete = new THREE.MeshStandardMaterial({
      map: cloneTex(conc.map, 2, 1), roughnessMap: cloneTex(conc.rough, 2, 1),
      bumpMap: cloneTex(conc.bump, 2, 1), bumpScale: 0.035, color: 0x9ba0a2,
      roughness: 0.94, metalness: 0.02,
    });
    this.matConcreteDark = new THREE.MeshStandardMaterial({
      map: cloneTex(conc.map, 3, 1), roughnessMap: cloneTex(conc.rough, 3, 1),
      bumpMap: cloneTex(conc.bump, 3, 1), bumpScale: 0.03, color: 0x6f7678,
      roughness: 0.9, metalness: 0.02,
    });
    this.matMetal = new THREE.MeshStandardMaterial({
      map: cloneTex(metal.map, 2, 2), roughnessMap: cloneTex(metal.rough, 2, 2),
      color: 0x8b969c, roughness: 0.62, metalness: 0.72,
    });
    this.matMetalDark = new THREE.MeshStandardMaterial({
      map: cloneTex(metal.map, 2, 2), roughnessMap: cloneTex(metal.rough, 2, 2),
      color: 0x4c555b, roughness: 0.68, metalness: 0.78,
    });
    this.matCrate = new THREE.MeshStandardMaterial({
      map: crate.map, roughness: 0.7, metalness: 0.45, color: 0xc3c9cc,
    });
    this.matHazard = new THREE.MeshStandardMaterial({
      map: hazard.map, roughness: 0.78, metalness: 0.22, color: 0xc9c9c9,
    });
    this.matBlack = new THREE.MeshStandardMaterial({ color: 0x171b1f, roughness: 0.62, metalness: 0.7 });
    this.matRubber = new THREE.MeshStandardMaterial({ color: 0x0d1013, roughness: 0.94, metalness: 0.05 });
    this.matAmber = new THREE.MeshStandardMaterial({
      color: 0x261a08, emissive: 0xffa22e, emissiveIntensity: 3.4, roughness: 0.4, metalness: 0.2,
    });
    this.matRed = new THREE.MeshStandardMaterial({
      color: 0x2a0c0a, emissive: 0xff3b24, emissiveIntensity: 3.2, roughness: 0.4, metalness: 0.1,
    });
    this.matCyan = new THREE.MeshStandardMaterial({
      color: 0x071d24, emissive: 0x54e6ff, emissiveIntensity: 3.8, roughness: 0.35, metalness: 0.2,
    });
    this.matGlass = new THREE.MeshPhysicalMaterial({
      color: 0x0e222c, roughness: 0.08, metalness: 0.1, transmission: 0.5,
      transparent: true, opacity: 0.6, envMapIntensity: 1.4,
    });
    this.matPuddle = new THREE.MeshPhysicalMaterial({
      color: 0x141c22, roughness: 0.03, metalness: 0.55, envMapIntensity: 2.4,
      transparent: true, opacity: 0.74, clearcoat: 1, clearcoatRoughness: 0.02,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    this.matFloor = new THREE.MeshStandardMaterial({
      map: floorTextures().map, roughnessMap: floorTextures().rough,
      color: 0x9aa0a3, roughness: 0.62, metalness: 0.22,
    });
  }

  _buildSky() {
    const scene = this.scene;
    scene.fog = new THREE.FogExp2(0x080f16, 0.017);
    scene.background = new THREE.Color(0x050a10);

    const skyGeo = new THREE.SphereGeometry(260, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x02060b) },
        mid: { value: new THREE.Color(0x0b1a28) },
        bottom: { value: new THREE.Color(0x23323c) },
        moonDir: { value: new THREE.Vector3(-0.55, 0.45, -0.7).normalize() },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 moonDir;
        void main(){
          float h = clamp(vDir.y*0.5+0.5, 0.0, 1.0);
          vec3 col = mix(bottom, mid, smoothstep(0.42,0.62,h));
          col = mix(col, top, smoothstep(0.6,0.95,h));
          float moon = pow(max(dot(normalize(vDir), moonDir), 0.0), 220.0);
          col += vec3(0.7,0.78,0.9) * moon * 1.5;
          float haze = pow(1.0-abs(vDir.y), 7.0);
          col += vec3(0.16,0.19,0.18) * haze * 0.4;
          gl_FragColor = vec4(col,1.0);
        }`,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // stars
    const starCount = 900;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = Math.random() * 0.62 + 0.18;
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 240;
      pos[i * 3 + 1] = y * 240;
      pos[i * 3 + 2] = Math.sin(a) * r * 240;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xbcd2e6, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false,
    }));
    scene.add(stars);

    // moon glow sprite
    const moonTex = glowTexture('rgba(180,205,235,1)');
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: moonTex, color: 0xdde8ff, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.9, fog: false,
    }));
    moon.position.set(-95, 82, -125);
    moon.scale.set(34, 34, 1);
    scene.add(moon);
    const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(240,248,255,1)'), color: 0xffffff, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9, fog: false,
    }));
    moonCore.position.copy(moon.position).add(new THREE.Vector3(0, 0, 1));
    moonCore.scale.set(9, 9, 1);
    scene.add(moonCore);

    // distant city silhouette
    const city = new THREE.Group();
    const win = windowTexture(2);
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2 + Math.random() * 0.1;
      const rad = 92 + Math.random() * 48;
      const h = 9 + Math.random() * 36;
      const w = 6 + Math.random() * 12;
      const b = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({
        color: 0x0b1218, roughness: 0.9, metalness: 0.2,
        map: cloneTex(win, Math.max(1, w / 5), Math.max(1, h / 8)),
        emissiveMap: cloneTex(win, Math.max(1, w / 5), Math.max(1, h / 8)),
        emissive: 0x8fa4b4, emissiveIntensity: 0.5,
      }));
      b.position.set(Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
      b.scale.set(w, h, w);
      b.rotation.y = -a;
      city.add(b);
      if (Math.random() < 0.6) {
        const beacon = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture('rgba(255,70,50,1)'), color: 0xff4a32, transparent: true,
          depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9, fog: false,
        }));
        beacon.position.set(b.position.x, h + 1.5, b.position.z);
        beacon.scale.set(3, 3, 1);
        city.add(beacon);
      }
    }
    scene.add(city);

    // lighting
    const hemi = new THREE.HemisphereLight(0x7294b5, 0x17120d, 0.55);
    scene.add(hemi);
    const moonLight = new THREE.DirectionalLight(0xa8c4e8, 1.75);
    moonLight.position.set(-32, 46, -40);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.left = -42;
    moonLight.shadow.camera.right = 42;
    moonLight.shadow.camera.top = 42;
    moonLight.shadow.camera.bottom = -42;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 130;
    moonLight.shadow.bias = -0.0008;
    moonLight.shadow.normalBias = 0.03;
    scene.add(moonLight);
    this.moonLight = moonLight;
  }

  _buildArena() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), this.matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;

    // outer walls
    const wallH = 9;
    const wallSpecs = [
      [0, -32.4, 66, wallH, 1.0],
      [0, 32.4, 66, wallH, 1.0],
      [-32.4, 0, 1.0, wallH, 66],
      [32.4, 0, 1.0, wallH, 66],
    ];
    for (const [x, z, w, h, d] of wallSpecs) {
      const wall = new THREE.Mesh(BOX, this.matConcreteDark);
      wall.position.set(x, h / 2, z);
      wall.scale.set(w, h, d);
      wall.receiveShadow = true;
      wall.castShadow = true;
      this.scene.add(wall);
      this.addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, h);
    }

    // wall panel ribs + upper trim
    for (let i = -30; i <= 30; i += 6) {
      for (const side of [-1, 1]) {
        const ribZ = new THREE.Mesh(BOX, this.matMetalDark);
        ribZ.position.set(i, 4.5, side * 31.7);
        ribZ.scale.set(0.28, 9, 0.5);
        ribZ.castShadow = true;
        this.scene.add(ribZ);
        const ribX = new THREE.Mesh(BOX, this.matMetalDark);
        ribX.position.set(side * 31.7, 4.5, i);
        ribX.scale.set(0.5, 9, 0.28);
        ribX.castShadow = true;
        this.scene.add(ribX);
      }
    }
    // lower hazard skirting
    for (const [x, z, w, d] of [[0, -31.86, 64, 0.12], [0, 31.86, 64, 0.12], [-31.86, 0, 0.12, 64], [31.86, 0, 0.12, 64]]) {
      const strip = new THREE.Mesh(BOX, this.matHazard);
      strip.position.set(x, 0.45, z);
      strip.scale.set(w, 0.9, d);
      this.scene.add(strip);
    }
    // catwalk rim
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(BOX, this.matMetalDark);
      walk.position.set(0, 5.3, side * 30.7);
      walk.scale.set(64, 0.2, 2.4);
      walk.castShadow = true;
      this.scene.add(walk);
      const walkX = new THREE.Mesh(BOX, this.matMetalDark);
      walkX.position.set(side * 30.7, 5.3, 0);
      walkX.scale.set(2.4, 0.2, 64);
      walkX.castShadow = true;
      this.scene.add(walkX);
    }
    // railing posts
    for (let i = -30; i <= 30; i += 4) {
      for (const side of [-1, 1]) {
        const postZ = new THREE.Mesh(BOX, this.matMetal);
        postZ.position.set(i, 6.05, side * 29.6);
        postZ.scale.set(0.09, 1.5, 0.09);
        this.scene.add(postZ);
        const postX = new THREE.Mesh(BOX, this.matMetal);
        postX.position.set(side * 29.6, 6.05, i);
        postX.scale.set(0.09, 1.5, 0.09);
        this.scene.add(postX);
      }
    }
    for (const [x, z, w, d] of [[0, 29.6, 61, 0.06], [0, -29.6, 61, 0.06], [29.6, 0, 0.06, 61], [-29.6, 0, 0.06, 61]]) {
      const rail = new THREE.Mesh(BOX, this.matMetal);
      rail.position.set(x, 6.7, z);
      rail.scale.set(w, 0.07, d);
      this.scene.add(rail);
    }

    // subtle floor light strips
    this.floorLights = [];
    for (const [x, z, w, d] of [
      [-20, 12, 5, 0.12], [20, 12, 5, 0.12],
      [-10, -19, 0.12, 5], [10, -19, 0.12, 5],
      [-20, -6, 4, 0.1], [20, -6, 4, 0.1],
    ]) {
      const strip = new THREE.Mesh(BOX, this.matAmber.clone());
      strip.material.emissiveIntensity = 1.4;
      strip.position.set(x, 0.025, z);
      strip.scale.set(w, 0.03, d);
      this.scene.add(strip);
      this.floorLights.push(strip);
    }

    // puddles
    for (let i = 0; i < 16; i++) {
      const r = 0.8 + Math.random() * 2.6;
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 24), this.matPuddle);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = Math.random() * Math.PI;
      puddle.scale.y = 0.4 + Math.random() * 0.7;
      puddle.position.set((Math.random() - 0.5) * 54, 0.012, (Math.random() - 0.5) * 54);
      this.scene.add(puddle);
    }

    // painted floor decals
    const decal = (text, x, z, w, h, rot = 0, accent = '#c69a3e') => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
          map: signTexture(text, '', accent), transparent: false, roughness: 0.7,
          metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rot;
      mesh.position.set(x, 0.02, z);
      this.scene.add(mesh);
    };
    decal('CAUTION', -13, 13, 5, 1.25, 0.04);
    decal('SECTOR 07', 14, -12, 5.6, 1.25, Math.PI + 0.04);
    decal('AUTHORIZED', -14, -13, 5.6, 1.25, -0.03, '#9fb6c4');
  }

  _buildStructures() {
    // central reactor plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.9, 1.2, 8), this.matConcreteDark);
    plinth.position.set(0, 0.6, -1);
    plinth.castShadow = true; plinth.receiveShadow = true;
    this.scene.add(plinth);
    this.addCollider(-4.9, -5.9, 4.9, 3.9, 0, 1.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.09, 8, 64), this.matAmber);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.22, -1);
    this.scene.add(ring);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.9, 0.5, 8), this.matMetalDark);
    cap.position.set(0, 1.45, -1);
    this.scene.add(cap);
    this.holo = new THREE.Group();
    this.holo.position.set(0, 3.1, -1);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshBasicMaterial({
      color: 0x55e4ff, wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
    }));
    this.holo.add(core);
    const coreGlow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshBasicMaterial({
      color: 0x2fc8e6, wireframe: true, transparent: true, opacity: 0.85,
    }));
    coreGlow.scale.setScalar(0.62);
    this.holo.add(coreGlow);
    this.holoCore = core;
    this.holoCoreGlow = coreGlow;
    const ring2 = new THREE.Mesh(TORUS, new THREE.MeshBasicMaterial({
      color: 0x6ee9ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
    }));
    ring2.scale.setScalar(2.2);
    ring2.rotation.x = 1.2;
    this.holo.add(ring2);
    const ring3 = new THREE.Mesh(TORUS, new THREE.MeshBasicMaterial({
      color: 0x6ee9ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending,
    }));
    ring3.scale.setScalar(2.8);
    ring3.rotation.x = 2.1; ring3.rotation.y = 0.5;
    this.holo.add(ring3);
    this.holoRing2 = ring2;
    this.holoRing3 = ring3;
    const projector = new THREE.PointLight(0x54e6ff, 16, 16, 1.7);
    projector.position.set(0, 2.4, -1);
    this.scene.add(projector);
    this.projector = projector;
    this.scene.add(this.holo);

    // 4 corner sentinel pillars
    for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) {
      const base = new THREE.Mesh(BOX, this.matConcreteDark);
      base.position.set(x, 1.2, z);
      base.scale.set(3.4, 2.4, 3.4);
      base.castShadow = true; base.receiveShadow = true;
      this.scene.add(base);
      this.addCollider(x - 1.7, z - 1.7, x + 1.7, z + 1.7, 0, 2.4);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 6.4, 8), this.matMetalDark);
      tower.position.set(x, 5.2, z);
      tower.castShadow = true;
      this.scene.add(tower);
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12), this.matRed);
      light.position.set(x, 8.5, z);
      this.scene.add(light);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,80,55,1)'), color: 0xff5a35, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7,
      }));
      glow.position.set(x, 8.55, z);
      glow.scale.set(4, 4, 1);
      this.scene.add(glow);
    }
  }

  _buildProps() {
    // utility containers
    const containerData = [
      [-20.5, -12, 6.4, 2.7, 2.6, 0],
      [20.5, -14, 6.4, 2.7, 2.6, 0],
      [-19.5, 13, 6.4, 2.7, 2.6, 0],
      [20.5, 10, 2.6, 2.7, 6.4, 0],
    ];
    for (const [x, z, w, h, d] of containerData) {
      const c = new THREE.Group();
      const body = new THREE.Mesh(BOX, this.matMetal);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      body.castShadow = true; body.receiveShadow = true;
      c.add(body);
      // ribs
      const ribs = Math.floor((w > d ? w : d) / 0.7);
      for (let i = 0; i < ribs; i++) {
        const rib = new THREE.Mesh(BOX, this.matMetalDark);
        if (w > d) {
          rib.scale.set(0.09, h * 0.88, d + 0.06);
          rib.position.set(-w / 2 + (i + 0.5) * (w / ribs), h / 2, 0);
        } else {
          rib.scale.set(w + 0.06, h * 0.88, 0.09);
          rib.position.set(0, h / 2, -d / 2 + (i + 0.5) * (d / ribs));
        }
        c.add(rib);
      }
      const stripe = new THREE.Mesh(BOX, this.matHazard);
      stripe.scale.set(w + 0.02, 0.22, d + 0.02);
      stripe.position.y = 0.3;
      c.add(stripe);
      const top = new THREE.Mesh(BOX, this.matMetalDark);
      top.scale.set(w + 0.08, 0.1, d + 0.08);
      top.position.y = h;
      c.add(top);
      c.position.set(x, 0, z);
      this.scene.add(c);
      this.addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, h);
    }

    // supply crates (some stacked)
    const crates = [
      [-10, 6, 2.2, 0], [10, 6, 2.2, 0], [-13, -6, 2.4, 0], [13, -6, 2.4, 0],
      [6, -15, 2.0, 0], [-6, -15, 2.2, 0], [16, 14, 2.4, 0], [-16, 15, 2.2, 0],
      [-9.6, 15, 1.8, 0], [9.6, 15, 1.9, 0], [-7.6, 6, 1.6, 0], [7.6, 6, 1.6, 0],
    ];
    for (const [x, z, s] of crates) {
      this._addCrate(x, z, s, 0);
    }
    // stacked pairs
    this._addCrate(-10, 6, 1.5, 2.2);
    this._addCrate(10, 6, 1.5, 2.2);
    this._addCrate(16, 14, 1.7, 2.4);
    this._addCrate(-13, -6, 1.6, 2.4);

    // concrete barriers
    const barriers = [
      [-7, 10, 4.0, 0], [7, 10, 4.0, 0], [-15, 2, 3.6, Math.PI / 2],
      [15, -1, 3.6, Math.PI / 2], [-4, -10, 4.0, 0], [4, -10, 4.0, 0],
      [23, 4, 3.4, Math.PI / 2], [-23, -2, 3.4, Math.PI / 2],
    ];
    for (const [x, z, w, rot] of barriers) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(BOX, this.matConcrete);
      body.scale.set(w, 1.15, 0.62);
      body.position.y = 0.575;
      body.castShadow = true; body.receiveShadow = true;
      g.add(body);
      const cap = new THREE.Mesh(BOX, this.matHazard);
      cap.scale.set(w + 0.02, 0.22, 0.66);
      cap.position.y = 1.06;
      g.add(cap);
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.scene.add(g);
      const sw = Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * 0.62;
      const sd = Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * 0.62;
      this.addCollider(x - sw / 2, z - sd / 2, x + sw / 2, z + sd / 2, 0, 1.15);
    }

    // barrels
    for (const [x, z] of [[-5.5, 2.5], [-4.6, 1.9], [11.7, -9.4], [12.6, -9.1], [17.5, -3.4], [-17.2, 8.5], [-18, 9.4]]) {
      const barrel = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.25, 16), this.matMetalDark);
      b.position.y = 0.625; b.castShadow = true; b.receiveShadow = true;
      barrel.add(b);
      for (const y of [0.25, 1.0]) {
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 16), this.matAmber);
        rim.position.y = y;
        barrel.add(rim);
      }
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 16), this.matBlack);
      lid.position.y = 1.26;
      barrel.add(lid);
      barrel.position.set(x, 0, z);
      this.scene.add(barrel);
      this.addCollider(x - 0.47, z - 0.47, x + 0.47, z + 0.47, 0, 1.3);
    }

    // generator units
    for (const [x, z, rot] of [[-27, 5, 0], [27, -4, Math.PI], [5, -27, Math.PI / 2], [-5, 27, -Math.PI / 2]]) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(BOX, this.matMetal);
      body.scale.set(3.4, 1.7, 1.5);
      body.position.y = 0.85; body.castShadow = true;
      g.add(body);
      for (let i = 0; i < 4; i++) {
        const vent = new THREE.Mesh(BOX, this.matBlack);
        vent.scale.set(0.55, 0.75, 0.08);
        vent.position.set(-1.1 + i * 0.72, 0.9, 0.78);
        g.add(vent);
      }
      const light = new THREE.Mesh(BOX, this.matCyan);
      light.scale.set(1.3, 0.06, 0.06);
      light.position.set(0, 1.45, 0.8);
      g.add(light);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), this.matRubber);
      cable.rotation.z = Math.PI / 2;
      cable.position.set(2.6, 0.18, 0.4);
      g.add(cable);
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.scene.add(g);
      this.addCollider(x - 1.75, z - 0.8, x + 1.75, z + 0.8, 0, 1.7);
    }

    // terminals with glowing screens
    for (const [x, z, rot, label] of [[-25, 20, Math.PI / 2, 'SECURITY'], [25, 20, -Math.PI / 2, 'CONTROL'], [-25, -20, Math.PI / 2, 'BIOHAZARD']]) {
      const t = new THREE.Group();
      const desk = new THREE.Mesh(BOX, this.matMetalDark);
      desk.scale.set(2.2, 1.05, 0.8); desk.position.y = 0.525; desk.castShadow = true;
      t.add(desk);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.6), new THREE.MeshBasicMaterial({
        map: signTexture(label, 'SYSTEM LINK // ACTIVE', '#5fd9e8'), toneMapped: false,
      }));
      screen.position.set(0, 1.42, 0);
      screen.rotation.x = -0.18;
      t.add(screen);
      const stand = new THREE.Mesh(BOX, this.matBlack);
      stand.scale.set(0.1, 0.45, 0.1); stand.position.y = 1.05;
      t.add(stand);
      const glow = new THREE.PointLight(0x54d7e8, 2.4, 6, 2);
      glow.position.set(0, 1.4, 0.4);
      t.add(glow);
      t.position.set(x, 0, z);
      t.rotation.y = rot;
      this.scene.add(t);
      this.addCollider(x - 1.1, z - 0.5, x + 1.1, z + 0.5, 0, 1.1);
    }

    // pipes along back wall
    for (let i = 0; i < 3; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 58, 10), this.matMetalDark);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 3.6 + i * 0.55, -30.6 + i * 0.35);
      pipe.castShadow = true;
      this.scene.add(pipe);
    }
    for (let i = 0; i < 3; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 58, 10), this.matMetalDark);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 3.6 + i * 0.55, 30.6 - i * 0.35);
      this.scene.add(pipe);
    }

    // warning signage on walls
    const signs = [
      [-18, 6.4, -31.25, 0, 'RESTRICTED', 'LEVEL 4 CLEARANCE', '#e0a63f'],
      [16, 6.4, -31.25, 0, 'SECTOR 07', 'BLACKSITE FACILITY', '#65d6e6'],
      [-31.25, 6.4, 10, Math.PI / 2, 'BIOHAZARD', 'CONTAINMENT ACTIVE', '#ef6a52'],
      [31.25, 6.4, -12, -Math.PI / 2, 'AUTHORIZED', 'PERSONNEL ONLY', '#9fb6c4'],
    ];
    for (const [x, y, z, rot, a, b, color] of signs) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), new THREE.MeshBasicMaterial({
        map: signTexture(a, b, color), toneMapped: false,
      }));
      mesh.position.set(x, y, z);
      mesh.rotation.y = rot;
      this.scene.add(mesh);
      const glow = new THREE.PointLight(new THREE.Color(color), 1.8, 7, 2);
      glow.position.set(x, y, z + (z < 0 ? 1 : -1));
      this.scene.add(glow);
    }

    // lamp posts with warm pools of light
    for (const [x, z, warm] of [[-16, 16, true], [16, 16, true], [-16, -16, false], [16, -16, true]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.2, 8), this.matMetalDark);
      pole.position.set(x, 2.6, z);
      pole.castShadow = true;
      this.scene.add(pole);
      const arm = new THREE.Mesh(BOX, this.matMetalDark);
      arm.scale.set(1.5, 0.08, 0.08);
      arm.position.set(x + 0.65, 5.15, z);
      this.scene.add(arm);
      const head = new THREE.Mesh(BOX, this.matBlack);
      head.scale.set(0.55, 0.15, 0.4);
      head.position.set(x + 1.3, 5.1, z);
      this.scene.add(head);
      const lamp = new THREE.Mesh(BOX, (warm ? this.matAmber : this.matCyan).clone());
      lamp.scale.set(0.42, 0.03, 0.28);
      lamp.position.set(x + 1.3, 5.01, z);
      this.scene.add(lamp);
      const light = new THREE.PointLight(warm ? 0xffb257 : 0x74dbff, 22, 17, 1.8);
      light.position.set(x + 1.3, 4.85, z);
      this.scene.add(light);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(warm ? 'rgba(255,170,80,1)' : 'rgba(100,220,255,1)'),
        color: warm ? 0xffb257 : 0x74dbff, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.85,
      }));
      glow.position.set(x + 1.3, 4.95, z);
      glow.scale.set(3.4, 3.4, 1);
      this.scene.add(glow);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 20, 1, true), new THREE.MeshBasicMaterial({
        color: warm ? 0xffb257 : 0x74dbff, transparent: true, opacity: 0.035,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      cone.position.set(x + 1.3, 2.55, z);
      this.scene.add(cone);
      // glowing dust motes
      const count = 22;
      const p = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        p[i * 3] = x + 1.3 + (Math.random() - 0.5) * 3.2;
        p[i * 3 + 1] = 1 + Math.random() * 4;
        p[i * 3 + 2] = z + (Math.random() - 0.5) * 3.2;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const motes = new THREE.Points(pg, new THREE.PointsMaterial({
        color: warm ? 0xffc477 : 0x9be7ff, size: 0.035, transparent: true,
        opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      this.scene.add(motes);
      this.animated.push({ kind: 'motes', obj: motes, base: p.slice(), seed: Math.random() * 10 });
    }

    // rooftop searchlights beyond walls
    for (const [x, z, phase] of [[-46, -60, 0], [55, -45, 2.1], [40, 58, 4.2]]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 65, 24, 1, true), new THREE.MeshBasicMaterial({
        color: 0xb9d6ea, transparent: true, opacity: 0.026, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      beam.position.set(x, 30, z);
      beam.rotation.z = 0.5;
      beam.rotation.y = phase;
      this.scene.add(beam);
      this.animated.push({ kind: 'searchlight', obj: beam, phase });
    }

    // scattered floor debris
    for (let i = 0; i < 70; i++) {
      const d = new THREE.Mesh(BOX, Math.random() < 0.5 ? this.matMetalDark : this.matRubber);
      d.scale.set(0.08 + Math.random() * 0.22, 0.03 + Math.random() * 0.05, 0.08 + Math.random() * 0.3);
      d.position.set((Math.random() - 0.5) * 55, 0.025, (Math.random() - 0.5) * 55);
      d.rotation.y = Math.random() * Math.PI;
      this.scene.add(d);
    }

    // center catwalk supports / arch above reactor
    for (const [x, z] of [[-6.5, -2], [6.5, -2]]) {
      const beam = new THREE.Mesh(BOX, this.matMetalDark);
      beam.scale.set(0.35, 7.2, 0.35);
      beam.position.set(x, 3.6, z);
      beam.castShadow = true;
      this.scene.add(beam);
      this.addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 0, 7.2);
    }
    const arch = new THREE.Mesh(BOX, this.matMetalDark);
    arch.scale.set(13.4, 0.42, 0.5);
    arch.position.set(0, 7.1, -2);
    this.scene.add(arch);
    const archLight = new THREE.Mesh(BOX, this.matCyan);
    archLight.scale.set(9, 0.06, 0.52);
    archLight.position.set(0, 6.86, -2);
    this.scene.add(archLight);
  }

  _addCrate(x, z, size, y = 0) {
    const c = new THREE.Mesh(BOX, this.matCrate);
    c.scale.set(size, size, size);
    c.position.set(x, y + size / 2, z);
    c.castShadow = true; c.receiveShadow = true;
    c.rotation.y = 0;
    this.scene.add(c);
    this.addCollider(x - size / 2, z - size / 2, x + size / 2, z + size / 2, y, y + size);
    // top edge trim
    const trim = new THREE.Mesh(BOX, this.matMetalDark);
    trim.scale.set(size + 0.04, 0.07, size + 0.04);
    trim.position.set(x, y + size, z);
    this.scene.add(trim);
  }

  _buildAtmosphere() {
    // low ground fog planes
    const fogMat = new THREE.MeshBasicMaterial({
      color: 0x6a8597, transparent: true, opacity: 0.028, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, map: softParticleTexture(), fog: false,
    });
    for (let i = 0; i < 10; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), fogMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set((Math.random() - 0.5) * 48, 0.22 + Math.random() * 0.22, (Math.random() - 0.5) * 48);
      this.scene.add(plane);
      this.animated.push({ kind: 'fog', obj: plane, seed: Math.random() * 10 });
    }

    // ambient hanging cable + lamps above reactor? decorative cables
    for (const [x1, z1, x2, z2] of [[-32, -32, 0, -2], [32, -32, 0, -2], [-32, 32, 0, -2], [32, 32, 0, -2]]) {
      const a = new THREE.Vector3(x1, 8.8, z1);
      const b = new THREE.Vector3(x2, 7.4, z2);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y -= 1.4;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const geo = new THREE.TubeGeometry(curve, 16, 0.025, 4, false);
      const cable = new THREE.Mesh(geo, this.matRubber);
      this.scene.add(cable);
    }
  }

  _buildPortals() {
    const points = [
      [-27, 26], [27, 26], [-27, 6], [27, 6],
      [-27, -14], [27, -14], [-12, -27], [12, -27],
    ];
    for (const [x, z] of points) {
      const g = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.08, 20), this.matMetalDark);
      pad.position.y = 0.04;
      g.add(pad);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.055, 8, 48), this.matRed.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      ring.material.emissiveIntensity = 2.4;
      g.add(ring);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.96, 32), new THREE.MeshBasicMaterial({
        color: 0xff3b24, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      }));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.1;
      g.add(inner);
      for (let i = 0; i < 4; i++) {
        const post = new THREE.Mesh(BOX, this.matMetalDark);
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        post.position.set(Math.cos(a) * 1.35, 0.85, Math.sin(a) * 1.35);
        post.scale.set(0.11, 1.7, 0.11);
        post.rotation.y = a;
        g.add(post);
        const tip = new THREE.Mesh(BOX, this.matRed.clone());
        tip.position.set(Math.cos(a) * 1.35, 1.65, Math.sin(a) * 1.35);
        tip.scale.set(0.09, 0.12, 0.09);
        g.add(tip);
      }
      const light = new THREE.PointLight(0xff3b24, 1.2, 5, 2);
      light.position.y = 0.9;
      g.add(light);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.portals.push({ group: g, ring, inner, light, phase: Math.random() * Math.PI * 2 });
      this.spawns.push(new THREE.Vector3(x, 0, z));
    }
  }

  _buildRain() {
    const count = 1500;
    const positions = new Float32Array(count * 6);
    const drops = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 70;
      const y = Math.random() * 24 + 1;
      const z = (Math.random() - 0.5) * 70;
      const len = 0.35 + Math.random() * 0.5;
      const speed = 24 + Math.random() * 16;
      drops.push({ x, y, z, len, speed });
      positions[i * 6] = x; positions[i * 6 + 1] = y; positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x; positions[i * 6 + 4] = y + len; positions[i * 6 + 5] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x9fc3d8, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
    this.rainDrops = drops;
  }

  addCollider(minX, minZ, maxX, maxZ, minY, maxY) {
    this.colliders.push({ minX, minZ, maxX, maxZ, minY, maxY });
  }

  collide(pos, radius, feetY = 0) {
    let hit = false;
    for (const c of this.colliders) {
      if (feetY + 1.65 < c.minY || feetY > c.maxY) continue;
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > radius * radius) continue;
      hit = true;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      } else {
        // center inside box: push out nearest face
        const left = pos.x - c.minX;
        const right = c.maxX - pos.x;
        const back = pos.z - c.minZ;
        const front = c.maxZ - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = c.minX - radius;
        else if (m === right) pos.x = c.maxX + radius;
        else if (m === back) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
    pos.x = Math.max(-30.8, Math.min(30.8, pos.x));
    pos.z = Math.max(-30.8, Math.min(30.8, pos.z));
    return hit;
  }

  raycastWalls(origin, dir, maxDist = 200) {
    let best = maxDist;
    let normal = new THREE.Vector3(0, 1, 0);
    let hit = false;
    const invX = 1 / (dir.x || 1e-9);
    const invY = 1 / (dir.y || 1e-9);
    const invZ = 1 / (dir.z || 1e-9);
    for (const c of this.colliders) {
      let t1 = (c.minX - origin.x) * invX;
      let t2 = (c.maxX - origin.x) * invX;
      let tmin = Math.min(t1, t2);
      let tmax = Math.max(t1, t2);
      let axis = 0;
      t1 = (c.minY - origin.y) * invY;
      t2 = (c.maxY - origin.y) * invY;
      let nmin = Math.min(t1, t2);
      let nmax = Math.max(t1, t2);
      if (nmin > tmin) { tmin = nmin; axis = 1; }
      if (nmax < tmax) tmax = nmax;
      if (tmax < tmin) continue;
      t1 = (c.minZ - origin.z) * invZ;
      t2 = (c.maxZ - origin.z) * invZ;
      nmin = Math.min(t1, t2);
      nmax = Math.max(t1, t2);
      if (nmin > tmin) { tmin = nmin; axis = 2; }
      if (nmax < tmax) tmax = nmax;
      if (tmax < tmin || tmax < 0) continue;
      const t = tmin >= 0 ? tmin : tmax;
      if (t < best) {
        best = t;
        hit = true;
        normal.set(0, 0, 0);
        if (axis === 0) normal.x = dir.x > 0 ? -1 : 1;
        else if (axis === 1) normal.y = dir.y > 0 ? -1 : 1;
        else normal.z = dir.z > 0 ? -1 : 1;
      }
    }
    // floor
    if (dir.y < -1e-5) {
      const t = -origin.y / dir.y;
      if (t > 0 && t < best) {
        best = t; hit = true; normal.set(0, 1, 0);
      }
    }
    return hit ? { distance: best, normal, point: origin.clone().addScaledVector(dir, best) } : null;
  }

  pointBlocked(p) {
    for (const c of this.colliders) {
      if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && p.y > c.minY && p.y < c.maxY) return true;
    }
    return false;
  }

  lineOfSight(a, b) {
    const dir = b.clone().sub(a);
    const dist = dir.length();
    if (dist < 0.01) return true;
    dir.normalize();
    const hit = this.raycastWalls(a, dir, dist - 0.1);
    return !hit;
  }

  update(dt, time, camera) {
    this.time = time;
    // rain
    const arr = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < this.rainDrops.length; i++) {
      const d = this.rainDrops[i];
      d.y -= d.speed * dt;
      if (d.y < 0.2) {
        d.y = 20 + Math.random() * 8;
        d.x = (Math.random() - 0.5) * 70;
        d.z = (Math.random() - 0.5) * 70;
      }
      arr[i * 6] = d.x; arr[i * 6 + 1] = d.y; arr[i * 6 + 2] = d.z;
      arr[i * 6 + 3] = d.x + 0.02; arr[i * 6 + 4] = d.y + d.len; arr[i * 6 + 5] = d.z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;

    // holo
    this.holo.rotation.y += dt * 0.35;
    this.holoCore.rotation.x += dt * 0.5;
    this.holoCoreGlow.rotation.y -= dt * 0.85;
    this.holoRing2.rotation.z += dt * 0.65;
    this.holoRing3.rotation.y += dt * 0.42;
    const flicker = 0.82 + Math.sin(time * 17.3) * 0.05 + Math.sin(time * 3.2) * 0.1;
    this.holoCore.material.opacity = 0.45 * flicker;
    this.projector.intensity = 13 + Math.sin(time * 2.1) * 2.5;

    // portals
    for (const p of this.portals) {
      const pulse = 0.5 + Math.sin(time * 3 + p.phase) * 0.5;
      p.ring.material.emissiveIntensity = 1.6 + pulse * 2.2;
      p.inner.material.opacity = 0.07 + pulse * 0.1;
      p.light.intensity = 0.8 + pulse * 1.2;
    }

    // animated bits
    for (const a of this.animated) {
      if (a.kind === 'searchlight') {
        a.obj.rotation.y = a.phase + Math.sin(time * 0.12 + a.phase) * 0.7;
        a.obj.rotation.z = 0.42 + Math.sin(time * 0.19 + a.phase) * 0.12;
      } else if (a.kind === 'fog') {
        a.obj.position.x += Math.sin(time * 0.05 + a.seed) * dt * 0.12;
        a.obj.position.y = 0.22 + Math.sin(time * 0.2 + a.seed) * 0.06;
        a.obj.material.opacity = 0.022 + Math.sin(time * 0.3 + a.seed) * 0.006;
      } else if (a.kind === 'motes') {
        const pos = a.obj.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i] = a.base[i] + Math.sin(time * 0.35 + a.seed + i) * 0.15;
          pos[i + 1] = a.base[i + 1] + Math.sin(time * 0.22 + i * 0.7) * 0.5;
          pos[i + 2] = a.base[i + 2] + Math.cos(time * 0.3 + a.seed + i) * 0.15;
        }
        a.obj.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  setQuality(q) {
    this.quality = q;
    const low = q === 'low';
    this.rain.visible = !low;
    this.moonLight.castShadow = !low;
    this.renderer.shadowMap.enabled = !low;
  }
}
