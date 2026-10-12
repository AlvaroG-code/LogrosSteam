// Servidor local: sirve la web + endpoint /api/refresh que sincroniza con Steam
// La API key solo vive en .env en tu PC, nunca en el frontend.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";

function loadEnv() {
  return readFile(".env", "utf8").then(t => {
    for (const line of t.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }).catch(() => {});
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png" };

await loadEnv();
const PORT = Number(process.env.PORT || 8080);

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // Refrescar datos de Steam bajo demanda
  if (url.pathname === "/api/refresh") {
    if (!process.env.STEAM_API_KEY) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Falta STEAM_API_KEY en .env" }));
      return;
    }
    const child = spawn(process.execPath, ["scripts/sync.mjs"], { env: process.env });
    let log = "";
    child.stdout.on("data", d => (log += d));
    child.stderr.on("data", d => (log += d));
    child.on("close", code => {
      res.writeHead(code === 0 ? 200 : 500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: code === 0, log: log.slice(-2000) }));
    });
    return;
  }
  // Estáticos
  let path = url.pathname === "/" ? "/index.html" : url.pathname;
  path = normalize(join(".", path)).replace(/^(\.\.[\/\\])+/, "");
  try {
    const data = await readFile(path);
    res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("No encontrado: " + url.pathname);
  }
}).listen(PORT, () => console.log(`Web local: http://localhost:${PORT}  (botón "Actualizar Steam" = /api/refresh)`));
