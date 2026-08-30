import React, { useState, useEffect } from 'react';
import { Star, FileText, CheckCircle, RefreshCcw, Package } from 'lucide-react';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';

const UserReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/my-reviews');
      setReviews(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-6 text-gray-500">Loading reviews...</div>;

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-800">No Reviews Found</h3>
        <p className="text-sm text-gray-500 mt-2">You haven't written any product reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
      <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-50 pb-3">
        <Star className="w-5 h-5 text-primary" />
        My Reviews
      </h3>
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="border border-gray-100 rounded-lg p-3 md:p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-white rounded border border-gray-200 flex-shrink-0 p-1">
                {review.product_thumbnail ? (
                  <img src={getImageUrl(review.product_thumbnail)} alt={review.product_name} className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-800">{review.product_name}</h4>
                  <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < parseFloat(review.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-700">{review.title}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{review.body}</p>
                
                {review.helpful_count > 0 && (
                  <div className="text-xs text-gray-500 bg-white border border-gray-200 inline-block px-2 py-1 rounded">
                    👍 {review.helpful_count} people found this helpful
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserReviews;
