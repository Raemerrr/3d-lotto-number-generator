import { LotteryPhysics } from "./physics.js";
export class DrawSession {
  constructor(game, options = {}) {
    this.game = game;
    this.main = new LotteryPhysics({
      ...options,
      range: game.range,
      count: game.count,
    });
    this.extra = game.bonus
      ? new LotteryPhysics({
          ...options,
          range: game.bonus.range,
          count: game.bonus.count,
        })
      : null;
    this.reset();
  }
  get active() {
    return this.phase === "bonus" ? this.extra : this.main;
  }
  get state() {
    return this.active.state;
  }
  get running() {
    return this.active.running;
  }
  get numbers() {
    return this.main.numbers;
  }
  get bonus() {
    return this.extra?.numbers || [];
  }
  get drawnCount() {
    return this.numbers.length + this.bonus.length;
  }
  get totalCount() {
    return this.game.count + (this.game.bonus?.count || 0);
  }
  reset() {
    this.main.reset();
    this.extra?.reset();
    this.phase = "main";
  }
  start() {
    this.reset();
    this.main.start();
  }
  advance(delta) {
    this.active.advance(delta);
    if (this.phase === "main" && this.main.state === "COMPLETE" && this.extra) {
      this.phase = "bonus";
      this.extra.start();
    }
  }
}
