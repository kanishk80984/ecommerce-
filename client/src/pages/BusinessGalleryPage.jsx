import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, useNavigate, Link } = rrdPkg;
import { useSelector } from 'react-redux';
import api from '../services/api';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { ArrowLeft, Plus, Eye, Edit, Trash2, LayoutGrid, List, Sparkles, Heart, ShieldCheck, X } from 'lucide-react';

const BusinessGalleryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [sortBy, setSortBy] = useState('Newest');

  const getImageUrl = (path) => {
    return resolveImageUrl(path);
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/public/business/${slug}`);
        if (res.data.success) {
          setBusiness(res.data.business);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cc0000]"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700">Business Profile Not Found</h2>
          <button onClick={() => navigate('/businesses')} className="mt-4 bg-[#cc0000] text-white px-4 py-2 rounded-xl text-sm font-semibold">
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  const galleryOnly = business.gallery_only ? (typeof business.gallery_only === 'string' ? JSON.parse(business.gallery_only) : business.gallery_only) : [];
  const isOwner = user?.id && business?.user_id && user.id === business.user_id;

  // Group gallery items by Album Title
  const groupedAlbums = {};
  galleryOnly.forEach((item) => {
    const title = typeof item === 'string' ? 'General' : (item.title || 'General');
    if (!groupedAlbums[title]) {
      groupedAlbums[title] = [];
    }
    groupedAlbums[title].push(item);
  });

  // Apply sorting within each group
  Object.keys(groupedAlbums).forEach(albumName => {
    if (sortBy === 'Oldest') {
      // Keep normal array order (oldest first)
      groupedAlbums[albumName] = [...groupedAlbums[albumName]];
    } else {
      // Reverse array order (newest first)
      groupedAlbums[albumName] = [...groupedAlbums[albumName]].reverse();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-4 md:py-8 px-4 md:px-0">
      <div className="max-w-6xl mx-auto">
        {/* Business Title info with Back Button & Sort By */}
        <div className="flex items-center justify-between gap-2 pb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => navigate(`/shop/${slug}`)}
              className="p-1.5 sm:p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 bg-white shadow-sm flex items-center justify-center shrink-0"
              title="Back to Business Profile"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-base sm:text-xl md:text-3xl font-extrabold text-gray-900 leading-tight">Business Gallery</h1>
              <p className="hidden xs:block text-[10px] sm:text-sm text-gray-500 mt-0.5">Manage and view all photos in your gallery.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-550 font-bold bg-white border border-gray-200 px-2.5 py-1.5 rounded-xl shadow-sm">
              <span className="shrink-0 text-gray-400">Sort:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-800 outline-none font-bold text-[11px] sm:text-xs cursor-pointer focus:ring-0"
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Image Grid grouped by Album */}
        {galleryOnly.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm mt-8">
            <h3 className="text-lg font-bold text-gray-700">No Photos In Gallery</h3>
            <p className="text-gray-500 text-sm mt-1">This business profile does not have any gallery photos yet.</p>
          </div>
        ) : (
          <div className="space-y-10 mt-8">
            {Object.keys(groupedAlbums).map((albumName, albumIdx) => (
              <div key={albumIdx} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-150 pb-2 bg-gray-50/50 p-2 rounded-xl">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 uppercase tracking-wide">
                    📁 {albumName}
                  </h3>
                  <span className="text-xs bg-blue-55 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    {groupedAlbums[albumName].length} {groupedAlbums[albumName].length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
                  {groupedAlbums[albumName].map((item, idx) => {
                    const imgPath = typeof item === 'string' ? item : (item.image_path || item);
                    const mockDate = "08 May 2025, 10:" + (30 - idx >= 10 ? 30 - idx : "0" + Math.max(0, 30 - idx)) + " AM";
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setActiveLightboxImage(imgPath)}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm aspect-square relative group cursor-zoom-in flex flex-col justify-end"
                      >
                        <img 
                          src={getImageUrl(imgPath)} 
                          alt={albumName} 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />

                        {/* Bottom date banner */}
                        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">
                          {mockDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal overlay */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all border border-white/20 z-[10000]"
          >
            <X size={24} strokeWidth={2.5} className="text-white" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getImageUrl(activeLightboxImage)} 
              alt="Enlarged View" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessGalleryPage;
