import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate, useLocation } = rrdPkg;
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { clearCart, removeFromCart } from '../store/cartSlice';
import LocationPickerModal from '../components/location/LocationPickerModal';
import { MapPin, Plus, Check, ShieldCheck, Truck, CreditCard, ChevronRight, AlertCircle, Phone, User } from 'lucide-react';

const Checkout = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const cartItems = useSelector(state => state.cart?.items) || [];
  const location = useLocation();
  const checkoutItems = location.state?.checkoutItems || cartItems;
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  // OpenStreetMap Location Picker Modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapInitialLocation, setMapInitialLocation] = useState(null);

  // Load guest address from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem('guestCheckoutSession');
    let guestAddrObj = null;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.address) {
          guestAddrObj = {
            id: 'guest-address',
            name: parsed.address.name,
            phone: parsed.address.phone,
            street: parsed.address.addressLine1 || parsed.address.street,
            city: parsed.address.city,
            state: parsed.address.state,
            zip: parsed.address.pincode || parsed.address.zip,
            country: 'India',
            is_default: true,
            latitude: parsed.address.latitude,
            longitude: parsed.address.longitude,
            house_no: parsed.address.house_no,
            area: parsed.address.area,
            district: parsed.address.district,
            formatted_address: parsed.address.formatted_address
          };
        }
      } catch (e) {
        console.error('Failed to parse guestCheckoutSession', e);
      }
    }

    if (!isAuthenticated) {
      if (guestAddrObj) {
        setSavedAddresses([guestAddrObj]);
        setSelectedAddressId('guest-address');
        setUseNewAddress(false);

        // Populate react-hook-form fields
        setValue('fullName', guestAddrObj.name);
        setValue('phone', guestAddrObj.phone);
        setValue('street', guestAddrObj.street);
        setValue('city', guestAddrObj.city);
        setValue('state', guestAddrObj.state);
        setValue('zip', guestAddrObj.zip);
      } else {
        setUseNewAddress(true);
      }
    } else {
      // Authenticated flow: Fetch saved addresses from server, but prepend guest address if one exists
      api.get('/addresses')
        .then((res) => {
          const addrs = res.data.addresses || [];
          if (guestAddrObj) {
            // Include guest address in the list
            setSavedAddresses([guestAddrObj, ...addrs]);
            setSelectedAddressId('guest-address');
            setUseNewAddress(false);
            
            // Populate react-hook-form fields
            setValue('fullName', guestAddrObj.name);
            setValue('phone', guestAddrObj.phone);
            setValue('street', guestAddrObj.street);
            setValue('city', guestAddrObj.city);
            setValue('state', guestAddrObj.state);
            setValue('zip', guestAddrObj.zip);
          } else {
            setSavedAddresses(addrs);
            if (addrs.length > 0) {
              setUseNewAddress(false);
              const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
              setSelectedAddressId(defaultAddr.id);
            } else {
              setUseNewAddress(true);
            }
          }
        })
        .catch((e) => {
          console.error('Failed to load saved addresses', e);
          if (guestAddrObj) {
            setSavedAddresses([guestAddrObj]);
            setSelectedAddressId('guest-address');
            setUseNewAddress(false);
          } else {
            setUseNewAddress(true);
          }
        });
    }
  }, [isAuthenticated]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      const addrs = res.data.addresses || [];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        setUseNewAddress(false);
        const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setUseNewAddress(true);
      }
    } catch (e) {
      console.error('Failed to load saved addresses', e);
    }
  };

  const getImageUrl = (pathOrItem) => {
    let path = typeof pathOrItem === 'string' ? pathOrItem : (pathOrItem?.thumbnail || pathOrItem?.image_url || pathOrItem?.image || pathOrItem?.images?.[0]?.imageUrl || pathOrItem?.images?.[0]?.image_url || '');
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  const totalBaseAmount = checkoutItems.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const totalGST = Math.round(checkoutItems.reduce((acc, item) => acc + (Number(item.price || 0) * (Number(item.gst_percentage || 0) / 100) * Number(item.quantity || 1)), 0));
  const totalAmount = totalBaseAmount + totalGST;

  // State for Map Address Contact Details Modal
  const [pendingMapLocation, setPendingMapLocation] = useState(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [mapContactName, setMapContactName] = useState(user?.name || '');
  const [mapContactPhone, setMapContactPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  if (checkoutItems.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-4">
        <h2 className="text-2xl font-extrabold text-gray-900">No Items Selected for Checkout</h2>
        <p className="text-gray-500 text-sm max-w-md">Your checkout bag is currently empty. Explore our catalog and add products to proceed.</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 text-sm transition-all"
        >
          Explore Catalog & Shop Now
        </button>
      </div>
    );
  }

  // Handle saving new manually entered address
  const handleSaveNewAddress = async (data) => {
    if (!/^[0-9]{10}$/.test(data.phone)) {
      alert('Mobile number must be exactly 10 digits');
      return;
    }
    
    if (!isAuthenticated) {
      // Guest User Flow - Save locally in state & localStorage
      const guestAddr = {
        name: data.fullName,
        phone: data.phone,
        addressLine1: data.street,
        street: data.street,
        city: data.city,
        state: data.state,
        pincode: data.zip,
        zip: data.zip,
        country: 'India',
        is_default: true
      };
      
      const newSession = {
        address: guestAddr,
        selectedAddressId: 'guest-address',
        deliveryMethod: '',
        coupon: null,
        checkoutStep: '',
        orderSummary: {}
      };
      
      localStorage.setItem('guestCheckoutSession', JSON.stringify(newSession));
      setSavedAddresses([{ id: 'guest-address', ...guestAddr }]);
      setSelectedAddressId('guest-address');
      setUseNewAddress(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/addresses', {
        name: data.fullName,
        phone: data.phone,
        street: data.street,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: 'India',
        is_default: true
      });
      if (res.data.success) {
        await fetchSavedAddresses();
        if (res.data.address) {
          setSelectedAddressId(res.data.address.id);
        }
        setUseNewAddress(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };


  // When location is selected on OpenStreetMap, open Phone Number modal
  const handleMapLocationSelected = (locationData) => {
    setPendingMapLocation(locationData);
    setMapContactName(user?.name || '');
    setMapContactPhone('');
    setPhoneError('');
    setIsMapModalOpen(false);
    setIsPhoneModalOpen(true);
  };

  // Submit map location with user-entered compulsory phone number
  const handleConfirmMapAddress = async (e) => {
    e.preventDefault();
    if (!mapContactPhone || !/^[0-9]{10}$/.test(mapContactPhone)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!mapContactName.trim()) {
      setPhoneError('Please enter recipient full name');
      return;
    }

    if (!isAuthenticated) {
      // Guest User Flow - Save map location locally
      const locationData = pendingMapLocation;
      const fullAddr = locationData.fullAddress || `${locationData.houseNo || ''} ${locationData.street || ''} ${locationData.area || ''} ${locationData.city || ''}`.trim();
      const guestAddr = {
        name: mapContactName.trim(),
        phone: mapContactPhone.trim(),
        addressLine1: fullAddr,
        street: fullAddr,
        city: locationData.city || locationData.district || 'City',
        state: locationData.state || 'State',
        pincode: locationData.pincode || '600001',
        zip: locationData.pincode || '600001',
        country: 'India',
        latitude: locationData.lat,
        longitude: locationData.lng,
        house_no: locationData.houseNo,
        area: locationData.area,
        district: locationData.district,
        formatted_address: fullAddr,
        is_default: true
      };

      const newSession = {
        address: guestAddr,
        selectedAddressId: 'guest-address',
        deliveryMethod: '',
        coupon: null,
        checkoutStep: '',
        orderSummary: {}
      };

      localStorage.setItem('guestCheckoutSession', JSON.stringify(newSession));
      setSavedAddresses([{ id: 'guest-address', ...guestAddr }]);
      setSelectedAddressId('guest-address');
      setUseNewAddress(false);
      setIsPhoneModalOpen(false);
      setPendingMapLocation(null);
      return;
    }

    setLoading(true);
    try {
      const locationData = pendingMapLocation;
      const fullAddr = locationData.fullAddress || `${locationData.houseNo || ''} ${locationData.street || ''} ${locationData.area || ''} ${locationData.city || ''}`.trim();
      const res = await api.post('/addresses', {
        name: mapContactName.trim(),
        phone: mapContactPhone.trim(),
        street: fullAddr,
        city: locationData.city || locationData.district || 'City',
        state: locationData.state || 'State',
        zip: locationData.pincode || '600001',
        country: 'India',
        latitude: locationData.lat,
        longitude: locationData.lng,
        house_no: locationData.houseNo,
        area: locationData.area,
        district: locationData.district,
        formatted_address: fullAddr,
        is_default: true
      });

      if (res.data.success) {
        setIsPhoneModalOpen(false);
        setPendingMapLocation(null);
        await fetchSavedAddresses();
        if (res.data.address) {
          setSelectedAddressId(res.data.address.id);
        }
        setUseNewAddress(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save map address');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOrder = async () => {
    if (!isAuthenticated) {
      // Save guest checkout session
      const selectedAddrObj = savedAddresses.find(a => a.id === selectedAddressId);
      if (selectedAddrObj) {
        const guestAddr = {
          name: selectedAddrObj.name,
          phone: selectedAddrObj.phone,
          addressLine1: selectedAddrObj.street,
          street: selectedAddrObj.street,
          city: selectedAddrObj.city,
          state: selectedAddrObj.state,
          pincode: selectedAddrObj.zip,
          zip: selectedAddrObj.zip,
          country: 'India',
          latitude: selectedAddrObj.latitude,
          longitude: selectedAddrObj.longitude,
          house_no: selectedAddrObj.house_no,
          area: selectedAddrObj.area,
          district: selectedAddrObj.district,
          formatted_address: selectedAddrObj.formatted_address,
          is_default: true
        };

        const session = {
          address: guestAddr,
          selectedAddressId: 'guest-address',
          deliveryMethod: '',
          coupon: null,
          checkoutStep: '',
          orderSummary: {}
        };
        localStorage.setItem('guestCheckoutSession', JSON.stringify(session));
      }
      
      // Save return URL with state if checkoutItems is just a subset, or general route
      localStorage.setItem('checkoutReturnUrl', window.location.pathname + window.location.search);
      alert('Please login to place an order.');
      navigate('/login');
      return;
    }

    if (!selectedAddressId) {
      alert('Please select or add a delivery address.');
      return;
    }

    setLoading(true);
    try {
      let finalAddressId = selectedAddressId;

      // If the address is still the guest address identifier, we must save it first to get a database ID
      if (selectedAddressId === 'guest-address') {
        const addrToSave = savedAddresses.find(a => a.id === 'guest-address');
        if (addrToSave) {
          const res = await api.post('/addresses', {
            name: addrToSave.name,
            phone: addrToSave.phone,
            street: addrToSave.street,
            city: addrToSave.city,
            state: addrToSave.state,
            zip: addrToSave.zip,
            country: 'India',
            latitude: addrToSave.latitude,
            longitude: addrToSave.longitude,
            house_no: addrToSave.house_no,
            area: addrToSave.area,
            district: addrToSave.district,
            formatted_address: addrToSave.formatted_address,
            is_default: true
          });
          if (res.data.success && res.data.address) {
            finalAddressId = res.data.address.id;
          }
        }
      }

      const payload = {
        items: checkoutItems,
        totalAmount,
        paymentMethod,
        shippingAddressId: finalAddressId
      };

      const orderRes = await api.post('/orders', payload);

      for (const item of checkoutItems) {
        dispatch(removeFromCart({ id: item.cartItemId || item.product_id, variantId: item.variant_id }));
      }

      // Clear guest session info upon successful order
      localStorage.removeItem('guestCheckoutSession');
      localStorage.removeItem('checkoutReturnUrl');

      setOrderSuccess(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
          <Check className="w-10 h-10 stroke-[3]" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">Order Placed!</h2>
        <p className="text-gray-500 text-sm">
          Your order has been successfully placed. You can view the order status, track delivery updates, or request returns anytime.
        </p>
        <button
          onClick={() => navigate('/account/history', { replace: true })}
          className="w-full bg-[#2874f0] hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md uppercase tracking-wider"
        >
          View Order Status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 pb-24 space-y-4 md:space-y-8">

      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex items-start justify-between">
        <div className="flex-1 pr-2">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight">
            Checkout & Delivery <br className="block md:hidden" /> Confirmation
          </h1>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1.5">Select delivery address, verify product items, and confirm payment</p>
        </div>

        <div className="flex-shrink-0 flex items-center text-[10px] md:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1.5 md:px-3 md:py-1.5 rounded-2xl md:rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4 hidden md:block mr-2" />
          <span className="hidden md:inline">100% Secure Checkout</span>

          <div className="flex flex-col md:hidden text-left leading-[1.2]">
            <span className="pl-4">100%</span>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <span className="pl-4">Checkout</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN (8 cols): Address & Payment */}
        <div className="lg:col-span-8 space-y-6">

          {/* SECTION 1: DELIVERY ADDRESS SELECTION */}
          <div className="bg-white rounded-2xl border-0 md:border md:border-gray-200 shadow-sm p-6 space-y-6">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Base Cylinder */}
                    <ellipse cx="50" cy="82" rx="28" ry="10" fill="#a00d14" />
                    <ellipse cx="50" cy="78" rx="28" ry="10" fill="#de1c24" />
                    <ellipse cx="50" cy="77" rx="26" ry="8" fill="#f43f47" />
                    {/* Base Highlight */}
                    <path d="M 24 77 A 26 8 0 0 1 76 77 A 22 6 0 0 0 24 77" fill="#ffffff" fillOpacity="0.4" />

                    {/* Pin Body */}
                    <path d="M 50 82 C 50 82 22 48 22 35 C 22 19 34 8 50 8 C 66 8 78 19 78 35 C 78 48 50 82 50 82 Z" fill="#c4121a" />
                    <path d="M 50 80 C 50 80 25 48 25 35 C 25 21 36 11 50 11 C 64 11 75 21 75 35 C 75 48 50 80 50 80 Z" fill="#e81e28" />

                    {/* Gloss highlight on left */}
                    <path d="M 28 35 C 28 23 37 14 50 14 C 40 14 31 23 31 35 C 31 42 36 52 42 63 C 37 54 28 42 28 35 Z" fill="#ffffff" fillOpacity="0.5" />
                    {/* Shadow on right */}
                    <path d="M 72 35 C 72 23 63 14 50 14 C 60 14 69 23 69 35 C 69 42 64 52 58 63 C 63 54 72 42 72 35 Z" fill="#7a050a" fillOpacity="0.4" />

                    {/* Hole depth */}
                    <ellipse cx="50" cy="37" rx="13" ry="14" fill="#87060d" />
                    {/* Hole Center (White) */}
                    <circle cx="50" cy="34" r="12" fill="#ffffff" />
                    {/* Hole Highlight */}
                    <path d="M 38 34 A 12 12 0 0 1 62 34 A 14 14 0 0 0 38 34" fill="#ff7a80" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">1. Delivery Address</h2>
                  <p className="text-xs text-gray-500">Choose where you want your items delivered</p>
                </div>
              </div>

              {/* OpenStreetMap Map Location Button */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                📍 Pick Location on Map (OpenStreetMap)
              </button>
            </div>

            {/* SAVED ADDRESSES SELECTOR LIST */}
            {savedAddresses.length > 0 && !useNewAddress ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddressId === addr.id;

                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${isSelected
                          ? 'border-red-600 bg-red-50/20 shadow-md ring-2 ring-red-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="selectedAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <span className="font-extrabold text-sm text-gray-900">{addr.name || 'Customer Address'}</span>
                          </div>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 space-y-1 pl-6">
                          <p className="font-semibold text-gray-800 leading-snug">{addr.street || addr.formatted_address}</p>
                          <p className="text-gray-500">{addr.city}, {addr.state} - <span className="font-bold text-gray-800">{addr.zip}</span></p>
                          {addr.phone && (
                            <p className="text-gray-500 font-bold flex items-center gap-1 pt-1">
                              <Phone className="w-3 h-3 text-gray-400" /> {addr.phone}
                            </p>
                          )}
                          {addr.latitude && addr.longitude && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              📍 Pin Coordinates Verified
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="flex items-center justify-end text-xs font-extrabold text-red-600 pt-2 border-t border-red-100">
                            <Check className="w-4 h-4 mr-1" /> Selected for Delivery
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(true)}
                    className="text-xs font-extrabold text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add New Address Manually
                  </button>
                </div>
              </div>
            ) : (
              /* NEW MANUAL ADDRESS FORM */
              <div className="space-y-4">
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(false)}
                    className="text-xs font-bold text-red-600 hover:underline mb-2 flex items-center gap-1"
                  >
                    ← Choose from Saved Addresses ({savedAddresses.length})
                  </button>
                )}

                <form onSubmit={handleSubmit(handleSaveNewAddress)} className="space-y-4 md:bg-gray-50/50 md:p-5 md:rounded-2xl border-0 md:border md:border-gray-200">
                  <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Fill Address Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                      <input
                        {...register('fullName', { required: true })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-semibold focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Phone (10 digits) *</label>
                      <input
                        type="tel"
                        {...register('phone', { required: true, pattern: /^[0-9]{10}$/ })}
                        placeholder="9876543210"
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-semibold focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Street Address / House No / Building *</label>
                    <textarea
                      {...register('street', { required: true })}
                      rows="2"
                      placeholder="e.g. Flat 402, Green Valley Apartments, Main Road"
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-medium focus:outline-none focus:border-red-500"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                      <input
                        {...register('city', { required: true })}
                        placeholder="City"
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                      <input
                        {...register('state', { required: true })}
                        placeholder="State"
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Pincode *</label>
                      <input
                        {...register('zip', { required: true })}
                        placeholder="Pincode"
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md uppercase"
                  >
                    Save Address & Use
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* SECTION 2: PAYMENT METHOD */}
          <div className="bg-white rounded-2xl border-0 md:border md:border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="translate(50, 48) rotate(-35) translate(-40, -25)">
                    <rect x="0" y="0" width="80" height="50" rx="6" fill="#4b93ff" />
                    <rect x="0" y="8" width="80" height="12" fill="#334a5e" />
                    <rect x="56" y="28" width="14" height="10" rx="2" fill="#f8fafc" />
                    <rect x="10" y="28" width="10" height="4" rx="2" fill="#3a6080" />
                    <rect x="24" y="28" width="10" height="4" rx="2" fill="#3a6080" />
                    <rect x="38" y="28" width="10" height="4" rx="2" fill="#3a6080" />
                    <rect x="10" y="38" width="20" height="4" rx="2" fill="#3a6080" />
                  </g>
                  <circle cx="68" cy="72" r="22" fill="#ffc107" />
                  <circle cx="68" cy="72" r="16" fill="#ff9800" />
                  <text x="68" y="81" fontFamily="Arial" fontWeight="900" fontSize="24" fill="#ffffff" textAnchor="middle">$</text>
                </svg>
              </div>
              <div>
                <h2 className="font-extrabold text-base text-gray-900">2. Payment Method</h2>
                <p className="text-xs text-gray-500">Select payment mode for this order</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 border border-red-600 bg-red-50/20 rounded-2xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="w-4 h-4 text-red-600 accent-red-600"
                  />
                  <div>
                    <span className="font-extrabold text-sm text-gray-900">Cash on Delivery (COD)</span>
                    <p className="text-xs text-gray-500 mt-0.5">Pay with cash when items arrive at your address</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-extrabold rounded-full">
                  Available
                </span>
              </label>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols): Order Summary with Product Titles */}
        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white rounded-2xl border-0 md:border md:border-gray-200 shadow-sm p-6 sticky top-20 space-y-5">

            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-extrabold text-base text-gray-900">Order Summary ({checkoutItems.length} items)</h3>
            </div>

            {/* CHECKOUT ITEMS LIST WITH PRODUCT TITLES */}
            <div className="space-y-3 max-h-[450px] md:max-h-[350px] overflow-y-auto pr-1">
              {checkoutItems.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-3 p-2.5 bg-gray-50/60 rounded-xl border border-gray-100">
                  <img
                    src={getImageUrl(item.thumbnail)}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg border border-gray-200 object-cover flex-shrink-0 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    {/* PRODUCT TITLE */}
                    <h4 className="font-extrabold text-xs text-gray-900 line-clamp-2 leading-tight">
                      {item.name || item.title || item.product_name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                      <span>Qty: <strong className="text-gray-900">{item.quantity || 1}</strong></span>
                      <span className="font-extrabold text-gray-900">₹{(Number(item.price) * Number(item.quantity || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* BILLING BREAKDOWN */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Items Subtotal</span>
                <span className="text-gray-900 font-bold">₹{totalBaseAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Estimated GST</span>
                <span className="text-gray-900 font-bold">+ ₹{totalGST.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Delivery Charge</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-gray-200 text-sm">
                <span className="font-extrabold text-gray-900">Total Amount Payable</span>
                <span className="text-xl font-black text-black">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* CONFIRM ORDER BUTTON */}
            <button
              type="button"
              onClick={onSubmitOrder}
              disabled={loading || !selectedAddressId}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3.5 rounded-xl shadow-sm transition-all uppercase text-xs tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "PLACE ORDER"
              )}
            </button>

          </div>

        </div>

      </div>

      {/* OPENSTREETMAP LOCATION PICKER MODAL */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialLocation={mapInitialLocation}
        onSave={handleMapLocationSelected}
        onCancel={() => setIsMapModalOpen(false)}
        title="Select Delivery Location on OpenStreetMap"
        subtitle="Search your location or drag pin on OpenStreetMap to save your delivery address"
      />

      {/* COMPULSORY CONTACT PHONE NUMBER MODAL FOR MAP ADDRESS */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shadow-red-500/20">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Enter Contact Phone Number</h3>
                <p className="text-xs text-gray-500">Compulsory for delivery updates & courier call</p>
              </div>
            </div>

            {/* Address Preview */}
            {pendingMapLocation && (
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-xs text-gray-700 space-y-1">
                <span className="font-extrabold text-red-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Selected Pin Location:
                </span>
                <p className="font-medium text-gray-800 line-clamp-2">
                  {pendingMapLocation.fullAddress || `${pendingMapLocation.houseNo || ''} ${pendingMapLocation.street || ''} ${pendingMapLocation.area || ''} ${pendingMapLocation.city || ''}`}
                </p>
              </div>
            )}

            <form onSubmit={handleConfirmMapAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Recipient Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mapContactName}
                    onChange={(e) => setMapContactName(e.target.value)}
                    placeholder="Enter Recipient Full Name"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Mobile Phone Number (10 Digits Compulsory) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={mapContactPhone}
                    onChange={(e) => {
                      setMapContactPhone(e.target.value.replace(/\D/g, ''));
                      setPhoneError('');
                    }}
                    placeholder="Enter 10-digit Mobile Number"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-red-500"
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {phoneError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPhoneModalOpen(false);
                    setIsMapModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Back to Map
                </button>

                <button
                  type="submit"
                  disabled={loading || !mapContactPhone || mapContactPhone.length !== 10}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-500/20 uppercase disabled:opacity-50"
                >
                  {loading ? 'Saving Address...' : 'Confirm & Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
