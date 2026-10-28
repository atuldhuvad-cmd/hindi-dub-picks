import { access, readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../movies-data.json', import.meta.url), 'utf8'));
if (!Array.isArray(data.items) || !data.items.length) throw new Error('movies-data.json has no items');

const genres = new Set(['Crime Thriller', 'Suspense', 'Comedy', 'Dark Comedy', 'Spy Thriller']);
const platforms = new Set(['Netflix', 'Prime Video', 'JioHotstar', 'YouTube']);
const ids = new Set(), titles = new Set();
for (const [i, m] of data.items.entries()) {
  const at = `item ${i + 1}`;
  if (!m.title || !m.origin || !['Movie', 'Series'].includes(m.type)) throw new Error(`${at}: invalid identity`);
  if (!Number.isFinite(m.rating) || m.rating < 0 || m.rating > 10) throw new Error(`${at}: invalid rating`);
  if (!Number.isInteger(m.year) || m.year < 1900 || m.year > new Date().getFullYear() + 1) throw new Error(`${at}: invalid year`);
  if (!Array.isArray(m.genres) || !m.genres.length || m.genres.some(g => !genres.has(g))) throw new Error(`${at}: invalid genres`);
  if (!platforms.has(m.platform)) throw new Error(`${at}: invalid platform`);
  const titleKey = `${m.title.toLowerCase()}|${m.year}`;
  if (titles.has(titleKey)) throw new Error(`${at}: duplicate title and year`); titles.add(titleKey);
  if (m.imdbId) { if (!/^tt\d+$/.test(m.imdbId) || ids.has(m.imdbId)) throw new Error(`${at}: invalid or duplicate IMDb ID`); ids.add(m.imdbId); }
  if (m.link && !/^https:\/\//.test(m.link)) throw new Error(`${at}: watch link must use HTTPS`);
}

for (const path of ['index.html', 'css/styles.css', 'js/app.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'])
  await access(new URL(`../${path}`, import.meta.url));

console.log(`verified: ${data.items.length} titles, ${ids.size} IMDb IDs, required PWA files present`);
