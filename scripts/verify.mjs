// Verificación rápida: lee .env y comprueba la key contra la API (sin mostrar la key)
import { readFile } from "node:fs/promises";
try {
  const env = await readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.log("Falta .env");
  process.exit(1);
}
const key = (process.env.STEAM_API_KEY || "").trim();
const id = (process.env.STEAM_ID || "").trim();
if (!key || key === "pon_tu_key_aqui") {
  console.log("Pon tu key real en .env (línea STEAM_API_KEY=...)");
  process.exit(1);
}
const r = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${key}&steamid=${id}&format=json`);
const j = await r.json();
console.log("HTTP", r.status, "| juegos:", j.response?.game_count ?? JSON.stringify(j).slice(0, 200));
