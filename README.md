# アルバロ — Steam Completionist (LOCAL, sin subir a internet)

Todo queda en tu PC. Nada se publica.

## Puesta en marcha (una vez)
1. Instala Node.js LTS desde https://nodejs.org/ (botón Windows x64).
2. Saca tu Steam API key en https://steamcommunity.com/dev/apikey (dominio: `localhost`).
3. Copia `.env.example` a `.env` y pega tu key dentro:
   ```
   STEAM_API_KEY=tu_key_aqui
   STEAM_ID=76561198124408238
   ```
4. Doble clic en **`iniciar-web.bat`**. Sincroniza (horas, logros, %, última sesión) y abre `http://localhost:8080`.

La key solo vive en `.env` en tu disco. El navegador nunca la ve: el servidor la usa por detrás.

## Uso diario
- **Actualizar:** botón `↻ Actualizar desde Steam` en la web, o `npm run sync`.
- **Por jugar + random:** edita `data/backlog.json`:
  ```json
  { "backlog": [{ "appid": 752590, "name": "A Plague Tale: Innocence", "priority": "alta", "note": "pendiente" }] }
  ```
- **Juego sin logros marcado manual:** en `data/games.json` añade `"manualCompleted": true` al juego y el sync lo respeta.
- Sin internet de Steam la web sigue abriendo con los últimos datos guardados.

## Archivos
- `index.html`, `styles.css`, `app.js` — la web
- `scripts/sync.mjs` — Steam API -> `data/games.json`
- `scripts/server.mjs` — sirve la web en local + botón actualizar
- `.github/` — ignorar, era del plan GitHub Pages. Puedes borrar esa carpeta.
