import pool from '../config/db.js';
import StorageService from '../storage/StorageService.js';
import { optimizeToSingleBuffer } from '../services/imageService.js';

export const getVendorServices = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    let queryField = 'vp.slug = ? OR vp.public_id = ?';
    let queryVal = [vendorId, vendorId];
    if (/^\d+$/.test(vendorId)) {
      queryField = 'vp.user_id = ?';
      queryVal = [parseInt(vendorId)];
    }
    const [services] = await pool.query(`
      SELECT vs.* 
      FROM vendor_services vs 
      JOIN vendor_profiles vp ON vs.vendor_id = vp.user_id 
      WHERE ${queryField} 
      ORDER BY vs.id ASC
    `, queryVal);

    const formatted = services.map(s => ({
      ...s,
      id: s.id,
      vendor_id: vendorId
    }));
    res.status(200).json({ success: true, services: formatted });
  } catch (error) {
    next(error);
  }
};

export const saveVendorServices = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const services = JSON.parse(req.body.services || '[]');

    // Resolve any slug/string IDs to real integer IDs
    for (const service of services) {
      if (service.id && !/^\d+$/.test(String(service.id))) {
        // It's a slug — look up the real integer id
        const [rows] = await connection.query(
          'SELECT id FROM vendor_services WHERE (slug = ? OR public_id = ?) AND vendor_id = ?',
          [service.id, service.id, userId]
        );
        service.id = rows.length > 0 ? rows[0].id : null;
      } else if (service.id) {
        service.id = parseInt(service.id, 10);
      }
    }

    const existingIds = services.map(s => s.id).filter(id => id && Number.isInteger(id));

    // Delete services that are no longer in the list
    if (existingIds.length > 0) {
      await connection.query('DELETE FROM vendor_services WHERE vendor_id = ? AND id NOT IN (?)', [userId, existingIds]);
    } else {
      await connection.query('DELETE FROM vendor_services WHERE vendor_id = ?', [userId]);
    }

    // Process each service
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      let imagePath = service.image_path || '';
      let mobileImage = service.mobile_image || '';

      // Check if there is an uploaded file for this service index (desktop image)
      const file = req.files && req.files.find(f => f.fieldname === `service_image_${i}`);
      if (file && file.buffer) {
        const optimized = await optimizeToSingleBuffer(file.buffer, {
          maxWidth: 1200,
          maxHeight: 800,
          fit: 'inside',
          originalName: (file.originalname || 'service').split('.')[0],
        });
        const uploaded = await StorageService.upload(optimized.buffer, {
          module: 'services',
          fileName: optimized.fileName,
          mimeType: optimized.mimeType,
        });
        imagePath = uploaded.publicUrl;
      }

      // Check if there is an uploaded file for mobile image
      const mobileFile = req.files && req.files.find(f => f.fieldname === `service_mobile_image_${i}`);
      if (mobileFile && mobileFile.buffer) {
        const optimized = await optimizeToSingleBuffer(mobileFile.buffer, {
          maxWidth: 600,
          maxHeight: 600,
          fit: 'inside',
          originalName: (mobileFile.originalname || 'service_mobile').split('.')[0],
        });
        const uploaded = await StorageService.upload(optimized.buffer, {
          module: 'services',
          fileName: optimized.fileName,
          mimeType: optimized.mimeType,
        });
        mobileImage = uploaded.publicUrl;
      }

      let cleanName = (service.name || 'service').toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      let slugParts = cleanName.split('-');
      let slug = slugParts.slice(0, 2).join('-');

      if (service.id && Number.isInteger(service.id)) {
        // Uniqueness check excluding current service
        const [existing] = await connection.query('SELECT id FROM vendor_services WHERE slug = ? AND id != ?', [slug, service.id]);
        if (existing.length > 0) {
          slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        await connection.query(
          `UPDATE vendor_services SET name = ?, experience = ?, amount = ?, description = ?, image_path = ?, mobile_image = ?, slug = ? WHERE id = ? AND vendor_id = ?`,
          [service.name, service.experience, service.amount, service.description || null, imagePath, mobileImage || null, slug, service.id, userId]
        );
      } else {
        // Uniqueness check for new service
        const [existing] = await connection.query('SELECT id FROM vendor_services WHERE slug = ?', [slug]);
        if (existing.length > 0) {
          slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const [insertRes] = await connection.query(
          `INSERT INTO vendor_services (vendor_id, name, experience, amount, description, image_path, mobile_image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, service.name, service.experience, service.amount, service.description || null, imagePath, mobileImage || null]
        );
        const newId = insertRes.insertId;
        const public_id = `srv_${newId}`;
        await connection.query('UPDATE vendor_services SET slug = ?, public_id = ? WHERE id = ?', [slug, public_id, newId]);
      }
    }

    await connection.commit();
    res.status(200).json({ success: true, message: 'Services saved successfully!' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const createServiceEnquiry = async (req, res, next) => {
  try {
    const { vendorId, customerName, customerPhone, enquiryText, type, status, addressId, customerId, imagePath } = req.body;
    let { serviceId } = req.body;

    if (!vendorId || !customerName || !customerPhone || !enquiryText) {
      return res.status(400).json({ success: false, message: 'Vendor, Customer Name, Phone, and Enquiry Text are required' });
    }
    if (!/^[0-9]{10}$/.test(customerPhone)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    let realVendorId = vendorId;
    if (!/^\d+$/.test(vendorId)) {
      const [vRows] = await pool.query("SELECT user_id FROM vendor_profiles WHERE slug = ? OR public_id = ?", [vendorId, vendorId]);
      if (vRows.length > 0) {
        realVendorId = vRows[0].user_id;
      }
    }

    let realServiceId = serviceId;
    if (serviceId && !/^\d+$/.test(serviceId)) {
      const [sRows] = await pool.query("SELECT id FROM vendor_services WHERE slug = ? OR public_id = ?", [serviceId, serviceId]);
      if (sRows.length > 0) {
        realServiceId = sRows[0].id;
      }
    }

    // If serviceId is not provided (e.g. general enquiry or product enquiry), find a fallback service
    if (!realServiceId) {
      const [services] = await pool.query('SELECT id FROM vendor_services WHERE vendor_id = ? LIMIT 1', [realVendorId]);
      if (services.length > 0) {
        realServiceId = services[0].id;
      } else {
        return res.status(400).json({ success: false, message: 'Vendor must have at least one service to receive enquiries' });
      }
    }

    await pool.query(
      `INSERT INTO service_enquiries (service_id, vendor_id, customer_name, customer_phone, enquiry_text, type, status, address_id, customer_id, image_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [realServiceId, realVendorId, customerName, customerPhone, enquiryText, type || 'ENQUIRY', status || 'ENQUIRY_SUBMITTED', addressId || null, customerId || null, imagePath || null]
    );
    res.status(201).json({ success: true, message: 'Enquiry submitted successfully!' });
  } catch (error) {
    next(error);
  }
};

export const getVendorEnquiries = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Mark all unread enquiries for this vendor as read
    await pool.query(
      'UPDATE service_enquiries SET is_read = TRUE WHERE vendor_id = ? AND is_read = FALSE',
      [userId]
    );

    const [enquiries] = await pool.query(
      `SELECT se.*, vs.name as service_name, vs.amount, vs.experience, COALESCE(se.image_path, vs.image_path) as image_path,
              a.name as addr_name, a.phone as addr_phone, a.street as addr_street, a.city as addr_city, a.state as addr_state, a.zip as addr_zip
       FROM service_enquiries se 
       JOIN vendor_services vs ON se.service_id = vs.id 
       LEFT JOIN addresses a ON se.address_id = a.id
       WHERE se.vendor_id = ? 
       ORDER BY se.created_at DESC`,
      [userId]
    );
    res.status(200).json({ success: true, enquiries });
  } catch (error) {
    next(error);
  }
};

