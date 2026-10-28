const GENRES = ['Crime Thriller', 'Suspense', 'Comedy', 'Spy Thriller'];
// ponytail: platform links are search URLs, not deep links -> add per-title "link" in JSON to override
const SEARCH = {
  'Netflix': t => 'https://www.netflix.com/search?q=' + encodeURIComponent(t),
  'Prime Video': t => 'https://www.primevideo.com/search?phrase=' + encodeURIComponent(t),
  'JioHotstar': t => 'https://www.hotstar.com/in/search?q=' + encodeURIComponent(t),
  'YouTube': t => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(t + ' hindi dubbed full'),
};
const $ = id => document.getElementById(id);
const REGIONS = ['Hindi Original', 'South Indian (Hindi Dub)', 'International (Hindi Dub)'];
const region = m => /^India \(Hindi/.test(m.origin) ? REGIONS[0] : /^India/.test(m.origin) ? REGIONS[1] : REGIONS[2];
const state = { items: [], updated: '', q: '', genre: 'All', platform: 'All', region: 'All', favoritesOnly: false, showWatched: false, sort: 'newest' };
let favorites, watched;
try { favorites = new Set(JSON.parse(localStorage.getItem('hdp-favorites') || '[]')); } catch { favorites = new Set(); }
try { watched = new Set(JSON.parse(localStorage.getItem('hdp-watched') || '[]')); } catch { watched = new Set(); }

const link = m => (/^https:\/\//.test(m.link || '') ? m.link : (SEARCH[m.platform] || SEARCH.YouTube)(m.title));
// ponytail: favorites are device-local and title/year keyed -> add versioned export/sync only if requested
const key = m => `${m.title}|${m.year}`;

function chips(el, values, key) {
  el.replaceChildren(...['All', ...values].map(v => {
    const b = document.createElement('button');
    b.textContent = v;
    b.setAttribute('aria-pressed', state[key] === v);
    b.onclick = () => { state[key] = v; chips(el, values, key); render(); };
    return b;
  }));
}

function card(m) {
  const c = document.createElement('article'); c.className = 'card';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = txt; return e; };
  const saved = favorites.has(key(m));
  const seen = watched.has(key(m));
  const title = mk('div', 'title-row', '');
  const actions = mk('div', 'title-actions', '');
  const favorite = mk('button', 'favorite', saved ? 'Saved' : 'Save');
  favorite.type = 'button'; favorite.setAttribute('aria-pressed', saved); favorite.setAttribute('aria-label', `${saved ? 'Remove' : 'Add'} ${m.title} ${saved ? 'from' : 'to'} favorites`);
  favorite.onclick = () => {
    saved ? favorites.delete(key(m)) : favorites.add(key(m));
    try { localStorage.setItem('hdp-favorites', JSON.stringify([...favorites])); } catch {}
    render();
  };
  const watchedButton = mk('button', 'favorite', seen ? 'Unwatch' : 'Watched');
  watchedButton.type = 'button'; watchedButton.setAttribute('aria-pressed', seen); watchedButton.setAttribute('aria-label', `${seen ? 'Restore' : 'Mark'} ${m.title} ${seen ? 'to the list' : 'as watched'}`);
  watchedButton.onclick = () => {
    seen ? watched.delete(key(m)) : watched.add(key(m));
    try { localStorage.setItem('hdp-watched', JSON.stringify([...watched])); } catch {}
    render();
  };
  actions.append(favorite, watchedButton);
  title.append(mk('h2', '', m.title), actions);
  const top = mk('div', 'row', ''); top.append(mk('span', 'rate', '★ ' + Number(m.rating).toFixed(1)), mk('span', 'tag', m.type + ' · ' + m.year));
  if (m.new) top.append(mk('span', 'tag new', 'NEW'));
  const tags = mk('div', 'row', ''); m.genres.forEach(g => tags.append(mk('span', 'tag', g)));
  const a = mk('a', 'watch', 'Watch on ' + m.platform);
  a.href = link(m); a.target = '_blank'; a.rel = 'noopener noreferrer';
  c.append(title, top, tags, mk('div', 'row', 'Origin: ' + m.origin), mk('div', 'row', 'Source: ' + m.platform), a);
  return c;
}

function render() {
  const q = state.q.toLowerCase();
  const list = state.items
    .filter(m => (state.genre === 'All' || m.genres.some(g => g.includes(state.genre)))
      && (state.platform === 'All' || m.platform === state.platform)
      && (state.region === 'All' || region(m) === state.region)
      && (!state.favoritesOnly || favorites.has(key(m)))
      && (state.showWatched || !watched.has(key(m)))
      && (m.title + ' ' + m.origin).toLowerCase().includes(q))
    .sort(state.sort === 'rating' ? (a, b) => b.rating - a.rating || b.year - a.year
      : state.sort === 'title' ? (a, b) => a.title.localeCompare(b.title)
      : (a, b) => b.year - a.year || b.rating - a.rating);
  $('meta').textContent = `${list.length} of ${state.items.length} titles · updated ${state.updated}`;
  $('watched').textContent = `${state.showWatched ? 'Hide' : 'Show'} watched (${watched.size})`;
  if (list.length) $('grid').replaceChildren(...list.map(card));
  else { const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'No matches.'; $('grid').replaceChildren(e); }
}

async function init() {
  try {
    // cache-busting is handled by the service worker (network-first for this file)
    const d = await (await fetch('movies-data.json')).json();
    state.items = d.items;
    state.updated = d.updated;
    chips($('regions'), REGIONS, 'region');
    chips($('genres'), GENRES, 'genre');
    chips($('platforms'), [...new Set(d.items.map(m => m.platform))].sort(), 'platform');
    render();
  } catch { $('meta').textContent = 'Could not load data. Check your connection.'; }
}

$('q').oninput = e => { state.q = e.target.value; render(); };
$('favorites').onclick = e => { state.favoritesOnly = !state.favoritesOnly; e.currentTarget.setAttribute('aria-pressed', state.favoritesOnly); render(); };
$('watched').onclick = e => { state.showWatched = !state.showWatched; e.currentTarget.setAttribute('aria-pressed', state.showWatched); render(); };
$('sort').onchange = e => { state.sort = e.target.value; render(); };
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
