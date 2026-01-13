(async function () {
  const input = document.getElementById('q');
  const resultsEl = document.getElementById('results');
  const metaEl = document.getElementById('meta');

  let index = [];
  try {
    const res = await fetch('/search/search-index.json', { cache: 'no-store' });
    index = await res.json();
  } catch (e) {
    metaEl.textContent = 'Search index failed to load.';
    return;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function score(item, q) {
    const t = (item.title || '').toLowerCase();
    const s = (item.summary || '').toLowerCase();
    const u = (item.url || '').toLowerCase();
    let sc = 0;
    if (t.includes(q)) sc += 10;
    if (s.includes(q)) sc += 5;
    if (u.includes(q)) sc += 2;
    return sc;
  }

  function render(list, q) {
    if (!q) {
      metaEl.textContent = `Loaded ${index.length} pages.`;
      resultsEl.innerHTML = '';
      return;
    }
    const hit = list.slice(0, 20);
    metaEl.textContent = `${list.length} result(s).`;
    resultsEl.innerHTML = hit.map(item => `
      <div class="result-item">
        <a class="result-title" href="${item.url}">${escapeHtml(item.title)}</a>
        <div class="result-meta">
          <span>${escapeHtml(item.section || '')}</span>
          <span>·</span>
          <span>${escapeHtml(item.last_updated || '')}</span>
        </div>
        <div class="result-summary">${escapeHtml(item.summary || '')}</div>
      </div>
    `).join('');
  }

  function run() {
    const q = input.value.trim().toLowerCase();
    const list = q
      ? index
          .map(item => ({ item, sc: score(item, q) }))
          .filter(x => x.sc > 0)
          .sort((a, b) => b.sc - a.sc)
          .map(x => x.item)
      : [];
    render(list, q);
  }

  input.addEventListener('input', run);

  // optional: querystring ?q=
  const params = new URLSearchParams(location.search);
  const preset = params.get('q');
  if (preset) {
    input.value = preset;
    run();
  } else {
    metaEl.textContent = `Loaded ${index.length} pages.`;
  }
})();

