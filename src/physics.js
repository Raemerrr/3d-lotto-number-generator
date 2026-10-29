import * as CANNON from "cannon-es";

export const STEP = 1 / 60;
export const RADIUS = 6;
export const BALL_RADIUS = 0.44;
export const EXIT_RADIUS = 1.05;
export const RAIL_POINTS = [
  [0, 8.1, 0],
  [0, 11, 0],
  [-9, 11, 0],
  [-9, 5, 0],
];
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
export function railPoint(t) {
  const u = 1 - t;
  return [0, 1, 2].map(
    (i) =>
      u ** 3 * RAIL_POINTS[0][i] +
      3 * u * u * t * RAIL_POINTS[1][i] +
      3 * u * t * t * RAIL_POINTS[2][i] +
      t ** 3 * RAIL_POINTS[3][i],
  );
}

// No number is preselected: the first physical crossing of the aperture wins.
export class LotteryPhysics {
  constructor({ random = Math.random, range = 45, count = 6 } = {}) {
    if (
      !Number.isInteger(range) ||
      !Number.isInteger(count) ||
      range < 1 ||
      range > 90 ||
      count < 1 ||
      count > Math.min(range, 7)
    )
      throw new Error("Invalid draw configuration");
    this.range = range;
    this.count = count;
    this.random = random;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -16, 0) });
    this.world.solver.iterations = 12;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    const material = new CANNON.Material("ball");
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(material, material, {
        friction: 0.04,
        restitution: 0.55,
      }),
    );
    this.balls = Array.from({ length: this.range }, (_, i) => {
      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(BALL_RADIUS),
        material,
        linearDamping: 0.12,
        angularDamping: 0.25,
      });
      this.world.addBody(body);
      return { id: i + 1, body, previous: new CANNON.Vec3(), extracted: false };
    });
    this.reset();
  }
  get running() {
    return !["IDLE", "COMPLETE", "ERROR"].includes(this.state);
  }
  transition(state) {
    this.state = state;
    this.elapsed = 0;
  }
  reset() {
    this.transition("IDLE");
    this.time = 0;
    this.accumulator = 0;
    this.numbers = [];
    this.target = null;
    this.retries = 0;
    this.recoveries = 0;
    // Spaced lattice inside the chamber; shuffled independently of ball number.
    const positions = [];
    for (let y = -4; y <= 0; y += 1.1)
      for (let x = -3.3; x < 3.4; x += 1.1)
        for (let z = -3.3; z < 3.4; z += 1.1) {
          if (Math.hypot(x, y, z) < RADIUS - BALL_RADIUS - 0.1)
            positions.push([x, y, z]);
        }
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (const [i, ball] of this.balls.entries()) {
      const b = ball.body;
      if (!b.world) this.world.addBody(b);
      b.position.set(...positions[i]);
      b.previousPosition.copy(b.position);
      b.interpolatedPosition.copy(b.position);
      ball.previous.copy(b.position);
      b.velocity.setZero();
      b.angularVelocity.setZero();
      b.force.setZero();
      b.torque.setZero();
      b.quaternion.set(0, 0, 0, 1);
      b.aabbNeedsUpdate = true;
      b.wakeUp();
      ball.extracted = false;
    }
    this.world.broadphase.dirty = true;
  }
  start() {
    this.reset();
    this.transition("MIXING");
  }
  advance(delta) {
    if (!this.running) return;
    // A suspended tab never catches up minutes of physics on return.
    this.accumulator += Math.min(Math.max(delta, 0), 0.1);
    let steps = 0;
    while (this.accumulator + 1e-10 >= STEP && steps < 6 && this.running) {
      this.tick();
      this.accumulator = Math.max(0, this.accumulator - STEP);
      steps++;
    }
  }
  tick() {
    this.time += STEP;
    this.elapsed += STEP;
    for (const ball of this.balls) ball.previous.copy(ball.body.position);
    if (
      this.state === "MIXING" &&
      this.elapsed >= (this.numbers.length ? 0.65 : 1.6)
    )
      this.transition("OPEN");
    const open = this.state === "OPEN" && this.elapsed > 0.25;
    for (const ball of this.balls) {
      if (ball.extracted || ball === this.target) continue;
      const b = ball.body,
        p = b.position,
        v = b.velocity;
      const lift = p.y < -1 ? 42 : 12;
      let fx =
        -p.z * 2 +
        Math.sin(this.time * 2 + p.y) * 9 +
        (this.random() - 0.5) * 18;
      let fy = lift + Math.sin(this.time * 3 + p.x) * 8;
      let fz =
        p.x * 2 +
        Math.cos(this.time * 1.7 + p.y) * 9 +
        (this.random() - 0.5) * 18;
      if (open) {
        fy += 22;
        if (p.y > 0) {
          fx = -p.x * 15 - v.x * 5;
          fz = -p.z * 15 - v.z * 5;
          fy += 10;
        }
      }
      // Apply at the center of mass; relativePoint defaults to (0, 0, 0).
      b.applyForce(new CANNON.Vec3(fx, fy, fz));
      const speed = v.length();
      if (speed > 14) v.scale(14 / speed, v);
    }
    this.world.step(STEP);
    // Sort by crossing time, not number / iteration order, for same-step arrivals.
    const candidates = [];
    for (const ball of this.balls) {
      if (ball.extracted || ball === this.target) continue;
      const p = ball.body.position,
        prev = ball.previous;
      if (open && prev.y < 6.5 && p.y >= 6.5) {
        const t = (6.5 - prev.y) / (p.y - prev.y);
        if (
          Math.hypot(lerp(prev.x, p.x, t), lerp(prev.z, p.z, t)) <=
          EXIT_RADIUS - BALL_RADIUS
        )
          candidates.push({ ball, t });
      }
    }
    candidates.sort((a, b) => a.t - b.t);
    if (candidates.length) {
      this.target = candidates[0].ball;
      this.world.removeBody(this.target.body);
      this.origin = [...this.target.body.position.toArray()];
      this.target.body.velocity.setZero();
      this.transition("CAPTURE");
      this.retries = 0;
    }
    for (const ball of this.balls) {
      if (ball.extracted || ball === this.target) continue;
      const b = ball.body,
        p = b.position;
      const radial = Math.hypot(p.x, p.z);
      const corridor =
        open &&
        !this.target &&
        p.y > 5.2 &&
        radial <= EXIT_RADIUS - BALL_RADIUS;
      const length = p.length(),
        bound = RADIUS - BALL_RADIUS;
      if (!corridor && length > bound) {
        const n = p.scale(1 / length);
        p.copy(n.scale(bound));
        const outward = b.velocity.dot(n);
        if (outward > 0) b.velocity.vsub(n.scale(outward * 1.55), b.velocity);
        b.aabbNeedsUpdate = true;
      }
    }
    this.moveCaptured();
    if (this.state === "OPEN" && this.elapsed > 9) {
      this.recoveries++;
      if (++this.retries > 2) this.transition("ERROR");
      else this.transition("MIXING");
    }
    if (
      this.balls.some((b) => !b.body.position.toArray().every(Number.isFinite))
    )
      this.transition("ERROR");
  }
  moveCaptured() {
    if (!this.target) return;
    const p = this.target.body.position;
    if (this.state === "CAPTURE") {
      const t = smooth(Math.min(1, this.elapsed / 0.45));
      p.set(
        lerp(this.origin[0], 0, t),
        lerp(this.origin[1], 6.95, t),
        lerp(this.origin[2], 0, t),
      );
      if (t === 1) this.transition("EJECT");
    } else if (this.state === "EJECT") {
      const t = smooth(Math.min(1, this.elapsed / 0.5));
      p.set(0, lerp(6.95, 8.1, t), 0);
      if (t === 1) this.transition("RAIL");
    } else if (this.state === "RAIL") {
      const t = Math.min(1, this.elapsed / 1.35);
      p.set(...railPoint(smooth(t)));
      if (t === 1) this.transition("STACK");
    } else if (this.state === "STACK") {
      const t = smooth(Math.min(1, this.elapsed / 0.55));
      p.set(-9, lerp(5, -3.8 + this.numbers.length * 0.95, t), 0);
      if (t === 1) {
        this.target.extracted = true;
        this.numbers.push(this.target.id);
        this.target = null;
        this.transition(
          this.numbers.length === this.count ? "COMPLETE" : "MIXING",
        );
      }
    }
  }
}
