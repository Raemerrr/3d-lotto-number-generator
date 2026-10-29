import * as THREE from "three";
import { BALL_RADIUS, RADIUS, RAIL_POINTS, STEP } from "./physics.js";
export const ballColors = [0xe1a518, 0x287bc4, 0xd25545, 0x776992, 0x3e9568];
export class LotteryView {
  constructor(container, simulation, { low = false, reduced = false } = {}) {
    this.container = container;
    this.simulation = simulation;
    this.low = low;
    this.reduced = reduced;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x697965, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 12, 15);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8);
    rim.position.set(-12, 7, -4);
    this.scene.add(rim);
    const glass = new THREE.MeshPhongMaterial({
      color: 0xb1c7cd,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 90,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x294d3a,
      metalness: 0.2,
      roughness: 0.5,
    });
    this.mesh(
      new THREE.SphereGeometry(
        RADIUS,
        48,
        32,
        0,
        Math.PI * 2,
        0.18,
        Math.PI - 0.18,
      ),
      glass,
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b6550,
      transparent: true,
      opacity: 0.9,
    });
    for (const axis of ["x", "z"]) {
      const ring = this.mesh(
        new THREE.TorusGeometry(RADIUS, 0.025, 8, 96),
        ringMat,
      );
      ring.rotation[axis] = Math.PI / 2;
    }
    const base = this.mesh(
      new THREE.CylinderGeometry(4, 4.8, 0.7, 48),
      metal,
      [0, -6.4, 0],
    );
    this.mesh(
      new THREE.TorusGeometry(4.25, 0.06, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x22624c }),
      [0, -6.1, 0],
    ).rotation.x = Math.PI / 2;
    this.mesh(
      new THREE.CylinderGeometry(0.7, 1.05, 2.2, 32, 1, true),
      glass,
      [0, 7, 0],
    );
    this.gates = [6, 7.6].map((y, i) =>
      this.mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24),
        new THREE.MeshStandardMaterial({
          color: i ? 0xd1b77f : 0x22624c,
          emissive: 0x000000,
          roughness: 0.4,
        }),
        [0, y, 0],
      ),
    );
    const curve = new THREE.CubicBezierCurve3(
      ...RAIL_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    this.mesh(new THREE.TubeGeometry(curve, 64, 0.7, 24, false), glass);
    for (const sign of [-1, 1]) {
      const edgePoints = [];
      for (let i = 0; i <= 64; i++) {
        const t = i / 64,
          p = curve.getPoint(t),
          tangent = curve.getTangent(t);
        edgePoints.push(
          p.add(
            new THREE.Vector3(tangent.y, -tangent.x, 0).multiplyScalar(
              sign * 0.7,
            ),
          ),
        );
      }
      this.mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(edgePoints),
          64,
          0.025,
          6,
          false,
        ),
        ringMat,
      );
      const neck = new THREE.LineCurve3(
        new THREE.Vector3(sign * 1.05, 5.9, 0),
        new THREE.Vector3(sign * 0.7, 8.1, 0),
      );
      this.mesh(new THREE.TubeGeometry(neck, 1, 0.025, 6, false), ringMat);
      const stack = new THREE.LineCurve3(
        new THREE.Vector3(-9 + sign * 0.7, -4.25, 0),
        new THREE.Vector3(-9 + sign * 0.7, 5, 0),
      );
      this.mesh(new THREE.TubeGeometry(stack, 1, 0.025, 6, false), ringMat);
    }

    const rail = new THREE.CubicBezierCurve3(
      ...RAIL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    this.mesh(new THREE.TubeGeometry(rail, 64, 0.018, 8, false), ringMat);
    this.mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 9.25, 32, 1, true),
      glass,
      [-9, 0.375, 0],
    );
    this.mesh(
      new THREE.CylinderGeometry(1.05, 1.15, 0.3, 24),
      metal,
      [-9, -4.4, 0],
    );
    // Matching radii and vertical tangents join the neck, curve and stack tube.
    for (const [x, y, z] of [
      [0, 8.1, 0],
      [-9, 5, 0],
    ]) {
      const collar = this.mesh(
        new THREE.TorusGeometry(0.7, 0.055, 12, 48),
        metal,
        [x, y, z],
      );
      collar.rotation.x = Math.PI / 2;
    }
    const floor = this.mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshBasicMaterial({
        color: 0xdde0d5,
        transparent: true,
        opacity: 0.35,
      }),
      [-2, -6.85, 0],
    );
    floor.rotation.x = -Math.PI / 2;
    this.setSimulation(simulation);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }
  setSimulation(simulation, specialColor = null) {
    for (const group of this.meshes || []) {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
    }
    this.simulation = simulation;
    this.meshes = simulation.balls.map((ball) => {
      const group = new THREE.Group();
      const color =
        specialColor ||
        ballColors[Math.floor((ball.id - 1) / 10) % ballColors.length];
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.45,
          metalness: 0.02,
        }),
      );
      group.add(sphere);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fffef8";
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#263c32";
      ctx.font = "700 75px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ball.id, 64, 68);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      badge.scale.set(0.62, 0.62, 1);
      badge.position.set(-0.03, 0.045, 0.49);
      group.add(badge);
      this.scene.add(group);
      return group;
    });
  }
  mesh(geometry, material, position = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    this.scene.add(mesh);
    return mesh;
  }
  resize() {
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.low ? 1 : 1.75),
    );
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = Math.max(
      11.5 / Math.tan(vFov / 2),
      10.5 / (Math.tan(vFov / 2) * this.camera.aspect),
    );
    this.camera.position.set(-2.3, 5, distance);
    this.camera.lookAt(-2.3, 1.4, 0);
    this.camera.updateProjectionMatrix();
    this.render();
  }
  render() {
    const sim = this.simulation;
    const alpha = sim.running ? Math.min(1, sim.accumulator / STEP) : 1;
    this.meshes.forEach((mesh, i) => {
      const ball = sim.balls[i];
      mesh.visible = !(this.reduced && sim.running);
      mesh.position.lerpVectors(ball.previous, ball.body.position, alpha);
      // Number badges face the reader; physical rotation still runs in the engine.
    });
    this.gates[0].position.x =
      sim.state === "OPEN" ? Math.min(1, sim.elapsed / 0.25) * 2.4 : 0;
    this.gates[1].position.x =
      sim.state === "EJECT" ? Math.min(1, sim.elapsed / 0.15) * 2.4 : 0;
    this.renderer.render(this.scene, this.camera);
  }
}
