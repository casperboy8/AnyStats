'use client';

import { useState, useEffect, useCallback } from 'react';

type TableInfo = { name: string; rows: number | null };
type QueryResult = { rows: Record<string, unknown>[]; columns: string[]; total: number; truncated?: boolean; error?: string };
type BrowseResult = QueryResult & { page: number; pageSize: number };

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [browse, setBrowse] = useState<BrowseResult | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/database?action=tables')
      .then(r => r.json())
      .then(setTables);
  }, []);

  const loadTable = useCallback((name: string, page = 0) => {
    setBrowseLoading(true);
    setSelected(name);
    fetch(`/api/admin/database?action=browse&table=${name}&page=${page}`)
      .then(r => r.json())
      .then(data => { setBrowse({ ...data, page }); setBrowseLoading(false); });
  }, []);

  const runQuery = async () => {
    if (!sql.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    const res = await fetch('/api/admin/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    const data = await res.json();
    if (!res.ok) { setQueryError(data.error); }
    else { setQueryResult(data); }
    setQueryLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Database</h1>
        <p className="text-sm text-gray-500 mt-1">Alleen leestoegang — schrijfoperaties zijn geblokkeerd</p>
      </div>

      <div className="flex gap-6">
        {/* Tabellijst */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Tabellen
            </div>
            {tables.map(t => (
              <button
                key={t.name}
                onClick={() => loadTable(t.name)}
                className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors ${selected === t.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                <span className="truncate">{t.name}</span>
                {t.rows !== null && (
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{t.rows.toLocaleString()}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Hoofd content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Tabel browser */}
          {selected && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{selected}</span>
                {browse && (
                  <span className="text-xs text-gray-400">
                    {browse.total.toLocaleString()} rijen
                    {browse.total > browse.pageSize && ` · pagina ${browse.page + 1} van ${Math.ceil(browse.total / browse.pageSize)}`}
                  </span>
                )}
              </div>

              {browseLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Laden…</div>
              ) : browse && browse.columns.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {browse.columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-100">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {browse.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {browse.columns.map(col => (
                              <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-xs truncate">
                                {row[col] === null ? (
                                  <span className="text-gray-300 italic">null</span>
                                ) : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {browse.total > browse.pageSize && (
                    <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
                      <button
                        disabled={browse.page === 0}
                        onClick={() => loadTable(selected, browse.page - 1)}
                        className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Vorige
                      </button>
                      <button
                        disabled={(browse.page + 1) * browse.pageSize >= browse.total}
                        onClick={() => loadTable(selected, browse.page + 1)}
                        className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Volgende →
                      </button>
                    </div>
                  )}
                </>
              ) : browse?.rows.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Tabel is leeg</div>
              ) : null}
            </div>
          )}

          {/* SQL Console */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-sm">SQL Console</span>
              <span className="ml-2 text-xs text-gray-400">alleen SELECT &amp; PRAGMA</span>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runQuery(); }}
                placeholder="SELECT * FROM users LIMIT 10"
                className="w-full h-28 font-mono text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={runQuery}
                  disabled={queryLoading || !sql.trim()}
                  className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {queryLoading ? 'Uitvoeren…' : 'Uitvoeren'}
                </button>
                <span className="text-xs text-gray-400">Ctrl+Enter</span>
              </div>

              {queryError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-mono">
                  {queryError}
                </div>
              )}

              {queryResult && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                    {queryResult.total.toLocaleString()} rij{queryResult.total !== 1 ? 'en' : ''}
                    {queryResult.truncated && ` (afgekapt op 500)`}
                  </div>
                  {queryResult.columns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            {queryResult.columns.map(col => (
                              <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-100">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {queryResult.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {queryResult.columns.map(col => (
                                <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-xs truncate">
                                  {row[col] === null ? (
                                    <span className="text-gray-300 italic">null</span>
                                  ) : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-gray-400 text-center">Geen resultaten</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
