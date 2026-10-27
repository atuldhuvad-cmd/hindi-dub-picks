# Hindi Dub Picks (PWA)

- Run locally: `npx serve .` (service worker needs http://localhost or https).
- Deploy: GitHub Pages (Settings → Pages → branch `main`, root). All paths are relative, so subpaths work.
- Weekly update: add repo secrets `OMDB_API_KEY` (omdbapi.com, free) and optionally `TMDB_API_KEY` (themoviedb.org, free). Workflow `.github/workflows/weekly-update.yml` runs Mondays 03:00 UTC (or manually via Actions → Run workflow), commits `movies-data.json`; the app fetches it network-first, so no redeploy needed.
- Script: refreshes ratings for existing `imdbId`s, and (with TMDB key) adds up to 5 titles ≥7.5 on Netflix/Prime/JioHotstar India flagged `"new": true`.
- Caveats: seed ratings/platforms are approximate; Hindi-dub availability can't be verified by any free API — check new entries. Watch buttons are platform search links; set `"link": "https://..."` on an item for a deep link.
- Bump `CACHE` in `sw.js` when changing shell files.
