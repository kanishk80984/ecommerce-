import React, { useEffect, useState } from 'react';
import * as rrdPkg from 'react-router-dom';
const { Link } = rrdPkg;
import api from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  Package, ShoppingBag, IndianRupee, TrendingUp, X, Eye, Layers, ArrowRight, BarChart2, Award, ChevronRight, Calendar, ChevronDown
} from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const VendorDashboard = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    total_orders: 0,
    total_revenue: 0,
    weekly_revenue: 0,
    monthly_revenue: 0,
    sold_products: [],
    all_products_sales: []
  });
  const [loading, setLoading] = useState(true);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [chartView, setChartView] = useState('FLOWCHART'); // 'FLOWCHART' | 'BAR' | 'PIE'
  const [timeframe, setTimeframe] = useState('WEEKLY'); // 'WEEKLY' | 'MONTHLY'

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/vendor/dashboard');
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Loading Vendor Dashboard...</p>
      </div>
    );
  }

  const allProducts = stats.all_products_sales || [];
  const topSoldProducts = stats.sold_products || [];

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b-0 md:border-b border-gray-100 pb-2 md:pb-5">
        <div>
          <h2 className="text-lg md:text-2xl font-extrabold text-gray-900">Sales Overview</h2>
          <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Track your store performance</p>
        </div>
        <div className="md:hidden flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-700 shadow-sm">
          <Calendar size={12} className="text-gray-500" />
          Today
          <ChevronDown size={12} className="text-gray-500" />
        </div>
        <button
          onClick={() => setIsProductsModalOpen(true)}
          className="hidden md:flex px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all items-center gap-2"
        >
          <Package className="w-4 h-4" />
          View All Products & Sales Data ({stats.total_products})
        </button>
      </div>

      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

        {/* Card 1: My Products (Desktop) */}
        <div
          onClick={() => setIsProductsModalOpen(true)}
          className="hidden md:flex bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden flex-col justify-between min-h-[140px]"
        >
          <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-40 transition-opacity">
            <Package className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100">My Products</span>
            <div className="text-4xl font-extrabold mt-2 tracking-tight">{stats.total_products}</div>
          </div>
          <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-bold text-blue-100 group-hover:text-white">
            <span>Click to view sales details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 1: My Products (Mobile) */}
        <div
          onClick={() => setIsProductsModalOpen(true)}
          className="md:hidden bg-white border border-gray-100 rounded-2xl p-3.5 flex shadow-sm relative"
        >
           <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0 mr-3 h-fit">
              <Package size={18} />
           </div>
           <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-gray-700 leading-none">My Products</span>
              <span className="text-xl font-black text-gray-900 leading-tight mt-1">{stats.total_products}</span>
              <div className="flex items-center justify-between mt-1">
                 <span className="text-[9px] text-gray-500 line-clamp-1">Active listings</span>
                 <div className="bg-blue-50 text-blue-600 p-1 rounded-full">
                    <ChevronRight size={10} strokeWidth={3} />
                 </div>
              </div>
           </div>
        </div>

        {/* Card 2: Total Orders (Desktop) */}
        <div className="hidden md:flex bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex-col justify-between min-h-[140px]">
          <div className="absolute right-3 top-3 opacity-20">
            <ShoppingBag className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">Total Orders Placed</span>
            <div className="text-4xl font-extrabold mt-2 tracking-tight">{stats.total_orders || 0}</div>
          </div>
          <div className="relative z-10 mt-4 text-xs font-medium text-emerald-100">
            Across all product items
          </div>
        </div>

        {/* Card 2: Total Orders (Mobile) */}
        <div className="md:hidden bg-white border border-gray-100 rounded-2xl p-3.5 flex shadow-sm relative">
           <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl shrink-0 mr-3 h-fit">
              <ShoppingBag size={18} />
           </div>
           <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-gray-700 leading-none">Total Orders</span>
              <span className="text-xl font-black text-gray-900 leading-tight mt-1">{stats.total_orders || 0}</span>
              <div className="flex items-center justify-between mt-1">
                 <span className="text-[9px] text-gray-500 line-clamp-1">Across all products</span>
                 <div className="bg-emerald-50 text-emerald-600 p-1 rounded-full">
                    <ChevronRight size={10} strokeWidth={3} />
                 </div>
              </div>
           </div>
        </div>

        {/* Card 3: Total Revenue (Desktop) */}
        <div className="hidden md:flex bg-gradient-to-br from-amber-500 to-amber-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex-col justify-between min-h-[140px]">
          <div className="absolute right-3 top-3 opacity-20">
            <IndianRupee className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">Total Revenue Generated</span>
            <div className="text-3xl font-extrabold mt-2 tracking-tight">₹{Number(stats.total_revenue).toLocaleString('en-IN')}</div>
          </div>
          <div className="relative z-10 mt-4 text-xs font-medium text-amber-100">
            Total sales earnings
          </div>
        </div>

        {/* Card 3: Total Revenue (Mobile) */}
        <div className="md:hidden bg-white border border-gray-100 rounded-2xl p-3.5 flex shadow-sm relative">
           <div className="bg-orange-50 text-orange-500 p-2 rounded-xl shrink-0 mr-3 h-fit">
              <IndianRupee size={18} />
           </div>
           <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-gray-700 leading-none">Total Revenue</span>
              <span className="text-xl font-black text-gray-900 leading-tight mt-1">₹{Number(stats.total_revenue).toLocaleString('en-IN')}</span>
              <div className="flex items-center justify-between mt-1">
                 <span className="text-[9px] text-gray-500 line-clamp-1">Total sales earnings</span>
                 <div className="bg-orange-50 text-orange-500 p-1 rounded-full">
                    <ChevronRight size={10} strokeWidth={3} />
                 </div>
              </div>
           </div>
        </div>

        {/* Card 4: Interactive Timeframe Sales Summary (Desktop) */}
        <div className="hidden md:flex bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex-col justify-between min-h-[140px]">
          <div className="absolute right-3 top-3 opacity-10">
            <TrendingUp className="w-24 h-24" />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-100">
                {timeframe === 'WEEKLY' ? 'This Week Selling' : 'This Month Selling'}
              </span>
              <div className="flex bg-white/20 p-0.5 rounded-lg text-[9px] font-black uppercase">
                <button
                  onClick={(e) => { e.stopPropagation(); setTimeframe('WEEKLY'); }}
                  className={`px-1.5 py-0.5 rounded ${timeframe === 'WEEKLY' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setTimeframe('MONTHLY'); }}
                  className={`px-1.5 py-0.5 rounded ${timeframe === 'MONTHLY' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-1 tracking-tight">
              ₹{Number(timeframe === 'WEEKLY' ? stats.weekly_revenue : stats.monthly_revenue).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[10px] font-medium text-purple-100">
            {timeframe === 'WEEKLY' ? 'Sales generated in the last 7 days' : 'Sales generated in the last 30 days'}
          </div>
        </div>

        {/* Card 4: This Week Sales (Mobile) */}
        <div className="md:hidden bg-white border border-gray-100 rounded-2xl p-3.5 flex shadow-sm relative">
           <div className="bg-purple-50 text-purple-600 p-2 rounded-xl shrink-0 mr-3 h-fit">
              <TrendingUp size={18} />
           </div>
           <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-gray-700 leading-none">This Week Sales</span>
              <span className="text-xl font-black text-gray-900 leading-tight mt-1">₹{Number(stats.weekly_revenue).toLocaleString('en-IN')}</span>
              <div className="flex items-center justify-between mt-1">
                 <span className="text-[9px] text-gray-500 line-clamp-1">Last 7 days</span>
                 <div className="bg-purple-50 text-purple-600 p-1 rounded-full">
                    <ChevronRight size={10} strokeWidth={3} />
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* Mobile Top Selling Products */}
      <div className="md:hidden bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mt-6 mb-2">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Top Selling Products</h3>
          <span className="text-[10px] font-semibold text-blue-600">View All</span>
        </div>
        
        {/* Fake Tabs to match image */}
        <div className="flex border-b border-gray-100 px-4 pt-2">
          <div className="pb-2 px-2 text-[11px] font-bold text-blue-600 border-b-2 border-blue-600">Sales</div>
          <div className="pb-2 px-6 text-[11px] font-medium text-gray-400">Revenue</div>
          <div className="pb-2 px-6 text-[11px] font-medium text-gray-400">Units</div>
        </div>

        <div className="p-4 space-y-4 bg-gray-50/50">
          {topSoldProducts.slice(0, 3).map((prod, index) => (
            <div key={prod.id || index} className="bg-white border border-gray-100 rounded-xl p-3 relative shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="bg-amber-100 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  ⭐ #{index + 1} Top Seller
                </span>
                <span className="text-[10px] text-gray-500 font-medium">Stock: {prod.stock}</span>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg p-1 flex-shrink-0">
                   <img src={getImageUrl(prod.thumbnail)} className="w-full h-full object-contain"/>
                </div>
                <div>
                   <h4 className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-1">{prod.name}</h4>
                   <p className="text-[9px] text-gray-500 mt-0.5">{prod.sold_quantity} unit{prod.sold_quantity !== 1 ? 's' : ''} sold</p>
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-gray-50 pt-2 mb-2">
                 <div>
                    <div className="text-[9px] text-gray-400">Total Revenue</div>
                    <div className="text-[11px] font-bold text-emerald-500">₹{Number(prod.revenue).toLocaleString('en-IN')}</div>
                 </div>
                 <div className="text-right">
                    <div className="text-[9px] text-gray-400">Units Sold</div>
                    <div className="text-[11px] font-bold text-blue-600">{prod.sold_quantity} pcs</div>
                 </div>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
                 <div className="bg-blue-600 h-full rounded-full w-[80%]"></div>
              </div>
            </div>
          ))}
          {topSoldProducts.length === 0 && (
            <div className="text-center text-xs text-gray-400 py-4">No top selling products yet.</div>
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white sm:rounded-2xl border-y sm:border border-gray-200/80 shadow-sm p-4 sm:p-6 space-y-6 -mx-4 sm:mx-0">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Maximum Sold Products Analytics
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Flowchart diagram and sales distribution of top selling products</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setChartView('FLOWCHART')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${chartView === 'FLOWCHART' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Sales Flowchart
            </button>
            <button
              onClick={() => setChartView('BAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${chartView === 'BAR' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setChartView('PIE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${chartView === 'PIE' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Share Pie
            </button>
          </div>
        </div>

        {/* View 1: Flowchart Diagram */}
        {chartView === 'FLOWCHART' && (
          <div className="space-y-6">
            {topSoldProducts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm font-semibold">
                No product sales recorded yet. Once orders are placed, sales flowchart diagram will render here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {topSoldProducts.map((prod, index) => {
                  const maxSold = topSoldProducts[0]?.sold_quantity || 1;
                  const percentage = Math.round((prod.sold_quantity / maxSold) * 100);

                  return (
                    <div
                      key={prod.id || index}
                      className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between relative shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* Flow Connection Arrow for Next Node */}
                      {index < topSoldProducts.length - 1 && (
                        <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1 bg-white border border-gray-200 rounded-full shadow text-blue-600">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div>
                        {/* Rank Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                            #{index + 1} Top Seller
                          </span>
                          <span className="text-[11px] font-bold text-gray-400">Stock: {prod.stock}</span>
                        </div>

                        {/* Thumbnail & Title */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-white flex-shrink-0 p-1 flex items-center justify-center">
                            <img src={getImageUrl(prod.thumbnail)} alt={prod.name} className="max-h-full max-w-full object-contain" />
                          </div>
                          <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight">{prod.name}</h4>
                        </div>
                      </div>

                      {/* Sales Metrics */}
                      <div className="space-y-2 border-t border-gray-100 pt-3 mt-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-gray-500">Units Sold:</span>
                          <span className="font-extrabold text-blue-600 text-sm">{prod.sold_quantity} pcs</span>
                        </div>
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-gray-500">Total Revenue:</span>
                          <span className="font-extrabold text-emerald-600">₹{Number(prod.revenue).toLocaleString('en-IN')}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View 2: Bar Chart */}
        {chartView === 'BAR' && (
          <div className="h-80">
            {topSoldProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSoldProducts} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} units`, 'Sold Quantity']} />
                  <Bar dataKey="sold_quantity" radius={[8, 8, 0, 0]}>
                    {topSoldProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data available</div>
            )}
          </div>
        )}

        {/* View 3: Pie Chart */}
        {chartView === 'PIE' && (
          <div className="h-80">
            {topSoldProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topSoldProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={5}
                    dataKey="sold_quantity"
                    nameKey="name"
                  >
                    {topSoldProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data available</div>
            )}
          </div>
        )}

      </div>

      {/* ALL PRODUCTS & SALES DATA MODAL */}
      {isProductsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">All Products & Sales Performance Data</h3>
                  <p className="text-xs text-gray-500">Showing detailed units sold, total revenue, and stock levels for every product</p>
                </div>
              </div>

              <button
                onClick={() => setIsProductsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Products Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {allProducts.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Package className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-500 font-bold text-sm">No products uploaded yet.</p>
                  <Link
                    to="/vendor/products"
                    className="inline-block px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow"
                  >
                    Upload First Product
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] font-extrabold uppercase text-gray-500 tracking-wider border-b border-gray-200">
                        <th className="py-3.5 px-4">Product</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Price / MRP</th>
                        <th className="py-3.5 px-4">Stock Status</th>
                        <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Units Sold</th>
                        <th className="py-3.5 px-4 text-right">Revenue Generated</th>
                        <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                      {allProducts.map((p) => {
                        const units = Number(p.units_sold || 0);
                        const revenue = Number(p.total_revenue || 0);
                        const stock = Number(p.current_stock || 0);

                        return (
                          <tr key={p.product_id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getImageUrl(p.thumbnail)}
                                  alt={p.product_name}
                                  className="w-10 h-10 rounded-lg border border-gray-200 object-cover flex-shrink-0 bg-white"
                                />
                                <div>
                                  <p className="font-bold text-gray-900 line-clamp-1">{p.product_name}</p>
                                  <span className="text-[10px] text-gray-400">ID: #{p.product_id}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-gray-600 font-medium">
                              {p.category_name || 'General'}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-gray-900">₹{Number(p.price).toLocaleString('en-IN')}</span>
                                {Number(p.mrp) > Number(p.price) && (
                                  <span className="text-[10px] text-gray-400 line-through">₹{Number(p.mrp).toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {stock <= 0 ? (
                                <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full border border-red-200">
                                  Out of Stock
                                </span>
                              ) : stock < 5 ? (
                                <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-[10px] font-extrabold rounded-full border border-orange-200">
                                  Low Stock ({stock})
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-extrabold rounded-full border border-green-200">
                                  In Stock ({stock})
                                </span>
                              )}
                            </td>

                            <td className="text-left px-6 py-4">
                              <span className={`font-extrabold text-xs px-2.5 py-1 rounded-lg ${units > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                                {units} pcs
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span className="font-extrabold text-sm text-emerald-600">
                                ₹{revenue.toLocaleString('en-IN')}
                              </span>
                            </td>

                            <td className="text-left px-6 py-4">
                              <Link
                                to="/vendor/products"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Edit / Manage →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">Total Listed: {allProducts.length} Products</span>
              <button
                onClick={() => setIsProductsModalOpen(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default VendorDashboard;
