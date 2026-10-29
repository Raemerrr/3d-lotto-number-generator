import { translations, languages, resolveLocale } from "./src/i18n.js";
import { DrawSession } from "./src/draw.js";
import { BatchDraw } from "./src/batch.js";
import {
  games,
  gameRule,
  resolveGame,
  jackpotCombinations,
} from "./src/games.js";
import {
  HISTORY_KEY,
  readHistory,
  formatResult,
  sortedNumbers,
  copyNumbers,
} from "./src/results.js";
const $ = (id) => document.getElementById(id);
let storageAvailable = true;
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    storageAvailable = false;
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    storageAvailable = false;
    $("storage-status").textContent = t.storageError;
  }
}
const base = document.body.dataset.base;
const lang = document.body.dataset.lang;
const t = translations[lang];
const savedLanguage = read("lotto645.language");
if (document.body.dataset.root === "true") {
  const chosen = languages[savedLanguage]
    ? savedLanguage
    : resolveLocale(navigator.languages || [navigator.language]);
  const query = new URLSearchParams(location.search);
  location.replace(
    `${base}${chosen}/${games[query.get("game")] ? "?game=" + query.get("game") : ""}`,
  );
}
$("language").value = lang;
$("language").addEventListener("change", (event) => {
  write("lotto645.language", event.target.value);
  location.assign(
    `${base}${event.target.value}/${gameId ? "?game=" + gameId : ""}`,
  );
});
let history = readHistory(read(HISTORY_KEY) ?? read("lotto645.history.v1"));
const requestedGame = new URLSearchParams(location.search).get("game");
let gameId = resolveGame(requestedGame, navigator.languages || [navigator.language]);
let game = games[gameId];
$("game").value = gameId || "";
let uiSnapshot = "";
let sim,
  batch,
  view,
  lastFrame = 0,
  frameId,
  lastState,
  lastCount = -1,
  recorded = 0,
  failed = false,
  paused = false;
const media = matchMedia("(prefers-reduced-motion: reduce)");
const savedMotion = read("lotto645.motion");
$("motion").checked =
  savedMotion === null ? media.matches : savedMotion === "true";
$("quality").value = read("lotto645.quality") === "low" ? "low" : "standard";
if (!storageAvailable) $("storage-status").textContent = t.storageError;

