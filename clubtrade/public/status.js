const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const out = document.getElementById('out');
const t0 = performance.now();
try {
  const res = await fetch('/api/status');
  const s = await res.json();
  const ms = Math.round(performance.now() - t0);
  out.innerHTML = `
    <p><strong>Your browser reached the site:</strong> yes (${ms} ms)</p>
    <ul>${s.diagnosis.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    <h2>Data providers</h2>
    ${s.providers.length ? `<table><tbody>${s.providers.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.state)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Not checked (demo mode).</p>'}
    <p class="muted">Database: ${esc(s.database)} · Cache: ${esc(s.cache)} · Server time: ${esc(s.time)}</p>`;
} catch (e) {
  out.innerHTML = `<p><strong>Your browser reached the site:</strong> the page loaded, but the data request failed.</p>
    <p>This usually means a school web filter is blocking part of the site. Ask your advisor to allow this site's address (see README).</p>
    <p class="muted">Error: ${esc(e.message)}</p>`;
}
