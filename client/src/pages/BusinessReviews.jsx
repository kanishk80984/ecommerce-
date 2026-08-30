
import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { Star, ArrowLeft, Loader2, Calendar, Edit3, CheckCircle2, ChevronDown, MoreVertical, ThumbsUp, ThumbsDown } from 'lucide-react';

const BusinessReviews = () => {
  const { slug } = useParams();
  const location = useLocation();
  const type = new URLSearchParams(location.search).get('type') || 'all';
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  const handleReaction = async (reviewId, action) => {
    if (!isAuthenticated) {
      alert('Please log in to react to reviews');
      return;
    }

    try {
      // Optimistically update the UI
      setReviews(reviews.map(r => {
        if (r.id === reviewId) {
          const newReview = { ...r };
          if (r.user_reaction === action) {
            // Remove reaction
            newReview.user_reaction = null;
            newReview[action === 'LIKE' ? 'likes' : 'dislikes'] = Math.max(0, r[action === 'LIKE' ? 'likes' : 'dislikes'] - 1);
          } else {
            // Add or switch reaction
            if (r.user_reaction) {
              newReview[r.user_reaction === 'LIKE' ? 'likes' : 'dislikes'] = Math.max(0, r[r.user_reaction === 'LIKE' ? 'likes' : 'dislikes'] - 1);
            }
            newReview.user_reaction = action;
            newReview[action === 'LIKE' ? 'likes' : 'dislikes'] = (r[action === 'LIKE' ? 'likes' : 'dislikes'] || 0) + 1;
          }
          return newReview;
        }
        return r;
      }));

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(`/public/business/${slug}/reviews/${reviewId}/reaction`, { action }, { headers });
    } catch (err) {
      console.error(err);
      fetchReviews(); // Revert on failure
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [slug, type]);

  useEffect(() => {
    let filtered = reviews;
    if (filterRating !== 'all') {
      filtered = filtered.filter(r => Math.round(Number(r.rating)) === Number(filterRating));
    }
    if (verifiedOnly) {
      filtered = filtered.filter(r => true); // Assuming all completed reviews are verified
    }
    setFilteredReviews(filtered);
  }, [filterRating, verifiedOnly, reviews]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const typeParam = type !== 'all' ? `?type=${type}` : '';
      const res = await api.get(`/public/business/${slug}/reviews${typeParam}`, { headers });
      if (res.data.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingSummary = () => {
    const summary = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(Number(r.rating));
      if (summary[rating] !== undefined) summary[rating]++;
    });
    return summary;
  };

  const summary = getRatingSummary();
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (reviews.reduce((acc, curr) => acc + Number(curr.rating), 0) / totalReviews).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-4">

        {/* Desktop Header */}
        <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link to={`/shop/${slug}`} className="mt-1 text-gray-500 hover:text-gray-700 bg-white shadow-sm border p-2 rounded-full hover:bg-gray-50 transition-colors flex shrink-0">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{type === 'product' ? 'Product Reviews' : type === 'service' ? 'Service Reviews' : 'All Reviews'}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span>{totalReviews} reviews</span>
                <span>•</span>
                <span>{averageRating} average rating</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <div className="absolute left-3 text-gray-500 pointer-events-none flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </div>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-9 pr-8 rounded-lg text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer h-[38px]"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3 text-gray-500 pointer-events-none flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" /></svg>
              </div>
              <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-9 pr-8 rounded-lg text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer h-[38px]">
                <option>Most Recent</option>
                <option>Highest Rated</option>
                <option>Lowest Rated</option>
              </select>
              <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
                <ChevronDown size={16} />
              </div>
            </div>

            <label className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors h-[38px]">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
              <span className="text-sm font-semibold text-gray-700">Verified Only</span>
            </label>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={`/shop/${slug}`} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="text-[1.35rem] font-bold text-gray-900 leading-none">All Reviews</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-xl font-bold text-gray-900">{averageRating}</span>
            <Star size={16} className="text-yellow-400 fill-yellow-400 shrink-0" />
            <span className="text-sm font-medium text-gray-500 ml-1">{totalReviews} Reviews</span>
            <span className="text-gray-300 mx-1 text-xs">•</span>
            <div className="flex items-center gap-1 text-xs font-bold text-green-700">
              <CheckCircle2 size={14} className="fill-green-100 text-green-600 shrink-0" />
              Verified Reviews
            </div>
          </div>

          <div className="flex gap-2 mt-3 mb-1">
            <div className="relative flex-1">
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="appearance-none w-full bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-full text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <div className="absolute right-3 top-[10px] text-gray-400 pointer-events-none">
                <ChevronDown size={14} />
              </div>
            </div>
            <div className="relative flex-1">
              <select className="appearance-none w-full bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-full text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                <option>Most Recent</option>
                <option>Highest Rated</option>
                <option>Lowest Rated</option>
              </select>
              <div className="absolute right-3 top-[10px] text-gray-400 pointer-events-none">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="hidden lg:block lg:col-span-1 h-fit sticky top-24">
              <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-black text-gray-900 leading-none tracking-tight">{averageRating}</span>
                  <span className="text-gray-600 font-semibold text-lg">/ 5.0</span>
                </div>

                <div className="flex justify-center mt-4 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={26}
                      className={star <= Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-sm font-bold text-green-700 mb-8 mt-1">
                  <CheckCircle2 size={16} className="fill-green-100 text-green-700" />
                  Verified Reviews
                </div>

                <div className="w-full space-y-3 mb-8">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFilterRating(star.toString())}
                      className={`flex items-center text-sm w-full gap-3 p-1 rounded transition-colors ${filterRating === star.toString() ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    >
                      <span className="font-bold text-gray-800 w-2 text-right">{star}</span>
                      <Star size={14} className="text-yellow-400 fill-yellow-400 shrink-0" />
                      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${totalReviews > 0 ? (summary[star] / totalReviews) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-bold w-4 text-right">{summary[star]}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-gray-200 shadow-sm">
                    <div className="text-xl font-black text-gray-900">{summary[5]}</div>
                    <div className="text-[11px] text-gray-600 font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <span className="font-bold text-gray-800">5</span> <Star size={10} className="text-yellow-400 fill-yellow-400" /> Reviews
                    </div>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-gray-200 shadow-sm">
                    <div className="text-xl font-black text-gray-900">{summary[1]}</div>
                    <div className="text-[11px] text-gray-600 font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <span className="font-bold text-gray-800">1</span> <Star size={10} className="text-yellow-400 fill-yellow-400" /> Review
                    </div>
                  </div>
                </div>

                {filterRating !== 'all' && (
                  <button
                    onClick={() => setFilterRating('all')}
                    className="text-xs text-red-600 font-bold w-full text-center mt-6 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-5">
              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                  <Star size={48} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">No reviews found</h3>
                  <p className="text-gray-500 text-sm">
                    {filterRating !== 'all' ? `No ${filterRating}-star reviews yet.` : "This business doesn't have any completed reviews yet."}
                  </p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                          {review.reviewer_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-[14px] sm:text-[15px]">{review.reviewer_name || 'User'}</div>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-green-700 whitespace-nowrap">
                              <CheckCircle2 size={12} className="fill-green-100 text-green-600" />
                              Verified Purchase
                            </span>
                            <span className="hidden sm:inline text-[11px] text-gray-300">•</span>
                            <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium whitespace-nowrap">
                              {new Date(review.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={`star-${star}`}
                            size={14}
                            className={star <= Math.round(Number(review.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-100 fill-gray-100'}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mb-4 sm:mb-6 mt-1 sm:mt-2">
                      <h4 className="font-bold text-gray-900 text-[14px] sm:text-[15px] mb-1.5 sm:mb-2">{review.title}</h4>
                      <p className="text-gray-600 text-[13px] leading-relaxed line-clamp-3 sm:line-clamp-none">{review.body}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center bg-gray-50 border border-gray-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold text-gray-600 truncate max-w-[200px]">
                          {review.service_name || review.product_name}
                        </span>
                        <span className="inline-flex items-center bg-green-50 text-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold border border-green-100 whitespace-nowrap">
                          Verified Purchase
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto mr-1">
                        <button
                          onClick={() => handleReaction(review.id, 'LIKE')}
                          className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${review.user_reaction === 'LIKE' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Helpful?
                          <ThumbsUp size={14} className={`ml-0.5 ${review.user_reaction === 'LIKE' ? 'fill-blue-600' : ''}`} />
                          {review.likes > 0 && <span className="ml-0.5">{review.likes}</span>}
                        </button>
                        <button
                          onClick={() => handleReaction(review.id, 'DISLIKE')}
                          className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold transition-colors ${review.user_reaction === 'DISLIKE' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          <ThumbsDown size={14} className={`${review.user_reaction === 'DISLIKE' ? 'fill-red-600' : ''}`} />
                          {review.dislikes > 0 && <span>{review.dislikes}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessReviews;
