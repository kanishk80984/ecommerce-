import React, { useEffect, useState } from "react";
import api from "../../services/api";

const SearchAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("keywords");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchAnalytics = () => {
    api.get("/admin/analytics/search")
      .then(res => setAnalytics(res.data.analytics))
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5001);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedIds([]);
    setDeleteError(null);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete("/admin/analytics/search", { data: { type: activeTab, ids: selectedIds } });
      setSelectedIds([]);
      fetchAnalytics();
    } catch (err) {
      setDeleteError("Failed to delete selected items.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />Loading analytics...</div>;
  if (error) return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;

  const { totals, topKeywords, topClickedProducts, topClickedVariants, dailyVolume } = analytics;
  const maxVol = Math.max(...(dailyVolume || []).map(d => Number(d.searches) + Number(d.clicks) + Number(d.cart_adds)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">User Behaviour Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Last 30 days — search, click, and cart add activity from all users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Searches", value: totals?.total_searches, color: "text-blue-700" },
          { label: "Clicks", value: totals?.total_clicks, color: "text-indigo-700" },
          { label: "Cart Adds", value: totals?.total_cart_adds, color: "text-green-700" },
          { label: "Sessions", value: totals?.unique_sessions, color: "text-purple-700" },
          { label: "Total Events", value: totals?.total_events, color: "text-orange-700" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className={"text-2xl font-extrabold mt-1 " + s.color}>{Number(s.value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {dailyVolume && dailyVolume.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Daily Event Volume (Last 14 Days)</h3>
          <div className="flex items-end gap-1" style={{ height: "7rem" }}>
            {dailyVolume.map((day, i) => {
              const total = Number(day.searches) + Number(day.clicks) + Number(day.cart_adds);
              const pct = Math.max((total / maxVol) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors" style={{ height: pct + "%" }} />
                  <span className="text-[8px] text-gray-400 mt-0.5">{(day.date || "").slice(5)}</span>
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                    S:{day.searches} C:{day.clicks} Cart:{day.cart_adds}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">S = Searches, C = Clicks, Cart = Add to Cart events. Hover bars for details.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[{ id: "keywords", label: "🔍 Top Keywords" }, { id: "products", label: "📦 Top Products" }, { id: "variants", label: "🎨 Top Variants" }].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={"flex-1 py-3 px-4 text-sm font-semibold transition-colors " + (activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50")}>
              {tab.label}
            </button>
          ))}
        </div>

        {deleteError && <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{deleteError}</div>}

        {selectedIds.length > 0 && (
          <div className="mx-5 mt-4 flex items-center justify-between bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-800">{selectedIds.length} item(s) selected</span>
            <button
              onClick={handleDeleteSelected}
              disabled={deleteLoading}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 transition-colors"
            >
              {deleteLoading ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        )}

        <div className="p-5">
          {activeTab === "keywords" && (
            !topKeywords || topKeywords.length === 0
              ? <div className="text-center text-gray-400 py-10 text-sm"><p className="text-3xl mb-2">🔍</p><p>No searches recorded yet.</p><p className="text-xs mt-1 text-gray-300">Data will appear as users search the marketplace.</p></div>
              : <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 font-medium">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.length === topKeywords.length && topKeywords.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? topKeywords.map(k => k.query) : [])}
                    />
                    Select All
                  </label>
                </div>
                <div className="space-y-3">
                  {topKeywords.map((kw, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        checked={selectedIds.includes(kw.query)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(prev => [...prev, kw.query]);
                          else setSelectedIds(prev => prev.filter(id => id !== kw.query));
                        }}
                      />
                      <span className="text-xs font-extrabold text-gray-400 w-6 text-right shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-800 flex-1 truncate">"{kw.query}"</span>
                      <div className="h-2 rounded-full bg-blue-100 w-24 md:w-40 shrink-0 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: ((kw.count / (topKeywords[0]?.count || 1)) * 100) + "%" }} />
                      </div>
                      <span className="text-xs font-bold text-blue-700 w-10 text-right shrink-0">{kw.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
          )}
          {activeTab === "products" && (
            !topClickedProducts || topClickedProducts.length === 0
              ? <div className="text-center text-gray-400 py-10 text-sm"><p className="text-3xl mb-2">📦</p><p>No product clicks tracked yet.</p></div>
              : <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left py-2 pl-1 w-8">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.length === topClickedProducts.length && topClickedProducts.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? topClickedProducts.map(p => p.public_id) : [])}
                    />
                  </th>
                  <th className="text-left py-2 pl-1">#</th>
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Clicks</th>
                  <th className="text-right py-2 pr-1">Cart Adds</th>
                </tr></thead>
                <tbody>
                  {topClickedProducts.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pl-1">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.includes(p.public_id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(prev => [...prev, p.public_id]);
                            else setSelectedIds(prev => prev.filter(id => id !== p.public_id));
                          }}
                        />
                      </td>
                      <td className="py-2.5 pl-1 text-xs text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2.5"><div className="font-semibold text-gray-800 truncate max-w-xs">{p.name}</div><div className="text-[10px] text-gray-400">{p.slug}</div></td>
                      <td className="py-2.5 text-right font-extrabold text-blue-700">{p.click_count}</td>
                      <td className="py-2.5 text-right pr-1 font-extrabold text-green-600">{p.cart_adds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
          {activeTab === "variants" && (
            !topClickedVariants || topClickedVariants.length === 0
              ? <div className="text-center text-gray-400 py-10 text-sm"><p className="text-3xl mb-2">🎨</p><p>No variant clicks tracked yet.</p></div>
              : <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left py-2 pl-1 w-8">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.length === topClickedVariants.length && topClickedVariants.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? topClickedVariants.map(v => v.variant_public_id) : [])}
                    />
                  </th>
                  <th className="text-left py-2 pl-1">#</th>
                  <th className="text-left py-2">Variant</th>
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2 pr-1">Clicks</th>
                </tr></thead>
                <tbody>
                  {topClickedVariants.map((v, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pl-1">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.includes(v.variant_public_id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(prev => [...prev, v.variant_public_id]);
                            else setSelectedIds(prev => prev.filter(id => id !== v.variant_public_id));
                          }}
                        />
                      </td>
                      <td className="py-2.5 pl-1 text-xs text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2.5 font-semibold text-gray-800">{v.variant_name}</td>
                      <td className="py-2.5 text-gray-500 truncate max-w-[140px]">{v.product_name}</td>
                      <td className="py-2.5 text-right pr-1 font-extrabold text-blue-700">{v.click_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchAnalytics;
