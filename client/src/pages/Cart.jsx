import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { Link, useNavigate } = rrdPkg;
import { updateQuantity, removeFromCart, clearCart } from '../store/cartSlice';
import api from '../services/api';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { Trash2, Zap, HelpCircle } from 'lucide-react';

const Cart = () => {
  const cartItems = useSelector(state => state.cart?.items) || [];
  const { isAuthenticated } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedItemForQty, setSelectedItemForQty] = useState(null);
  const [customQtyInput, setCustomQtyInput] = useState('');

  const getImageUrl = (pathOrItem) => {
    let path = typeof pathOrItem === 'string' ? pathOrItem : (pathOrItem?.thumbnail || pathOrItem?.image_url || pathOrItem?.image || pathOrItem?.images?.[0]?.imageUrl || pathOrItem?.images?.[0]?.image_url || '');
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) {
      handleRemove(item);
      return;
    }
    dispatch(updateQuantity({ id: item.cartItemId || item.product_id, quantity: newQuantity, variantId: item.variant_id }));

    if (isAuthenticated) {
      try {
        await api.put(`/cart/${item.product_id}`, { quantity: newQuantity, variantId: item.variant_id || 0 });
      } catch (error) {
        console.error('Failed to update cart quantity on server', error);
      }
    }
  };

  const handleRemove = async (item) => {
    dispatch(removeFromCart({ id: item.cartItemId || item.product_id, variantId: item.variant_id }));

    if (isAuthenticated) {
      try {
        await api.delete(`/cart/${item.product_id}?variantId=${item.variant_id || 0}`);
      } catch (error) {
        console.error('Failed to remove cart item from server', error);
      }
    }
  };

  const handleClearCart = async () => {
    dispatch(clearCart());
    if (isAuthenticated) {
      try {
        await api.delete('/cart'); // Assuming /cart DELETE clears all items
      } catch (error) {
        console.error('Failed to clear cart on server', error);
      }
    }
  };

  const totalMRP = cartItems.reduce((acc, item) => acc + (Number(item.mrp || 0) * item.quantity), 0);
  const totalAmount = cartItems.reduce((acc, item) => acc + (Number(item.price || 0) * item.quantity), 0);
  const discount = totalMRP - totalAmount;
  const totalGST = Math.round(cartItems.reduce((acc, item) => {
    const gstRate = Number(item.gst_percentage || 0);
    const itemPrice = Number(item.price || 0);
    return acc + (itemPrice * (gstRate / 100) * item.quantity);
  }, 0));
  const totalPayable = totalAmount + totalGST;

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-sm shadow-sm p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Cart is Empty!</h2>
        <p className="text-gray-500 mb-6">Add items to it now.</p>
        <Link to="/" className="bg-[#2874f0] text-white px-8 py-2 rounded-sm font-semibold shadow hover:bg-blue-600">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto px-2 pb-24 lg:pb-8 min-h-[85vh]">

      {/* Left side: Cart Items */}
      <div className="flex-1 flex flex-col gap-3">

        {/* Cart Header */}
        <div className="bg-white rounded shadow-sm px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg md:text-[19px] font-extrabold text-gray-900 flex items-baseline gap-1">
            My Cart <span className="text-gray-400 font-medium text-xs md:text-sm">({cartItems.length} Items)</span>
          </h2>
          <button
            onClick={handleClearCart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 transition-colors text-xs font-bold"
          >
            <Trash2 size={14} /> Clear Cart
          </button>
        </div>

        {/* Product Items List */}
        <div className="bg-white rounded shadow-sm">
          <div className="flex flex-col">
            {cartItems.map(item => {
              const itemDiscount = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
              return (
                <div key={item.cartItemId || `${item.product_id}-${item.variant_id || 0}`} className="p-4 md:p-6 flex flex-col">
                  <div className="flex gap-4 md:gap-6">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 flex flex-col items-center justify-between gap-2">
                      <img src={getImageUrl(item.thumbnail)} alt={item.name} className="max-h-full max-w-full object-contain" />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-extrabold text-gray-900 text-sm md:text-base hover:text-blue-600 cursor-pointer line-clamp-2 leading-snug"
                        onClick={() => {
                          const categorySlug = (item.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          const variantSlug = item.variant_seo_slug || item.variant_id;
                          const targetPath = variantSlug
                            ? `/${categorySlug}/product/${variantSlug}/${item.slug || item.product_id}`
                            : `/${categorySlug}/product/${item.slug || item.product_id}`;
                          navigate(targetPath);
                        }}
                      >
                        {item.name || item.title || item.product_name}
                      </h3>
                      {item.short_description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.short_description}</p>
                      )}

                      {/* Pricing section */}
                      <div className="flex items-baseline gap-2 mt-3 flex-wrap">
                        {itemDiscount > 0 && (
                          <span className="text-[#388e3c] text-xs font-bold flex items-center">
                            ↓{itemDiscount}%
                          </span>
                        )}
                        <span className="text-xs text-gray-400 line-through">₹{Number(item.mrp || 0).toLocaleString('en-IN')}</span>
                        <span className="text-base md:text-lg font-bold text-gray-900">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Qty & Actions Row */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center">
                      <select
                        value={item.quantity <= 3 ? item.quantity : '4+'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '4+') {
                            setSelectedItemForQty(item);
                            setCustomQtyInput(item.quantity.toString());
                            setQuantityModalOpen(true);
                          } else {
                            handleUpdateQuantity(item, parseInt(val));
                          }
                        }}
                        className="bg-white border border-gray-200 rounded px-2.5 py-1 font-semibold text-gray-800 text-xs focus:outline-none cursor-pointer hover:border-gray-300"
                      >
                        <option value="0">Qty: 0 (Remove)</option>
                        <option value="1">Qty: 1</option>
                        <option value="2">Qty: 2</option>
                        <option value="3">Qty: 3</option>
                        <option value="4+">Qty: 4+ (More)</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions Footer Panel */}
                  <div className="flex mt-4 text-xs md:text-sm font-bold -mx-4 md:-mx-6 -mb-4 md:-mb-6 border-t border-gray-100">
                    <button onClick={() => handleRemove(item)} className="flex-1 py-3.5 text-center text-red-500 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors border-r border-gray-100">
                      <Trash2 size={14} className="text-red-500" />
                      Remove
                    </button>
                    <button onClick={() => navigate('/checkout', { state: { checkoutItems: [item] } })} className="flex-1 py-3.5 text-center text-green-600 hover:bg-green-50 flex items-center justify-center gap-1.5 transition-colors">
                      <Zap size={14} className="text-green-600" />
                      Buy this now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right side: Price Details sidebar (Desktop view) */}
      <div className="w-full lg:w-[380px] flex flex-col gap-4">
        <div className="bg-white rounded shadow-sm sticky top-20">
          <h3 className="text-gray-500 font-bold border-b border-gray-100 p-4 text-base">Price Details</h3>

          <div className="p-4 flex flex-col gap-4 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="border-b border-dotted border-gray-400 cursor-help">Price ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</span>
              <span className="text-gray-900 font-medium">₹{totalMRP.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#388e3c]">
              <span>Discount</span>
              <span>- ₹{discount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#388e3c]">
              <span>Delivery Charges</span>
              <span className="font-semibold uppercase text-xs">Free</span>
            </div>
            {totalGST > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Estimated GST</span>
                <span>+ ₹{totalGST.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-200 my-1"></div>

            <div className="flex justify-between font-bold text-gray-800 text-base py-0.5">
              <span>Total Amount</span>
              <span>₹{totalPayable.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-[#e8f5e9] text-[#388e3c] text-[13px] font-bold py-2.5 px-3 rounded text-center mt-1">
              You will save ₹{discount.toLocaleString('en-IN')} on this order
            </div>

            <button
              onClick={() => navigate('/checkout', { state: { checkoutItems: cartItems } })}
              className="w-full bg-[#fb641b] text-white font-bold py-3 rounded shadow hover:bg-[#e85d19] mt-3 uppercase text-sm tracking-wide transition-colors"
            >
              CONFIRM ORDER
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded hover:bg-gray-50 mt-2 uppercase text-sm tracking-wide transition-colors"
            >
              Shop More
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Place Order Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white px-4 py-2.5 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 line-through">₹{totalMRP.toLocaleString('en-IN')}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-gray-900">₹{totalPayable.toLocaleString('en-IN')}</span>
            <span className="text-gray-400 text-[10px] border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center font-bold">i</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/checkout', { state: { checkoutItems: cartItems } })}
          className="bg-[#ffc200] hover:bg-[#e6af00] text-gray-900 font-bold px-8 py-2.5 rounded shadow-md text-sm uppercase tracking-wide transition-colors"
        >
          Place order
        </button>
      </div>

      {/* Custom Quantity Modal */}
      {quantityModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white w-full max-w-sm rounded shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 pb-4">
              <h3 className="text-gray-800 font-medium mb-4">Enter Quantity</h3>
              <input
                type="number"
                min="1"
                autoFocus
                value={customQtyInput}
                onChange={(e) => setCustomQtyInput(e.target.value)}
                className="w-full border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 text-base py-1 placeholder-gray-400"
                placeholder="Quantity"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuantityModalOpen(false)}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 uppercase tracking-wide"
              >
                Cancel
              </button>
              <div className="w-px bg-gray-100"></div>
              <button
                onClick={() => {
                  const parsed = parseInt(customQtyInput);
                  if (!isNaN(parsed) && parsed >= 1 && selectedItemForQty) {
                    handleUpdateQuantity(selectedItemForQty, parsed);
                  }
                  setQuantityModalOpen(false);
                }}
                className="flex-1 py-3 text-sm font-semibold text-blue-600 hover:bg-gray-50 uppercase tracking-wide"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
