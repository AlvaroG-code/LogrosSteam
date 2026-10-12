# アルバロ — Steam Completionist

Web personal: stats de Steam, completados 100%, en curso, por empezar,
lista por jugar + botón random (principal + ASUS).

## Puesta en marcha en local (una vez)
1. Instala Node.js LTS desde https://nodejs.org/ (botón Windows x64).
2. Saca tu Steam API key en https://steamcommunity.com/dev/apikey (dominio: `localhost`).
3. Copia `.env.example` a `.env` y pega tu key dentro:
   ```
   STEAM_API_KEY=9DF6E4D6DD5CCF49F04920B6A2FD336A
   STEAM_ID=76561198124408238
   ```
   (esa key es un ejemplo falso, pon la tuya; el archivo `.env` nunca se sube a git)
4. Doble clic en **`iniciar-web.bat`**. Sincroniza (horas, logros, %, última sesión) y abre `http://localhost:8080`.

## Uso diario
- **Actualizar:** botón `↻ Actualizar desde Steam` en la web, o `npm run sync`.
- **Por jugar + random:** edita `data/backlog.json` (`asus:true` = entra en el sorteo de la ASUS).
- **Juego sin logros marcado manual:** en `data/games.json` añade `"manualCompleted": true` y el sync lo respeta.
- **Extra perfectos:** `data/extra.json` conserva los 100% que la API de biblioteca no devuelve.

## Subir a GitHub Pages
Ver `DEPLOY-PAGES.md`. La key va como Secret, nunca en el repo.
