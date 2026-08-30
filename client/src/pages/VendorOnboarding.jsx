import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate } = rrdPkg;
import api from '../services/api';
import { logout } from '../store/authSlice';
import { MapPin } from 'lucide-react';
import EnterpriseImageUploader from '../components/EnterpriseImageUploader';
import LocationPickerModal from '../components/location/LocationPickerModal';

const VendorOnboarding = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  const [formData, setFormData] = useState({
    vendor_type: 'PRODUCT',
    business_name: '',
    vendor_name: user?.name || '',
    category: '',
    subcategory: '',
    store_description: '',
    website: '',
    whatsapp_number: '',
    working_hours: '',
    social_facebook: '',
    social_instagram: '',
    business_address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    aadhaar_number: '',
    bank_account: '',
    ifsc_code: '',
    upi_id: '',
    latitude: '',
    longitude: '',
    house_no: '',
    area: '',
    district: '',
    formatted_address: ''
  });

  const [mapModalOpen, setMapModalOpen] = useState(false);

  const [files, setFiles] = useState({
    kyc_documents: []
  });

  const [businessLogoImgs, setBusinessLogoImgs] = useState([]);
  const [storeBannerImgs, setStoreBannerImgs] = useState([]);
  const [galleryImgs, setGalleryImgs] = useState([]);

  useEffect(() => {
    checkKycStatus();
  }, []);

  const checkKycStatus = async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      if (res.data?.profile?.kyc_status) {
        setKycStatus(res.data.profile.kyc_status);
        if (res.data.profile.kyc_status === 'APPROVED') {
          navigate('/vendor');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleLocationSave = (loc) => {
    setFormData(prev => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude,
      house_no: loc.house_no,
      area: loc.area,
      district: loc.district,
      formatted_address: loc.formatted_address,
      business_address: loc.formatted_address || `${loc.house_no ? loc.house_no + ', ' : ''}${loc.street}`,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      pincode: loc.pincode || prev.pincode
    }));
    setMapModalOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (name === 'kyc_documents') {
      setFiles({ ...files, [name]: Array.from(selectedFiles) });
    }
  };

  const submitKyc = async () => {
    setLoading(true);
    try {
      const submitData = new FormData();

      // Append string data
      Object.keys(formData).forEach(key => {
        if (!key.startsWith('social_') && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Append social links as JSON
      const socialLinks = {
        facebook: formData.social_facebook,
        instagram: formData.social_instagram
      };
      submitData.append('social_links', JSON.stringify(socialLinks));

      // Helper to append EnterpriseImageUploader images
      const appendImg = async (img, fieldName, filename) => {
        const path = img.imageUrl || img.image_url || img.mainPath;
        if (path && !path.startsWith('data:') && !path.startsWith('blob:')) {
          submitData.append(`${fieldName}_path`, path); // Use a path field if it's already on server
        } else if (path) {
          const resp = await fetch(path);
          const blob = await resp.blob();
          submitData.append(fieldName, blob, filename);
        }
      };

      if (businessLogoImgs.length > 0) await appendImg(businessLogoImgs[0], 'business_logo', 'logo.webp');
      if (storeBannerImgs.length > 0) await appendImg(storeBannerImgs[0], 'store_banner', 'banner.webp');

      for (let i = 0; i < galleryImgs.length; i++) {
        const img = galleryImgs[i];
        const path = img.imageUrl || img.image_url || img.mainPath;
        if (path && !path.startsWith('data:') && !path.startsWith('blob:')) {
          // For multiple files, we might need a different handling or just fetch blob
          // Simple approach: fetch blob and append
          const resp = await fetch(path);
          const blob = await resp.blob();
          submitData.append('gallery_images', blob, `gallery_${i}.webp`);
        } else if (path) {
          const resp = await fetch(path);
          const blob = await resp.blob();
          submitData.append('gallery_images', blob, `gallery_${i}.webp`);
        }
      }

      files.kyc_documents.forEach(f => submitData.append('kyc_documents', f));

      await api.put('/vendor/kyc', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('KYC Submitted! Awaiting Admin Approval.');
      checkKycStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit KYC');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (kycStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
          <span className="text-6xl mb-4 block">⏳</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pending Approval</h2>
          <p className="text-gray-500 mb-6">Your vendor application is being reviewed by our Super Admin. Please check back later.</p>
          <button onClick={() => dispatch(logout())} className="bg-gray-100 text-gray-700 font-bold py-2 px-6 rounded hover:bg-gray-200">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm p-8 border border-gray-200">

        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">Vendor Onboarding</h1>
          <p className="text-gray-500 mt-1">Step {step} of 4: {['Business Basics', 'Location & Contact', 'Media & Gallery', 'Legal & Banking'][step - 1]}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Type *</label>
                <select name="vendor_type" value={formData.vendor_type} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none">
                  <option value="PRODUCT">Product Seller</option>
                  <option value="SERVICE">Service Provider</option>
                  <option value="ADVERTISEMENT">Advertisement Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Name (Owner Name) *</label>
                <input type="text" name="vendor_name" value={formData.vendor_name} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
                <input type="text" name="business_name" value={formData.business_name} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange} 
                  required 
                  className="w-full border rounded p-2 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Category</option>
                  <option value="Restaurants">Restaurants</option>
                  <option value="Hospitals">Hospitals</option>
                  <option value="Education">Education</option>
                  <option value="Hotels">Hotels</option>
                  <option value="Theatres">Theatres</option>
                  <option value="Banks">Banks</option>
                  <option value="Auditors">Auditors</option>
                  <option value="Cafes">Cafes</option>
                  <option value="Dentists">Dentists</option>
                  <option value="Temples">Temples</option>
                  <option value="Gym">Gym</option>
                  <option value="Loans">Loans</option>
                  <option value="Contractors">Contractors</option>
                  <option value="Pharmacies">Pharmacies</option>
                  <option value="Event Organisers">Event Organisers</option>
                  <option value="Beauty Spa">Beauty Spa</option>
                  <option value="Home Decor">Home Decor</option>
                  <option value="Wedding Planning">Wedding Planning</option>
                  <option value="Rent & Hire">Rent & Hire</option>
                  <option value="Pet Shops">Pet Shops</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subcategory</label>
                <input type="text" name="subcategory" value={formData.subcategory} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Short Description *</label>
                <textarea name="store_description" value={formData.store_description} onChange={handleChange} rows="3" className="w-full border rounded p-2 focus:border-blue-500 outline-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(2)} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded hover:bg-blue-700">Next Step</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">

            {/* OpenStreetMap Location Pin Button */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Pin Shop Location on OpenStreetMap</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.latitude && formData.longitude
                      ? `📍 Pinned: (${parseFloat(formData.latitude).toFixed(4)}, ${parseFloat(formData.longitude).toFixed(4)}) — ${formData.city || ''}`
                      : 'Drag pin or search to set precise shop location for customer map discovery'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMapModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 flex-shrink-0"
              >
                <MapPin className="w-4 h-4" />
                {formData.latitude ? 'Update Map Pin' : 'Select on Map'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Address *</label>
                <textarea name="business_address" value={formData.business_address} onChange={handleChange} rows="2" className="w-full border rounded p-2 focus:border-blue-500 outline-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                <select name="city" value={formData.city} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select City</option>
                  <option>Ariyalur</option>
                  <option>Chengalpattu</option>
                  <option>Chennai</option>
                  <option>Coimbatore</option>
                  <option>Cuddalore</option>
                  <option>Dharmapuri</option>
                  <option>Dindigul</option>
                  <option>Erode</option>
                  <option>Kallakurichi</option>
                  <option>Kancheepuram</option>
                  <option>Karur</option>
                  <option>Krishnagiri</option>
                  <option>Madurai</option>
                  <option>Mayiladuthurai</option>
                  <option>Nagapattinam</option>
                  <option>Kanniyakumari</option>
                  <option>Namakkal</option>
                  <option>Perambalur</option>
                  <option>Pudukottai</option>
                  <option>Ramanathapuram</option>
                  <option>Ranipet</option>
                  <option>Salem</option>
                  <option>Sivaganga</option>
                  <option>Tenkasi</option>
                  <option>Thanjavur</option>
                  <option>Theni</option>
                  <option>Thoothukudi</option>
                  <option>Tiruchirappalli</option>
                  <option>Tirunelveli</option>
                  <option>Tirupathur</option>
                  <option>Tiruppur</option>
                  <option>Tiruvallur</option>
                  <option>Tiruvannamalai</option>
                  <option>Tiruvarur</option>
                  <option>Vellore</option>
                  <option>Viluppuram</option>
                  <option>Virudhunagar</option>
                  <option>The Nilgiris</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                <select name="state" value={formData.state} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select State</option>
                  <option>Andhra Pradesh</option>
                  <option>Arunachal Pradesh</option>
                  <option>Assam</option>
                  <option>Bihar</option>
                  <option>Chhattisgarh</option>
                  <option>Goa</option>
                  <option>Gujarat</option>
                  <option>Haryana</option>
                  <option>Himachal Pradesh</option>
                  <option>Jharkhand</option>
                  <option>Karnataka</option>
                  <option>Kerala</option>
                  <option>Madhya Pradesh</option>
                  <option>Maharashtra</option>
                  <option>Manipur</option>
                  <option>Meghalaya</option>
                  <option>Mizoram</option>
                  <option>Nagaland</option>
                  <option>Odisha</option>
                  <option>Punjab</option>
                  <option>Rajasthan</option>
                  <option>Sikkim</option>
                  <option>Tamil Nadu</option>
                  <option>Telangana</option>
                  <option>Tripura</option>
                  <option>Uttar Pradesh</option>
                  <option>Uttarakhand</option>
                  <option>West Bengal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode *</label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                <input type="text" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Working Hours</label>
                <input type="text" name="working_hours" value={formData.working_hours} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" placeholder="e.g. 9 AM - 6 PM" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website URL</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded hover:bg-gray-300">Back</button>
              <button onClick={() => setStep(3)} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded hover:bg-blue-700">Next Step</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Logo (1:1 Ratio)</label>
                <EnterpriseImageUploader
                  images={businessLogoImgs}
                  onChange={setBusinessLogoImgs}
                  module="stores"
                  single={true}
                  aspectRatio="1:1"
                  allowedRatios={['1:1', 'free']}
                  maxFileSizeMB={2}
                  showAltText={false}
                  showImageType={false}
                  showSeoTitle={false}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Banner (4:1 Ratio)</label>
                <EnterpriseImageUploader
                  images={storeBannerImgs}
                  onChange={setStoreBannerImgs}
                  module="stores"
                  single={true}
                  aspectRatio="4:1"
                  allowedRatios={['4:1', 'free']}
                  maxFileSizeMB={5}
                  showAltText={false}
                  showImageType={false}
                  showSeoTitle={false}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gallery Images (Max 10)</label>
                <EnterpriseImageUploader
                  images={galleryImgs}
                  onChange={setGalleryImgs}
                  module="stores"
                  maxFiles={10}
                  aspectRatio="1:1"
                  allowedRatios={['1:1', '4:5', '16:9', 'free']}
                  maxFileSizeMB={5}
                  showAltText={true}
                  showImageType={false}
                  showSeoTitle={false}
                />
                <p className="text-xs text-gray-500 mt-2">Showcase your products, store, or past work.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook Link</label>
                <input type="url" name="social_facebook" value={formData.social_facebook} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram Link</label>
                <input type="url" name="social_instagram" value={formData.social_instagram} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded hover:bg-gray-300">Back</button>
              <button onClick={() => setStep(4)} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded hover:bg-blue-700">Next Step</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GST Number (Optional)</label>
                <input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PAN Number</label>
                <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Account Number</label>
                <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">IFSC Code</label>
                <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">KYC Documents (PDF/Images)</label>
                <input type="file" name="kyc_documents" accept="image/*,.pdf" multiple onChange={handleFileChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded mt-4 border border-blue-100">
              <p className="text-sm font-semibold text-blue-800">Ready to Submit?</p>
              <p className="text-xs text-blue-600 mt-1">Please ensure all details are accurate. Once submitted, your profile will be reviewed by our admin team before you can start selling.</p>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(3)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded hover:bg-gray-300">Back</button>
              <button
                onClick={submitKyc}
                disabled={loading}
                className="bg-green-600 text-white font-bold py-2 px-8 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Profile'}
              </button>
            </div>
          </div>
        )}

      </div>
      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={mapModalOpen}
        initialLocation={formData.latitude ? {
          latitude: formData.latitude,
          longitude: formData.longitude,
          house_no: formData.house_no,
          street: formData.business_address,
          area: formData.area,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          formatted_address: formData.formatted_address
        } : null}
        onSave={handleLocationSave}
        onCancel={() => setMapModalOpen(false)}
        title="Pin Vendor Shop Location on OpenStreetMap"
        subtitle="Set precise store location to display on customer map directory"
      />
    </div>
  );
};

export default VendorOnboarding;