function ballMarkup(numbers, placeholders = 0, extra = false) {
  return (
    placeholders
      ? Array.from({ length: placeholders }, (_, i) => numbers[i])
      : numbers
  )
    .map(
      (n) =>
        `<span class="number-ball ${n ? (extra ? "extra-ball" : "color-" + (Math.floor((n - 1) / 10) % 5)) : "empty-ball"}">${n || "–"}</span>`,
    )
    .join("");
}
function announce(text) {
  $("copy-status").textContent = text;
}
async function copy(text) {
  announce("");
  const ok = await copyNumbers(text, navigator.clipboard);
  announce(ok ? t.copied : t.copyFailed);
  $("manual-copy").hidden = ok;
  if (!ok) {
    $("manual-numbers").value = text;
    $("manual-numbers").focus();
    $("manual-numbers").select();
  }
}
function renderHistory() {
  $("history-list").replaceChildren();
  $("history-empty").hidden = history.length > 0;
  $("copy-all").disabled = $("clear-history").disabled = !history.length;
  for (const row of history) {
    const item = document.createElement("li");
    item.className = "history-item";
    const content = document.createElement("div");
    const time = document.createElement("time");
    time.dateTime = row.date;
    time.textContent = new Intl.DateTimeFormat(
      lang === "zh-hans" ? "zh-CN" : lang,
      { dateStyle: "medium", timeStyle: "short" },
    ).format(new Date(row.date));
    const numbers = document.createElement("p");
    numbers.className = "history-numbers";
    numbers.textContent = formatResult(row, true);
    content.append(time, numbers);
    const button = document.createElement("button");
    button.className = "button subtle";
    button.textContent = t.copy;
    button.setAttribute("aria-label", `${t.copy}: ${formatResult(row, true)}`);
    button.addEventListener("click", () => copy(formatResult(row, true)));
    item.append(content, button);
    $("history-list").append(item);
  }
}
renderHistory();
$("copy-all").addEventListener("click", () =>
  copy(history.map((row) => formatResult(row, true)).join("\n")),
);
$("clear-history").addEventListener("click", () => {
  history = [];
  write(HISTORY_KEY, "[]");
  try {
    localStorage.removeItem("lotto645.history.v1");
  } catch {}
  renderHistory();
  announce(t.historyCleared);
});
$("copy-result").addEventListener("click", () => {
  if (sim?.state === "COMPLETE")
    copy(
      formatResult({ gameId, numbers: sim.numbers, bonus: sim.bonus }, true),
    );
});
$("retry").addEventListener("click", () => location.reload());
$("spin-button").addEventListener("click", () => {
  if (!sim || failed) return;
  if (batch.active) batch.stop();
  else {
    batch.start(Number($("batch-count").value));
    recorded = 0;
  }
  renderBatch();
  paused = false;
  $("pause-button").textContent = t.pause;
  announce("");
  $("manual-copy").hidden = true;
  update();
  wake();
});
$("reset-button").addEventListener("click", () => {
  if (!sim || failed) return;
  batch.reset();
  renderBatch();
  paused = false;
  recorded = 0;
  $("pause-button").textContent = t.pause;
  update();
  wake();
});
$("pause-button").addEventListener("click", () => {
  if (!batch?.active) return;
  paused = !paused;
  $("pause-button").textContent = paused ? t.resume : t.pause;
  update();
  wake();
});
$("quality").addEventListener("change", () => {
  write("lotto645.quality", $("quality").value);
  if (view) {
    view.low = $("quality").value === "low";
    view.resize();
  }
});
$("motion").addEventListener("change", () => {
  write("lotto645.motion", String($("motion").checked));
  if (view) view.reduced = $("motion").checked;
  update();
  wake();
});
media.addEventListener("change", (event) => {
  if (read("lotto645.motion") === null) {
    $("motion").checked = event.matches;
    if (view) view.reduced = event.matches;
    update();
    wake();
  }
});
function update() {
  if (!sim) return;
  if (view && view.simulation !== sim.active)
    view.setSimulation(
      sim.active,
      sim.phase === "bonus" ? game.bonus.color : null,
    );
  const snapshot = [gameId, sim.state, sim.phase, sim.drawnCount, batch.active,
    batch.total, batch.results.length, paused, $("motion").checked].join("|");
  if (snapshot === uiSnapshot) return;
  uiSnapshot = snapshot;
  $("game").disabled = batch.active;
  $("batch-count").disabled = batch.active;
  $("batch-progress").textContent =
    batch.total > 1
      ? `${Math.min(batch.results.length + (batch.active ? 1 : 0), batch.total)} / ${batch.total}`
      : "";
  $("active-pool").textContent =
    `${sim.phase === "bonus" ? game.bonus.name : game.name} · 1–${sim.active.range}`;
  const complete = sim.state === "COMPLETE";
  const stateText =
    sim.state === "ERROR"
      ? t.error
      : paused
        ? t.pause
        : complete
          ? batch.active
            ? t.nextSet
            : t.complete
          : sim.state === "IDLE"
            ? t.ready
            : sim.state === "MIXING"
              ? t.mixing
              : t.drawing;
  if ($("draw-status").textContent !== stateText)
    $("draw-status").textContent = stateText;
  $("spin-button").textContent = batch.active ? t.stop : t.start;
  $("pause-button").hidden = !batch.active;
  $("draw-progress").value = sim.drawnCount;
  $("progress-count").textContent = `${sim.drawnCount} / ${sim.totalCount}`;
  $("result-panel").classList.toggle("complete", complete);
  $("result-note").textContent = complete ? t.sorted : t.drawOrder;
  $("copy-result").disabled = !complete;
  $("reduced-note").hidden = !($("motion").checked && sim.running);
  if (lastCount !== sim.drawnCount || lastState !== sim.state) {
    $("result-numbers").innerHTML = ballMarkup(
      complete ? sortedNumbers(sim.numbers) : sim.numbers,
      game.count,
    );
    $("extra-numbers").innerHTML = game.bonus
      ? ballMarkup(sim.bonus, game.bonus.count, true)
      : "";
    $("result-text").textContent = complete
      ? formatResult({ gameId, numbers: sim.numbers, bonus: sim.bonus }, true)
      : "";
    lastCount = sim.drawnCount;
    lastState = sim.state;
  }
  if (batch.results.length > recorded) {
    for (const result of batch.results.slice(recorded))
      history.unshift({
        date: new Date().toISOString(),
        gameId,
        numbers: [...result.numbers],
        bonus: [...result.bonus],
      });
    recorded = batch.results.length;
    history = history.slice(0, 20);
    write(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    renderBatch();
  }
}
function frame(now) {
  frameId = null;
  if (document.hidden || failed) {
    lastFrame = 0;
    return;
  }
  if (batch?.active && !paused && lastFrame)
    batch.advance((now - lastFrame) / 1000);
  lastFrame = now;
  update();
  view?.render();
  if (batch?.active && !paused) frameId = requestAnimationFrame(frame);
}
function wake() {
  if (frameId) cancelAnimationFrame(frameId);
  lastFrame = 0;
  frameId = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = 0;
  } else wake();
});
function showFailure() {
  failed = true;
  if (frameId) cancelAnimationFrame(frameId);
  $("scene-message").textContent = t.webglError;
  $("scene-message").hidden = false;
  $("retry").hidden = false;
  $("spin-button").disabled = true;
  $("reset-button").disabled = true;
  $("pause-button").hidden = true;
  $("draw-status").textContent = t.webglError;
}
async function initialize() {
  try {
    const { LotteryView } = await import("./src/view.js");
    batch = game ? new BatchDraw(game) : null;
    sim = batch?.session;
    const preview = sim || new DrawSession(games["lotto-645"]);
    view = new LotteryView($("scene-container"), preview.active, {
      low: $("quality").value === "low",
      reduced: $("motion").checked,
    });
    view.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      showFailure();
    });
    $("scene-message").hidden = true;
    $("spin-button").disabled = !game;
    $("reset-button").disabled = !game;
    if (!game) $("draw-status").textContent = t.chooseGame;
    update();
    wake();
  } catch (error) {
    console.error("Could not initialize 3D drawing", error);
    showFailure();
  }
}
function renderBatch() {
  $("batch-section").hidden = !batch?.results.length;
  $("batch-list").replaceChildren();
  for (const [i, result] of (batch?.results || []).entries()) {
    const row = { ...result, gameId };
    const item = document.createElement("li");
    item.className = "history-item";
    const label = document.createElement("p");
    label.className = "history-numbers";
    label.textContent = `${i + 1}. ${formatResult(row, true)}`;
    const button = document.createElement("button");
    button.className = "button subtle";
    button.textContent = t.copy;
    button.setAttribute(
      "aria-label",
      `${i + 1}. ${t.copy}: ${formatResult(row, true)}`,
    );
    button.addEventListener("click", () => copy(formatResult(row, true)));
    item.append(label, button);
    $("batch-list").append(item);
  }
}
$("copy-batch").addEventListener("click", () =>
  copy(
    batch.results
      .map((row) => formatResult({ ...row, gameId }, true))
      .join("\n"),
  ),
);
function applyGameDetails() {
  $("game-rule").textContent = game ? gameRule(game) : "—";
  $("machine-game").textContent = game ? game.name : t.chooseGame;
  $("machine-range").textContent = game ? `01 — ${game.range}` : "—";
  $("extra-group").hidden = !game?.bonus;
  $("main-label").textContent = game
    ? `${t.mainPool} · ${game.count} / ${game.range}`
    : t.mainPool;
  $("extra-label").textContent = game?.bonus
    ? `${game.bonus.name} · 1 / ${game.bonus.range}`
    : "";
  $("odds-value").textContent = game
    ? `1 / ${jackpotCombinations(game).toLocaleString(lang)}`
    : "—";
  $("official-rules").hidden = !game;
  if (game) $("official-rules").href = game.source;
  $("country-note").hidden = !!game;
  $("draw-progress").max = game ? game.count + (game.bonus?.count || 0) : 6;
  $("result-numbers").innerHTML = ballMarkup([], game?.count || 6);
  $("extra-numbers").innerHTML = game?.bonus ? ballMarkup([], 1, true) : "";
}
$("game").addEventListener("change", () => {
  if (!games[$("game").value] || batch?.active) return;
  gameId = $("game").value;
  game = games[gameId];
  window.history.replaceState(null, "", `?game=${gameId}`);
  batch = new BatchDraw(game);
  sim = batch.session;
  paused = false;
  recorded = 0;
  lastState = null;
  lastCount = -1;
  $("copy-result").disabled = true;
  $("manual-copy").hidden = true;
  announce("");
  $("spin-button").disabled = failed;
  $("reset-button").disabled = failed;
  renderBatch();
  applyGameDetails();
  update();
  wake();
});
applyGameDetails();
initialize();
