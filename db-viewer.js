/**
 * Standalone SQLite database viewer — poort 4001
 * Vereiste env vars (in .env.db-viewer):
 *   DB_VIEWER_USER   — inlognaam
 *   DB_VIEWER_PASS   — wachtwoord
 *   DB_VIEWER_PORT   — poort (standaard 4001)
 */
'use strict';

const http = require('http');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Laad .env.db-viewer
const envFile = path.join(__dirname, '.env.db-viewer');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  });
}

const PORT     = Number(process.env.DB_VIEWER_PORT ?? 4001);
const USERNAME = process.env.DB_VIEWER_USER;
const PASSWORD = process.env.DB_VIEWER_PASS;
const DB_PATH  = process.env.DB_PATH ?? path.join(__dirname, 'anytimer.db');

if (!USERNAME || !PASSWORD) {
  console.error('[db-viewer] Stel DB_VIEWER_USER en DB_VIEWER_PASS in in .env.db-viewer');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const MAX_ROWS = 500;
const PAGE_SIZE = 50;

const ALLOWED_RE = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i;
const BLOCKED_RE = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|ATTACH|DETACH|REPLACE|TRUNCATE|VACUUM)\b/i;

// ── Helpers ──────────────────────────────────────────────────────────────

function checkAuth(req) {
  const header = req.headers['authorization'] ?? '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  // Timing-safe vergelijking
  const validUser = user.length === USERNAME.length &&
    require('crypto').timingSafeEqual(Buffer.from(user), Buffer.from(USERNAME));
  const validPass = pass.length === PASSWORD.length &&
    require('crypto').timingSafeEqual(Buffer.from(pass), Buffer.from(PASSWORD));
  return validUser && validPass;
}

function requireAuth(req, res) {
  if (checkAuth(req)) return true;
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Database Viewer"',
    'Content-Type': 'text/plain',
  });
  res.end('Unauthorized');
  return false;
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function getTables() {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  return tables.map(({ name }) => {
    try {
      const count = db.prepare(`SELECT count(*) as n FROM "${name}"`).get().n;
      return { name, rows: count };
    } catch {
      return { name, rows: null };
    }
  });
}

// ── HTML shell ────────────────────────────────────────────────────────────

