import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { Link } = rrdPkg;
import api from '../../services/api';
import { MapPin, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import EnterpriseImageUploader from '../../components/EnterpriseImageUploader';
import LocationPickerModal from '../../components/location/LocationPickerModal';
import { getImageUrl } from '../../utils/imageUrl';
import WorkingHoursPickerModal from '../../components/WorkingHoursPicker';
import WeeklyHoursPicker from '../../components/WeeklyHoursPicker';
import { toast } from 'react-hot-toast';


const CommunityBusiness = () => {
  const { user } = useSelector((state) => state.auth);

  const [categoriesList, setCategoriesList] = useState([]);

  const [isProductPhotosOpen, setIsProductPhotosOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isGalleryAlbumsOpen, setIsGalleryAlbumsOpen] = useState(false);

  useEffect(() => {
    const fetchDBCategories = async () => {
      try {
        const res = await api.get('/public/service-categories');

        if (res.data?.categories) {
          const names = res.data.categories
            .map(c => c.name)
            .filter(c => c !== 'Others');

          names.push('Others');
          setCategoriesList(names);
        }
      } catch (err) {
        console.error('Failed to load DB categories, using defaults', err);
      }
    };
    fetchDBCategories();
  }, []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    vendor_type: 'PRODUCT',
    business_name: '',
    vendor_name: user?.name || '',
    category: '',
    subcategory: '',
    store_description: '',
    website: '',
    business_email: '',
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
    business_logo: '',
    store_banner: '',
    latitude: '',
    longitude: '',
    house_no: '',
    area: '',
    district: '',
    formatted_address: '',
    keywords: '',
    country: '',
    phone_number: '',
    yearly_turnover: '',
    year_established: '',
    youtube_link: '',
    slug: ''
  });

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [showWorkingHoursPicker, setShowWorkingHoursPicker] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryOnlyItems, setGalleryOnlyItems] = useState([]);
  const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
  const [galleryGroups, setGalleryGroups] = useState([]);


  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [customCategoryStatus, setCustomCategoryStatus] = useState(null); // 'PENDING', 'APPROVED', 'REJECTED'

  // Sync category state when database value loads
  useEffect(() => {
    if (formData.category) {
      const exists = categoriesList.includes(formData.category);
      if (exists && formData.category !== 'Others') {
        setShowCustomCategory(false);
        setCustomCategoryText('');
      } else {
        setShowCustomCategory(true);
        setCustomCategoryText(formData.category === 'Others' ? '' : formData.category);
      }
    } else {
      setShowCustomCategory(false);
      setCustomCategoryText('');
    }
  }, [formData.category]);

  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === 'Others') {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category: customCategoryText || 'Others' }));
    } else {
      setShowCustomCategory(false);
      setFormData(prev => ({ ...prev, category: val }));
    }
  };

  const handleCustomCategoryChange = (e) => {
    const val = e.target.value;
    setCustomCategoryText(val);
    setFormData(prev => ({ ...prev, category: val || 'Others' }));
  };

  // Auto-save custom category suggestion
  const autoSaveCustomCategory = async (text) => {
    if (!text || !text.trim()) return;
    try {
      const res = await api.post('/vendor/suggest-category', { suggested_name: text.trim() });
      if (res.data?.status) {
        setCustomCategoryStatus(res.data.status);
      }
    } catch (e) {
      console.error('Error auto-saving category:', e);
    }
  };

  // Trigger auto-save on type with debounce
  useEffect(() => {
    if (!showCustomCategory || !customCategoryText || !customCategoryText.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      autoSaveCustomCategory(customCategoryText);
    }, 1000);
    return () => clearTimeout(delayDebounceFn);
  }, [customCategoryText, showCustomCategory]);

  // Submit category request to admin
  const handleSubmitCategoryRequest = async () => {
    if (!customCategoryText.trim()) return;
    try {
      const res = await api.post('/vendor/submit-category', { suggested_name: customCategoryText.trim() });
      if (res.data?.status) {
        setCustomCategoryStatus(res.data.status);
        toast.success('Category request submitted successfully for approval!');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit category request.');
    }
  };

  const keywordsArray = formData.keywords
    ? formData.keywords.split(/[,/_\-]+/).map(k => k.trim()).filter(Boolean)
    : [];

  const establishmentYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  const [files, setFiles] = useState({
    kyc_documents: []
  });

  const [businessLogoImgs, setBusinessLogoImgs] = useState([]);
  const [storeBannerImgs, setStoreBannerImgs] = useState([]);

  // Services State
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchServices();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      if (res.data?.profile) {
        const p = res.data.profile;
        // Also get the fresh vendor name from API response
        const freshVendorName = res.data?.vendorName || user?.name || '';
        if (res.data?.categoryRequest) {
          const req = res.data.categoryRequest;
          if (req.status === 'REJECTED') {
            const updatedTime = new Date(req.updated_at).getTime();
            const now = new Date().getTime();
            const diffMinutes = (now - updatedTime) / (1000 * 60);
            if (diffMinutes >= 5) {
              setCustomCategoryStatus(null);
            } else {
              setCustomCategoryStatus('REJECTED');
              const remainingMs = (5 - diffMinutes) * 60 * 1000;
              setTimeout(() => {
                setCustomCategoryStatus(null);
              }, remainingMs);
            }
          } else {
            setCustomCategoryStatus(req.status);
          }
        } else {
          setCustomCategoryStatus(null);
        }
        let facebook = '';
        let instagram = '';
        try {
          if (p.social_links) {
            const parsed = typeof p.social_links === 'string' ? JSON.parse(p.social_links) : p.social_links;
            facebook = parsed.facebook || '';
            instagram = parsed.instagram || '';
          }
        } catch (e) { }

        if (p.business_name && p.city) {
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }

        setFormData({
          vendor_type: p.vendor_type || 'PRODUCT',
          business_name: p.business_name || '',
          vendor_name: freshVendorName,
          category: p.category || '',
          subcategory: p.subcategory || '',
          keywords: p.keywords || '',
          store_description: p.store_description || '',
          website: p.website || '',
          whatsapp_number: p.whatsapp_number || '',
          phone_number: p.phone_number || '',
          business_email: p.business_email || '',
          working_hours: p.working_hours || '',
          social_facebook: facebook,
          social_instagram: instagram,
          business_address: p.business_address || '',
          city: p.city || '',
          state: p.state || '',
          pincode: p.pincode || '',
          country: p.country || '',
          gst_number: p.gst_number || '',
          pan_number: p.pan_number || '',
          aadhaar_number: p.aadhaar_number || '',
          bank_account: p.bank_account || '',
          ifsc_code: p.ifsc_code || '',
          upi_id: p.upi_id || '',
          latitude: p.latitude || '',
          longitude: p.longitude || '',
          house_no: p.house_no || '',
          area: p.area || '',
          district: p.district || '',
          formatted_address: p.formatted_address || '',
          yearly_turnover: p.yearly_turnover || '',
          year_established: p.year_established || '',
          youtube_link: p.youtube_link || '',
          business_logo: p.business_logo || '',
          store_banner: p.store_banner || '',
          slug: p.slug || ''
        });

        let initialGallery = [];
        try {
          if (p.gallery_images) {
            const parsed = typeof p.gallery_images === 'string' ? JSON.parse(p.gallery_images) : p.gallery_images;
            if (Array.isArray(parsed)) {
              initialGallery = parsed.map(item => {
                if (typeof item === 'string') {
                  return {
                    name: 'Product',
                    price: '',
                    warranty: '',
                    description: '',
                    image_path: item,
                    mobile_image: item,
                    _uiImages: [{ imageUrl: item }],
                    _uiMobileImages: [{ imageUrl: item }]
                  };
                }
                return {
                  name: item.name || '',
                  price: item.price || '',
                  warranty: item.warranty || '',
                  description: item.description || '',
                  image_path: item.image_path || '',
                  mobile_image: item.mobile_image || '',
                  _uiImages: item.image_path ? [{ imageUrl: item.image_path }] : [],
                  _uiMobileImages: item.mobile_image ? [{ imageUrl: item.mobile_image }] : []
                };
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse gallery images', e);
        }
        setGalleryItems(initialGallery);

        let initialGalleryOnly = [];
        try {
          if (p.gallery_only) {
            const parsed = typeof p.gallery_only === 'string' ? JSON.parse(p.gallery_only) : p.gallery_only;
            if (Array.isArray(parsed)) {
              initialGalleryOnly = parsed.map(item => {
                const path = typeof item === 'string' ? item : (item.image_path || '');
                const title = typeof item === 'string' ? 'General' : (item.title || 'General');
                return {
                  image_path: path,
                  title: title,
                  imageUrl: path,
                  mainPath: path
                };
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse gallery only images', e);
        }
        setGalleryOnlyItems(initialGalleryOnly);

        // Group by title
        const groups = {};
        initialGalleryOnly.forEach(item => {
          const t = item.title || 'General';
          if (!groups[t]) groups[t] = [];
          groups[t].push(item);
        });
        const initialGroups = Object.keys(groups).map(title => ({
          title: title,
          images: groups[title].map((img, i) => ({
            ...img,
            id: i,
            sortOrder: i
          }))
        }));
        setGalleryGroups(initialGroups);

        if (p.business_logo) {
          setBusinessLogoImgs([{ imageUrl: p.business_logo }]);
        }
        if (p.store_banner) {
          setStoreBannerImgs([{ imageUrl: p.store_banner }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchServices = async () => {
    try {
      if (user?.id) {
        const res = await api.get(`/services/vendor/${user.id}`);
        const loaded = (res.data.services || []).map(s => ({
          ...s,
          image_path: s.image_path || '',
          mobile_image: s.mobile_image || '',
          _uiImages: s.image_path ? [{ imageUrl: s.image_path }] : [],
          _uiMobileImages: s.mobile_image ? [{ imageUrl: s.mobile_image }] : []
        }));
        setServices(loaded);
      }
    } catch (e) {
      console.error('Failed to load services', e);
    }
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

  // Service Handlers
  const handleServiceCountChange = (count) => {
    const updated = [...services];
    if (count > updated.length) {
      while (updated.length < count) {
        updated.push({
          id: null,
          name: '',
          experience: '',
          amount: '',
          description: '',
          image_path: '',
          mobile_image: '',
          file: null,
          mobile_file: null,
          preview_url: null,
          mobile_preview_url: null,
          _uiImages: [],
          _uiMobileImages: []
        });
      }
    } else {
      updated.splice(count);
    }
    setServices(updated);
  };

  const handleDeleteService = (index) => {
    const updated = services.filter((_, i) => i !== index);
    setServices(updated);
  };

  const handleAddGalleryItem = () => {
    setGalleryItems(prev => [
      ...prev,
      { name: '', price: '', warranty: '', description: '', image_path: '', mobile_image: '', _uiImages: [], _uiMobileImages: [] }
    ]);
  };

  const handleDeleteGalleryItem = (index) => {
    setGalleryItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleGalleryItemFieldChange = (index, field, value) => {
    setGalleryItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGalleryItemImagesChange = (index, images) => {
    setGalleryItems(prev => {
      const updated = [...prev];
      if (images.length > 0) {
        const img = images[0];
        const path = img.imageUrl || img.image_url || img.mainPath;
        updated[index] = {
          ...updated[index],
          image_path: path || '',
          _uiImages: images
        };
      } else {
        updated[index] = {
          ...updated[index],
          image_path: '',
          _uiImages: []
        };
      }
      return updated;
    });
  };

  const handleGalleryItemMobileImagesChange = (index, images) => {
    setGalleryItems(prev => {
      const updated = [...prev];
      if (images.length > 0) {
        const img = images[0];
        const path = img.imageUrl || img.image_url || img.mainPath;
        updated[index] = {
          ...updated[index],
          mobile_image: path || '',
          _uiMobileImages: images
        };
      } else {
        updated[index] = {
          ...updated[index],
          mobile_image: '',
          _uiMobileImages: []
        };
      }
      return updated;
    });
  };

  const handleAddAlbum = () => {
    setGalleryGroups(prev => [
      ...prev,
      { title: '', images: [] }
    ]);
  };

  const handleDeleteAlbum = (index) => {
    setGalleryGroups(prev => prev.filter((_, i) => i !== index));
  };

  const handleAlbumTitleChange = (index, val) => {
    setGalleryGroups(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: val };
      return updated;
    });
  };

  const handleAlbumImagesChange = (index, images) => {
    const mapped = images.map((img, i) => {
      const path = img.imageUrl || img.image_url || img.mainPath || img.image_path || '';
      return {
        ...img,
        image_path: path,
        imageUrl: path,
        mainPath: path,
        id: img.id || i,
        sortOrder: img.sortOrder || i
      };
    });
    setGalleryGroups(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], images: mapped };
      return updated;
    });
  };

  const handleServiceFieldChange = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
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

  const handleServiceImagesChange = (index, images) => {
    const updated = [...services];
    if (images.length > 0) {
      const img = images[0];
      const path = img.imageUrl || img.image_url || img.mainPath;
      updated[index] = {
        ...updated[index],
        image_path: path || '',
        preview_url: img._previewUrl || null,
        file: null, // Since EnterpriseImageUploader uploads instantly, we just send the path
        _uiImages: images // Keep track of the uploader's internal representation
      };
    } else {
      updated[index] = {
        ...updated[index],
        image_path: '',
        preview_url: null,
        file: null,
        _uiImages: []
      };
    }
    setServices(updated);
  };

  const handleServiceMobileImagesChange = (index, images) => {
    const updated = [...services];
    if (images.length > 0) {
      const img = images[0];
      const path = img.imageUrl || img.image_url || img.mainPath;
      updated[index] = {
        ...updated[index],
        mobile_image: path || '',
        mobile_preview_url: img._previewUrl || null,
        mobile_file: null,
        _uiMobileImages: images
      };
    } else {
      updated[index] = {
        ...updated[index],
        mobile_image: '',
        mobile_preview_url: null,
        mobile_file: null,
        _uiMobileImages: []
      };
    }
    setServices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate services images
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (!s.image_path && (!s._uiImages || s._uiImages.length === 0)) {
        toast.error(`Please upload a Desktop/Main Banner Image for Service #${i + 1}`);
        return;
      }
      if (!s.mobile_image && (!s._uiMobileImages || s._uiMobileImages.length === 0)) {
        toast.error(`Please upload a Mobile View Image for Service #${i + 1}`);
        return;
      }
    }
    setLoading(true);
    try {
      // 1. Save profile details
      const submitData = new FormData();
      // Always-required fields — append even if empty so backend receives them
      const alwaysInclude = ['vendor_type', 'business_name', 'vendor_name'];
      Object.keys(formData).forEach(key => {
        if (key.startsWith('social_') || key === 'business_logo' || key === 'store_banner') return;
        if (alwaysInclude.includes(key) || formData[key]) {
          submitData.append(key, formData[key] ?? '');
        }
      });

      const galleryPayload = galleryItems
        .filter(item => item.image_path)
        .map(item => ({
          name: item.name || '',
          price: item.price || '',
          warranty: item.warranty || '',
          description: item.description || '',
          image_path: item.image_path,
          mobile_image: item.mobile_image || item.image_path
        }));
      submitData.append('gallery_images_data', JSON.stringify(galleryPayload));

      const flattenedGalleryOnly = [];
      galleryGroups.forEach(group => {
        const title = group.title ? group.title.trim() : 'General';
        if (group.images && Array.isArray(group.images)) {
          group.images.forEach(img => {
            const path = img.imageUrl || img.image_url || img.mainPath || img.image_path;
            if (path) {
              flattenedGalleryOnly.push({
                title: title,
                image_path: path
              });
            }
          });
        }
      });
      submitData.append('gallery_only_data', JSON.stringify(flattenedGalleryOnly));

      const socialLinks = {
        facebook: formData.social_facebook,
        instagram: formData.social_instagram
      };
      submitData.append('social_links', JSON.stringify(socialLinks));

      const appendImg = async (img, fieldName, filename) => {
        const path = img.imageUrl || img.image_url || img.mainPath;
        if (path && !path.startsWith('data:') && !path.startsWith('blob:')) {
          submitData.append(`${fieldName}_path`, path);
        } else if (path) {
          const resp = await fetch(path);
          const blob = await resp.blob();
          submitData.append(fieldName, blob, filename);
        }
      };

      if (businessLogoImgs.length > 0) await appendImg(businessLogoImgs[0], 'business_logo', 'logo.webp');
      if (storeBannerImgs.length > 0) await appendImg(storeBannerImgs[0], 'store_banner', 'banner.webp');

      files.kyc_documents.forEach(f => submitData.append('kyc_documents', f));

      await api.put('/vendor/business-profile', submitData);

      // 2. Save services
      const servicesData = new FormData();
      const servicesPayload = services.map((s, index) => {
        if (s.file) {
          servicesData.append(`service_image_${index}`, s.file);
        }
        if (s.mobile_file) {
          servicesData.append(`service_mobile_image_${index}`, s.mobile_file);
        }
        return {
          id: s.id,
          name: s.name,
          experience: s.experience,
          amount: s.amount,
          description: s.description || '',
          image_path: s.image_path,
          mobile_image: s.mobile_image || ''
        };
      });
      servicesData.append('services', JSON.stringify(servicesPayload));

      await api.post('/services/vendor', servicesData);

      // Refetch services to get their new IDs from the database
      await fetchServices();

      setLoading(false);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
      fetchProfile();
      fetchServices();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8">Loading profile...</div>;

  const getLogoUrl = (path) => getImageUrl(path);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Info Directory Profile</h1>
          <p className="text-gray-500 mt-1">Update the details shown on your public directory profile page.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700"
          >
            Edit Profile & Services
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Wrapper */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-64 md:h-80 bg-gray-200 relative">
                {formData.store_banner ? (
                  <img src={getImageUrl(formData.store_banner)} alt="Banner" className="w-full h-full object-fill" />
                ) : (
                  <div className="w-full h-full bg-gray-300"></div>
                )}
              </div>
              <div className="p-6 relative">
                <div className="w-24 h-24 bg-white rounded-lg shadow-md p-1 absolute -top-12 border-4 border-white">
                  {formData.business_logo ? (
                    <img src={getLogoUrl(formData.business_logo)} alt="Logo" className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-md"></div>
                  )}
                </div>
                <div className="mt-14">
                  <h2 className="text-2xl font-bold text-gray-900">{formData.business_name}</h2>
                  <p className="text-gray-600 font-medium">{formData.category}</p>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">About</h3>
                      <p className="text-gray-800 text-sm">{formData.store_description || 'No description provided.'}</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h3>
                      <p className="text-gray-800"><strong>Address:</strong> {formData.business_address}, {formData.city}, {formData.state} - {formData.pincode}</p>
                      <p className="text-gray-800"><strong>WhatsApp:</strong> {formData.whatsapp_number || 'N/A'}</p>
                      <p className="text-gray-800"><strong>Working Hours:</strong> {formData.working_hours || 'N/A'}</p>
                      <p className="text-gray-800"><strong>Website:</strong> {formData.website ? <a href={formData.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formData.website}</a> : 'N/A'}</p>
                      <p className="text-gray-800"><strong>YouTube Link:</strong> {formData.youtube_link ? <a href={formData.youtube_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formData.youtube_link}</a> : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Products</h2>
              {galleryItems.length === 0 ? (
                <p className="text-gray-500 text-sm">No products uploaded yet. Click "Edit Profile & Services" to add them!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {galleryItems.map((item, index) => (
                    <div key={index} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="h-32 bg-gray-100 relative">
                        <img src={getImageUrl(item.image_path)} alt={`Product item ${index}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-blue-600">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                          {item.warranty && (
                            <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                              🛡️ {item.warranty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column Wrapper */}
          <div className="lg:col-span-5 space-y-6">
            {/* Services List Preview */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Services</h2>
              {services.length === 0 ? (
                <p className="text-gray-500 text-sm">No services listed yet. Click "Edit Profile & Services" to add them!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((service, index) => (
                    <div key={service.id || index} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="h-32 bg-gray-100 relative">
                        <img src={getImageUrl(service.image_path)} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{service.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-1">Experience: {service.experience}</p>
                        {service.description && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 italic">"{service.description}"</p>
                        )}
                        <p className="text-xs font-semibold text-blue-600 mt-2">₹{Number(service.amount).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gallery (Just Images) Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Gallery</h2>
                {galleryOnlyItems.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setViewAllModalOpen(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                )}
              </div>
              {galleryOnlyItems.length === 0 ? (
                <p className="text-gray-500 text-sm">No gallery photos uploaded yet. Click "Edit Profile & Services" to add them!</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {galleryOnlyItems.slice(0, 6).map((item, index) => (
                    <div key={index} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white aspect-square relative group">
                      <img src={getImageUrl(item.image_path)} alt={`Gallery item ${index}`} className="w-full h-full object-cover" />
                      {index === 5 && galleryOnlyItems.length > 6 && (
                        <div
                          onClick={() => setViewAllModalOpen(true)}
                          className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center text-white font-bold text-sm cursor-pointer hover:bg-black/70 transition-colors"
                        >
                          <span>+{galleryOnlyItems.length - 6}</span>
                          <span className="text-[10px] font-normal uppercase tracking-wider">More</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

          {/* Section 1 */}
          <div className="p-6 border-b border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Business Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Name (Owner Name) *</label>
                <input type="text" name="vendor_name" value={formData.vendor_name} onChange={handleChange} required className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
                <input type="text" name="business_name" value={formData.business_name} onChange={handleChange} required className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Type</label>
                <select name="vendor_type" value={formData.vendor_type} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none">
                  <option value="PRODUCT">Product Seller</option>
                  <option value="SERVICE">Service Provider</option>
                  <option value="ADVERTISEMENT">Advertisement Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                <select
                  name="category"
                  value={showCustomCategory ? 'Others' : (formData.category || '')}
                  onChange={handleCategorySelectChange}
                  className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Select Category</option>
                  {categoriesList.filter(c => c !== 'Others').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Others">Others</option>
                </select>
              </div>



              {/* Specify Custom Category input when Others is selected */}
              {showCustomCategory && (
                <div className="animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Specify Custom Category *</label>
                    {customCategoryStatus && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${customCategoryStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        customCategoryStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {customCategoryStatus === 'PENDING' ? '⏳ Pending Approval' :
                          customCategoryStatus === 'APPROVED' ? '✅ Approved' :
                            '❌ Rejected'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customCategoryText}
                    onChange={handleCustomCategoryChange}
                    required
                    placeholder="Enter your custom category"
                    className="w-full border rounded p-2 focus:border-blue-500 outline-none"
                    style={{ minHeight: '42px' }}
                    disabled={customCategoryStatus === 'PENDING'}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitCategoryRequest}
                    disabled={!customCategoryText.trim() || customCategoryStatus === 'PENDING'}
                    className={`mt-2 w-full px-4 py-2 text-xs font-bold rounded-lg shadow transition-all ${customCategoryStatus === 'PENDING'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      }`}
                  >
                    {customCategoryStatus === 'PENDING' ? '⏳ Submitted (Pending Approval)' : 'Submit for Admin Approval'}
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Keywords / Search Tags</label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleChange}
                  placeholder="e.g. fresh fruits, organic, home delivery (comma, dash, slash, or underscore separated)"
                  className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white"
                  style={{ minHeight: '42px' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Keywords Preview (Read-only)</label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 bg-gray-50 rounded min-h-[42px] items-center">
                  {keywordsArray.length > 0 ? (
                    keywordsArray.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 select-none cursor-default"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No keywords yet...</span>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea name="store_description" value={formData.store_description} onChange={handleChange} rows="3" className="w-full border rounded p-2 focus:border-blue-500 outline-none"></textarea>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="p-6 border-b border-gray-100 space-y-6 bg-gray-50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Contact & Store Location</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formData.latitude && formData.longitude
                    ? `📍 Store Pinned: (${parseFloat(formData.latitude).toFixed(4)}, ${parseFloat(formData.longitude).toFixed(4)})`
                    : 'Set precise store pin on OpenStreetMap for customer discovery'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2 flex-shrink-0"
              >
                <MapPin className="w-4 h-4" />
                {formData.latitude ? 'Update Store Pin' : 'Pin Store on Map'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Address</label>
                <textarea name="business_address" value={formData.business_address} onChange={handleChange} rows="2" className="w-full border rounded p-2 focus:border-blue-500 outline-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode</label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Country</label>
                <select name="country" value={formData.country} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select Country</option>
                  <option>India</option>
                  <option>Malaysia</option>
                  <option>Vietnam</option>
                  <option>Cambodia</option>
                  <option>Myanmar</option>
                  <option>Nepal</option>
                  <option>Indonesia</option>
                  <option>Singapore</option>
                  <option>United Kingdom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                <input type="text" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address (Public)</label>
                <input type="email" name="business_email" value={formData.business_email} onChange={handleChange} placeholder="e.g. contact@business.com" className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours</label>
                <WeeklyHoursPicker
                  value={formData.working_hours}
                  onChange={(val) => setFormData(prev => ({ ...prev, working_hours: val }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website URL</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube Link</label>
                <input type="url" name="youtube_link" value={formData.youtube_link} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Yearly Turnover (Fill or Choose)</label>
                <input
                  type="text"
                  name="yearly_turnover"
                  value={formData.yearly_turnover}
                  onChange={handleChange}
                  list="turnover-options"
                  placeholder="e.g. ₹10 Lakhs - ₹50 Lakhs"
                  className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white"
                />
                <datalist id="turnover-options">
                  <option value="Under ₹10 Lakhs" />
                  <option value="₹10 Lakhs - ₹50 Lakhs" />
                  <option value="₹50 Lakhs - ₹1 Crore" />
                  <option value="₹1 Crore - ₹5 Crores" />
                  <option value="Above ₹5 Crores" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Year Established (Fill or Choose)</label>
                <input
                  type="text"
                  name="year_established"
                  value={formData.year_established}
                  onChange={handleChange}
                  list="year-options"
                  placeholder="e.g. 2015"
                  className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white"
                />
                <datalist id="year-options">
                  {establishmentYears.map(year => (
                    <option key={year} value={year} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 3: Media & Social */}
          <div className="p-6 border-b border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Media & Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Update Logo (1:1)</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Update Banner (4:1)</label>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook</label>
                <input type="url" name="social_facebook" value={formData.social_facebook} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram</label>
                <input type="url" name="social_instagram" value={formData.social_instagram} onChange={handleChange} className="w-full border rounded p-2 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>



          {/* Section 3.5: Product Photos Management */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              onClick={() => setIsProductPhotosOpen(!isProductPhotosOpen)}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Product Photos
                  {isProductPhotosOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Provide details and photos of your products or business offerings.</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddGalleryItem();
                  if (!isProductPhotosOpen) setIsProductPhotosOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Product Item
              </button>
            </div>

            {isProductPhotosOpen && (
              <div className="mt-6 space-y-6">
                {galleryItems.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-400 font-medium">No product items added yet. Click "Add Product Item" to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {galleryItems.map((item, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm space-y-4 relative">
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(index)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors font-bold text-lg leading-none"
                          title="Delete Item"
                        >
                          &times;
                        </button>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Product Name *</label>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => handleGalleryItemFieldChange(index, 'name', e.target.value)}
                            placeholder="e.g. Redmi Note 12 Pro"
                            className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹) *</label>
                            <input
                              type="number"
                              required
                              value={item.price}
                              onChange={(e) => handleGalleryItemFieldChange(index, 'price', e.target.value)}
                              placeholder="e.g. 500"
                              className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Warranty</label>
                            <input
                              type="text"
                              value={item.warranty}
                              onChange={(e) => handleGalleryItemFieldChange(index, 'warranty', e.target.value)}
                              placeholder="e.g. 1 Year"
                              className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">About Product / Description</label>
                          <textarea
                            rows="3"
                            value={item.description}
                            onChange={(e) => handleGalleryItemFieldChange(index, 'description', e.target.value)}
                            placeholder="Provide details or specifications of the product..."
                            className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white text-sm resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Desktop / Main Banner Image *</label>
                            <EnterpriseImageUploader
                              images={item._uiImages || []}
                              onChange={(images) => handleGalleryItemImagesChange(index, images)}
                              module="gallery"
                              single={true}
                              aspectRatio="16:9"
                              allowedRatios={['16:9', '4:3', '1:1', 'free']}
                              maxFileSizeMB={2}
                              showAltText={false}
                              showImageType={false}
                              showSeoTitle={false}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Mobile View Image</label>
                            <EnterpriseImageUploader
                              images={item._uiMobileImages || []}
                              onChange={(images) => handleGalleryItemMobileImagesChange(index, images)}
                              module="gallery"
                              single={true}
                              aspectRatio="3:2"
                              allowedRatios={['3:2', '1:1', '4:5', 'free']}
                              maxFileSizeMB={2}
                              showAltText={false}
                              showImageType={false}
                              showSeoTitle={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Services Management */}
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              onClick={() => setIsServicesOpen(!isServicesOpen)}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Services Details
                  {isServicesOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Provide details of the services you offer to customers.</p>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="text-sm font-semibold text-gray-700">How many services are you providing?</label>
                <select
                  value={services.length}
                  onChange={(e) => {
                    handleServiceCountChange(parseInt(e.target.value));
                    if (parseInt(e.target.value) > 0 && !isServicesOpen) setIsServicesOpen(true);
                  }}
                  className="border border-gray-200 rounded p-1.5 focus:border-blue-500 bg-white"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {isServicesOpen && (
              <div className="mt-6 space-y-6">
                {services.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {services.map((service, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="font-bold text-gray-800">Service #{index + 1}</span>
                          <div className="flex items-center gap-2">
                            {service.id && (
                              <span className="text-[10px] text-gray-400 font-mono">ID: {service.id}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteService(index)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Service Name *</label>
                          <input
                            type="text"
                            required
                            value={service.name}
                            onChange={(e) => handleServiceFieldChange(index, 'name', e.target.value)}
                            placeholder="e.g. Bridal Make-up"
                            className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Experience *</label>
                            <input
                              type="text"
                              required
                              value={service.experience}
                              onChange={(e) => handleServiceFieldChange(index, 'experience', e.target.value)}
                              placeholder="e.g. 5 Years"
                              className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹) *</label>
                            <input
                              type="number"
                              required
                              value={service.amount}
                              onChange={(e) => handleServiceFieldChange(index, 'amount', e.target.value)}
                              placeholder="e.g. 1500"
                              className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">About Service / Description</label>
                          <textarea
                            value={service.description || ''}
                            onChange={(e) => handleServiceFieldChange(index, 'description', e.target.value)}
                            placeholder="e.g. Detailed description of the service packages, what is included, terms, etc."
                            rows={2}
                            className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                              <span>Desktop / Main Banner Image *</span>
                              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Free / 1:1 / 16:9</span>
                            </label>
                            <EnterpriseImageUploader
                              images={service._uiImages || (service.image_path ? [{ imageUrl: service.image_path }] : [])}
                              onChange={(imgs) => handleServiceImagesChange(index, imgs)}
                              module="services"
                              single={true}
                              aspectRatio="16:9"
                              allowedRatios={['16:9', '4:3', '1:1', 'free']}
                              maxFileSizeMB={2}
                              showAltText={false}
                              showImageType={false}
                              showSeoTitle={false}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                              <span>Mobile View Image *</span>
                              <span className="text-[10px] text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">1:1 / 4:5 Crop</span>
                            </label>
                            <EnterpriseImageUploader
                              images={service._uiMobileImages || (service.mobile_image ? [{ imageUrl: service.mobile_image }] : [])}
                              onChange={(imgs) => handleServiceMobileImagesChange(index, imgs)}
                              module="services"
                              single={true}
                              aspectRatio="1:1"
                              allowedRatios={['1:1', '4:5', 'free', '4:3']}
                              maxFileSizeMB={2}
                              showAltText={false}
                              showImageType={false}
                              showSeoTitle={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3.6: Gallery Albums Management */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              onClick={() => setIsGalleryAlbumsOpen(!isGalleryAlbumsOpen)}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Gallery Albums (1:1 Ratio Only)
                  {isGalleryAlbumsOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Group your photos into albums by entering a title. Photos added inside each album will share that title.</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddAlbum();
                  if (!isGalleryAlbumsOpen) setIsGalleryAlbumsOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Gallery Album
              </button>
            </div>

            {isGalleryAlbumsOpen && (
              <div className="mt-6 space-y-6">
                {galleryGroups.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-400 font-medium">No gallery albums created yet. Click "Add Gallery Album" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {galleryGroups.map((group, groupIdx) => (
                      <div key={groupIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 relative">
                        <button
                          type="button"
                          onClick={() => handleDeleteAlbum(groupIdx)}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors font-bold text-lg leading-none"
                          title="Delete Album"
                        >
                          &times;
                        </button>

                        <div className="max-w-md">
                          <label className="block text-xs font-bold text-gray-700 mb-1">Album Title *</label>
                          <input
                            type="text"
                            required
                            value={group.title}
                            onChange={(e) => handleAlbumTitleChange(groupIdx, e.target.value)}
                            placeholder="e.g. Summer Collection, Store Front"
                            className="w-full border rounded p-2 focus:border-blue-500 outline-none bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">Photos (1:1 aspect ratio)</label>
                          <EnterpriseImageUploader
                            images={group.images || []}
                            onChange={(images) => handleAlbumImagesChange(groupIdx, images)}
                            module="gallery"
                            single={false}
                            maxFiles={12}
                            aspectRatio="1:1"
                            allowedRatios={['1:1']}
                            maxFileSizeMB={2}
                            showAltText={false}
                            showImageType={false}
                            showSeoTitle={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 flex justify-end gap-4">
            {formData.business_name && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white font-bold py-2 px-8 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}
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
        title="Pin Vendor Store Location on OpenStreetMap"
      />
      {/* Working Hours Picker Modal */}
      <WorkingHoursPickerModal
        isOpen={showWorkingHoursPicker}
        onClose={() => setShowWorkingHoursPicker(false)}
        value={formData.working_hours}
        onChange={(newVal) => setFormData(prev => ({ ...prev, working_hours: newVal }))}
      />

      {/* View All Gallery Photos Modal */}
      {viewAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">All Gallery Photos</h3>
                <p className="text-xs text-gray-500 mt-0.5">{galleryOnlyItems.length} photos uploaded</p>
              </div>
              <button
                type="button"
                onClick={() => setViewAllModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grid Content */}
            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryOnlyItems.map((item, index) => (
                <div key={index} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white aspect-square hover:scale-[1.02] transition-transform duration-200">
                  <img src={getImageUrl(item.image_path)} alt={`Gallery item ${index}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityBusiness;
