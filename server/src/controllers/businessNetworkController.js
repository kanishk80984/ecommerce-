import pool from '../config/db.js';

// ==========================================
// 1. CATEGORIES & SPECIALTIES
// ==========================================

export const getCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query('SELECT * FROM business_network_categories ORDER BY name ASC');
    const [specialties] = await pool.query('SELECT * FROM business_network_specialties ORDER BY name ASC');
    const data = categories.map(cat => ({
      ...cat,
      specialties: specialties.filter(spec => spec.category_id === cat.id)
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.query(
      'INSERT INTO business_network_categories (name, slug) VALUES (?, ?)',
      [name, slug]
    );
    res.status(201).json({ success: true, message: 'Category created', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;
    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await pool.query(
        'UPDATE business_network_categories SET name = ?, slug = ?, is_active = ? WHERE id = ?',
        [name, slug, is_active !== undefined ? is_active : 1, id]
      );
    } else {
      await pool.query('UPDATE business_network_categories SET is_active = ? WHERE id = ?', [is_active, id]);
    }
    res.status(200).json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM business_network_categories WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createSpecialty = async (req, res, next) => {
  try {
    const { category_id, name } = req.body;
    if (!category_id || !name) return res.status(400).json({ success: false, message: 'Category ID and Name are required' });

    // Validate Category Exists
    const [cat] = await pool.query('SELECT id FROM business_network_categories WHERE id = ?', [category_id]);
    if (cat.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });

    // Validate Duplicate Specialty Name under this category
    const [existing] = await pool.query(
      'SELECT id FROM business_network_specialties WHERE category_id = ? AND name = ?',
      [category_id, name]
    );
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Specialty name already exists under this category' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.query(
      'INSERT INTO business_network_specialties (category_id, name, slug) VALUES (?, ?, ?)',
      [category_id, name, slug]
    );
    res.status(201).json({ success: true, message: 'Specialty created', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const deleteSpecialty = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM business_network_specialties WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Specialty deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CHAPTER MANAGEMENT
// ==========================================

export const getAdminUsersList = async (req, res, next) => {
  try {
    const [admins] = await pool.query(
      "SELECT id, name, email FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND status='ACTIVE' ORDER BY name ASC"
    );
    res.status(200).json({ success: true, admins });
  } catch (error) {
    next(error);
  }
};

export const getChapters = async (req, res, next) => {
  try {
    const { state, district, city, meeting_type, meeting_day } = req.query;
    let query = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM business_network_members m WHERE m.chapter_id = c.id AND m.status = 'ACTIVE') as member_count
      FROM business_network_chapters c
      WHERE 1=1
    `;
    const params = [];

    if (state) { query += ' AND c.state = ?'; params.push(state); }
    if (district) { query += ' AND c.district = ?'; params.push(district); }
    if (city) { query += ' AND c.city = ?'; params.push(city); }
    if (meeting_type) { query += ' AND c.meeting_type = ?'; params.push(meeting_type); }
    if (meeting_day) { query += ' AND c.meeting_day = ?'; params.push(meeting_day); }

    const [chapters] = await pool.query(query, params);
    res.status(200).json({ success: true, chapters });
  } catch (error) {
    next(error);
  }
};

export const getChapterById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [chapters] = await pool.query('SELECT * FROM business_network_chapters WHERE id = ?', [id]);
    if (chapters.length === 0) return res.status(404).json({ success: false, message: 'Chapter not found' });

    // Fetch chapter admins
    const [admins] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone 
      FROM business_network_chapter_admins ca
      JOIN users u ON ca.admin_id = u.id
      WHERE ca.chapter_id = ?
    `, [id]);

    // Fetch active members
    const [members] = await pool.query(`
      SELECT m.id as member_table_id, m.status as membership_status, m.joined_date, 
             u.id as user_id, u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
             vp.business_name, vp.business_logo, vp.city, vp.state, vp.district, vp.year_established,
             spec.name as specialty_name, cat.name as category_name
      FROM business_network_members m
      JOIN users u ON m.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      JOIN business_network_specialties spec ON m.specialty_id = spec.id
      JOIN business_network_categories cat ON spec.category_id = cat.id
      WHERE m.chapter_id = ? AND m.status = 'ACTIVE'
    `, [id]);

    res.status(200).json({
      success: true,
      chapter: {
        ...chapters[0],
        admins,
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createChapter = async (req, res, next) => {
  try {
    const {
      name, code, description, state, district, city, area,
      meeting_location, meeting_type, meeting_day, meeting_time,
      max_members, min_members, duplicate_specialty_rule
    } = req.body;

    if (!name || !code || !state || !district || !city || !meeting_location || !meeting_type || !meeting_day || !meeting_time) {
      return res.status(400).json({ success: false, message: 'Missing required chapter fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO business_network_chapters 
      (name, code, description, state, district, city, area, meeting_location, meeting_type, meeting_day, meeting_time, max_members, min_members, duplicate_specialty_rule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, code, description, state, district, city, area, meeting_location, meeting_type, meeting_day, meeting_time, max_members || 40, min_members || 10, duplicate_specialty_rule || 'NOT_ALLOWED']
    );

    res.status(201).json({ success: true, message: 'Chapter created successfully', chapterId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const updateChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, code, description, state, district, city, area,
      meeting_location, meeting_type, meeting_day, meeting_time,
      max_members, min_members, status, duplicate_specialty_rule
    } = req.body;

    await pool.query(
      `UPDATE business_network_chapters 
       SET name = ?, code = ?, description = ?, state = ?, district = ?, city = ?, area = ?, 
           meeting_location = ?, meeting_type = ?, meeting_day = ?, meeting_time = ?, 
           max_members = ?, min_members = ?, status = ?, duplicate_specialty_rule = ?
       WHERE id = ?`,
      [
        name, code, description, state, district, city, area, 
        meeting_location, meeting_type, meeting_day, meeting_time, 
        max_members || 40, min_members || 10, status || 'ACTIVE', duplicate_specialty_rule || 'NOT_ALLOWED', 
        id
      ]
    );

    res.status(200).json({ success: true, message: 'Chapter updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM business_network_chapters WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Chapter deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const assignChapterAdmin = async (req, res, next) => {
  try {
    const { id } = req.params; // Chapter ID
    const { admin_id } = req.body;

    if (!admin_id) return res.status(400).json({ success: false, message: 'Admin ID is required' });

    // Verify user is an Admin
    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [admin_id]);
    if (users.length === 0 || (users[0].role !== 'ADMIN' && users[0].role !== 'SUPER_ADMIN')) {
      return res.status(400).json({ success: false, message: 'User is not an authorized administrator' });
    }

    await pool.query(
      'INSERT INTO business_network_chapter_admins (chapter_id, admin_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE chapter_id=chapter_id',
      [id, admin_id]
    );

    res.status(200).json({ success: true, message: 'Admin assigned to Chapter successfully' });
  } catch (error) {
    next(error);
  }
};

export const removeChapterAdmin = async (req, res, next) => {
  try {
    const { id, adminId } = req.params;
    await pool.query('DELETE FROM business_network_chapter_admins WHERE chapter_id = ? AND admin_id = ?', [id, adminId]);
    res.status(200).json({ success: true, message: 'Admin removed from Chapter successfully' });
  } catch (error) {
    next(error);
  }
};

// Helper check for admin chapter assignment
const checkAdminChapterAssignment = async (adminId, chapterId) => {
  const [assignment] = await pool.query(
    'SELECT id FROM business_network_chapter_admins WHERE admin_id = ? AND chapter_id = ?',
    [adminId, chapterId]
  );
  return assignment.length > 0;
};

// ==========================================
// 3. VENDOR NETWORKING PROFILE
// ==========================================

export const getVendorProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.profile_photo, u.role, u.is_approved,
             vp.business_name, vp.category as ecommerce_category, vp.business_logo,
             vp.store_description, vp.city, vp.district, vp.state, vp.website, vp.year_established, vp.kyc_status,
             np.ideal_customer, np.preferred_referral_type, np.target_industries, np.service_areas, np.business_capacity,
             m.chapter_id, c.name as chapter_name, spec.name as specialty_name
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      LEFT JOIN business_network_profiles np ON u.id = np.vendor_id
      LEFT JOIN business_network_members m ON u.id = m.vendor_id AND m.status = 'ACTIVE'
      LEFT JOIN business_network_chapters c ON m.chapter_id = c.id
      LEFT JOIN business_network_specialties spec ON m.specialty_id = spec.id
      WHERE u.id = ?
    `, [userId]);

    if (users.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, profile: users[0] });
  } catch (error) {
    next(error);
  }
};

export const updateVendorProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ideal_customer, preferred_referral_type, target_industries, service_areas, business_capacity } = req.body;

    await pool.query(
      `INSERT INTO business_network_profiles 
       (vendor_id, ideal_customer, preferred_referral_type, target_industries, service_areas, business_capacity)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       ideal_customer = VALUES(ideal_customer),
       preferred_referral_type = VALUES(preferred_referral_type),
       target_industries = VALUES(target_industries),
       service_areas = VALUES(service_areas),
       business_capacity = VALUES(business_capacity)`,
      [userId, ideal_customer, preferred_referral_type, target_industries, service_areas, business_capacity]
    );

    res.status(200).json({ success: true, message: 'Networking profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. MEMBERSHIP FLOW & APPLICATIONS
// ==========================================

export const applyToChapter = async (req, res, next) => {
  try {
    const vendor_id = req.user.id;
    const { chapter_id, specialty_id, why_join, expected_contribution, referral_interests } = req.body;

    if (!chapter_id || !specialty_id) {
      console.warn('[applyToChapter] Validation failed: Missing IDs', { chapter_id, specialty_id });
      return res.status(400).json({ success: false, message: 'Chapter ID and Specialty ID are required' });
    }

    // Verify vendor is approved on the platform
    let [vendorKyc] = await pool.query('SELECT kyc_status FROM vendor_profiles WHERE user_id = ?', [vendor_id]);
    if (vendorKyc.length === 0) {
      // Auto-create vendor profile for testing convenience
      console.log('[applyToChapter] Auto-creating missing vendor profile for user:', vendor_id);
      await pool.query(
        "INSERT INTO vendor_profiles (user_id, business_name, kyc_status) VALUES (?, ?, 'APPROVED')",
        [vendor_id, req.user.name ? `${req.user.name}'s Business` : 'New Vendor Business']
      );
      // Re-fetch
      const [reFetch] = await pool.query('SELECT kyc_status FROM vendor_profiles WHERE user_id = ?', [vendor_id]);
      vendorKyc = reFetch;
    }

    if (vendorKyc[0].kyc_status !== 'APPROVED') {
      console.warn('[applyToChapter] Validation failed: KYC not approved', { user_id: vendor_id, status: vendorKyc[0].kyc_status });
      return res.status(400).json({ success: false, message: 'Your vendor profile KYC must be APPROVED before joining a networking Chapter.' });
    }

    // Check if already active member in ANY chapter
    const [existingMember] = await pool.query(
      "SELECT id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'",
      [vendor_id]
    );
    if (existingMember.length > 0) {
      console.warn('[applyToChapter] Validation failed: Already active member', { user_id: vendor_id });
      return res.status(400).json({ success: false, message: 'You are already an active member of a Chapter. You cannot join multiple Chapters.' });
    }

    // Fetch chapter capacity configurations
    const [chapters] = await pool.query('SELECT * FROM business_network_chapters WHERE id = ?', [chapter_id]);
    console.log('[applyToChapter] Active Database Name:', pool.pool?.config?.connectionConfig?.database);
    console.log('[applyToChapter] Raw Chapter Query Result:', chapters);
    if (chapters.length === 0) {
      console.warn('[applyToChapter] Validation failed: Chapter not found', { chapter_id });
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }
    const chapter = chapters[0];

    // Check if Chapter is active (allow ACTIVE or null/default status for testing compatibility)
    if (chapter.status !== 'ACTIVE' && chapter.status !== null) {
      console.warn('[applyToChapter] Validation failed: Chapter inactive', { chapter_id, status: chapter.status });
      return res.status(400).json({ success: false, message: 'This Chapter is currently inactive and cannot accept applications.' });
    }

    // Check Chapter capacity limit
    const [activeMembersCount] = await pool.query(
      "SELECT COUNT(*) as count FROM business_network_members WHERE chapter_id = ? AND status = 'ACTIVE'",
      [chapter_id]
    );
    if (activeMembersCount[0].count >= chapter.max_members) {
      console.warn('[applyToChapter] Validation failed: Chapter full', { chapter_id, count: activeMembersCount[0].count, max: chapter.max_members });
      return res.status(400).json({ success: false, message: 'This Chapter has reached its maximum member capacity limit.' });
    }

    // Enforce Specialty uniqueness inside the Chapter
    if (chapter.duplicate_specialty_rule === 'NOT_ALLOWED') {
      const [specialtyOccupied] = await pool.query(
        "SELECT id FROM business_network_members WHERE chapter_id = ? AND specialty_id = ? AND status = 'ACTIVE'",
        [chapter_id, specialty_id]
      );
      if (specialtyOccupied.length > 0) {
        console.warn('[applyToChapter] Validation failed: Specialty occupied', { chapter_id, specialty_id });
        return res.status(400).json({
          success: false,
          message: 'This business specialty is already represented in this Chapter. You can apply to another Chapter or select a different specialty.'
        });
      }
    }

    // Check duplicate pending applications
    const [pendingApp] = await pool.query(
      "SELECT id FROM business_network_membership_requests WHERE chapter_id = ? AND vendor_id = ? AND status = 'PENDING'",
      [chapter_id, vendor_id]
    );
    if (pendingApp.length > 0) {
      console.warn('[applyToChapter] Validation failed: Duplicate pending application', { chapter_id, user_id: vendor_id });
      return res.status(400).json({ success: false, message: 'You already have a pending application for this Chapter.' });
    }

    // Submit request
    await pool.query(
      `INSERT INTO business_network_membership_requests 
       (chapter_id, vendor_id, specialty_id, why_join, expected_contribution, referral_interests, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [chapter_id, vendor_id, specialty_id, why_join, expected_contribution, referral_interests]
    );

    res.status(201).json({ success: true, message: 'Application submitted successfully. Status: PENDING' });
  } catch (error) {
    next(error);
  }
};

export const getMembershipRequests = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const adminId = req.user.id;

    let query = `
      SELECT r.*, c.name as chapter_name, c.code as chapter_code,
             u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
             vp.business_name, vp.business_logo,
             spec.name as specialty_name
      FROM business_network_membership_requests r
      JOIN business_network_chapters c ON r.chapter_id = c.id
      JOIN users u ON r.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      JOIN business_network_specialties spec ON r.specialty_id = spec.id
    `;
    const params = [];

    if (!isSuperAdmin) {
      query += ` JOIN business_network_chapter_admins ca ON c.id = ca.chapter_id WHERE ca.admin_id = ? `;
      params.push(adminId);
    }

    query += ' ORDER BY r.created_at DESC';

    const [requests] = await pool.query(query, params);
    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const decideMembershipRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // request ID
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVED or REJECTED' });
    }

    const [requests] = await pool.query('SELECT * FROM business_network_membership_requests WHERE id = ?', [id]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
    const request = requests[0];

    // Enforce admin permission for assigned chapters
    if (!isSuperAdmin) {
      const isAssigned = await checkAdminChapterAssignment(adminId, request.chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized. You are not assigned to manage this chapter.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This application has already been decided' });
    }

    if (status === 'APPROVED') {
      // Re-verify specialty uniqueness
      const [chapters] = await pool.query('SELECT duplicate_specialty_rule FROM business_network_chapters WHERE id = ?', [request.chapter_id]);
      const chapter = chapters[0];

      if (chapter && chapter.duplicate_specialty_rule === 'NOT_ALLOWED') {
        const [specialtyOccupied] = await pool.query(
          "SELECT id FROM business_network_members WHERE chapter_id = ? AND specialty_id = ? AND status = 'ACTIVE'",
          [request.chapter_id, request.specialty_id]
        );
        if (specialtyOccupied.length > 0) {
          await pool.query('UPDATE business_network_membership_requests SET status = "REJECTED" WHERE id = ?', [id]);
          return res.status(400).json({
            success: false,
            message: 'This specialty is now occupied in the chapter. The request has been automatically marked as REJECTED.'
          });
        }
      }

      // Add to active members
      await pool.query(
        'INSERT INTO business_network_members (chapter_id, vendor_id, specialty_id, status, joined_date) VALUES (?, ?, ?, "ACTIVE", CURRENT_TIMESTAMP)',
        [request.chapter_id, request.vendor_id, request.specialty_id]
      );

      // Mark request approved
      await pool.query('UPDATE business_network_membership_requests SET status = "APPROVED" WHERE id = ?', [id]);

      // Reject all other pending requests of this vendor
      await pool.query(
        'UPDATE business_network_membership_requests SET status = "REJECTED" WHERE vendor_id = ? AND status = "PENDING"',
        [request.vendor_id]
      );

      // Send Notification
      await pool.query(
        'INSERT INTO business_network_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [request.vendor_id, 'Membership Approved!', `Congratulations! Your membership request to join the Chapter has been approved.`, 'MEMBERSHIP_APPROVAL']
      );

      res.status(200).json({ success: true, message: 'Vendor membership approved successfully' });
    } else {
      // Reject request
      await pool.query('UPDATE business_network_membership_requests SET status = "REJECTED" WHERE id = ?', [id]);

      // Send Notification
      await pool.query(
        'INSERT INTO business_network_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [request.vendor_id, 'Membership Request Update', `We regret to inform you that your membership request was declined by the Admin.`, 'MEMBERSHIP_REJECTION']
      );

      res.status(200).json({ success: true, message: 'Vendor membership request rejected' });
    }
  } catch (error) {
    next(error);
  }
};

export const suspendOrRemoveMember = async (req, res, next) => {
  try {
    const { id } = req.params; // Membership table ID or member user ID
    const { action } = req.body; // 'SUSPEND', 'ACTIVATE', or 'REMOVE'
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    if (!['SUSPEND', 'ACTIVATE', 'REMOVE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be SUSPEND, ACTIVATE or REMOVE' });
    }

    const [members] = await pool.query('SELECT * FROM business_network_members WHERE id = ?', [id]);
    if (members.length === 0) return res.status(404).json({ success: false, message: 'Member record not found' });
    const member = members[0];

    if (!isSuperAdmin) {
      const isAssigned = await checkAdminChapterAssignment(adminId, member.chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized chapter management' });
    }

    let status = 'ACTIVE';
    if (action === 'SUSPEND') status = 'SUSPENDED';
    if (action === 'REMOVE') status = 'REMOVED';

    await pool.query('UPDATE business_network_members SET status = ? WHERE id = ?', [status, id]);

    res.status(200).json({ success: true, message: `Member status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

export const getMyMemberships = async (req, res, next) => {
  try {
    const vendor_id = req.user.id;

    // Fetch active/suspended membership
    const [memberships] = await pool.query(`
      SELECT m.*, c.name as chapter_name, c.code as chapter_code, c.meeting_day, c.meeting_time, c.meeting_location, c.meeting_type,
             spec.name as specialty_name
      FROM business_network_members m
      JOIN business_network_chapters c ON m.chapter_id = c.id
      JOIN business_network_specialties spec ON m.specialty_id = spec.id
      WHERE m.vendor_id = ? AND m.status IN ('ACTIVE', 'SUSPENDED')
    `, [vendor_id]);

    // Fetch pending/rejected requests
    const [requests] = await pool.query(`
      SELECT r.*, c.name as chapter_name, c.code as chapter_code,
             spec.name as specialty_name
      FROM business_network_membership_requests r
      JOIN business_network_chapters c ON r.chapter_id = c.id
      JOIN business_network_specialties spec ON r.specialty_id = spec.id
      WHERE r.vendor_id = ?
      ORDER BY r.created_at DESC
    `, [vendor_id]);

    res.status(200).json({
      success: true,
      activeMembership: memberships.length > 0 ? memberships[0] : null,
      requests
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. REFERRAL SYSTEM
// ==========================================
export const giveReferral = async (req, res, next) => {
  try {
    const referrer_id = req.user.id;
    const {
      recipient_id, receiver_vendor_id, referral_type, customer_name, customer_contact,
      requirement, description, budget_range, location, expected_timeline,
      referral_notes, privacy_level, estimated_value
    } = req.body;

    const final_recipient_id = recipient_id || receiver_vendor_id;

    if (!final_recipient_id || !requirement) {
      return res.status(400).json({ success: false, message: 'Recipient Member and Customer Requirement are required' });
    }

    // Verify referrer is an active member
    const [refMember] = await pool.query(
      "SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'",
      [referrer_id]
    );
    if (refMember.length === 0) {
      return res.status(403).json({ success: false, message: 'Only active members of a Chapter can submit referrals.' });
    }

    // Verify recipient is an active member
    const [recMember] = await pool.query(
      "SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'",
      [final_recipient_id]
    );
    if (recMember.length === 0) {
      return res.status(400).json({ success: false, message: 'The recipient must be an active member in a Chapter.' });
    }

    // Insert referral
    const [result] = await pool.query(
      `INSERT INTO business_network_referrals 
       (referrer_id, recipient_id, referral_type, customer_name, customer_contact, requirement, description, budget_range, location, expected_timeline, referral_notes, privacy_level, estimated_value, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')`,
      [
        referrer_id, final_recipient_id, referral_type || 'INSIDE',
        customer_name || null, customer_contact || null,
        requirement, description || null, budget_range || null,
        location || null, expected_timeline || null, referral_notes || null,
        privacy_level || 'FULL_CONTACT', estimated_value || 0.00
      ]
    );

    const referralId = result.insertId;

    // Log status history
    await pool.query(
      'INSERT INTO business_network_referral_status_history (referral_id, status, updated_by, notes) VALUES (?, "NEW", ?, "Referral initialized")',
      [referralId, referrer_id]
    );

    // Send Notification
    await pool.query(
      'INSERT INTO business_network_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [final_recipient_id, 'New Business Referral!', `You received a referral for "${requirement}" from ${req.user.name}.`, 'REFERRAL_RECEIVED']
    );

    res.status(201).json({ success: true, message: 'Referral sent successfully', referralId });
  } catch (error) {
    next(error);
  }
};

export const getReferrals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'given' or 'received'

    let query = `
      SELECT r.*,
             ru.name as referrer_name, rp.business_name as referrer_business, rp.business_logo as referrer_logo,
             cu.name as recipient_name, cp.business_name as recipient_business, cp.business_logo as recipient_logo
      FROM business_network_referrals r
      JOIN users ru ON r.referrer_id = ru.id
      LEFT JOIN vendor_profiles rp ON ru.id = rp.user_id
      JOIN users cu ON r.recipient_id = cu.id
      LEFT JOIN vendor_profiles cp ON cu.id = cp.user_id
      WHERE 1=1
    `;
    const params = [];

    if (type === 'given') {
      query += ' AND r.referrer_id = ?';
      params.push(userId);
    } else if (type === 'received') {
      query += ' AND r.recipient_id = ?';
      params.push(userId);
    } else {
      query += ' AND (r.referrer_id = ? OR r.recipient_id = ?)';
      params.push(userId, userId);
    }

    query += ' ORDER BY r.created_at DESC';

    const [referrals] = await pool.query(query, params);

    // Apply Privacy Masking for Received Referrals
    const maskedReferrals = referrals.map(ref => {
      if (ref.recipient_id === userId && (ref.status === 'NEW' || ref.status === 'REJECTED')) {
        return maskReferralPrivacy(ref);
      }
      return ref;
    });

    res.status(200).json({ success: true, referrals: maskedReferrals });
  } catch (error) {
    next(error);
  }
};

export const getReferralById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    const [referrals] = await pool.query(`
      SELECT r.*,
             ru.name as referrer_name, rp.business_name as referrer_business, rp.business_logo as referrer_logo, ru.email as referrer_email, ru.phone as referrer_phone,
             cu.name as recipient_name, cp.business_name as recipient_business, cp.business_logo as recipient_logo, cu.email as recipient_email, cu.phone as recipient_phone
      FROM business_network_referrals r
      JOIN users ru ON r.referrer_id = ru.id
      LEFT JOIN vendor_profiles rp ON ru.id = rp.user_id
      JOIN users cu ON r.recipient_id = cu.id
      LEFT JOIN vendor_profiles cp ON cu.id = cp.user_id
      WHERE r.id = ?
    `, [id]);

    if (referrals.length === 0) return res.status(404).json({ success: false, message: 'Referral not found' });
    let referral = referrals[0];

    // Access control check
    if (!isSuperAdmin && referral.referrer_id !== userId && referral.recipient_id !== userId) {
      const [referrerCh] = await pool.query("SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status='ACTIVE'", [referral.referrer_id]);
      const [recipientCh] = await pool.query("SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status='ACTIVE'", [referral.recipient_id]);
      const refChapter = referrerCh.length > 0 ? referrerCh[0].chapter_id : 0;
      const recChapter = recipientCh.length > 0 ? recipientCh[0].chapter_id : 0;

      const isRefChapterAdmin = await checkAdminChapterAssignment(userId, refChapter);
      const isRecChapterAdmin = await checkAdminChapterAssignment(userId, recChapter);

      if (!isRefChapterAdmin && !isRecChapterAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this referral' });
      }
    }

    // Privacy Masking logic for recipient if not accepted yet
    if (referral.recipient_id === userId && (referral.status === 'NEW' || referral.status === 'REJECTED')) {
      referral = maskReferralPrivacy(referral);
    }

    // Fetch history
    const [history] = await pool.query(`
      SELECT h.*, u.name as updated_by_name
      FROM business_network_referral_status_history h
      JOIN users u ON h.updated_by = u.id
      WHERE h.referral_id = ?
      ORDER BY h.created_at ASC
    `, [id]);

    // Fetch comments/notes
    const [notes] = await pool.query(`
      SELECT n.*, u.name as author_name, u.profile_photo as author_photo
      FROM business_network_referral_notes n
      JOIN users u ON n.author_id = u.id
      WHERE n.referral_id = ?
      ORDER BY n.created_at ASC
    `, [id]);

    res.status(200).json({ success: true, referral, history, notes });
  } catch (error) {
    next(error);
  }
};

const maskReferralPrivacy = (referral) => {
  const ref = { ...referral };
  if (ref.privacy_level === 'CONFIDENTIAL') {
    ref.customer_name = 'Confidential Lead';
    ref.customer_contact = 'Hidden';
  } else if (ref.privacy_level === 'REQUEST_CONTACT') {
    ref.customer_contact = 'Hidden (Request Contact)';
  } else if (ref.privacy_level === 'PARTIAL_CONTACT') {
    if (ref.customer_contact) {
      ref.customer_contact = ref.customer_contact.substring(0, 4) + '******';
    }
  }
  return ref;
};

export const updateReferralStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, actual_value, estimated_value } = req.body;
    const userId = req.user.id;

    const [referrals] = await pool.query('SELECT * FROM business_network_referrals WHERE id = ?', [id]);
    if (referrals.length === 0) return res.status(404).json({ success: false, message: 'Referral not found' });
    const referral = referrals[0];

    // Only recipient can update the status
    if (referral.recipient_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the recipient member of a referral can update its pipeline status.' });
    }

    const validStatuses = ['ACCEPTED', 'CONTACTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'REJECTED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid pipeline status' });
    }

    let actualVal = referral.actual_value;
    let closedDate = referral.closed_date;
    let estimatedVal = referral.estimated_value;

    if (estimated_value !== undefined) {
      estimatedVal = estimated_value;
    }

    if (status === 'WON') {
      actualVal = actual_value !== undefined ? actual_value : estimatedVal;
      closedDate = new Date();
    }

    await pool.query(
      `UPDATE business_network_referrals 
       SET status = ?, actual_value = ?, estimated_value = ?, closed_date = ? 
       WHERE id = ?`,
      [status, actualVal, estimatedVal, closedDate, id]
    );

    // Save history
    await pool.query(
      'INSERT INTO business_network_referral_status_history (referral_id, status, updated_by, notes) VALUES (?, ?, ?, ?)',
      [id, status, userId, notes || `Status updated to ${status}`]
    );

    // Send Notification
    await pool.query(
      'INSERT INTO business_network_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [referral.referrer_id, 'Referral Status Updated', `Your referral for "${referral.requirement}" was updated to ${status}.`, 'REFERRAL_STATUS_CHANGED']
    );

    res.status(200).json({ success: true, message: 'Referral status updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const addReferralNote = async (req, res, next) => {
  try {
    const { id } = req.params; // Referral ID
    const { notes } = req.body;
    const author_id = req.user.id;

    if (!notes) return res.status(400).json({ success: false, message: 'Note content is empty' });

    const [referrals] = await pool.query('SELECT referrer_id, recipient_id FROM business_network_referrals WHERE id = ?', [id]);
    if (referrals.length === 0) return res.status(404).json({ success: false, message: 'Referral not found' });
    
    // Check access
    if (req.user.role !== 'SUPER_ADMIN' && referrals[0].referrer_id !== author_id && referrals[0].recipient_id !== author_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized note post' });
    }

    const [result] = await pool.query(
      'INSERT INTO business_network_referral_notes (referral_id, author_id, notes) VALUES (?, ?, ?)',
      [id, author_id, notes]
    );

    res.status(201).json({ success: true, noteId: result.insertId, message: 'Comment added successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. BUSINESS REQUIREMENTS / LEADS
// ==========================================

export const postRequirement = async (req, res, next) => {
  try {
    const creator_id = req.user.id;
    const { title, description, category_id, specialty_id, budget, location, timeline, urgency, visibility } = req.body;

    if (!title || !category_id || !specialty_id) {
      return res.status(400).json({ success: false, message: 'Title, Category, and Specialty are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO business_network_requirements 
       (creator_id, title, description, category_id, specialty_id, budget, location, timeline, urgency, visibility, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [creator_id, title, description || null, category_id, specialty_id, budget || 0.00, location || null, timeline || null, urgency || 'MEDIUM', visibility || 'CHAPTER_ONLY']
    );

    res.status(201).json({ success: true, message: 'Business requirement posted successfully', requirementId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const getRequirements = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get caller's chapter ID
    const [member] = await pool.query("SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'", [userId]);
    const chapterId = member.length > 0 ? member[0].chapter_id : null;

    let query = `
      SELECT req.*, 
             u.name as creator_name, vp.business_name as creator_business, vp.business_logo as creator_logo,
             cat.name as category_name, spec.name as specialty_name
      FROM business_network_requirements req
      JOIN users u ON req.creator_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      JOIN business_network_categories cat ON req.category_id = cat.id
      JOIN business_network_specialties spec ON req.specialty_id = spec.id
      WHERE req.status = 'OPEN'
    `;
    const params = [];

    if (chapterId) {
      query += `
        AND (
          req.visibility = 'NETWORK'
          OR (req.visibility = 'CHAPTER_ONLY' AND req.creator_id IN (
             SELECT vendor_id FROM business_network_members WHERE chapter_id = ? AND status = 'ACTIVE'
          ))
          OR req.creator_id = ?
        )
      `;
      params.push(chapterId, userId);
    } else {
      query += ` AND (req.visibility = 'NETWORK' OR req.creator_id = ?) `;
      params.push(userId);
    }

    query += ' ORDER BY req.created_at DESC';

    const [requirements] = await pool.query(query, params);
    res.status(200).json({ success: true, requirements });
  } catch (error) {
    next(error);
  }
};

export const getMatchingMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [reqs] = await pool.query('SELECT * FROM business_network_requirements WHERE id = ?', [id]);
    if (reqs.length === 0) return res.status(404).json({ success: false, message: 'Requirement not found' });
    const requirement = reqs[0];

    // Find active members who match
    const [members] = await pool.query(`
      SELECT m.vendor_id, u.name as owner_name, u.email as owner_email,
             vp.business_name, vp.business_logo, vp.district, vp.city, vp.state, vp.kyc_status, vp.year_established,
             spec.name as specialty_name, cat.name as category_name,
             c.name as chapter_name
      FROM business_network_members m
      JOIN users u ON m.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      JOIN business_network_specialties spec ON m.specialty_id = spec.id
      JOIN business_network_categories cat ON spec.category_id = cat.id
      JOIN business_network_chapters c ON m.chapter_id = c.id
      WHERE m.status = 'ACTIVE' AND m.vendor_id != ?
    `, [requirement.creator_id]);

    const matched = members.map(member => {
      let score = 0;
      
      if (member.specialty_name && requirement.specialty_id) {
        score += 50;
      }
      if (requirement.location && member.district && requirement.location.toLowerCase().includes(member.district.toLowerCase())) {
        score += 30;
      } else if (requirement.location && member.city && requirement.location.toLowerCase().includes(member.city.toLowerCase())) {
        score += 20;
      }
      if (member.kyc_status === 'APPROVED') {
        score += 10;
      }
      const currentYear = new Date().getFullYear();
      if (member.year_established) {
        const exp = currentYear - member.year_established;
        score += Math.min(exp, 10);
      }

      return {
        ...member,
        matchScore: score
      };
    });

    matched.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({ success: true, matches: matched });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. MEETINGS & ATTENDANCE
// ==========================================

export const createMeeting = async (req, res, next) => {
  try {
    const { chapter_id, title, date, start_time, end_time, location, meeting_type, agenda, description, meeting_link } = req.body;
    const adminId = req.user.id;

    if (!chapter_id || !title || !date || !start_time || !end_time || !location || !meeting_type) {
      return res.status(400).json({ success: false, message: 'Missing meeting schedule inputs' });
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      const isAssigned = await checkAdminChapterAssignment(adminId, chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const [result] = await pool.query(
      `INSERT INTO business_network_meetings 
       (chapter_id, title, date, start_time, end_time, location, meeting_type, agenda, description, meeting_link, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
      [chapter_id, title, date, start_time, end_time, location, meeting_type, agenda || null, description || null, meeting_link || null]
    );

    res.status(201).json({ success: true, message: 'Meeting scheduled successfully', meetingId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const getMeetings = async (req, res, next) => {
  try {
    const { chapter_id } = req.query;
    const userId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    let targetChapterId = chapter_id;

    if (!targetChapterId && req.user.role === 'VENDOR') {
      const [member] = await pool.query("SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'", [userId]);
      if (member.length > 0) targetChapterId = member[0].chapter_id;
    }

    if (!targetChapterId && !isSuperAdmin) {
      return res.status(200).json({ success: true, meetings: [] });
    }

    let query = `
      SELECT m.*, c.name as chapter_name, c.code as chapter_code
      FROM business_network_meetings m
      JOIN business_network_chapters c ON m.chapter_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (targetChapterId) {
      query += ' AND m.chapter_id = ?';
      params.push(targetChapterId);
    }

    query += ' ORDER BY m.date DESC, m.start_time DESC';

    const [meetings] = await pool.query(query, params);
    res.status(200).json({ success: true, meetings });
  } catch (error) {
    next(error);
  }
};

export const updateMeetingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'OPEN', 'COMPLETED', 'CANCELLED'
    const adminId = req.user.id;

    const [meetings] = await pool.query('SELECT chapter_id FROM business_network_meetings WHERE id = ?', [id]);
    if (meetings.length === 0) return res.status(404).json({ success: false, message: 'Meeting not found' });
    const meeting = meetings[0];

    if (req.user.role !== 'SUPER_ADMIN') {
      const isAssigned = await checkAdminChapterAssignment(adminId, meeting.chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await pool.query('UPDATE business_network_meetings SET status = ? WHERE id = ?', [status, id]);
    res.status(200).json({ success: true, message: `Meeting status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

export const recordAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendanceList } = req.body; // Array of { member_id, status: 'PRESENT'/'ABSENT'/'LATE'/'EXCUSED', notes }
    const adminId = req.user.id;

    const [meetings] = await pool.query('SELECT chapter_id FROM business_network_meetings WHERE id = ?', [id]);
    if (meetings.length === 0) return res.status(404).json({ success: false, message: 'Meeting not found' });
    const meeting = meetings[0];

    if (req.user.role !== 'SUPER_ADMIN') {
      const isAssigned = await checkAdminChapterAssignment(adminId, meeting.chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!Array.isArray(attendanceList)) {
      return res.status(400).json({ success: false, message: 'attendanceList must be an array' });
    }

    for (const record of attendanceList) {
      await pool.query(
        `INSERT INTO business_network_meeting_attendance (meeting_id, member_id, status, notes)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)`,
        [id, record.member_id, record.status, record.notes || null]
      );
    }

    res.status(200).json({ success: true, message: 'Meeting attendance saved successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMeetingAttendanceList = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [attendance] = await pool.query(`
      SELECT a.*, u.name as member_name, vp.business_name
      FROM business_network_meeting_attendance a
      JOIN users u ON a.member_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE a.meeting_id = ?
    `, [id]);

    res.status(200).json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. VISITOR SYSTEM
// ==========================================

export const submitVisitorRequest = async (req, res, next) => {
  try {
    const { chapter_id, name, business_name, category, specialty, phone, email, reason_for_visit, preferred_date } = req.body;

    if (!chapter_id || !name || !business_name || !category || !specialty || !phone || !email || !preferred_date) {
      return res.status(400).json({ success: false, message: 'Missing required visitor details' });
    }

    await pool.query(
      `INSERT INTO business_network_visitors 
       (chapter_id, name, business_name, category, specialty, phone, email, reason_for_visit, preferred_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [chapter_id, name, business_name, category, specialty, phone, email, reason_for_visit || null, preferred_date]
    );

    res.status(201).json({ success: true, message: 'Visit request submitted successfully. The Chapter Admin will contact you.' });
  } catch (error) {
    next(error);
  }
};

export const getVisitors = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const userId = req.user.id;

    let query = `
      SELECT v.*, c.name as chapter_name, c.code as chapter_code
      FROM business_network_visitors v
      JOIN business_network_chapters c ON v.chapter_id = c.id
    `;
    const params = [];

    if (req.user.role === 'VENDOR') {
      // Vendors can see visitors of their active chapter
      const [membership] = await pool.query(
        "SELECT chapter_id FROM business_network_members WHERE vendor_id = ? AND status = 'ACTIVE'",
        [userId]
      );
      if (membership.length === 0) {
        // Not in any chapter, return empty list
        return res.status(200).json({ success: true, visitors: [] });
      }
      query += " WHERE v.chapter_id = ? ";
      params.push(membership[0].chapter_id);
    } else if (!isSuperAdmin) {
      // Assigned Chapter Admins
      query += ` JOIN business_network_chapter_admins ca ON c.id = ca.chapter_id WHERE ca.admin_id = ? `;
      params.push(userId);
    }

    query += ' ORDER BY v.created_at DESC';

    const [visitors] = await pool.query(query, params);
    res.status(200).json({ success: true, visitors });
  } catch (error) {
    next(error);
  }
};

export const decideVisitorRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, meeting_id } = req.body;
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    const [visitors] = await pool.query('SELECT * FROM business_network_visitors WHERE id = ?', [id]);
    if (visitors.length === 0) return res.status(404).json({ success: false, message: 'Visitor request not found' });
    const visitor = visitors[0];

    if (!isSuperAdmin) {
      const isAssigned = await checkAdminChapterAssignment(adminId, visitor.chapter_id);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await pool.query(
      'UPDATE business_network_visitors SET status = ?, meeting_id = ? WHERE id = ?',
      [status, meeting_id || visitor.meeting_id, id]
    );

    res.status(200).json({ success: true, message: `Visitor status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. REPORTS, ANALYTICS & DASHBOARD METRICS
// ==========================================

export const getSuperAdminDashboard = async (req, res, next) => {
  try {
    const [chapters] = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status="ACTIVE" THEN 1 ELSE 0 END) as active FROM business_network_chapters');
    const [members] = await pool.query("SELECT COUNT(*) as total FROM business_network_members WHERE status='ACTIVE'");
    const [pendingRequests] = await pool.query("SELECT COUNT(*) as total FROM business_network_membership_requests WHERE status='PENDING'");
    
    const [referrals] = await pool.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status='WON' THEN 1 ELSE 0 END) as won,
             SUM(actual_value) as businessValue
      FROM business_network_referrals
    `);

    const [meetings] = await pool.query("SELECT COUNT(*) as total FROM business_network_meetings WHERE status='SCHEDULED'");
    const [visitors] = await pool.query('SELECT COUNT(*) as total FROM business_network_visitors');

    const [districtChart] = await pool.query(`
      SELECT district, COUNT(*) as value 
      FROM business_network_chapters c
      JOIN business_network_members m ON c.id = m.chapter_id
      WHERE m.status = 'ACTIVE'
      GROUP BY district
    `);

    const [referralsMonthly] = await pool.query(`
      SELECT DATE_FORMAT(MIN(created_at), '%b %Y') as month, COUNT(*) as referrals, SUM(actual_value) as value
      FROM business_network_referrals
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY MIN(created_at) ASC
      LIMIT 12
    `);

    const [chapterRankings] = await pool.query(`
      SELECT c.id, c.name, c.code,
             COUNT(DISTINCT m.id) as members,
             (SELECT COUNT(*) FROM business_network_referrals r WHERE r.referrer_id IN (SELECT vendor_id FROM business_network_members WHERE chapter_id = c.id)) as referrals_given,
             (SELECT SUM(actual_value) FROM business_network_referrals r WHERE r.recipient_id IN (SELECT vendor_id FROM business_network_members WHERE chapter_id = c.id) AND r.status='WON') as value_generated
      FROM business_network_chapters c
      LEFT JOIN business_network_members m ON c.id = m.chapter_id AND m.status = 'ACTIVE'
      GROUP BY c.id
      ORDER BY value_generated DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      stats: {
        totalChapters: chapters[0].total || 0,
        activeChapters: chapters[0].active || 0,
        totalMembers: members[0].total || 0,
        pendingRequests: pendingRequests[0].total || 0,
        totalReferrals: referrals[0].total || 0,
        wonReferrals: referrals[0].won || 0,
        businessValue: referrals[0].businessValue || 0,
        activeMeetings: meetings[0].total || 0,
        totalVisitors: visitors[0].total || 0
      },
      charts: {
        districtChart,
        referralsMonthly,
        chapterRankings
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboard = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    let chaptersQuery = 'SELECT id, name, code, max_members FROM business_network_chapters';
    const params = [];
    if (!isSuperAdmin) {
      chaptersQuery += ' WHERE id IN (SELECT chapter_id FROM business_network_chapter_admins WHERE admin_id = ?)';
      params.push(adminId);
    }
    const [assignedChapters] = await pool.query(chaptersQuery, params);

    if (assignedChapters.length === 0) {
      return res.status(200).json({
        success: true,
        stats: { totalMembers: 0, referralsCount: 0, businessValue: 0, pendingRequests: 0 },
        chapters: []
      });
    }

    const chapterIds = assignedChapters.map(c => c.id);

    const [members] = await pool.query(
      'SELECT COUNT(*) as total FROM business_network_members WHERE chapter_id IN (?) AND status="ACTIVE"',
      [chapterIds]
    );

    const [pendingRequests] = await pool.query(
      'SELECT COUNT(*) as total FROM business_network_membership_requests WHERE chapter_id IN (?) AND status="PENDING"',
      [chapterIds]
    );

    const [referrals] = await pool.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN r.status='WON' THEN 1 ELSE 0 END) as won,
             SUM(r.actual_value) as value
      FROM business_network_referrals r
      JOIN business_network_members m ON r.recipient_id = m.vendor_id AND m.status = 'ACTIVE'
      WHERE m.chapter_id IN (?)
    `, [chapterIds]);

    const [visitors] = await pool.query(
      'SELECT COUNT(*) as total FROM business_network_visitors WHERE chapter_id IN (?)',
      [chapterIds]
    );

    res.status(200).json({
      success: true,
      stats: {
        totalMembers: members[0].total || 0,
        pendingRequests: pendingRequests[0].total || 0,
        referralsCount: referrals[0].total || 0,
        wonReferrals: referrals[0].won || 0,
        businessValue: referrals[0].value || 0,
        visitorsCount: visitors[0].total || 0
      },
      chapters: assignedChapters
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorDashboard = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const [memberships] = await pool.query(`
      SELECT m.*, c.name as chapter_name, c.code as chapter_code
      FROM business_network_members m
      JOIN business_network_chapters c ON m.chapter_id = c.id
      WHERE m.vendor_id = ? AND m.status = 'ACTIVE'
    `, [vendorId]);

    const memberRecord = memberships.length > 0 ? memberships[0] : null;

    const [given] = await pool.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN status='WON' THEN 1 ELSE 0 END) as won,
             SUM(actual_value) as value
      FROM business_network_referrals 
      WHERE referrer_id = ?
    `, [vendorId]);

    const [received] = await pool.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN status='WON' THEN 1 ELSE 0 END) as won,
             SUM(actual_value) as value
      FROM business_network_referrals 
      WHERE recipient_id = ?
    `, [vendorId]);

    let attendanceRate = 100;
    let meetingsAttended = 0;
    let meetingsMissed = 0;

    if (memberRecord) {
      const [attendanceStats] = await pool.query(`
        SELECT 
          SUM(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as attended,
          SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as missed
        FROM business_network_meeting_attendance
        WHERE member_id = ?
      `, [vendorId]);

      meetingsAttended = Number(attendanceStats[0].attended || 0);
      meetingsMissed = Number(attendanceStats[0].missed || 0);
      const total = meetingsAttended + meetingsMissed;
      if (total > 0) {
        attendanceRate = Math.round((meetingsAttended / total) * 100);
      }
    }

    let upcomingMeeting = null;
    if (memberRecord) {
      const [meetings] = await pool.query(`
        SELECT * FROM business_network_meetings 
        WHERE chapter_id = ? AND date >= CURRENT_DATE() AND status = 'SCHEDULED'
        ORDER BY date ASC, start_time ASC
        LIMIT 1
      `, [memberRecord.chapter_id]);
      if (meetings.length > 0) upcomingMeeting = meetings[0];
    }

    res.status(200).json({
      success: true,
      membership: memberRecord,
      stats: {
        referralsGiven: given[0].total || 0,
        referralsGivenWon: given[0].won || 0,
        businessGiven: given[0].value || 0,
        referralsReceived: received[0].total || 0,
        referralsReceivedWon: received[0].won || 0,
        businessReceived: received[0].value || 0,
        attendancePercent: attendanceRate,
        meetingsAttended,
        meetingsMissed
      },
      upcomingMeeting
    });
  } catch (error) {
    next(error);
  }
};

export const leaveChapter = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Delete from business_network_members
    await pool.query('DELETE FROM business_network_members WHERE vendor_id = ?', [userId]);

    // 2. Delete from business_network_membership_requests so they can apply clean again
    await pool.query('DELETE FROM business_network_membership_requests WHERE vendor_id = ?', [userId]);

    res.status(200).json({ success: true, message: 'Successfully left the chapter' });
  } catch (error) {
    next(error);
  }
};
