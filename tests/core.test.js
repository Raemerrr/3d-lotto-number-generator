import test from "node:test";
import assert from "node:assert/strict";
import { LotteryPhysics, STEP, RADIUS, BALL_RADIUS } from "../src/physics.js";
import { translations, languages, resolveLocale } from "../src/i18n.js";
import {
  validNumbers,
  formatNumbers,
  readHistory,
  copyNumbers,
} from "../src/results.js";
function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function finish(sim, hz = 60) {
  for (let i = 0; i < hz * 90 && sim.running; i++) sim.advance(1 / hz);
  assert.equal(sim.state, "COMPLETE");
  assert.ok(validNumbers(sim.numbers));
  return sim;
}
test("100 seeded physical draws complete with 6 distinct in-range numbers and stable stacks", () => {
  let recoveries = 0,
    maximum = 0;
  const frequency = Array(45).fill(0);
  for (let seed = 1; seed <= 100; seed++) {
    const sim = new LotteryPhysics({ random: seeded(seed) });
    sim.start();
    finish(sim);
    maximum = Math.max(maximum, sim.time);
    recoveries += sim.recoveries;
    for (const n of sim.numbers) frequency[n - 1]++;
    const positions = sim.balls
      .filter((b) => b.extracted)
      .map((b) => b.body.position.toArray());
    sim.advance(30);
    assert.deepEqual(
      sim.balls
        .filter((b) => b.extracted)
        .map((b) => b.body.position.toArray()),
      positions,
    );
    assert.equal(sim.world.bodies.length, 39);
  }
  console.log(
    JSON.stringify({
      draws: 100,
      maximumSeconds: maximum,
      recoveries,
      frequency,
    }),
  );
});
test("30, 60 and 120 Hz produce identical draws and simulation time for the same seed", () => {
  const runs = [30, 60, 120].map((hz) => {
    const sim = new LotteryPhysics({ random: seeded(72) });
    sim.start();
    return finish(sim, hz);
  });
  for (const sim of runs.slice(1)) {
    assert.deepEqual(sim.numbers, runs[0].numbers);
    assert.ok(Math.abs(sim.time - runs[0].time) < STEP);
  }
});
test("reset from each active state restores bodies, motion and timers", () => {
  for (const state of [
    "MIXING",
    "OPEN",
    "CAPTURE",
    "EJECT",
    "RAIL",
    "STACK",
    "COMPLETE",
  ]) {
    const sim = new LotteryPhysics({ random: seeded(123) });
    sim.start();
    for (let i = 0; i < 5000 && sim.state !== state; i++) sim.advance(STEP);
    assert.equal(sim.state, state);
    sim.reset();
    assert.equal(sim.state, "IDLE");
    assert.equal(sim.world.bodies.length, 45);
    assert.equal(sim.target, null);
    assert.deepEqual(sim.numbers, []);
    for (const b of sim.balls) {
      assert.equal(b.body.velocity.length(), 0);
      assert.equal(b.body.force.length(), 0);
      assert.equal(b.body.angularVelocity.length(), 0);
      assert.ok(b.body.position.length() <= RADIUS - BALL_RADIUS);
    }
    sim.start();
    finish(sim);
  }
});
test("a stalled aperture retries then exposes an error instead of inventing a result", () => {
  const sim = new LotteryPhysics({ random: seeded(7) });
  sim.start();
  // Remove available physical balls to model a chamber with no eligible exit crossing.
  sim.balls.forEach((b) => {
    b.extracted = true;
    sim.world.removeBody(b.body);
  });
  for (let i = 0; i < 3000 && sim.running; i++) sim.advance(STEP);
  assert.equal(sim.state, "ERROR");
  assert.deepEqual(sim.numbers, []);
  assert.equal(sim.recoveries, 3);
});
test("large elapsed intervals are capped", () => {
  const sim = new LotteryPhysics();
  sim.start();
  sim.advance(300);
  assert.ok(sim.time <= 0.101);
});
test("formatting does not mutate physical draw order; malformed history is rejected", () => {
  const numbers = [45, 1, 12, 7, 32, 20];
  assert.equal(formatNumbers(numbers), "1, 7, 12, 20, 32, 45");
  assert.deepEqual(numbers, [45, 1, 12, 7, 32, 20]);
  assert.equal(validNumbers([1, 1, 2, 3, 4, 5]), false);
  assert.equal(validNumbers([0, 1, 2, 3, 4, 5]), false);
  assert.deepEqual(readHistory("broken"), []);
  assert.deepEqual(readHistory('{"numbers":[]}'), []);
  const date = new Date().toISOString();
  assert.equal(
    readHistory(
      JSON.stringify([
        { numbers, date },
        { numbers: [1], date },
        { numbers, date: "bad" },
      ]),
    ).length,
    1,
  );
  assert.equal(
    readHistory(JSON.stringify(Array(30).fill({ numbers, date }))).length,
    20,
  );
});
test("clipboard reports success only after a successful write", async () => {
  let actual;
  assert.equal(
    await copyNumbers("1, 2, 3", {
      writeText: async (text) => {
        actual = text;
      },
    }),
    true,
  );
  assert.equal(actual, "1, 2, 3");
  assert.equal(await copyNumbers("1", undefined), false);
  assert.equal(
    await copyNumbers("1", {
      writeText: async () => {
        throw new Error("denied");
      },
    }),
    false,
  );
});
test("all six dictionaries are complete; locale fallbacks support scripts and regional tags", () => {
  const keys = Object.keys(translations.en);
  for (const lang of Object.keys(languages)) {
    assert.deepEqual(Object.keys(translations[lang]), keys);
    assert.ok(
      Object.values(translations[lang]).every(
        (v) => typeof v === "string" && v.length > 0,
      ),
    );
  }
  for (const [input, expected] of [
    [["ko-KR"], "ko"],
    [["zh-TW"], "zh-hans"],
    [["hi-IN"], "hi"],
    [["en-IN"], "en"],
    [["fr", "ja-JP"], "ja"],
    [["fr"], "en"],
  ])
    assert.equal(resolveLocale(input), expected);
});

