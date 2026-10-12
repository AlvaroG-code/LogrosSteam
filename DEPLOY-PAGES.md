# Subir a GitHub Pages sin exponer la API key

La key **nunca** entra en el repo ni en la web. Solo vive en
`Settings > Secrets` de GitHub. La Action la usa en el servidor,
genera `data/games.json` y Pages sirve ese JSON. Los visitantes
jamás ven la key.

## 1. Subir el repo (una vez)

En una terminal dentro de esta carpeta:

```
git init
git add .
git status
```

⚠️ Comprueba que `.env` **NO** aparece en la lista (está en
`.gitignore`). Si aparece, para y avísame.

```
git commit -m "web steam alvaro"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## 2. Guardar la key como Secret

GitHub > tu repo > `Settings > Secrets and variables > Actions` >
`New repository secret`:

- Name: `STEAM_API_KEY` — Value: tu key de
  `https://steamcommunity.com/dev/apikey`
- Name: `STEAM_ID` — Value: `76561198124408238`

## 3. Activar Pages

GitHub > tu repo > `Settings > Pages`:
- Source: `Deploy from a branch`
- Branch: `main` + `/ (root)` > Save

Tu web quedará en `https://TU_USUARIO.github.io/TU_REPO/`

## 4. Primera sincronización

`Actions > Sync Steam > Run workflow`. Tarda unos minutos
(98 juegos). Al terminar, la web muestra todos tus datos.

El sync se repite solo cada día a las 04:00 UTC.

## 5. Uso diario

- **Por jugar / random:** edita `data/backlog.json` en tu PC,
  `git add data/backlog.json`, `commit`, `push`. Sin key, sin riesgo.
- **Forzar sync:** `Actions > Sync Steam > Run workflow`.
- **En local** todo sigue igual con `iniciar-web.bat`.

## Seguridad

- Repo público (gratis para Pages) sin problema: los Secrets están
  cifrados y ningún script imprime la key en los logs.
- Si algún día la key se filtra, revócala en
  `steamcommunity.com/dev/apikey` y actualiza el Secret.
