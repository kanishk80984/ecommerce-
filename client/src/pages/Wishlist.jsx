import React from 'react';
import { useSelector } from 'react-redux';
import ProductCard from '../components/ProductCard';

const Wishlist = () => {
  const wishlistItems = useSelector((state) => state.wishlist?.items || []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 bg-white min-h-[60vh]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wishlist</h1>
      {wishlistItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your wishlist is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {wishlistItems.map((product) => (
            <div key={product.id} className="w-full h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
