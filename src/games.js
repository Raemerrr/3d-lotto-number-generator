export const games = {
  "lotto-645": {
    name: "로또 6/45",
    region: "KR",
    count: 6,
    range: 45,
    source: "https://www.dhlottery.co.kr/lt645/intro",
  },
  powerball: {
    name: "Powerball",
    region: "US",
    count: 5,
    range: 69,
    bonus: { count: 1, range: 26, name: "Powerball", color: 0xe9544e },
    source: "https://www.powerball.com/",
  },
  "mega-millions": {
    name: "Mega Millions",
    region: "US",
    count: 5,
    range: 70,
    bonus: { count: 1, range: 24, name: "Mega Ball", color: 0xe3b52f },
    source: "https://www.calottery.com/en/draw-games/mega-millions",
  },
  "loto-6": {
    name: "ロト6",
    region: "JP",
    count: 6,
    range: 43,
    source: "https://www.takarakuji-official.jp/kuji/loto/loto6/",
  },
  ssq: {
    name: "双色球",
    region: "CN",
    count: 6,
    range: 33,
    bonus: { count: 1, range: 16, name: "蓝球", color: 0x4285d5 },
    source: "https://www.scflcp.com.cn/yxgz/823145252.jhtml",
  },
  "sportloto-645": {
    name: "Спортлото 6 из 45",
    region: "RU",
    count: 6,
    range: 45,
    source:
      "https://media.stoloto.ru/cards/sportloto-6-iz-45-kak-igrat-i-chto-nuzhno-znat-o-loteree",
  },
};
Object.setPrototypeOf(games, null);
Object.freeze(games);
export function gameRule(game) {
  return `${game.count} / ${game.range}${game.bonus ? ` + ${game.bonus.count} / ${game.bonus.range}` : ""}`;
}
export function recommendGame(preferences = []) {
  const regions = {
    KR: "lotto-645",
    US: "powerball",
    JP: "loto-6",
    CN: "ssq",
    RU: "sportloto-645",
  };
  const unregionalized = {
    ko: "lotto-645",
    ja: "loto-6",
    zh: "ssq",
    ru: "sportloto-645",
  };
  // The first browser preference describes intent better than secondary languages.
  try {
    const locale = new Intl.Locale(preferences[0]);
    return locale.region
      ? regions[locale.region] || null
      : unregionalized[locale.language] || null;
  } catch {
    return null;
  }
}
// Explicit links preserve a choice; plain entry URLs always use browser locale.
export function resolveGame(requestedGame, preferences = []) {
  return games[requestedGame] ? requestedGame : recommendGame(preferences);
}
export function combinationCount(n, k) {
  let value = 1;
  for (let i = 1; i <= k; i++) value = (value * (n - i + 1)) / i;
  return Math.round(value);
}
export function jackpotCombinations(game) {
  return (
    combinationCount(game.range, game.count) *
    (game.bonus ? combinationCount(game.bonus.range, game.bonus.count) : 1)
  );
}
