import { games } from "./games.js";
export const HISTORY_KEY = "lotto645.history.v2";
export function validNumbers(numbers, count = 6, range = 45) {
  return (
    Array.isArray(numbers) &&
    numbers.length === count &&
    new Set(numbers).size === count &&
    numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= range)
  );
}
export function sortedNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b);
}
export function formatNumbers(numbers) {
  return sortedNumbers(numbers).join(", ");
}
export function formatResult(row, withGame = false) {
  const game = games[row.gameId];
  return `${withGame ? game.name + ": " : ""}${formatNumbers(row.numbers)}${game.bonus ? ` + ${game.bonus.name}: ${formatNumbers(row.bonus)}` : ""}`;
}
export function readHistory(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .map((row) =>
            row && typeof row === "object"
              ? {
                  ...row,
                  gameId: row.gameId || "lotto-645",
                  bonus: row.bonus || [],
                }
              : null,
          )
          .filter((row) => {
            const game = games[row?.gameId];
            return (
              game &&
              validNumbers(row.numbers, game.count, game.range) &&
              validNumbers(
                row.bonus,
                game.bonus?.count || 0,
                game.bonus?.range || 1,
              ) &&
              typeof row.date === "string" &&
              Number.isFinite(Date.parse(row.date))
            );
          })
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export async function copyNumbers(text, clipboard) {
  try {
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
