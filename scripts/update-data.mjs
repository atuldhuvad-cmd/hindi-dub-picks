// Weekly updater: refreshes IMDb ratings (OMDb) and adds new high-rated candidates (TMDB discover).
// Env: OMDB_API_KEY (required), TMDB_API_KEY (optional, enables discovery). Node 20+.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../movies-data.json', import.meta.url);
const { OMDB_API_KEY: OMDB, TMDB_API_KEY: TMDB } = process.env;
const MIN = 7.0, MAX_NEW = 8;
if (!OMDB) { console.error('OMDB_API_KEY missing'); process.exit(1); }

const j = async url => { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url.split('?')[0]); return r.json(); };
const omdb = id => j(`https://www.omdbapi.com/?apikey=${OMDB}&i=${id}`);
const tmdb = (p, q = '') => j(`https://api.themoviedb.org/3${p}?api_key=${TMDB}${q}`);
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const data = JSON.parse(await readFile(FILE, 'utf8'));
data.items.forEach(m => delete m.new);

// 1. refresh ratings (skip on title mismatch so a wrong imdbId never overwrites data)
for (const m of data.items) {
  if (!m.imdbId) continue; // filled in manually, rating stays as seeded
  try {
    const o = await omdb(m.imdbId);
    if (o.Response !== 'True') continue;
    const r = parseFloat(o.imdbRating);
    if (isNaN(r)) continue;
    if (!norm(o.Title).includes(norm(m.title.split(' (')[0])) && !norm(m.title).includes(norm(o.Title))) {
      console.warn(`ID mismatch, skipped: ${m.title} -> ${o.Title}`); continue;
    }
    m.rating = r;
  } catch (e) { console.warn('rating failed:', m.title, e.message); }
}

// 2. discover new titles available on Netflix/Prime/JioHotstar in India
// ponytail: TMDB can't confirm a Hindi dub exists -> new entries are flagged "new"; verify before keeping
if (TMDB) {
  const PROV = { 8: 'Netflix', 119: 'Prime Video', 122: 'JioHotstar' };
  const known = new Set(data.items.map(m => m.imdbId));
  let added = 0;
  const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10); // only titles from the last ~2 years
  // Indian-origin passes first so South Indian / Hindi titles aren't crowded out by foreign ones
  for (const [kind, genres, origin] of [['movie', '80,53,35', 'IN'], ['tv', '80,9648,35', 'IN'], ['movie', '80,53,35', ''], ['tv', '80,9648,35', '']]) {
    const res = await tmdb(`/discover/${kind}`, `${origin ? '&with_origin_country=IN' : ''}&with_genres=${genres.replace(/,/g, '|')}&watch_region=IN&with_watch_providers=8|119|122&with_watch_monetization_types=flatrate&vote_average.gte=${MIN}&vote_count.gte=300&${kind === 'movie' ? 'primary_release_date' : 'first_air_date'}.gte=${since}&sort_by=popularity.desc`);
    for (const t of res.results) {
      if (added >= MAX_NEW) break;
      try {
        const imdbId = kind === 'movie' ? (await tmdb(`/movie/${t.id}/external_ids`)).imdb_id : (await tmdb(`/tv/${t.id}/external_ids`)).imdb_id;
        if (!imdbId || known.has(imdbId)) continue;
        const o = await omdb(imdbId), rating = parseFloat(o.imdbRating);
        if (o.Response !== 'True' || !(rating >= MIN)) continue;
        const wp = (await tmdb(`/${kind}/${t.id}/watch/providers`)).results?.IN?.flatrate || [];
        const p = wp.find(x => PROV[x.provider_id]);
        if (!p) continue;
        const g = t.genre_ids, gen = [];
        if (g.includes(80) || g.includes(53)) gen.push('Crime Thriller');
        if (g.includes(9648)) gen.push('Suspense');
        if (g.includes(35)) gen.push('Comedy');
        data.items.push({ title: o.Title, type: kind === 'movie' ? 'Movie' : 'Series', genres: gen, rating, origin: /India/.test(o.Country) ? `India (${o.Language?.split(',')[0] || 'Hindi'})` : o.Country?.split(',')[0] || 'N/A', platform: PROV[p.provider_id], imdbId, year: parseInt(o.Year) || new Date().getFullYear(), new: true });
        known.add(imdbId); added++;
      } catch (e) { console.warn('discover failed:', t.id, e.message); }
    }
  }
}

data.updated = new Date().toISOString().slice(0, 10);
await writeFile(FILE, JSON.stringify(data, null, 2) + '\n');
console.log('done:', data.items.length, 'items');
