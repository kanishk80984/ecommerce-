import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import RichTextEditor from '../../components/RichTextEditor';
import ImageSortManager from '../../components/ImageSortManager';
import { getImageUrl } from '../../utils/imageUrl';
import {
  Plus, Trash2, Edit2, Layers, Settings, DollarSign, Package,
  Save, CheckCircle, FileText, Globe, RefreshCw, X, FolderOpen, Tag,
  ChevronRight, ChevronDown, Play, Upload, Shield, Box, Sparkles, Image as ImageIcon,
  GripVertical, MoreVertical, Search, ExternalLink, List, CheckCircle2
} from 'lucide-react';

const ProductUpload = () => {
  const [categories, setCategories] = useState([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search, filter, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  // UI Views: 'LIST' (products table) or 'EDIT_PANEL' (unified product dashboard)
  const [view, setView] = useState('LIST');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Edit Panel Sub-Tabs: 'PRODUCT_INFO' | 'MODELS' | 'VARIANTS'
  const [activeTab, setActiveTab] = useState('PRODUCT_INFO');

  // Product form states
  const [productForm, setProductForm] = useState({ name: '', category_id: '', brand_id: '' });
  const [editingProductId, setEditingProductId] = useState(null);

  // Models state for current product
  const [models, setModels] = useState([]);
  const [selectedModelForSpecs, setSelectedModelForSpecs] = useState(null); // Model being edited in specs/highlights/description
  const [highlights, setHighlights] = useState(['']);
  const [specTemplate, setSpecTemplate] = useState([]);
  const [specValues, setSpecValues] = useState({});
  const [modelImages, setModelImages] = useState([]); // Model specific images
  const [modelForm, setModelForm] = useState({
    name: '', sku: '', description: '', warranty: '1 Year Warranty', replacement_policy: 'No Replacement', replacement_days: '', return_policy: '', return_days: '7', whats_in_the_box: 'Main Unit, User Guide'
  });
  const [documents, setDocuments] = useState([]);
  const [videos, setVideos] = useState([{ videoUrl: '', videoType: 'youtube' }]);

  // Variants selection state (First dropdown: Choose Model)
  const [selectedModelIdForVariants, setSelectedModelIdForVariants] = useState('');
  const [variantsList, setVariantsList] = useState([]);
  const [variantForm, setVariantForm] = useState({
    name: '', sku: '', price: '', mrp: '', stock: '', status: 'PUBLISHED', warranty: '', whats_in_the_box: ''
  });
  const [variantSpecsValues, setVariantSpecsValues] = useState({}); // Variant-specific specifications overrides
  const [variantAttrs, setVariantAttrs] = useState([{ key: 'Color', value: '' }, { key: 'Size', value: '' }]);
  const [variantImages, setVariantImages] = useState([]); // Variant specific images uploaded inside the form
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState(null);

  // New Dynamic Attributes Architecture states
  const [categoryAttributeGroups, setCategoryAttributeGroups] = useState([]);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState({});
  const [generatedVariants, setGeneratedVariants] = useState([]);
  const [customValueInputs, setCustomValueInputs] = useState({}); // { [groupId]: '' }
  const [activeImageUploadVariantIndex, setActiveImageUploadVariantIndex] = useState(null); // track which variant's images are being edited
  const [activeSpecsVariantIndex, setActiveSpecsVariantIndex] = useState(null);
  const [variantSpecDrafts, setVariantSpecDrafts] = useState({});
  const [comboSpecifications, setComboSpecifications] = useState([{ id: 'combo-spec-1', name: '', value: '' }]);
  const [previewVariantIndex, setPreviewVariantIndex] = useState(null);
  const [comboVariantAbout, setComboVariantAbout] = useState('');
  const [comboVariantTitle, setComboVariantTitle] = useState('');
  const [comboVariantHighlights, setComboVariantHighlights] = useState(['']);
  const [comboWarranty, setComboWarranty] = useState('');
  const [comboWhatsInTheBox, setComboWhatsInTheBox] = useState('');
  const [comboReturnPolicy, setComboReturnPolicy] = useState('NO_RETURN');
  const [comboReturnWindowDays, setComboReturnWindowDays] = useState(7);
  const [comboSeoSlug, setComboSeoSlug] = useState('');
  const [variantRandomSuffix, setVariantRandomSuffix] = useState(String(Math.floor(100000 + Math.random() * 900000)));
  const [isComboFormOpen, setIsComboFormOpen] = useState(true);

  // Combo Builder states
  const [comboBuilder, setComboBuilder] = useState({}); // { [groupName]: '' }
  const [newComboImages, setNewComboImages] = useState([]);
  const [showImageUploaderForCombo, setShowImageUploaderForCombo] = useState(false);
  const [fallbackAttrName, setFallbackAttrName] = useState('Attribute');
  const [fallbackAttrValue, setFallbackAttrValue] = useState('');
  const [comboInventory, setComboInventory] = useState({
    price: '',
    mrp: '',
    sku: '',
    barcode: '',
    stock: '0',
    status: 'PUBLISHED'
  });

  const [fashionSize, setFashionSize] = useState('S');
  const [customFashionSize, setCustomFashionSize] = useState('');
  const [fashionColor, setFashionColor] = useState('Black');
  const [customFashionColor, setCustomFashionColor] = useState('');
  const [comboColor, setComboColor] = useState('Black');
  const [customComboColor, setCustomComboColor] = useState('');
  const [customAttrFields, setCustomAttrFields] = useState([{ id: 'custom-attr-1', name: '', value: '' }]);
  const [beautyPackOf, setBeautyPackOf] = useState('None');
  const [customBeautyPackOf, setCustomBeautyPackOf] = useState('');
  const [beautyVolume, setBeautyVolume] = useState('None');
  const [customBeautyVolume, setCustomBeautyVolume] = useState('');

  // Computer category configuration states
  const [computerRam, setComputerRam] = useState('8GB');
  const [customComputerRam, setCustomComputerRam] = useState('');
  const [computerStorage, setComputerStorage] = useState('512GB SSD');
  const [customComputerStorage, setCustomComputerStorage] = useState('');
  const [computerColor, setComputerColor] = useState('Silver');
  const [customComputerColor, setCustomComputerColor] = useState('');
  const [computerProcessor, setComputerProcessor] = useState('Intel Core i5');
  const [customComputerProcessor, setCustomComputerProcessor] = useState('');
  const [computerGen, setComputerGen] = useState('12th Gen');
  const [customComputerGen, setCustomComputerGen] = useState('');
  const [electronicsFields, setElectronicsFields] = useState([
    { id: 'attribute-1', name: '', value: '' }
  ]);
  const [showElectronicsPreview, setShowElectronicsPreview] = useState(false);
  const [electronicsColor, setElectronicsColor] = useState('Black');
  const [customElectronicsColor, setCustomElectronicsColor] = useState('');

  const [removedAttributeIds, setRemovedAttributeIds] = useState([]);
  const [customSpecs, setCustomSpecs] = useState([]);

  const selectedCategory = categories.find(c => c.id === parseInt(productForm.category_id));
  const categoryNameLower = (selectedCategory?.name || selectedProduct?.category_name || '').toLowerCase();

  const isFashion = categoryNameLower.includes('fashion') || categoryNameLower.includes('clothing') || categoryNameLower.includes('apparel') || parseInt(productForm.category_id) === 2;
  const isShoes = categoryNameLower.includes('shoe') || categoryNameLower.includes('footwear');
  const isSports = categoryNameLower.includes('sport') || categoryNameLower.includes('fitness');
  const isSizeRequired = isFashion || isShoes || isSports;

  const isBeauty = categoryNameLower.includes('beauty') || parseInt(productForm.category_id) === 5 || selectedProduct?.category_name?.toLowerCase()?.includes('beauty');
  const isComputer = categoryNameLower.includes('computers') || categoryNameLower.includes('computer') || categoryNameLower.includes('laptops') || categoryNameLower.includes('laptop') || parseInt(productForm.category_id) === 31;
  const isElectronics = isComputer || categoryNameLower.includes('electronic');
  const setComboSpecsFromModel = (model) => {
    const defaults = (model?.specifications || [])
      .filter(spec => spec.value !== null && spec.value !== undefined && String(spec.value).trim() !== '')
      .map((spec, index) => ({ id: `model-spec-${spec.attribute_id || index}`, name: spec.label || spec.name || `Specification ${index + 1}`, value: String(spec.value) }));
    setComboSpecifications(defaults.length ? defaults : [{ id: 'combo-spec-1', name: '', value: '' }]);
  };



  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const catRes = await api.get('/public/categories');
      setCategories(catRes.data.categories || []);

      const prodRes = await api.get('/vendor/products');
      setProducts(prodRes.data.products || []);
    } catch (e) {
      console.error('Error fetching initial data', e);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize category attributes template when productForm.category_id changes
  useEffect(() => {
    if (productForm.category_id) {
      setSpecTemplate([]);
      api.get(`/public/categories/${productForm.category_id}/attributes`)
        .then(res => {
          const attrs = res.data.attributes || [];
          setSpecTemplate(attrs);

          if (!selectedModelForSpecs || selectedModelForSpecs.id === 'NEW') {
            const vals = {};
            attrs.forEach(attr => { vals[attr.id] = ''; });
            setSpecValues(vals);
          }
        })
        .catch(err => {
          console.error('Failed to load category attributes template', err);
          setSpecTemplate([]);
        });

      // Fetch dynamic Attribute Groups
      api.get(`/public/categories/${productForm.category_id}/attribute-groups`)
        .then(res => {
          setCategoryAttributeGroups(res.data.attributeGroups || []);
        })
        .catch(err => {
          console.error('Failed to load attribute groups', err);
          setCategoryAttributeGroups([]);
        });
    } else {
      setSpecTemplate([]);
      setSpecValues({});
      setCategoryAttributeGroups([]);
    }
  }, [productForm.category_id]);

  const fetchProductDetails = async (product) => {
    setSelectedProduct(product);
    setProductForm({ name: product.name, category_id: product.category_id, brand_id: product.brand_id || '' });
    setEditingProductId(product.id);

    // Fetch models of this product
    await loadModelsList(product.id);
    setView('EDIT_PANEL');
    setActiveTab('PRODUCT_INFO');
  };

  const loadModelsList = async (productId) => {
    try {
      setLoading(true);
      const res = await api.get(`/vendor/products/${productId}/models`);
      const list = res.data.models || [];
      setModels(list);

      // Auto-select first model for dropdowns
      if (list.length > 0) {
        setSelectedModelIdForVariants(list[0].id.toString());
        setComboSpecsFromModel(list[0]);
        setComboWarranty(list[0].warranty || '1 Year Warranty');
        setComboWhatsInTheBox(list[0].whats_in_the_box || 'Main Unit');
        loadVariantsForModel(list[0].id);
      } else {
        setSelectedModelIdForVariants('');
        setVariantsList([]);
        setComboWarranty('');
        setComboWhatsInTheBox('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadVariantsForModel = async (modelId) => {
    try {
      const res = await api.get(`/vendor/models/${modelId}/variants`);
      const dbVariants = res.data.variants || [];
      setVariantsList(dbVariants);

      // Directly populate generatedVariants from dbVariants
      const matchedModel = models.find(m => m.id === parseInt(modelId));
      const modelName = matchedModel ? matchedModel.name : '';

      const mapped = dbVariants.map(v => {
        let attrsObj = {};
        try {
          attrsObj = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
        } catch (e) { }

        const comboName = Object.entries(attrsObj).filter(([k]) => k.toLowerCase() !== 'title').map(([k, val]) => val).join(' / ');
        const fullName = modelName ? `${modelName} (${comboName})` : comboName;
        const dbTitle = attrsObj.title;
        const finalVariantTitle = dbTitle ? dbTitle : fullName;

        return {
          ...v,
          id: v.id,
          price: v.price !== undefined && v.price !== null ? v.price : '',
          mrp: v.mrp !== undefined && v.mrp !== null ? v.mrp : '',
          sku: v.sku || '',
          stock: v.stock !== undefined && v.stock !== null ? v.stock : '',
          status: v.status || 'PUBLISHED',
          barcode: v.barcode || '',
          name: finalVariantTitle,
          title: finalVariantTitle,
          attributes: { ...attrsObj, title: dbTitle || finalVariantTitle },
          warranty: v.warranty || matchedModel?.warranty || '1 Year Warranty',
          whats_in_the_box: v.whats_in_the_box || matchedModel?.whats_in_the_box || 'Main Unit, User Guide',
          specifications: v.specifications || {},
          seo_slug: attrsObj.seo_slug || '',
          images: v.images || []
        };
      });

      setGeneratedVariants(mapped);

      // Extract unique attribute values from dbVariants
      const uniqueVals = {};
      dbVariants.forEach(v => {
        let attrsObj = {};
        try {
          attrsObj = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
        } catch (e) { }
        Object.entries(attrsObj).forEach(([key, val]) => {
          if (key.toLowerCase() === 'title') return;
          if (!uniqueVals[key]) uniqueVals[key] = new Set();
          if (val) uniqueVals[key].add(val);
        });
      });

      const extractedVals = {};
      Object.entries(uniqueVals).forEach(([key, valSet]) => {
        extractedVals[key] = Array.from(valSet);
      });

      setSelectedAttributeValues(extractedVals);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCombination = () => {
    let attrsObj = {};

    // 0. Variant Title validation (Compulsory)
    const customTitle = comboVariantTitle.trim();
    if (!customTitle) {
      alert('Variant Title is required.');
      return;
    }
    attrsObj['title'] = customTitle;

    // 1. Color validation (Compulsory for all categories)
    const finalColor = comboColor === 'Others' ? customComboColor.trim() : comboColor;
    if (!finalColor) {
      alert('Please select or enter a Color.');
      return;
    }
    attrsObj['Color'] = finalColor;

    // 2. Size validation & attribute setting (Compulsory for Shoes, Sports & Fashion; Optional for all other categories)
    const finalSize = fashionSize === 'Others' ? customFashionSize.trim() : (fashionSize === 'None' ? '' : fashionSize);
    if (isSizeRequired) {
      if (!finalSize) {
        alert('Please select or enter a Size.');
        return;
      }
    }
    if (finalSize && finalSize !== 'None') {
      attrsObj['Size'] = finalSize;
    }

    // 3. Universal Pack of & Volume (Optional for all categories)
    const finalPackOf = beautyPackOf === 'Others' ? customBeautyPackOf.trim() : beautyPackOf;
    if (finalPackOf && finalPackOf !== 'None') {
      attrsObj['Pack of'] = finalPackOf;
    }

    const finalVolume = beautyVolume === 'Others' ? customBeautyVolume.trim() : beautyVolume;
    if (finalVolume && finalVolume !== 'None') {
      attrsObj['Volume'] = finalVolume;
    }

    // 4. Category specific / Dynamic attributes
    if (isElectronics) {
      electronicsFields.forEach(field => {
        if (field.name.trim() && field.value.trim()) {
          attrsObj[field.name.trim()] = field.value.trim();
        }
      });
    } else if (categoryAttributeGroups.length === 0) {
      customAttrFields.forEach(field => {
        if (field.name.trim() && field.value.trim()) {
          attrsObj[field.name.trim()] = field.value.trim();
        }
      });
    } else {
      Object.entries(comboBuilder).forEach(([k, v]) => {
        if (v && v.trim()) {
          attrsObj[k] = v.trim();
        }
      });
    }

    // 4. Compulsory specifications validation (Must have at least one, and all must be completed)
    if (comboSpecifications.length === 0 || !comboSpecifications.some(s => s.name.trim() && s.value.trim())) {
      alert('Please add at least one variant specification.');
      return;
    }
    const hasEmptySpec = comboSpecifications.some(spec => !spec.name.trim() || !spec.value.trim());
    if (hasEmptySpec) {
      alert('Please complete all variant specifications (both specification name and value are required).');
      return;
    }
    const comboSpecs = Object.fromEntries(comboSpecifications.filter(spec => spec.name.trim() && spec.value.trim()).map(spec => [spec.name.trim(), spec.value.trim()]));

    // 5. Compulsory Variant About description validation
    if (!comboVariantAbout.trim()) {
      alert('Variant About (description) is required.');
      return;
    }

    // 6. Compulsory Variant Highlights validation (Must have at least one)
    const activeHighlights = comboVariantHighlights.filter(item => item.trim());
    if (activeHighlights.length === 0) {
      alert('Please add at least one variant highlight.');
      return;
    }

    // 7. Compulsory Variant Images validation (Must have at least one)
    if (newComboImages.length === 0) {
      alert('Please upload at least one image for this variant.');
      return;
    }

    const matchedModel = models.find(m => m.id === parseInt(selectedModelIdForVariants));
    const modelSku = matchedModel ? (matchedModel.sku || 'SKU') : 'SKU';
    const modelName = matchedModel ? matchedModel.name : '';

    // Check for duplicate combination in the list
    const isDuplicate = generatedVariants.some(v => {
      const existing = v.attributes || {};
      const incoming = { ...attrsObj };
      const existingEntries = Object.entries(existing);
      const incomingEntries = Object.entries(incoming);
      return existingEntries.length === incomingEntries.length && incomingEntries.every(([key, value]) => existing[key] === value);
    });
    if (isDuplicate) {
      alert('This combination already exists.');
      return;
    }

    const comboName = Object.entries(attrsObj).map(([key, value]) => `${key}: ${value}`).join(' / ');
    const fullName = modelName ? `${modelName} (${comboName})` : comboName;

    // Construct auto SKU
    const skuSuffix = Object.values(attrsObj).map(value => String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean).join('-');
    const defaultSku = skuSuffix ? `${modelSku}-${skuSuffix}-${variantRandomSuffix}` : `${modelSku}-${variantRandomSuffix}`;

    const newVar = {
      id: null,
      name: customTitle,
      title: customTitle,
      sku: defaultSku,
      price: matchedModel ? matchedModel.price || '' : '',
      mrp: matchedModel ? matchedModel.mrp || '' : '',
      stock: 0,
      barcode: '',
      status: 'PUBLISHED',
      attributes: attrsObj,
      warranty: comboWarranty || (matchedModel ? matchedModel.warranty || '1 Year Warranty' : '1 Year Warranty'),
      whats_in_the_box: comboWhatsInTheBox || (matchedModel ? matchedModel.whats_in_the_box || 'Main Unit' : 'Main Unit'),
      return_policy: comboReturnPolicy || 'NO_RETURN',
      return_window_days: comboReturnWindowDays || 7,
      specifications: comboSpecs,
      description: comboVariantAbout,
      seo_slug: comboSeoSlug,
      highlights: activeHighlights,
      images: [...newComboImages]
    };

    setGeneratedVariants([...generatedVariants, newVar]);
    alert('Variant combination details added successfully!');
    setIsComboFormOpen(false);

    // Reset creation fields
    setComboBuilder({});
    setFallbackAttrValue('');
    setFashionSize(isSizeRequired ? 'S' : 'None');
    setCustomFashionSize('');
    setFashionColor('Black');
    setCustomFashionColor('');
    setElectronicsFields(fields => fields.map(field => ({ ...field, value: '' })));
    setElectronicsColor('Black');
    setCustomElectronicsColor('');
    setComboColor('Black');
    setCustomComboColor('');
    setBeautyPackOf('None');
    setCustomBeautyPackOf('');
    setBeautyVolume('None');
    setCustomBeautyVolume('');
    setCustomAttrFields([{ id: `custom-attr-${Date.now()}`, name: '', value: '' }]);
    setComboSpecifications([{ id: `combo-spec-${Date.now()}`, name: '', value: '' }]);
    setNewComboImages([]);
    setShowImageUploaderForCombo(false);
    setComboVariantAbout('');
    setComboVariantTitle('');
    setComboReturnPolicy('NO_RETURN');
    setComboReturnWindowDays(7);
    setComboSeoSlug('');
    setComboVariantHighlights(['']);
    setVariantRandomSuffix(String(Math.floor(100000 + Math.random() * 900000)));
  };

  // ---------------- PRODUCT HANDLERS ----------------
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        const res = await api.put(`/vendor/products/${editingProductId}`, productForm);
        // Sync selectedProduct category_id with updated productForm values
        setSelectedProduct(prev => ({ ...prev, ...productForm }));
        alert('Product group updated successfully!');
      } else {
        const res = await api.post('/vendor/products', productForm);
        alert('Product group created successfully! Now manage models and variants.');
        fetchProductDetails({ id: res.data.productId, ...productForm });
      }
      fetchInitialData();
    } catch (e) {
      if (e.response && e.response.data && e.response.data.message) {
        alert(`Failed to save product group: ${e.response.data.message}`);
      } else {
        alert('Failed to save product group');
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product group? All models and variants will be deleted!')) return;
    try {
      await api.delete(`/vendor/products/${id}`);
      fetchInitialData();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  // ---------------- MODEL MANAGERS ----------------
  const handleModelAddClick = async () => {
    setSelectedModelForSpecs({ id: 'NEW' });
    setModelForm({ name: '', sku: '', description: '', warranty: '1 Year Warranty', replacement_policy: 'No Replacement', replacement_days: '', return_policy: '', return_days: '7', whats_in_the_box: 'Main Unit, User Guide' });
    setHighlights(['']);
    setDocuments([]);
    setVideos([{ videoUrl: '', videoType: 'youtube' }]);
    setModelImages([]);
    setRemovedAttributeIds([]);
    setCustomSpecs([]);

    try {
      const res = await api.get(`/public/categories/${productForm.category_id}/attributes`);
      const attrs = res.data.attributes || [];
      setSpecTemplate(attrs);
      const vals = {};
      attrs.forEach(attr => { vals[attr.id] = ''; });
      setSpecValues(vals);
    } catch (e) {
      console.error(e);
    }
  };

  const handleModelEditClick = async (model) => {
    setSelectedModelForSpecs(model);
    setModelForm({
      name: model.name || '',
      sku: model.sku || '',
      description: model.description || '',
      warranty: model.warranty || '1 Year Warranty',
      replacement_policy: model.replacement_policy || 'No Replacement',
      replacement_days: model.replacement_days || '',
      return_policy: model.return_policy || '',
      return_days: model.return_days || '7',
      whats_in_the_box: model.whats_in_the_box || 'Main Unit, User Guide'
    });
    setHighlights(model.highlights || ['']);
    setModelImages(model.images || []);
    setRemovedAttributeIds([]);
    setCustomSpecs([]);

    try {
      const res = await api.get(`/public/categories/${productForm.category_id}/attributes`);
      const attrs = res.data.attributes || [];
      setSpecTemplate(attrs);
      const vals = {};
      attrs.forEach(attr => {
        const match = (model.specifications || []).find(s => s.attribute_id === attr.id);
        vals[attr.id] = match ? match.value : '';
      });
      setSpecValues(vals);
    } catch (e) {
      console.error(e);
    }

    setDocuments(model.documents || []);
    setVideos(model.videos || [{ videoUrl: '', videoType: 'youtube' }]);
  };

  const handleModelSubmit = async (e) => {
    e.preventDefault();
    const specsPayload = Object.entries(specValues)
      .filter(([attrId]) => !removedAttributeIds.includes(parseInt(attrId)))
      .map(([attrId, val]) => ({
        attribute_id: parseInt(attrId),
        value: val
      }));

    // Post custom specifications first to categories database
    for (const cs of customSpecs) {
      if (cs.name.trim() && cs.value.trim()) {
        try {
          const res = await api.post(`/public/categories/${productForm.category_id}/attributes`, { name: cs.name.trim() });
          const attrId = res.data.attribute.id;
          specsPayload.push({
            attribute_id: attrId,
            value: cs.value.trim()
          });
        } catch (err) {
          console.error('Failed to save custom spec attribute', err);
        }
      }
    }

    const payload = {
      ...modelForm,
      highlights: highlights.filter(h => h.trim() !== ''),
      specifications: specsPayload,
      documents,
      videos: videos.filter(v => v.videoUrl),
      images: modelImages
    };

    try {
      if (selectedModelForSpecs.id === 'NEW') {
        await api.post(`/vendor/products/${selectedProduct.id}/models`, payload);
        alert('Model added successfully!');
      } else {
        await api.put(`/vendor/models/${selectedModelForSpecs.id}`, payload);
        alert('Model updated successfully!');
      }
      setSelectedModelForSpecs(null);
      loadModelsList(selectedProduct.id);
    } catch (e) {
      alert('Failed to save model details');
    }
  };

  // Automatically generate SKU Prefix based on name typed
  const handleModelNameChange = (val) => {
    const brandPrefix = selectedProduct.brand_name || 'GEN';
    const prodShorthand = selectedProduct.name.substring(0, 3).toUpperCase();
    const modelShorthand = val.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const skuPrefix = val ? `${brandPrefix.substring(0, 3).toUpperCase()}-${prodShorthand}-${modelShorthand}-${randCode}` : '';

    setModelForm(prev => ({
      ...prev,
      name: val,
      sku: skuPrefix
    }));
  };

  // Helper: Auto-generates Variant SKU Prefix + attributes values and updates state
  const updateVariantSku = (attrsList, modelId) => {
    const matchedModel = models.find(m => m.id === parseInt(modelId));
    const modelSku = matchedModel ? (matchedModel.sku || 'SKU') : 'SKU';
    const attrValues = attrsList
      .map(item => item.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean)
      .join('-');
    const suffix = attrValues ? `-${attrValues}` : '';
    setVariantForm(prev => ({
      ...prev,
      sku: `${modelSku}${suffix}`
    }));
  };

  // ---------------- VARIANT MANAGERS ----------------
  const handleModelSelectForVariantsChange = (e) => {
    const modelId = e.target.value;
    setSelectedModelIdForVariants(modelId);
    if (modelId) {
      const matchedModel = models.find(model => model.id === parseInt(modelId));
      setComboSpecsFromModel(matchedModel);
      setComboWarranty(matchedModel?.warranty || '1 Year Warranty');
      setComboWhatsInTheBox(matchedModel?.whats_in_the_box || 'Main Unit');
      loadVariantsForModel(modelId);
    } else {
      setVariantsList([]);
      setComboWarranty('');
      setComboWhatsInTheBox('');
    }
  };

  const handleVariantAddClick = () => {
    setEditingVariantId(null);

    // Auto-prefill values from parent Model

    const matchedModel = models.find(m => m.id === parseInt(selectedModelIdForVariants));
    const prefilledWarranty = matchedModel ? matchedModel.warranty || '' : '';
    const prefilledBox = matchedModel ? matchedModel.whats_in_the_box || '' : '';

    const modelSpecs = {};
    if (matchedModel && matchedModel.specifications) {
      matchedModel.specifications.forEach(s => {
        modelSpecs[s.attribute_id] = s.value;
      });
    }

    setVariantForm({
      name: '', sku: '', price: '', mrp: '', stock: '', status: 'PUBLISHED',
      warranty: prefilledWarranty, whats_in_the_box: prefilledBox
    });
    setVariantSpecsValues(modelSpecs);
    setVariantImages([]); // Reset variant images uploader inside the form

    const initialAttrs = [{ key: 'Color', value: '' }, { key: 'Size', value: '' }];
    setVariantAttrs(initialAttrs);
    setShowVariantForm(true);
    updateVariantSku(initialAttrs, selectedModelIdForVariants);
  };

  const handleVariantEditClick = (v) => {
    setEditingVariantId(v.id);

    // Parse specs override
    let specsOverride = {};
    try {
      specsOverride = typeof v.specifications === 'string' ? JSON.parse(v.specifications) : (v.specifications || {});
    } catch (e) { }

    // Prefill model specifications where variant did not specify

    const matchedModel = models.find(m => m.id === parseInt(selectedModelIdForVariants));
    const mergedSpecs = {};
    if (matchedModel && matchedModel.specifications) {
      matchedModel.specifications.forEach(s => {
        mergedSpecs[s.attribute_id] = specsOverride[s.attribute_id] !== undefined ? specsOverride[s.attribute_id] : s.value;
      });
    }

    setVariantForm({
      name: v.name || '',
      sku: v.sku || '',
      price: v.price || '',
      mrp: v.mrp || '',
      stock: v.stock || '',
      status: v.status || 'PUBLISHED',
      warranty: v.warranty !== null ? v.warranty : (matchedModel ? matchedModel.warranty || '' : ''),
      whats_in_the_box: v.whats_in_the_box !== null ? v.whats_in_the_box : (matchedModel ? matchedModel.whats_in_the_box || '' : '')
    });
    setVariantSpecsValues(mergedSpecs);
    setVariantImages(v.images || []); // Prefill variant images uploader inside the form

    let attrsObj = {};
    try {
      attrsObj = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
    } catch (e) { }

    const list = Object.entries(attrsObj).filter(([k]) => k.toLowerCase() !== 'title').map(([key, value]) => ({ key, value }));
    const finalAttrs = list.length > 0 ? list : [{ key: 'Color', value: '' }];
    setVariantAttrs(finalAttrs);
    setShowVariantForm(true);
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    const attributesObj = {};
    variantAttrs.forEach(item => {
      if (item.key && item.value) {
        attributesObj[item.key] = item.value;
      }
    });

    const payload = {
      ...variantForm,
      attributes: attributesObj,
      specifications: variantSpecsValues,
      images: variantImages
    };

    try {
      if (editingVariantId) {
        await api.put(`/vendor/variants/${editingVariantId}`, payload);
        alert('Variant updated successfully!');
      } else {
        await api.post(`/vendor/models/${selectedModelIdForVariants}/variants`, payload);
        alert('Variant created successfully!');
      }
      setShowVariantForm(false);
      loadVariantsForModel(selectedModelIdForVariants);
    } catch (e) {
      alert('Failed to save Variant');
    }
  };

  const handleBatchVariantsSave = async () => {
    if (!selectedModelIdForVariants) return;
    setLoading(true);
    try {
      await api.post(`/vendor/models/${selectedModelIdForVariants}/variants/batch`, {
        variants: generatedVariants
      });
      alert('All variants saved successfully!');
      loadVariantsForModel(selectedModelIdForVariants);
    } catch (e) {
      console.error(e);
      if (e.response && e.response.data && e.response.data.message) {
        alert(`Failed to save variants batch: ${e.response.data.message}`);
      } else {
        alert('Failed to save variants batch');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm('Delete this model and all variants inside?')) return;
    try {
      await api.delete(`/vendor/models/${id}`);
      loadModelsList(selectedProduct.id);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleDeleteVariant = async (id) => {
    if (!window.confirm('Delete this variant?')) return;
    try {
      await api.delete(`/vendor/variants/${id}`);
      loadVariantsForModel(selectedModelIdForVariants);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleVariantRowDelete = async (item, idx) => {
    if (item.id) {
      await handleDeleteVariant(item.id);
    } else {
      const updated = generatedVariants.filter((_, i) => i !== idx);
      setGeneratedVariants(updated);
    }
  };

  // Search, filter, and pagination
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toString() === searchQuery;
    const matchesCategory = filterCategoryId === 'ALL' || p.category_id.toString() === filterCategoryId;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-gray-50/50 min-h-screen p-4 md:p-6 text-gray-700">

      {/* breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm font-semibold text-gray-400">
        <span
          className="hover:text-blue-600 cursor-pointer text-blue-600"
          onClick={() => { setView('LIST'); setSelectedProduct(null); }}
        >
          Product Hub
        </span>
        {selectedProduct ? (
          <>
            <ChevronRight size={14} />
            <span className="text-gray-700">{selectedProduct.name}</span>
          </>
        ) : (
          <>
            <ChevronRight size={14} />
            <span className="text-gray-700">Products</span>
          </>
        )}
      </div>

      {!selectedProduct && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Product Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage your product catalogs and groups</p>
        </div>
      )}

      {/* ---------------- PRODUCTS LIST PANEL ---------------- */}
      {view === 'LIST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="space-y-6">
              {/* Create Product Group Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Layers className="text-blue-600" size={20} />
                  Create Product Catalog Group
                </h2>
                <form onSubmit={handleProductSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      placeholder="e.g. iPhone 15 Pro, Nike Air Max"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Category *</label>
                    <div className="relative">
                      <select
                        value={productForm.category_id}
                        onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                        required
                        className="w-full border border-gray-200 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:border-blue-500 bg-white appearance-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Brand (Optional)</label>
                    <input
                      type="text"
                      value={productForm.brand_id}
                      onChange={e => setProductForm({ ...productForm, brand_id: e.target.value })}
                      placeholder="e.g. Apple, Nike"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm flex justify-center items-center gap-2 transition-colors">
                    <Plus size={18} />
                    Create Catalog Group
                  </button>
                </form>
              </div>

              {/* Tips Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="text-blue-500" size={18} />
                  Tips
                </h3>
                <ul className="space-y-3">
                  {[
                    "Create catalog groups to organize products easily.",
                    "Add multiple models and variants under each group.",
                    "You can manage hierarchy using drag & drop.",
                    "Keep your catalog updated for better visibility."
                  ].map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 font-medium">
                      <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={16} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Products Table */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-lg font-bold text-gray-800">Your Product Catalogs</h2>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search catalog by name, category..." 
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="relative w-36">
                    <select 
                      value={filterCategoryId}
                      onChange={(e) => { setFilterCategoryId(e.target.value); setCurrentPage(1); }}
                      className="w-full border border-gray-200 rounded-lg p-2 pr-8 text-sm focus:outline-none focus:border-blue-500 bg-white appearance-none text-gray-600 font-medium"
                    >
                      <option value="ALL">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>
                  <button className="border border-gray-200 rounded-lg p-2 text-gray-600 hover:bg-gray-50 flex-shrink-0">
                    <List size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-4 px-6 w-10"></th>
                      <th className="py-4 px-2">Product Catalog</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4">Structure Details</th>
                      <th  className="py-4 px-6  text-left" >Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-20 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
                            <span>Loading products...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-20 text-center text-gray-400">No product groups found. Create one to begin.</td>
                      </tr>
                    ) : (
                      paginatedProducts.map(p => {
                        const date = new Date(p.created_at || Date.now());
                        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="py-4 pl-4 pr-2 text-gray-300">
                              <GripVertical size={16} className="cursor-grab hover:text-gray-500" />
                            </td>
                            <td className="py-4 px-2">
                              <h4 className="font-bold text-gray-800 text-sm">{p.name}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">ID: {p.id} • Created {formattedDate}</p>
                            </td>
                            <td className="py-4 px-4 text-gray-600 font-medium text-sm">{p.category_name}</td>
                            <td className="py-4 px-4">
                              <div className="flex gap-2">
                                <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-md">
                                  {p.model_count} Models
                                </span>
                                <span className="bg-green-50 text-green-600 text-[11px] font-bold px-2.5 py-1 rounded-md">
                                  {p.variant_count} Variants
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-left">
                              <div className="flex justify-start items-center gap-2">
                                <button
                                  onClick={() => fetchProductDetails(p)}
                                  className="border border-gray-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-semibold px-3 py-1.5 rounded-lg text-[13px] flex items-center gap-1.5 transition-colors"
                                >
                                  <ExternalLink size={14} /> Edit Hierarchy
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-gray-400 border border-gray-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 bg-white mt-auto">
                <div>Showing {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >{'<'}</button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >{'>'}</button>
                </div>
                <div className="relative">
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none bg-white"
                  >
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- UNIFIED PRODUCT EDIT PANEL ---------------- */}
      {view === 'EDIT_PANEL' && selectedProduct && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">

          {/* Top Panel Headers */}
          <div className="p-6 border-b border-gray-150 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Category: {selectedProduct.category_name} • Brand: {selectedProduct.brand_name || 'Generic'}</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {(() => {
                const selectedCat = categories.find(c => c.id == productForm.category_id);
                if (selectedCat?.youtube_video_link) {
                  return (
                    <button
                      type="button"
                      onClick={() => setShowVideoModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer animate-pulse"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                      </span>
                      View Video
                    </button>
                  );
                }
                return null;
              })()}
              <button
                onClick={() => {
                  setView('LIST');
                  setSelectedProduct(null);
                  setEditingProductId(null);
                  setProductForm({ name: '', category_id: '', brand_id: '' });
                }}
                className="text-gray-500 hover:text-gray-800 text-xs font-bold uppercase tracking-wider py-2 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all shadow-sm"
              >
                Back to Catalog list
              </button>
            </div>
          </div>

          {/* Category Margin Banner (in Edit Panel) */}
          {(() => {
            const selectedCat = categories.find(c => c.id == productForm.category_id);
            if (selectedCat && (parseFloat(selectedCat.margin_percentage) > 0 || selectedCat.margin_description)) {
              const margin = parseFloat(selectedCat.margin_percentage) || 0;
              return (
                <div className="mx-6 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
                  <DollarSign size={16} className="text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                      Platform Margin: {margin}%
                    </span>
                    {selectedCat.margin_description && (
                      <p className="text-xs text-amber-700 leading-relaxed mt-0.5">{selectedCat.margin_description}</p>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Unified Editor Navigation Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar bg-white">
            <button
              onClick={() => setActiveTab('PRODUCT_INFO')}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${activeTab === 'PRODUCT_INFO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Catalog General Info
            </button>
            <button
              onClick={() => { setActiveTab('MODELS'); setSelectedModelForSpecs(null); }}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${activeTab === 'MODELS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              1. Create Variants
            </button>
            <button
              onClick={() => { setActiveTab('VARIANTS'); loadModelsList(selectedProduct.id); }}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${activeTab === 'VARIANTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              2. Create Variant Combinations
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6">

            {/* SUB-TAB 1: PRODUCT GENERAL INFO */}
            {activeTab === 'PRODUCT_INFO' && (
              <div className="max-w-xl">
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Catalog Group Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Category</label>
                    <div className="relative">
                      <select
                        value={productForm.category_id}
                        onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:border-blue-500 bg-white appearance-none"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Brand</label>
                    <input
                      type="text"
                      value={productForm.brand_id}
                      onChange={e => setProductForm({ ...productForm, brand_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider">
                    Save general info
                  </button>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: MODELS SPECIFICATIONS AND INFO */}
            {activeTab === 'MODELS' && (
              <div className="space-y-6">
                {!selectedModelForSpecs ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Variant Families</h3>
                      <button
                        onClick={handleModelAddClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Variant
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {models.map(m => (
                        <div key={m.id} className="border border-gray-200 rounded-2xl p-5 bg-gray-50/20 hover:shadow-sm transition-all relative flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-base">{m.name}</h4>
                            <p className="text-xs text-gray-400 mt-1 font-mono">SKU: {m.sku || 'N/A'}</p>
                            <div className="mt-3 flex gap-2 flex-wrap">
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                {m.specifications?.length || 0} specs filled
                              </span>
                              <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                {m.warranty || 'No Warranty'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-gray-150 flex justify-end gap-2">
                            <button
                              onClick={() => handleModelEditClick(m)}
                              className="text-blue-600 hover:bg-blue-50 p-2 rounded font-bold text-xs flex items-center gap-1"
                            >
                              <Edit2 size={12} /> Edit Details
                            </button>
                            <button
                              onClick={() => handleDeleteModel(m.id)}
                              className="text-red-600 hover:bg-red-50 p-2 rounded font-bold text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // Model Details Editor (Specifications, Highlights, Description)
                  <form onSubmit={handleModelSubmit} className="space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-150 pb-3">
                      <h3 className="font-bold text-gray-900 text-base">
                        {selectedModelForSpecs.id === 'NEW' ? 'Create Model Family' : `Editing Specifications for: ${selectedModelForSpecs.name}`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedModelForSpecs(null)}
                        className="text-gray-400 hover:text-gray-700 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Model Name *</label>
                        <input
                          type="text"
                          value={modelForm.name}
                          onChange={e => handleModelNameChange(e.target.value)}
                          required
                          placeholder="e.g. 15 Pro Max 128GB"
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">SKU Prefix (Auto-Generated - Read-Only)</label>
                        <input
                          type="text"
                          value={modelForm.sku}
                          readOnly
                          placeholder="Auto-Generated"
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-100 cursor-not-allowed font-mono text-blue-600 font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Warranty</label>
                        <select value={modelForm.warranty} onChange={e => setModelForm({ ...modelForm, warranty: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-white">
                          {['No Warranty', '6 Months Warranty', '1 Year Warranty', '2 Years Warranty', '3 Years Warranty'].map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Replacement Policy</label>
                        <div className="flex gap-2">
                          <select value={modelForm.replacement_policy} onChange={e => setModelForm({ ...modelForm, replacement_policy: e.target.value })} className="flex-1 border border-gray-200 rounded-xl p-3 text-sm bg-white">
                            <option value="No Replacement">No Replacement</option>
                            <option value="Replacement Available">Replacement Available</option>
                          </select>
                          {modelForm.replacement_policy === 'Replacement Available' && <input type="number" min="1" value={modelForm.replacement_days} onChange={e => setModelForm({ ...modelForm, replacement_days: e.target.value })} placeholder="Days" className="w-24 border border-gray-200 rounded-xl p-3 text-sm" />}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Return Policy (vendor enters the terms)</label>
                        <div className="flex gap-2">
                          <textarea value={modelForm.return_policy} onChange={e => setModelForm({ ...modelForm, return_policy: e.target.value })} placeholder="e.g. Unused items can be returned in original packaging." className="flex-1 border border-gray-200 rounded-xl p-3 text-sm min-h-[76px]" />
                          <div className="w-28"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Return days</label><input type="number" min="1" value={modelForm.return_days} onChange={e => setModelForm({ ...modelForm, return_days: e.target.value })} placeholder="7" className="w-full border border-gray-200 rounded-xl p-3 text-sm" /><p className="text-[10px] text-gray-400 mt-1">Default: 7 days</p></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">What's in the Box</label>
                        <input
                          type="text"
                          value={modelForm.whats_in_the_box}
                          onChange={e => setModelForm({ ...modelForm, whats_in_the_box: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-150 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModelForSpecs(null)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow"
                      >
                        Save Variant Family Info
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* SUB-TAB 3: PRODUCT VARIANTS */}
            {activeTab === 'VARIANTS' && (
              <div className="space-y-6">

                {/* 1. Model Choose Dropdown */}
                <div className="max-w-md bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Choose Variant Family (e.g. iPhone 15 Pro) *</label>
                  <select
                    value={selectedModelIdForVariants}
                    onChange={handleModelSelectForVariantsChange}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                  >
                    <option value="">Select Variant Family</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                {selectedModelIdForVariants ? (
                  <>
                    <div className="bg-white border border-gray-250 p-6 rounded-2xl space-y-4 shadow-sm">
                    <div 
                      onClick={() => setIsComboFormOpen(!isComboFormOpen)}
                      className="flex justify-between items-center cursor-pointer border-b border-gray-150 pb-2 hover:bg-gray-50/50 transition-colors"
                    >
                      <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Plus size={16} className="text-blue-600" />
                        Create Variant Combination
                      </h3>
                      {isComboFormOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                    </div>

                    {isComboFormOpen && (
                      <div className="space-y-4">
                        {/* Universal Attributes (Colour, Size, Pack of, Volume / Quantity) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl bg-white border border-blue-100 p-4">
                          {/* Colour */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Colour *</label>
                            <select
                              value={comboColor}
                              onChange={e => {
                                setComboColor(e.target.value);
                                if (e.target.value !== 'Others') setCustomComboColor('');
                              }}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            >
                              {['Black', 'White', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Others'].map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                            {comboColor === 'Others' && (
                              <input
                                value={customComboColor}
                                onChange={e => setCustomComboColor(e.target.value)}
                                placeholder="e.g. Rose Gold"
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none mt-1.5"
                              />
                            )}
                          </div>

                          {/* Size */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                              Size {isSizeRequired ? '*' : '(Optional)'}
                            </label>
                            <select
                              value={fashionSize}
                              onChange={e => {
                                setFashionSize(e.target.value);
                                if (e.target.value !== 'Others') setCustomFashionSize('');
                              }}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            >
                              {!isSizeRequired && <option value="None">None</option>}
                              {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', '6', '7', '8', '9', '10', '11', '12', 'Others'].map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                            {fashionSize === 'Others' && (
                              <input
                                type="text"
                                value={customFashionSize}
                                onChange={e => setCustomFashionSize(e.target.value)}
                                placeholder="e.g. 5XL or 42 EU"
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none mt-1.5"
                              />
                            )}
                          </div>

                          {/* Pack of */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Pack of (Optional)</label>
                            <select
                              value={beautyPackOf}
                              onChange={e => {
                                setBeautyPackOf(e.target.value);
                                if (e.target.value !== 'Others') setCustomBeautyPackOf('');
                              }}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            >
                              {['None', 'Pack of 1', 'Pack of 2', 'Pack of 3', 'Pack of 4', 'Pack of 5', 'Pack of 6', 'Pack of 10', 'Others'].map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                            {beautyPackOf === 'Others' && (
                              <input
                                value={customBeautyPackOf}
                                onChange={e => setCustomBeautyPackOf(e.target.value)}
                                placeholder="e.g. Pack of 12"
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none mt-1.5"
                              />
                            )}
                          </div>

                          {/* Volume / Quantity */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Volume / Quantity (Optional)</label>
                            <select
                              value={beautyVolume}
                              onChange={e => {
                                setBeautyVolume(e.target.value);
                                if (e.target.value !== 'Others') setCustomBeautyVolume('');
                              }}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            >
                              {['None', '10ml', '30ml', '50ml', '100ml', '200ml', '250ml', '500ml', '1 Liter', '2 Liters', 'Others'].map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                            {beautyVolume === 'Others' && (
                              <input
                                value={customBeautyVolume}
                                onChange={e => setCustomBeautyVolume(e.target.value)}
                                placeholder="e.g. 750ml"
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none mt-1.5"
                              />
                            )}
                          </div>
                        </div>

                        {isElectronics ? (
                          <div className="space-y-4 p-4 rounded-xl bg-gray-50/50 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Electronics attributes</h4><p className="text-xs text-gray-400 mt-1">Add or remove only the fields needed for this combination.</p></div>
                              <button type="button" onClick={() => setElectronicsFields(fields => [...fields, { id: `${Date.now()}`, name: '', value: '' }])} className="text-xs text-blue-600 font-bold flex items-center gap-1"><Plus size={14} /> Add field</button>
                            </div>
                            {electronicsFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Field name</label><input value={field.name} onChange={e => setElectronicsFields(fields => fields.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="e.g. RAM" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Value</label><input value={field.value} onChange={e => setElectronicsFields(fields => fields.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} placeholder="e.g. 8GB" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white" /></div>
                                <button type="button" title="Remove field" onClick={() => setElectronicsFields(fields => fields.filter((_, i) => i !== index))} className="p-2.5 text-red-500"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                        ) : categoryAttributeGroups.length === 0 ? (
                          <div className="space-y-4 p-4 rounded-xl bg-gray-50/50 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Variant attributes</h4>
                                <p className="text-xs text-gray-400 mt-1">Add or remove custom attribute fields for this combination (Optional).</p>
                              </div>
                              <button type="button" onClick={() => setCustomAttrFields(fields => [...fields, { id: `${Date.now()}`, name: '', value: '' }])} className="text-xs text-blue-600 font-bold flex items-center gap-1">
                                <Plus size={14} /> Add field
                              </button>
                            </div>
                            {customAttrFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Attribute Name (Optional)</label>
                                  <input value={field.name} onChange={e => setCustomAttrFields(fields => fields.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="e.g. Material, Weight" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Attribute Value (Optional)</label>
                                  <input value={field.value} onChange={e => setCustomAttrFields(fields => fields.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} placeholder="e.g. Wood, 500g" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white" />
                                </div>
                                {customAttrFields.length > 1 && (
                                  <button type="button" title="Remove field" onClick={() => setCustomAttrFields(fields => fields.filter((_, i) => i !== index))} className="p-2.5 text-red-500">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Row inputs container */}
                            <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-200">
                              {categoryAttributeGroups.map(group => {
                                const standardValues = group.values || [];
                                const selectedVal = comboBuilder[group.name] || '';

                                return (
                                  <div key={group.id} className="flex-grow min-w-[200px] space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                                      {group.name} (Optional)
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        list={`list-${group.id}`}
                                        value={selectedVal}
                                        onChange={e => setComboBuilder({ ...comboBuilder, [group.name]: e.target.value })}
                                        placeholder={`Enter or select ${group.name}...`}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500"
                                      />
                                      <datalist id={`list-${group.id}`}>
                                        {standardValues.map(v => (
                                          <option key={v.id} value={v.value} />
                                        ))}
                                      </datalist>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Variant Title * (Compulsory) */}
                        <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                            Variant Title *
                          </label>
                          <input
                            type="text"
                            value={comboVariantTitle}
                            onChange={e => {
                              const val = e.target.value;
                              setComboVariantTitle(val);
                              const cleanVal = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                              setComboSeoSlug(cleanVal ? `${cleanVal}-${variantRandomSuffix}` : '');
                            }}
                            placeholder="e.g. Ray-Ban Sunglasses - Matte Black Edition"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold"
                          />
                        </div>

                        {/* SEO URL (Slug) */}
                        <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                            SEO URL (Slug) (Auto-Generated / Editable)
                          </label>
                          <input
                            type="text"
                            value={comboSeoSlug}
                            onChange={e => setComboSeoSlug(e.target.value)}
                            placeholder="e.g. ray-ban-sunglasses-matte-black-123456"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold"
                          />
                        </div>

                        {/* Variant Specifications (Common to all categories) */}
                        <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-gray-700 uppercase">Variant Specifications *</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">Specifications saved only for this variant (Compulsory).</p>
                            </div>
                            <button type="button" onClick={() => setComboSpecifications(specs => [...specs, { id: `${Date.now()}-spec`, name: '', value: '' }])} className="text-xs text-blue-600 font-bold flex items-center gap-1"><Plus size={13} /> Add specification</button>
                          </div>
                          {comboSpecifications.map((spec, specIndex) => (
                            <div key={spec.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Specification</label>
                                <input value={spec.name} onChange={e => setComboSpecifications(specs => specs.map((item, i) => i === specIndex ? { ...item, name: e.target.value } : item))} placeholder="e.g. Connectivity" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Value</label>
                                <input value={spec.value} onChange={e => setComboSpecifications(specs => specs.map((item, i) => i === specIndex ? { ...item, value: e.target.value } : item))} placeholder="e.g. Bluetooth 5.3" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs" />
                              </div>
                              <button type="button" onClick={() => setComboSpecifications(specs => specs.filter((_, i) => i !== specIndex))} className="p-2.5 text-red-500"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>

                        {/* Variant About & Highlights (Common to all categories) */}
                        <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-3">
                          <p className="text-xs font-bold text-gray-700 uppercase">Variant About & Highlights *</p>
                          <textarea value={comboVariantAbout} onChange={e => setComboVariantAbout(e.target.value)} placeholder="About this specific variant (Compulsory)" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs min-h-[72px]" />
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Highlights (Compulsory)</span>
                              <button type="button" onClick={() => setComboVariantHighlights(items => [...items, ''])} className="text-xs font-bold text-blue-600">+ Add highlight</button>
                            </div>
                            {comboVariantHighlights.map((highlight, highlightIndex) => (
                              <div key={highlightIndex} className="flex gap-2">
                                <input value={highlight} onChange={e => setComboVariantHighlights(items => items.map((item, i) => i === highlightIndex ? e.target.value : item))} placeholder="e.g. Silent click technology" className="flex-1 border border-gray-200 rounded-lg p-2.5 text-xs" />
                                <button type="button" onClick={() => setComboVariantHighlights(items => items.filter((_, i) => i !== highlightIndex))} className="text-red-500 p-2"><Trash2 size={15} /></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Variant Warranty, In The Box, Return Policy, and Return Window */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl bg-white border border-gray-200 p-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Warranty *</label>
                            <select value={comboWarranty} onChange={e => setComboWarranty(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800">
                              {['No Warranty', '6 Months Warranty', '1 Year Warranty', '2 Years Warranty', '3 Years Warranty'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">What's in the Box *</label>
                            <input
                              type="text"
                              value={comboWhatsInTheBox}
                              onChange={e => setComboWhatsInTheBox(e.target.value)}
                              placeholder="e.g. Main Unit, Charger, User Manual"
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Return Policy *</label>
                            <select
                              value={comboReturnPolicy}
                              onChange={e => setComboReturnPolicy(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            >
                              <option value="NO_RETURN">No Return</option>
                              <option value="REPLACEMENT_ONLY">Replacement Only</option>
                              <option value="REFUND_ONLY">Refund Only</option>
                              <option value="REPLACEMENT_AND_REFUND">Replacement & Refund</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Return Window (Days) *</label>
                            <input
                              type="number"
                              min="0"
                              value={comboReturnWindowDays}
                              onChange={e => setComboReturnWindowDays(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            />
                          </div>
                        </div>

                        {/* Image sorted selection manager block */}
                        <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2">
                          <span className="text-xs font-bold border rounded-lg px-3 py-2 bg-blue-600 border-blue-600 text-white cursor-default inline-block">
                            <ImageIcon size={14} className="inline mr-1" /> Variant images ({newComboImages.length}) *
                          </span>
                          <ImageSortManager images={newComboImages} onChange={setNewComboImages} />
                        </div>

                        {/* Action buttons (Common to all categories) */}
                        <div className="flex justify-end pt-1">
                          <button 
                            type="button" 
                            onClick={handleAddCombination} 
                            className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2.5 rounded-lg text-xs uppercase flex items-center gap-1 shadow-sm"
                          >
                            <Plus size={14} /> Add Combination
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Dynamic Variant Inventory Grid */}
                    {generatedVariants.length > 0 && (
                      <div className="bg-white border border-gray-250 p-6 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                          <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                            <Box size={16} className="text-blue-600" />
                            Variants List & Inventory details ({generatedVariants.length} variants)
                          </h3>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                {isFashion ? [
                                  <th key="size" className="py-3 px-4">Size</th>,
                                  <th key="color" className="py-3 px-4 w-[12%]">Color *</th>
                                ] : categoryAttributeGroups.length === 0 ? (
                                  <th className="py-3 px-4">Attribute</th>
                                ) : (
                                  categoryAttributeGroups.map(group => (
                                    <th key={group.id} className="py-3 px-4">{group.name}</th>
                                  ))
                                )}
                                <th className="py-3 px-3">Specifications</th>
                                <th className="text-left px-6 py-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Images</th>
                                <th className="py-3 px-4 w-[14%]">MRP (₹) *</th>
                                <th className="py-3 px-4 w-[14%]">Price (₹) *</th>
                                <th className="py-3 px-4 w-[9%]">GST Rate</th>
                                <th className="py-3 px-4 w-[10%]">Company Margin</th>
                                <th className="py-3 px-4 w-[11%]">Sales price(DP)</th>
                                <th className="py-3 px-4 w-[15%]">SKU *</th>
                                <th className="py-3 px-3 w-[10%]">Quantity *</th>
                                <th className="py-3 px-4 w-[9%]">Status</th>
                                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {generatedVariants.map((item, idx) => {
                                const isMediaActive = activeImageUploadVariantIndex === idx;
                                const isSpecsActive = activeSpecsVariantIndex === idx;
                                const isPreviewActive = previewVariantIndex === idx;
                                const colSpanValue = isFashion ? 12 : (categoryAttributeGroups.length === 0 ? 11 : categoryAttributeGroups.length + 10);
                                const previewModel = models.find(m => m.id === parseInt(selectedModelIdForVariants));
                                const previewImage = item.images?.[0]?.imageUrl || item.images?.[0]?.image_url || previewModel?.images?.[0]?.imageUrl || previewModel?.images?.[0]?.image_url || '';
                                let itemSpecs = {};
                                try { itemSpecs = typeof item.specifications === 'string' ? JSON.parse(item.specifications) : (item.specifications || {}); } catch (e) { }
                                const modelSpecDefaults = Object.fromEntries((previewModel?.specifications || []).filter(spec => spec.value !== null && spec.value !== undefined && String(spec.value).trim() !== '').map(spec => [spec.label || spec.name || ('Specification ' + spec.attribute_id), spec.value]));
                                itemSpecs = { ...modelSpecDefaults, ...itemSpecs };

                                const selectedCat = categories.find(c => c.id == productForm.category_id);
                                const gstRate = parseFloat(selectedCat?.gst_percentage || 0);
                                const marginRate = parseFloat(selectedCat?.margin_percentage || 0);
                                const basePrice = parseFloat(item.price || 0);
                                const marginAmount = basePrice * (marginRate / 100);
                                const priceAfterMargin = basePrice + marginAmount;
                                const gstAmount = priceAfterMargin * (gstRate / 100);
                                const totalAmount = priceAfterMargin + gstAmount;

                                return (
                                  <React.Fragment key={idx}>
                                    <tr className="hover:bg-gray-50/40">
                                      {isFashion ? [
                                        <td key="size" className="py-3 px-4 font-bold text-gray-900 leading-snug">
                                          {item.attributes?.['Size'] || '-'}
                                        </td>,
                                        <td key="color" className="py-3 px-4">
                                          <div className="space-y-1">
                                            <select
                                              value={['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Orange', 'Grey', 'Navy Blue', 'Gold', 'Silver'].includes(item.attributes?.['Color']) ? item.attributes?.['Color'] : 'Others'}
                                              onChange={e => {
                                                const val = e.target.value;
                                                const updated = [...generatedVariants];
                                                if (!updated[idx].attributes) updated[idx].attributes = {};
                                                if (val !== 'Others') {
                                                  updated[idx].attributes['Color'] = val;
                                                } else {
                                                  updated[idx].attributes['Color'] = '';
                                                }
                                                setGeneratedVariants(updated);
                                              }}
                                              className="w-full border border-gray-200 rounded-lg p-2 font-semibold bg-white"
                                            >
                                              {['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Orange', 'Grey', 'Navy Blue', 'Gold', 'Silver', 'Others'].map(col => (
                                                <option key={col} value={col}>{col}</option>
                                              ))}
                                            </select>

                                            {!['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Orange', 'Grey', 'Navy Blue', 'Gold', 'Silver'].includes(item.attributes?.['Color']) && (
                                              <input
                                                type="text"
                                                value={item.attributes?.['Color'] || ''}
                                                onChange={e => {
                                                  const updated = [...generatedVariants];
                                                  if (!updated[idx].attributes) updated[idx].attributes = {};
                                                  updated[idx].attributes['Color'] = e.target.value;
                                                  setGeneratedVariants(updated);
                                                }}
                                                placeholder="Custom Color"
                                                required
                                                className="w-full border border-gray-200 rounded-lg p-2 font-semibold mt-1"
                                              />
                                            )}
                                          </div>
                                        </td>
                                      ] : categoryAttributeGroups.length === 0 ? (
                                        <td className="py-3 px-4 font-bold text-gray-900 leading-snug">
                                          {Object.entries(item.attributes || {}).filter(([k]) => k.toLowerCase() !== 'title').map(([k, v]) => `${k}: ${v}`).join(', ') || item.name}
                                        </td>
                                      ) : (
                                        categoryAttributeGroups.map(group => (
                                          <td key={group.id} className="py-3 px-4 font-bold text-gray-900 leading-snug">
                                            {item.attributes?.[group.name] || '-'}
                                          </td>
                                        ))
                                      )}
                                      <td className="py-3 px-4">
                                        <button type="button" onClick={() => setActiveSpecsVariantIndex(isSpecsActive ? null : idx)} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg">{Object.keys(itemSpecs).length ? `${Object.keys(itemSpecs).length} specs Edit` : 'Add specs'}</button>
                                      </td>
                                      <td className="text-left px-6 py-4">
                                        <button
                                          type="button"
                                          onClick={() => setActiveImageUploadVariantIndex(isMediaActive ? null : idx)}
                                          className={`p-2 rounded-lg border transition-all ${isMediaActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                        >
                                          📸 {item.images?.length || 0}
                                        </button>
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          type="number"
                                          value={item.mrp}
                                          onChange={e => {
                                            const updated = [...generatedVariants];
                                            updated[idx].mrp = e.target.value;
                                            setGeneratedVariants(updated);
                                          }}
                                          required
                                          className="w-full border border-gray-200 rounded-lg p-2 font-semibold"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          type="number"
                                          value={item.price}
                                          onChange={e => {
                                            const updated = [...generatedVariants];
                                            updated[idx].price = e.target.value;
                                            setGeneratedVariants(updated);
                                          }}
                                          required
                                          className="w-full border border-gray-200 rounded-lg p-2 font-semibold"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex flex-col">
                                          <span className="font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded text-[11px] border border-amber-300 w-max">
                                            GST {gstRate}%
                                          </span>
                                          {basePrice > 0 && gstRate > 0 && (
                                            <span className="text-[10px] font-bold text-amber-700 mt-1 whitespace-nowrap">
                                              +₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex flex-col">
                                          <span className="font-extrabold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded text-[11px] border border-blue-300 w-max">
                                            Margin {marginRate}%
                                          </span>
                                          {basePrice > 0 && marginRate > 0 && (
                                            <span className="text-[10px] font-bold text-blue-700 mt-1 whitespace-nowrap">
                                              +₹{marginAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex flex-col min-w-[100px]">
                                          <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 whitespace-nowrap">
                                            ₹{totalAmount > 0 ? totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                          </span>
                                          <span className="text-[9px] font-bold text-gray-400 mt-0.5">Incl. GST & Margin</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          type="text"
                                          value={item.sku}
                                          readOnly={true}
                                          required
                                          className="w-full border border-gray-200 rounded-lg p-2 font-mono text-gray-400 bg-gray-100 cursor-not-allowed uppercase"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          type="number"
                                          value={item.stock}
                                          onChange={e => {
                                            const updated = [...generatedVariants];
                                            updated[idx].stock = e.target.value;
                                            setGeneratedVariants(updated);
                                          }}
                                          required
                                          className="w-full border border-gray-200 rounded-lg p-2 font-semibold"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <select
                                          value={item.status}
                                          onChange={e => {
                                            const updated = [...generatedVariants];
                                            updated[idx].status = e.target.value;
                                            setGeneratedVariants(updated);
                                          }}
                                          className="w-full border border-gray-200 rounded-lg p-2 bg-white"
                                        >
                                          <option value="PUBLISHED">Published</option>
                                          <option value="DRAFT">Draft</option>
                                        </select>
                                      </td>
                                      <td className="text-left px-6 py-4">
                                        <div className="flex items-center justify-start gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleVariantRowDelete(item, idx)}
                                            className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {isSpecsActive && (
                                      <tr>
                                        <td colSpan={colSpanValue} className="bg-blue-50/40 p-4 border-b border-blue-100">
                                          <div className="w-full space-y-3">
                                            <div className="flex justify-between items-center"><span className="font-bold text-gray-700 text-sm">Variant Additional Details</span><button type="button" onClick={() => setActiveSpecsVariantIndex(null)} className="text-xs text-red-500">Close</button></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Variant Title</label>
                                                <input
                                                  type="text"
                                                  value={item.attributes?.title || item.title || item.name || ''}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    const updated = [...generatedVariants];
                                                    const attrs = { ...(updated[idx].attributes || {}) };
                                                    attrs.title = val;
                                                    updated[idx].attributes = attrs;
                                                    updated[idx].title = val;
                                                    updated[idx].name = val;
                                                    const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                                    updated[idx].seo_slug = slug;
                                                    updated[idx].attributes.seo_slug = slug;
                                                    setGeneratedVariants(updated);
                                                  }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">SEO URL (Slug)</label>
                                                <input
                                                  type="text"
                                                  value={item.seo_slug || item.attributes?.seo_slug || ''}
                                                  onChange={e => {
                                                    const updated = [...generatedVariants];
                                                    updated[idx].seo_slug = e.target.value;
                                                    if (!updated[idx].attributes) updated[idx].attributes = {};
                                                    updated[idx].attributes.seo_slug = e.target.value;
                                                    setGeneratedVariants(updated);
                                                  }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Return Policy</label>
                                                <select
                                                  value={item.return_policy || 'NO_RETURN'}
                                                  onChange={e => { const updated = [...generatedVariants]; updated[idx].return_policy = e.target.value; setGeneratedVariants(updated); }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                                                >
                                                  <option value="NO_RETURN">No Return</option>
                                                  <option value="REPLACEMENT_ONLY">Replacement Only</option>
                                                  <option value="REFUND_ONLY">Refund Only</option>
                                                  <option value="REPLACEMENT_AND_REFUND">Replacement & Refund</option>
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Return Window (Days)</label>
                                                <input
                                                  type="number"
                                                  value={item.return_window_days || 7}
                                                  onChange={e => { const updated = [...generatedVariants]; updated[idx].return_window_days = e.target.value; setGeneratedVariants(updated); }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Warranty</label>
                                                <select
                                                  value={item.warranty || 'No Warranty'}
                                                  onChange={e => { const updated = [...generatedVariants]; updated[idx].warranty = e.target.value; setGeneratedVariants(updated); }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-semibold text-gray-800"
                                                >
                                                  {['No Warranty', '6 Months Warranty', '1 Year Warranty', '2 Years Warranty', '3 Years Warranty'].map(option => <option key={option} value={option}>{option}</option>)}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">What's in the Box</label>
                                                <input
                                                  type="text"
                                                  value={item.whats_in_the_box || ''}
                                                  onChange={e => { const updated = [...generatedVariants]; updated[idx].whats_in_the_box = e.target.value; setGeneratedVariants(updated); }}
                                                  className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-semibold text-gray-800"
                                                />
                                              </div>
                                            </div>
                                            <textarea value={item.description || ''} onChange={e => { const updated = [...generatedVariants]; updated[idx].description = e.target.value; setGeneratedVariants(updated); }} placeholder="Variant About" className="w-full border border-gray-200 rounded-lg p-2.5 text-xs min-h-[70px] bg-white" />
                                            <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-600">Variant Highlights</span><button type="button" onClick={() => { const updated = [...generatedVariants]; updated[idx].highlights = [...(Array.isArray(updated[idx].highlights) ? updated[idx].highlights : []), '']; setGeneratedVariants(updated); }} className="text-xs font-bold text-blue-600">+ Add highlight</button></div>{(Array.isArray(item.highlights) ? item.highlights : []).map((highlight, highlightIndex) => <div key={highlightIndex} className="flex gap-2"><input value={highlight} onChange={e => { const updated = [...generatedVariants]; const list = [...(Array.isArray(updated[idx].highlights) ? updated[idx].highlights : [])]; list[highlightIndex] = e.target.value; updated[idx].highlights = list; setGeneratedVariants(updated); }} className="flex-1 border border-gray-200 rounded-lg p-2 text-xs bg-white" /><button type="button" onClick={() => { const updated = [...generatedVariants]; updated[idx].highlights = (Array.isArray(updated[idx].highlights) ? updated[idx].highlights : []).filter((_, i) => i !== highlightIndex); setGeneratedVariants(updated); }} className="text-red-500 p-1"><Trash2 size={14} /></button></div>)}</div>
                                            {Object.entries(itemSpecs).map(([key, value], specIdx) => (
                                              <div key={specIdx} className="flex gap-2 items-center">
                                                <input
                                                  value={key}
                                                  onChange={e => {
                                                    const newKey = e.target.value;
                                                    const updated = [...generatedVariants];
                                                    const oldSpecs = typeof updated[idx].specifications === 'string' ? JSON.parse(updated[idx].specifications) : { ...(updated[idx].specifications || {}) };
                                                    const newSpecs = {};
                                                    for (const k in oldSpecs) {
                                                      if (k === key) newSpecs[newKey] = oldSpecs[k];
                                                      else newSpecs[k] = oldSpecs[k];
                                                    }
                                                    updated[idx].specifications = newSpecs;
                                                    setGeneratedVariants(updated);
                                                  }}
                                                  className="w-1/3 border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-600 bg-white"
                                                />
                                                <input value={value || ''} onChange={e => { const updated = [...generatedVariants]; const specs = typeof updated[idx].specifications === 'string' ? JSON.parse(updated[idx].specifications) : { ...(updated[idx].specifications || {}) }; specs[key] = e.target.value; updated[idx].specifications = specs; setGeneratedVariants(updated); }} className="flex-1 border border-gray-200 rounded-lg p-2 text-xs bg-white" />
                                                <button type="button" onClick={() => { const updated = [...generatedVariants]; const specs = typeof updated[idx].specifications === 'string' ? JSON.parse(updated[idx].specifications) : { ...(updated[idx].specifications || {}) }; delete specs[key]; updated[idx].specifications = specs; setGeneratedVariants(updated); }} className="text-red-500 p-1"><Trash2 size={14} /></button>
                                              </div>
                                            ))}
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-100"><input value={variantSpecDrafts[idx]?.name || ''} onChange={e => setVariantSpecDrafts({ ...variantSpecDrafts, [idx]: { ...(variantSpecDrafts[idx] || {}), name: e.target.value } })} placeholder="Specification name" className="border border-gray-200 rounded-lg p-2 text-xs bg-white" /><input value={variantSpecDrafts[idx]?.value || ''} onChange={e => setVariantSpecDrafts({ ...variantSpecDrafts, [idx]: { ...(variantSpecDrafts[idx] || {}), value: e.target.value } })} placeholder="Value" className="border border-gray-200 rounded-lg p-2 text-xs bg-white" /><button type="button" onClick={() => { const draft = variantSpecDrafts[idx] || {}; if (!draft.name?.trim() || !draft.value?.trim()) return; const updated = [...generatedVariants]; const specs = typeof updated[idx].specifications === 'string' ? JSON.parse(updated[idx].specifications) : { ...(updated[idx].specifications || {}) }; specs[draft.name.trim()] = draft.value.trim(); updated[idx].specifications = specs; setGeneratedVariants(updated); setVariantSpecDrafts({ ...variantSpecDrafts, [idx]: { name: '', value: '' } }); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">Add Specification</button></div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {/* Inline Media Uploader row */}
                                    {isMediaActive && (
                                      <tr>
                                        <td colSpan={colSpanValue} className="bg-gray-50/50 p-4 border-b border-gray-200">
                                          <div className="space-y-2 w-full">
                                            <div className="flex justify-between items-center">
                                              <span className="font-bold text-gray-700">Variant Image Gallery (Drag & Drop Sortable)</span>
                                              <button
                                                type="button"
                                                onClick={() => setActiveImageUploadVariantIndex(null)}
                                                className="text-xs text-red-500 hover:underline"
                                              >
                                                Close uploader
                                              </button>
                                            </div>
                                            <ImageSortManager
                                              images={item.images || []}
                                              onChange={imgs => {
                                                const updated = [...generatedVariants];
                                                updated[idx].images = imgs;
                                                setGeneratedVariants(updated);
                                              }}
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-gray-150">
                          <button
                            type="button"
                            onClick={handleBatchVariantsSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-wider shadow disabled:opacity-50"
                          >
                            Save All Variants & Inventory
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Please choose a model from the dropdown to load variants.</p>
                )}
              </div>
            )}

          </div>

        </div>
      )}
      {/* YouTube Video Modal */}
      {showVideoModal && (() => {
        const selectedCat = categories.find(c => c.id == productForm.category_id);
        if (!selectedCat?.youtube_video_link) return null;

        // Helper to convert YouTube link to embed url
        const getYoutubeEmbedUrl = (url) => {
          if (!url) return '';
          let videoId = '';
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = url.match(regExp);
          if (match && match[2].length === 11) {
            videoId = match[2];
          } else {
            return url;
          }
          return `https://www.youtube.com/embed/${videoId}`;
        };

        const embedUrl = getYoutubeEmbedUrl(selectedCat.youtube_video_link);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
                  Category Guide Video: {selectedCat.name}
                </span>
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-extrabold text-lg p-1"
                >
                  &times;
                </button>
              </div>
              <div className="relative pt-[56.25%] w-full bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={embedUrl}
                  title="Category Guide Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="px-6 py-3 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default ProductUpload;
