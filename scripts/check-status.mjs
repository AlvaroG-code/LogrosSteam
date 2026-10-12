import { readFile } from "node:fs/promises";
const g = JSON.parse(await readFile("data/games.json", "utf8"));
const c = g.games.filter(x => x.completed || x.percent === 100);
console.log("juegos:", g.games.length, "| completados:", c.length,
  "| manualHours:", g.games.filter(x => x.manualHours).length,
  "| extras:", g.games.filter(x => x.source === "extra").length,
  "| lastSync:", g.lastSync);
console.log("completados:", c.map(x => x.name).join(" | "));
const now = Date.now() / 1000;
const recent = [];
for (const x of g.games) {
  const t = Math.max(0, ...(x.achievements || []).filter(a => a.achieved && a.unlocktime).map(a => a.unlocktime));
  if (t > now - 3 * 86400) recent.push(`${x.name} (${new Date(t * 1000).toLocaleString()} ${x.unlockedAchievements}/${x.totalAchievements})`);
}
console.log("actividad logros 3d:", recent.join(" | ") || "ninguna");