import { games, recommendGame, resolveGame, jackpotCombinations } from "../src/games.js";
import { DrawSession } from "../src/draw.js";
import { formatResult } from "../src/results.js";
test("all game profiles complete physical main and separate extra pools", () => {
  const stats = [];
  for (const [id, game] of Object.entries(games)) {
    for (let seed = 1; seed <= 20; seed++) {
      const session = new DrawSession(game, { random: seeded(seed) });
      session.start();
      for (let i = 0; i < 6000 && session.running; i++) session.advance(STEP);
      assert.equal(session.state, "COMPLETE", id);
      assert.ok(validNumbers(session.numbers, game.count, game.range), id);
      assert.ok(
        validNumbers(
          session.bonus,
          game.bonus?.count || 0,
          game.bonus?.range || 1,
        ),
        id,
      );
      assert.equal(session.drawnCount, session.totalCount);
      const row = {
        gameId: id,
        numbers: session.numbers,
        bonus: session.bonus,
        date: new Date().toISOString(),
      };
      assert.equal(readHistory(JSON.stringify([row])).length, 1);
      if (game.bonus)
        assert.ok(formatResult(row, true).includes(game.bonus.name + ":"));
    }
    stats.push(id);
  }
  console.log("Verified 20 physical draws per game:", stats.join(", "));
});
test("game selection respects region rather than treating every English locale as US", () => {
  assert.equal(recommendGame(["en-US"]), "powerball");
  assert.equal(recommendGame(["en-KR"]), "lotto-645");
  assert.equal(recommendGame(["ja-JP"]), "loto-6");
  assert.equal(recommendGame(["zh-CN"]), "ssq");
  assert.equal(recommendGame(["ru-RU"]), "sportloto-645");
  assert.equal(recommendGame(["hi-IN"]), null);
  assert.equal(recommendGame(["en-IN"]), null);
  assert.equal(recommendGame(["en-GB"]), null);
  assert.equal(recommendGame(["en"]), null);
});
test("rules and combinatorial odds match supported formats; separate pools can repeat numbers", () => {
  assert.equal(jackpotCombinations(games.powerball), 292201338);
  assert.equal(jackpotCombinations(games["mega-millions"]), 290472336);
  assert.equal(jackpotCombinations(games["lotto-645"]), 8145060);
  assert.equal(jackpotCombinations(games["loto-6"]), 6096454);
  assert.equal(jackpotCombinations(games.ssq), 17721088);
  const row = {
    gameId: "powerball",
    numbers: [1, 2, 3, 4, 69],
    bonus: [1],
    date: new Date().toISOString(),
  };
  assert.equal(readHistory(JSON.stringify([row])).length, 1);
  assert.equal(
    readHistory(JSON.stringify([{ ...row, bonus: [27] }])).length,
    0,
  );
  assert.equal(
    readHistory(JSON.stringify([{ ...row, gameId: "not-a-game" }])).length,
    0,
  );
});

import { BatchDraw } from "../src/batch.js";
test("five-set batches finish independently, preserve snapshots and stop at exactly five", () => {
  for (const game of [games["lotto-645"], games.powerball, games.ssq]) {
    const batch = new BatchDraw(game, { random: seeded(99) });
    batch.start(5);
    for (let i = 0; i < 24000 && batch.active; i++) batch.advance(STEP);
    assert.equal(batch.active, false);
    assert.equal(batch.results.length, 5);
    for (const row of batch.results) {
      assert.ok(validNumbers(row.numbers, game.count, game.range));
      assert.ok(
        validNumbers(row.bonus, game.bonus?.count || 0, game.bonus?.range || 1),
      );
    }
    const snapshot = structuredClone(batch.results);
    batch.advance(100);
    assert.deepEqual(batch.results, snapshot);
    batch.session.reset();
    assert.deepEqual(batch.results, snapshot);
  }
});
test("stopping during the inter-set interval prevents ghost draws; reset clears current batch only", () => {
  const batch = new BatchDraw(games.powerball, { random: seeded(42) });
  batch.start(2);
  while (batch.results.length === 0) batch.advance(STEP);
  batch.stop();
  for (let i = 0; i < 600; i++) batch.advance(STEP);
  assert.equal(batch.results.length, 1);
  assert.equal(batch.session.state, "IDLE");
  batch.reset();
  assert.equal(batch.results.length, 0);
  assert.throws(() => batch.start(0));
  assert.throws(() => batch.start(6));
});

test("plain entry uses browser locale while explicit game links preserve choice", () => {
  assert.equal(resolveGame(null, ["ko-KR", "en-US"]), "lotto-645");
  assert.equal(resolveGame(null, ["ko"]), "lotto-645");
  assert.equal(resolveGame("powerball", ["ko-KR"]), "powerball");
  assert.equal(resolveGame("invalid", ["ko-KR"]), "lotto-645");
  assert.equal(resolveGame(null, ["en-US", "ko-KR"]), "powerball");
  assert.equal(resolveGame(null, ["en-IN", "ko-KR"]), null);
  assert.equal(resolveGame(null, []), null);
});
