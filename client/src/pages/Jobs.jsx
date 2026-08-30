import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, MapPin, Search, Filter, IndianRupee, Clock, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';

const TAMIL_NADU_CITIES = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Tiruppur',
  'Thanjavur', 'Dindigul', 'Karur', 'Namakkal', 'Nagapattinam',
  'Kanchipuram', 'Chengalpattu', 'Tambaram', 'Avadi', 'Tiruvallur',
  'Tiruvannamalai', 'Viluppuram', 'Kallakurichi', 'Cuddalore',
  'Chidambaram', 'Mayiladuthurai', 'Sirkazhi', 'Thiruvarur',
  'Pudukottai', 'Sivagangai', 'Ramanathapuram', 'Paramakudi',
  'Sivakasi', 'Virudhunagar', 'Rajapalayam', 'Srivilliputhur',
  'Tenkasi', 'Sankarankovil', 'Nagercoil', 'Kanyakumari',
  'Marthandam', 'Kuzhithurai', 'Theni', 'Bodinayakanur',
  'Cumbum', 'Periyakulam', 'Palani', 'Oddanchatram',
  'Kodaikanal', 'Pollachi', 'Mettupalayam', 'Coonoor',
  'Udhagamandalam', 'Gobichettipalayam', 'Bhavani', 'Sathyamangalam',
  'Mettur', 'Attur', 'Rasipuram', 'Kulithalai',
  'Ariyalur', 'Perambalur', 'Arakkonam', 'Ranipet',
  'Walajapet', 'Gudiyatham', 'Ambur', 'Vaniyambadi',
  'Tirupattur', 'Arani', 'Cheyyar', 'Tiruttani',
  'Palladam', 'Dharapuram', 'Udumalaipettai', 'Kovilpatti',
  'Tiruchendur', 'Neyveli', 'Panruti', 'Vriddhachalam',
  'Pattukkottai', 'Mannargudi', 'Vedaranyam', 'Karaikudi'
];

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [bookmarkedJobs, setBookmarkedJobs] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarked_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    let updated;
    if (bookmarkedJobs.includes(jobId)) {
      updated = bookmarkedJobs.filter(id => id !== jobId);
    } else {
      updated = [...bookmarkedJobs, jobId];
    }
    setBookmarkedJobs(updated);
    localStorage.setItem('bookmarked_jobs', JSON.stringify(updated));
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return 'recently';
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return '1 day ago';
    }
    return `${diffDays} days ago`;
  };

  const sortedJobs = React.useMemo(() => {
    const arr = [...jobs];
    if (sortBy === 'recent') {
      return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (sortBy === 'salary_high') {
      return arr.sort((a, b) => Number(b.salary_max || 0) - Number(a.salary_max || 0));
    }
    if (sortBy === 'salary_low') {
      return arr.sort((a, b) => Number(a.salary_min || 0) - Number(b.salary_min || 0));
    }
    return arr;
  }, [jobs, sortBy]);

  // Filters
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    type: searchParams.get('type') || '',
    mode: searchParams.get('mode') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/public/job-categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [debouncedSearch, filters.type, filters.mode, filters.category, filters.city]);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.mode) queryParams.append('mode', filters.mode);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.city) queryParams.append('location', filters.city);

      const res = await api.get(`/jobs?${queryParams.toString()}`);
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));

    if (value) {
      searchParams.set(name === 'search' ? 'q' : name, value);
    } else {
      searchParams.delete(name === 'search' ? 'q' : name);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-0 pb-12">
      <div className="w-full px-4 md:px-0 space-y-6">

        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-6 md:p-8 flex items-center justify-between border border-gray-100 shadow-sm min-h-[115px] sm:min-h-[160px]">
          {/* The illustration background on the right */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 md:w-[55%] bg-no-repeat bg-right bg-contain opacity-100 pointer-events-none hidden sm:block"
            style={{ backgroundImage: "url('/job-banner.png')" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-[40%] bg-no-repeat bg-right bg-contain opacity-100 pointer-events-none block sm:hidden"
            style={{ backgroundImage: "url('/job-banner-mobile.png')" }}
          />

          <div className="relative z-10 space-y-1.5 sm:space-y-3 max-w-full sm:max-w-[45%]">
            {/* Explore Opportunities Red Pill Badge */}
            <span className="inline-flex items-center gap-1.5 bg-[#fff0f0] text-[#e03131] text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-red-100/50">
              <Briefcase size={12} className="text-[#e03131]" />
              Explore Opportunities
            </span>

            <h1 className="text-[20px] sm:text-2xl md:text-4xl font-extrabold text-[#0c2340] leading-none whitespace-nowrap">Find Your Next Job</h1>
            <p className="text-gray-500 text-[11px] sm:text-sm font-medium">Explore local opportunities with top community businesses</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-full">
          {/* Filters Sidebar */}
          <div className={`w-full md:w-64 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'} space-y-6`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 space-y-4 md:space-y-6">
              {/* Toggle Header (Visible on desktop only) */}
              <div
                className="hidden md:flex items-center justify-between border-b pb-3 cursor-default"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter size={18} /> Filters
                </h3>
                <div className="flex items-center gap-2.5">
                  {(filters.type || filters.mode || filters.category) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters(prev => ({ ...prev, type: '', mode: '', category: '' }));
                        searchParams.delete('type');
                        searchParams.delete('mode');
                        searchParams.delete('category');
                        setSearchParams(searchParams);
                      }}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Body (Hidden by default on mobile, always visible on desktop) */}
              <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block space-y-4 md:space-y-6`}>
                {/* Clear All button for Mobile View */}
                {showMobileFilters && (filters.type || filters.mode || filters.category) && (
                  <div className="flex md:hidden items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-gray-500">Active Filters</span>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, type: '', mode: '', category: '' }));
                        searchParams.delete('type');
                        searchParams.delete('mode');
                        searchParams.delete('category');
                        setSearchParams(searchParams);
                      }}
                      className="text-xs text-red-600 font-extrabold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Category</h4>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-red-500 focus:focus:border-red-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Work Mode</h4>
                  {['On-site', 'Hybrid', 'Remote'].map(mode => (
                    <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="mode"
                        value={mode}
                        checked={filters.mode === mode}
                        onChange={handleFilterChange}
                        className="text-red-600 focus:ring-red-500 rounded border-gray-300 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-gray-600 text-sm group-hover:text-gray-900 transition-colors">{mode}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Employment Type</h4>
                  {['Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance'].map(type => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={filters.type === type}
                        onChange={handleFilterChange}
                        className="text-red-600 focus:ring-red-500 rounded border-gray-300 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-gray-600 text-sm group-hover:text-gray-900 transition-colors">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Job Listings */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between pb-1 gap-2 w-full">
              <div className="flex items-baseline text-gray-500 font-bold text-sm md:text-base">
                <span className="text-red-600 text-lg md:text-xl font-extrabold mr-1">{jobs.length}</span>
                <span>{jobs.length === 1 ? 'Job' : 'Jobs'} Found</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs md:text-sm font-semibold text-gray-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                >
                  <option value="recent">Most Recent</option>
                  <option value="salary_high">Salary (High to Low)</option>
                  <option value="salary_low">Salary (Low to High)</option>
                </select>
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className={`md:hidden p-2 border rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center shrink-0 ${showMobileFilters ? 'border-red-500 text-red-600 bg-red-50' : 'border-gray-200 text-gray-600 hover:text-red-600 hover:bg-gray-50'}`}
                >
                  <Filter size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
              </div>
            ) : sortedJobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No jobs found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              sortedJobs.map(job => {
                const skillsStr = job.qualifications || (job.requirements && !job.requirements.includes('\n') ? job.requirements : '');
                const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
                const cityCapitalized = job.city ? job.city.charAt(0).toUpperCase() + job.city.slice(1).toLowerCase() : '';
                const isBookmarked = bookmarkedJobs.includes(job.id);

                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.slug}`}
                    className="relative block bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 p-2.5 md:pt-5 md:pb-3 md:px-5 group"
                  >
                    {/* Desktop View Layout */}
                    <div className="hidden md:flex flex-row gap-6 items-start w-full">
                      {/* Company Logo */}
                      <div className="w-[200px] h-[200px] shrink-0 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-white shadow-sm">
                        {job.business_logo ? (
                          <img src={getImageUrl(job.business_logo)} alt={job.business_name} className="w-full h-full object-contain rounded" />
                        ) : (
                          <Briefcase className="text-gray-300 w-16 h-16" />
                        )}
                      </div>

                      {/* Right Content Column next to logo */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-[200px]">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-[#0c2340] line-clamp-2 break-words break-all leading-snug">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[#cc0000] text-base font-bold">{job.business_name}</span>
                            <span className="inline-flex items-center gap-1 bg-green-50 text-[#16a34a] text-xs font-semibold px-2 py-0.5 rounded-full border border-green-200/60 shrink-0">
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z"></path></svg>
                              Verified
                            </span>
                          </div>

                          {/* Location, Employment Type & Work Mode Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <MapPin size={11} className="text-gray-400" />
                              {cityCapitalized}{job.state ? `, ${job.state}` : ''}
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <Briefcase size={11} className="text-gray-400" />
                              {job.employment_type}
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <Clock size={11} className="text-gray-400" />
                              {job.work_mode}
                            </div>
                          </div>

                          {/* Salary Details */}
                          {(job.salary_min || job.salary_max) && (
                            <div className="text-gray-900 font-extrabold text-lg mt-1.5 flex items-baseline gap-1">
                              {job.salary_min ? `₹${Number(job.salary_min).toLocaleString('en-IN')}` : ''}
                              {job.salary_max ? ` - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : ''}
                              <span className="text-xs font-medium text-gray-500"> / month</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          {/* Skill Tags */}
                          {skills.length > 0 && (
                            <div
                              className="flex flex-row flex-nowrap overflow-hidden gap-1.5 mt-1 w-full min-w-0 pr-4"
                              style={{
                                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
                                maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)'
                              }}
                            >
                              {skills.map((skill, index) => (
                                <span key={index} className="text-xs text-gray-600 bg-[#f1f3f5] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bottom Row */}
                          <div className="flex items-center justify-between mt-2.5 w-full">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                Posted {getRelativeTime(job.created_at)}
                              </div>
                              {job.number_of_openings > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <div className="text-gray-600 font-semibold">
                                    {job.number_of_openings} {job.number_of_openings === 1 ? 'Opening' : 'Openings'}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* View Job Logo Colored Outlined Button */}
                            <div className="shrink-0">
                              <div className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#cc0000] hover:bg-[#cc0000] hover:text-white px-3 py-1.5 border border-[#cc0000] rounded-lg transition-all duration-300">
                                View Job <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path></svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile View Layout */}
                    <div className="md:hidden flex flex-col gap-2">
                      <div className="flex flex-row gap-3 items-center w-full">
                        {/* Company Logo */}
                        <div className="w-16 h-16 shrink-0 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-white shadow-sm">
                          {job.business_logo ? (
                            <img src={getImageUrl(job.business_logo)} alt={job.business_name} className="w-full h-full object-contain" />
                          ) : (
                            <Briefcase className="text-gray-300 w-6 h-6" />
                          )}
                        </div>

                        {/* Title & Company Name */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-[#0c2340] line-clamp-3 break-words leading-snug">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[#cc0000] text-xs sm:text-[13px] font-bold">{job.business_name}</span>
                            <span className="inline-flex items-center gap-1 bg-green-50 text-[#16a34a] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-green-200/60 shrink-0">
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z"></path></svg>
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Job Card Content */}
                      <div className="w-full flex flex-col justify-between flex-1 mt-1">
                        <div>
                          {/* Location, Employment Type & Work Mode Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <MapPin size={11} className="text-gray-400" />
                              {cityCapitalized}{job.state ? `, ${job.state}` : ''}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <Briefcase size={11} className="text-gray-400" />
                              {job.employment_type}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              <Clock size={11} className="text-gray-400" />
                              {job.work_mode}
                            </div>
                          </div>

                          {/* Salary Details */}
                          {(job.salary_min || job.salary_max) && (
                            <div className="text-gray-900 font-extrabold text-sm mt-1 flex items-baseline gap-1">
                              {job.salary_min ? `₹${Number(job.salary_min).toLocaleString('en-IN')}` : ''}
                              {job.salary_max ? ` - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : ''}
                              <span className="text-[10px] font-medium text-gray-500"> / month</span>
                            </div>
                          )}

                          {/* Skill Tags */}
                          {skills.length > 0 && (
                            <div
                              className="flex flex-row flex-nowrap overflow-hidden gap-1.5 mt-1 w-full pr-4"
                              style={{
                                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
                                maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)'
                              }}
                            >
                              {skills.map((skill, index) => (
                                <span key={index} className="text-[10px] text-gray-600 bg-[#f1f3f5] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              Posted {getRelativeTime(job.created_at)}
                            </div>
                            {job.number_of_openings > 0 && (
                              <>
                                <span className="text-gray-400">•</span>
                                <div className="text-gray-600 font-semibold">
                                  {job.number_of_openings} {job.number_of_openings === 1 ? 'Opening' : 'Openings'}
                                </div>
                              </>
                            )}
                          </div>

                          {/* View Job Logo Colored Outlined Button */}
                          <div className="shrink-0">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#cc0000] hover:bg-[#cc0000] hover:text-white px-3 py-1.5 border border-[#cc0000] rounded-lg transition-all duration-300">
                              View Job <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
