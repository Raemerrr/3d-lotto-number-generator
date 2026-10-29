import { DrawSession } from "./draw.js";
export class BatchDraw {
  constructor(game, options = {}) {
    this.game = game;
    this.options = options;
    this.session = new DrawSession(game, options);
    this.results = [];
    this.total = 1;
    this.active = false;
    this.wait = 0;
  }
  start(count = 1) {
    if (!Number.isInteger(count) || count < 1 || count > 5)
      throw new Error("Batch size must be 1–5");
    this.total = count;
    this.results = [];
    this.active = true;
    this.wait = 0;
    this.session.start();
  }
  stop() {
    this.active = false;
    this.wait = 0;
    this.session.reset();
  }
  reset() {
    this.stop();
    this.results = [];
  }
  advance(delta) {
    if (!this.active) return;
    if (this.session.state === "COMPLETE") {
      this.wait += Math.min(delta, 0.1);
      if (this.wait >= 1.5) {
        this.wait = 0;
        this.session.start();
      }
      return;
    }
    this.session.advance(delta);
    if (this.session.state === "COMPLETE") {
      this.results.push({
        numbers: [...this.session.numbers],
        bonus: [...this.session.bonus],
      });
      if (this.results.length === this.total) this.active = false;
    } else if (this.session.state === "ERROR") this.active = false;
  }
}
