import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { particleVertexShader, particleFragmentShader } from "./shaders.js";
import { sampleParticlePosition, getHeatmapColor, getNeutronCount } from "./quantumMechanics.js";

export class AtomSimulator {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.controls = null;
    this.particleSystems = [];
    this.nucleusMesh = null;
    this.nucleusGlow = null;
    this.currentAtomData = null;

    this.DISPLAY_SCALE = 30;
    this.BASE_PARTICLES = 20000;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    this.camera.position.set(0, 30, 160);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    const ambient = new THREE.AmbientLight(0x404040, 3);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    window.addEventListener("resize", () => this.onWindowResize());
    this.animate();
  }

  loadAtom(atomData) {
    this.currentAtomData = atomData;
    this.clearScene();

    this.createNucleusCluster(atomData.atomicNumber, atomData.nucleus.color);

    atomData.orbitals.forEach((orbital) => {
      if (orbital.currentElectrons > 0) {
        this.createOrbitalCloud(orbital, atomData.atomicNumber);
      }
    });
  }

  reloadColors() {
    if (!this.currentAtomData) return;
    this.particleSystems.forEach((sys) => {
      const alphas = sys.geometry.attributes.alpha.array;
      const colors = sys.geometry.attributes.color.array;
      const count = alphas.length;
      for (let i = 0; i < count; i++) {
        const prob = alphas[i];
        const c = getHeatmapColor(prob);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      sys.geometry.attributes.color.needsUpdate = true;
    });
  }

  createNucleusCluster(Z, colorHex) {
    const N = getNeutronCount(Z);
    const totalNucleons = Z + N;

    const geo = new THREE.SphereGeometry(1, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.2,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, totalNucleons);
    this.nucleusMesh = mesh;
    this.scene.add(mesh);

    const dummy = new THREE.Object3D();
    const colorProton = new THREE.Color(colorHex);
    const colorNeutron = new THREE.Color(0xdddddd);

    const nucleonScale = 2.0; // Size of spheres
    const clusterRadius = Math.pow(totalNucleons, 1 / 3) * nucleonScale * 1.3;

    let i = 0;
    for (let p = 0; p < Z; p++) {
      this.setNucleonPosition(dummy, i, clusterRadius, nucleonScale);
      mesh.setColorAt(i, colorProton);
      i++;
    }
    for (let n = 0; n < N; n++) {
      this.setNucleonPosition(dummy, i, clusterRadius, nucleonScale);
      mesh.setColorAt(i, colorNeutron);
      i++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.createGlowTexture(),
      color: colorProton,
      transparent: true,
      opacity: 0.8, // Brighter
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(clusterRadius * 10, clusterRadius * 10, 1);
    this.nucleusGlow = sprite;
    this.scene.add(sprite);
  }

  setNucleonPosition(dummy, index, clusterRadius, scale) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = Math.pow(Math.random(), 0.33) * clusterRadius;

    dummy.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    this.nucleusMesh.setMatrixAt(index, dummy.matrix);
  }

  createGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  createOrbitalCloud(orbital, Z) {
    const n = orbital.n;
    const particleCount = this.BASE_PARTICLES * orbital.currentElectrons;

    const positions = [];
    const colors = [];
    const alphas = [];
    let maxDens = 0;
    const samples = [];

    for (let i = 0; i < particleCount; i++) {
      const sample = sampleParticlePosition(n, orbital.l, orbital.m, Z);
      samples.push(sample);
      if (sample.density > maxDens) maxDens = sample.density;
    }

    for (let i = 0; i < particleCount; i++) {
      const s = samples[i];
      positions.push(s.x * this.DISPLAY_SCALE, s.y * this.DISPLAY_SCALE, s.z * this.DISPLAY_SCALE);
      const normDens = s.density / maxDens;
      const color = getHeatmapColor(normDens);
      colors.push(color.r, color.g, color.b);
      alphas.push(normDens);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const system = new THREE.Points(geometry, material);
    this.particleSystems.push(system);
    this.scene.add(system);
  }

  clearScene() {
    this.particleSystems.forEach((sys) => {
      sys.geometry.dispose();
      sys.material.dispose();
      this.scene.remove(sys);
    });
    this.particleSystems = [];

    if (this.nucleusMesh) {
      this.nucleusMesh.dispose();
      this.scene.remove(this.nucleusMesh);
      this.nucleusMesh = null;
    }

    if (this.nucleusGlow) {
      this.nucleusGlow.material.map.dispose();
      this.nucleusGlow.material.dispose();
      this.scene.remove(this.nucleusGlow);
      this.nucleusGlow = null;
    }
  }

  onWindowResize() {
    if (!this.camera) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