export const getUnreadEnquiriesCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM service_enquiries WHERE vendor_id = ? AND is_read = FALSE',
      [userId]
    );
    res.status(200).json({ success: true, count: result[0].count });
  } catch (error) {
    next(error);
  }
};

export const getCustomerEnquiries = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [enquiries] = await pool.query(
      `SELECT se.*, vs.name as service_name, vs.amount, vs.experience, COALESCE(se.image_path, vs.image_path) as image_path, vp.business_name, vp.id as business_id,
              IF(sr.id IS NOT NULL, 1, 0) as has_reviewed,
              sr.rating as review_rating,
              sr.title as review_title,
              sr.body as review_body
       FROM service_enquiries se 
       JOIN vendor_services vs ON se.service_id = vs.id 
       JOIN vendor_profiles vp ON vs.vendor_id = vp.user_id
       LEFT JOIN service_reviews sr ON sr.enquiry_id = se.id
       WHERE se.customer_id = ? 
       ORDER BY se.created_at DESC`,
      [userId]
    );
    res.status(200).json({ success: true, enquiries });
  } catch (error) {
    next(error);
  }
};

export const acceptEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    await pool.query(
      `UPDATE service_enquiries SET status = 'ACCEPTED' WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    res.status(200).json({ success: true, message: 'Service request accepted.' });
  } catch (error) {
    next(error);
  }
};

export const rejectEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const { reason } = req.body;
    await pool.query(
      `UPDATE service_enquiries SET status = 'REJECTED', reject_reason = ? WHERE id = ? AND vendor_id = ?`,
      [reason || 'No reason provided', id, vendorId]
    );
    res.status(200).json({ success: true, message: 'Service request rejected.' });
  } catch (error) {
    next(error);
  }
};

export const completeService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    await pool.query(
      `UPDATE service_enquiries SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    res.status(200).json({ success: true, message: 'Service completed successfully!' });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let queryField = 'vs.slug = ? OR vs.public_id = ? OR vs.name = ?';
    let queryVal = [id, id, id];
    if (/^\d+$/.test(id)) {
      queryField = 'vs.id = ?';
      queryVal = [parseInt(id)];
    }
    const [services] = await pool.query(
      `SELECT vs.*, vp.business_name, vp.slug as vendor_slug, vp.business_address, vp.business_email, vp.phone_number as vendor_profile_phone, vp.whatsapp_number as vendor_profile_whatsapp, vp.website, vp.working_hours, u.name as vendor_name, u.email as vendor_email, u.phone as vendor_phone,
        COALESCE(
          (SELECT AVG(sr.rating) FROM service_reviews sr JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE sr.service_id = vs.id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%')
        , 0) as rating,
        (SELECT COUNT(sr.id) FROM service_reviews sr JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE sr.service_id = vs.id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%') as review_count
       FROM vendor_services vs 
       JOIN vendor_profiles vp ON vs.vendor_id = vp.user_id 
       JOIN users u ON vs.vendor_id = u.id 
       WHERE ${queryField}`,
      queryVal
    );
    let service = services[0];
    if (services.length === 0) {
      const slugify = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const targetSlug = slugify(id);
      
      const [allServices] = await pool.query(
        `SELECT vs.*, vp.business_name, vp.slug as vendor_slug, vp.business_address, vp.business_email, vp.phone_number as vendor_profile_phone, vp.whatsapp_number as vendor_profile_whatsapp, vp.website, vp.working_hours, u.name as vendor_name, u.email as vendor_email, u.phone as vendor_phone,
          COALESCE(
            (SELECT AVG(sr.rating) FROM service_reviews sr JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE sr.service_id = vs.id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%')
          , 0) as rating,
          (SELECT COUNT(sr.id) FROM service_reviews sr JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE sr.service_id = vs.id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%') as review_count
         FROM vendor_services vs 
         JOIN vendor_profiles vp ON vs.vendor_id = vp.user_id 
         JOIN users u ON vs.vendor_id = u.id`
      );
      
      const matched = allServices.find(s => slugify(s.name) === targetSlug || slugify(s.slug) === targetSlug);
      if (!matched) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      service = matched;
    }
    const formatted = {
      ...service,
      id: service.slug || service.id,
      vendor_id: service.vendor_id
    };
    res.status(200).json({ success: true, service: formatted });
  } catch (error) {
    next(error);
  }
};