function html(tables) {
  const tableButtons = tables.map(t =>
    `<button onclick="loadTable('${t.name}',0)" class="tbl-btn" data-name="${t.name}">
      <span>${t.name}</span>
      <span class="cnt">${t.rows !== null ? t.rows.toLocaleString('nl') : '?'}</span>
    </button>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DB Viewer — AnyStats</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;background:#f5f5f5;color:#111}
#layout{display:flex;height:100vh;overflow:hidden}
#sidebar{width:200px;flex-shrink:0;background:#1e1e2e;overflow-y:auto;display:flex;flex-direction:column}
#sidebar h1{padding:16px 14px 10px;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #2a2a3e}
.tbl-btn{display:flex;justify-content:space-between;align-items:center;width:100%;padding:8px 14px;background:none;border:none;color:#c9c9d4;text-align:left;cursor:pointer;font-size:13px;border-bottom:1px solid #2a2a3e22}
.tbl-btn:hover{background:#2a2a3e;color:#fff}
.tbl-btn.active{background:#3b3bff22;color:#7b7bff}
.cnt{font-size:11px;color:#555;margin-left:8px}
#main{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px}
.card{background:#fff;border-radius:10px;border:1px solid #e5e5e5;overflow:hidden}
.card-head{padding:10px 16px;background:#fafafa;border-bottom:1px solid #e5e5e5;font-size:13px;font-weight:600;color:#333;display:flex;justify-content:space-between;align-items:center}
.card-head span.sub{font-weight:400;color:#999;font-size:12px}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
th{padding:7px 12px;text-align:left;background:#f7f7f7;border-bottom:1px solid #e5e5e5;font-weight:600;color:#555;white-space:nowrap}
td{padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#333;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}
tr:hover td{background:#fafafa}
.null{color:#ccc;font-style:italic}
.pagination{padding:10px 14px;border-top:1px solid #f0f0f0;display:flex;gap:8px;align-items:center}
.btn{padding:5px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#444}
.btn:hover{background:#f5f5f5} .btn:disabled{opacity:.4;cursor:default}
#sql-input{width:100%;height:100px;font-family:monospace;font-size:13px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;resize:vertical;outline:none}
#sql-input:focus{border-color:#3b3bff;box-shadow:0 0 0 3px #3b3bff18}
.run-bar{padding:10px 16px;display:flex;gap:10px;align-items:center;border-top:1px solid #f0f0f0}
.run-btn{padding:7px 18px;background:#1e1e2e;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px}
.run-btn:hover{background:#333}
.run-btn:disabled{opacity:.5;cursor:default}
.hint{font-size:12px;color:#aaa}
.error{margin:10px 16px;padding:10px 12px;background:#fff0f0;border:1px solid #fcc;border-radius:7px;color:#c00;font-size:12px;font-family:monospace}
.loading{padding:40px;text-align:center;color:#aaa}
</style>
</head>
<body>
<div id="layout">
  <nav id="sidebar">
    <h1>AnyStats DB</h1>
    ${tableButtons}
  </nav>
  <main id="main">
    <div class="card">
      <div class="card-head">SQL Console <span class="sub">alleen SELECT &amp; PRAGMA</span></div>
      <div style="padding:12px 16px">
        <textarea id="sql-input" placeholder="SELECT * FROM users LIMIT 10"></textarea>
      </div>
      <div class="run-bar">
        <button class="run-btn" id="run-btn" onclick="runQuery()">Uitvoeren</button>
        <span class="hint">Ctrl+Enter</span>
      </div>
      <div id="query-error"></div>
      <div id="query-result"></div>
    </div>
    <div id="browse-section" style="display:none" class="card">
      <div class="card-head" id="browse-head">Tabel</div>
      <div id="browse-body"><div class="loading">Laden…</div></div>
      <div class="pagination" id="browse-pagination" style="display:none"></div>
    </div>
  </main>
</div>
<script>
let currentTable = null, currentPage = 0;

document.getElementById('sql-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runQuery(); }
});

function renderTable(cols, rows, truncated) {
  if (!cols.length) return '<div class="loading">Geen resultaten</div>';
  const head = cols.map(c => \`<th>\${esc(c)}</th>\`).join('');
  const body = rows.map(r => '<tr>' + cols.map(c => {
    const v = r[c];
    return v === null ? '<td><span class="null">null</span></td>' : \`<td title="\${esc(String(v))}">\${esc(String(v))}</td>\`;
  }).join('') + '</tr>').join('');
  const note = truncated ? \`<tr><td colspan="\${cols.length}" style="text-align:center;color:#aaa;font-style:italic;padding:8px">Afgekapt op 500 rijen</td></tr>\` : '';
  return \`<div class="tbl-wrap"><table><thead><tr>\${head}</tr></thead><tbody>\${body}\${note}</tbody></table></div>\`;
}

async function runQuery() {
  const sql = document.getElementById('sql-input').value.trim();
  if (!sql) return;
  document.getElementById('run-btn').disabled = true;
  document.getElementById('query-error').innerHTML = '';
  document.getElementById('query-result').innerHTML = '<div class="loading">Bezig…</div>';
  const res = await fetch('/query', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sql}) });
  const data = await res.json();
  document.getElementById('run-btn').disabled = false;
  if (!res.ok) {
    document.getElementById('query-error').innerHTML = \`<div class="error">\${esc(data.error)}</div>\`;
    document.getElementById('query-result').innerHTML = '';
  } else {
    document.getElementById('query-result').innerHTML = renderTable(data.columns, data.rows, data.truncated);
  }
}

async function loadTable(name, page) {
  currentTable = name; currentPage = page;
  document.querySelectorAll('.tbl-btn').forEach(b => b.classList.toggle('active', b.dataset.name === name));
  const section = document.getElementById('browse-section');
  section.style.display = '';
  document.getElementById('browse-head').innerHTML = \`\${esc(name)} <span class="sub" id="browse-sub"></span>\`;
  document.getElementById('browse-body').innerHTML = '<div class="loading">Laden…</div>';
  document.getElementById('browse-pagination').style.display = 'none';
  const res = await fetch(\`/browse?table=\${encodeURIComponent(name)}&page=\${page}\`);
  const data = await res.json();
  if (data.error) { document.getElementById('browse-body').innerHTML = \`<div class="error">\${esc(data.error)}</div>\`; return; }
  document.getElementById('browse-sub').textContent = \`\${data.total.toLocaleString('nl')} rijen\`;
  document.getElementById('browse-body').innerHTML = renderTable(data.columns, data.rows);
  const pages = Math.ceil(data.total / data.pageSize);
  if (pages > 1) {
    document.getElementById('browse-pagination').style.display = 'flex';
    document.getElementById('browse-pagination').innerHTML =
      \`<button class="btn" onclick="loadTable(currentTable,\${page-1})" \${page===0?'disabled':''}>← Vorige</button>\`+
      \`<span class="hint">pagina \${page+1} / \${pages}</span>\`+
      \`<button class="btn" onclick="loadTable(currentTable,\${page+1})" \${page+1>=pages?'disabled':''}>Volgende →</button>\`;
  }
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
</script>
</body>
</html>`;
}

// ── Request handler ───────────────────────────────────────────────────────

function handleRequest(req, res) {
  if (!requireAuth(req, res)) return;

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET / — HTML interface
  if (req.method === 'GET' && url.pathname === '/') {
    const tables = getTables();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html(tables));
    return;
  }

  // GET /browse?table=xxx&page=0
  if (req.method === 'GET' && url.pathname === '/browse') {
    const table = url.searchParams.get('table') ?? '';
    const page  = Math.max(0, Number(url.searchParams.get('page') ?? 0));

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return json(res, { error: 'Ongeldige tabelnaam' }, 400);
    }
    try {
      const total   = db.prepare(`SELECT count(*) as n FROM "${table}"`).get().n;
      const rows    = db.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(PAGE_SIZE, page * PAGE_SIZE);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return json(res, { rows, columns, total, page, pageSize: PAGE_SIZE });
    } catch (e) {
      return json(res, { error: e.message }, 400);
    }
  }

  // POST /query
  if (req.method === 'POST' && url.pathname === '/query') {
    readBody(req).then(body => {
      const sql = (body.sql ?? '').trim();
      if (!sql) return json(res, { error: 'Geen query' }, 400);

      if (!ALLOWED_RE.test(sql) || BLOCKED_RE.test(sql)) {
        return json(res, { error: 'Alleen SELECT en PRAGMA zijn toegestaan.' }, 403);
      }
      try {
        const rows    = db.prepare(sql).all().slice(0, MAX_ROWS);
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return json(res, { rows, columns, total: rows.length, truncated: rows.length >= MAX_ROWS });
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[db-viewer] Draait op http://0.0.0.0:${PORT}`);
});
