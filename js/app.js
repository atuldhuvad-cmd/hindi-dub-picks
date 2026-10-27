const GENRES = ['Crime Thriller', 'Suspense', 'Comedy'];
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
const state = { items: [], q: '', genre: 'All', platform: 'All', region: 'All' };

const link = m => (/^https:\/\//.test(m.link || '') ? m.link : (SEARCH[m.platform] || SEARCH.YouTube)(m.title));

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
  const top = mk('div', 'row', ''); top.append(mk('span', 'rate', '★ ' + Number(m.rating).toFixed(1)), mk('span', 'tag', m.type + ' · ' + m.year));
  if (m.new) top.append(mk('span', 'tag new', 'NEW'));
  const tags = mk('div', 'row', ''); m.genres.forEach(g => tags.append(mk('span', 'tag', g)));
  const a = mk('a', 'watch', 'Watch on ' + m.platform);
  a.href = link(m); a.target = '_blank'; a.rel = 'noopener noreferrer';
  c.append(mk('h2', '', m.title), top, tags, mk('div', 'row', 'Origin: ' + m.origin), mk('div', 'row', 'Source: ' + m.platform), a);
  return c;
}

function render() {
  const q = state.q.toLowerCase();
  const list = state.items
    .filter(m => (state.genre === 'All' || m.genres.some(g => g.includes(state.genre)))
      && (state.platform === 'All' || m.platform === state.platform)
      && (state.region === 'All' || region(m) === state.region)
      && (m.title + ' ' + m.origin).toLowerCase().includes(q))
    .sort((a, b) => b.year - a.year || b.rating - a.rating);
  if (list.length) $('grid').replaceChildren(...list.map(card));
  else { const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'No matches.'; $('grid').replaceChildren(e); }
}

async function init() {
  try {
    // cache-busting is handled by the service worker (network-first for this file)
    const d = await (await fetch('movies-data.json')).json();
    state.items = d.items;
    $('meta').textContent = `${d.items.length} titles · updated ${d.updated}`;
    chips($('regions'), REGIONS, 'region');
    chips($('genres'), GENRES, 'genre');
    chips($('platforms'), [...new Set(d.items.map(m => m.platform))].sort(), 'platform');
    render();
  } catch { $('meta').textContent = 'Could not load data. Check your connection.'; }
}

$('q').oninput = e => { state.q = e.target.value; render(); };
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
