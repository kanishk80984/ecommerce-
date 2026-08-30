import pool from '../config/db.js';

export const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [addresses] = await pool.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [userId]
    );
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      name, phone, street, city, state, zip, country, is_default,
      latitude, longitude, house_no, area, district, formatted_address
    } = req.body;

    if (!street || !city || !state || !zip || !country) {
      return res.status(400).json({ success: false, message: 'All address fields are required' });
    }

    // If setting as default, unset others first
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = ?', [userId]);
    }

    const [result] = await pool.query(
      `INSERT INTO addresses 
       (user_id, name, phone, street, city, state, zip, country, is_default, latitude, longitude, house_no, area, district, formatted_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, name || null, phone || null, street, city, state, zip, country, is_default || false,
        latitude || null, longitude || null, house_no || null, area || null, district || null, formatted_address || null
      ]
    );

    const [newAddress] = await pool.query('SELECT * FROM addresses WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Address added successfully', address: newAddress[0] });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, phone, street, city, state, zip, country, is_default,
      latitude, longitude, house_no, area, district, formatted_address
    } = req.body;

    // Check ownership
    const [existing] = await pool.query('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // If setting as default, unset others first
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = ?', [userId]);
    }

    await pool.query(
      `UPDATE addresses 
       SET name = ?, phone = ?, street = ?, city = ?, state = ?, zip = ?, country = ?, is_default = ?,
           latitude = ?, longitude = ?, house_no = ?, area = ?, district = ?, formatted_address = ?
       WHERE id = ? AND user_id = ?`,
      [
        name || null, phone || null, street, city, state, zip, country, is_default || false,
        latitude || null, longitude || null, house_no || null, area || null, district || null, formatted_address || null,
        id, userId
      ]
    );

    const [updatedAddress] = await pool.query('SELECT * FROM addresses WHERE id = ?', [id]);

    res.status(200).json({ success: true, message: 'Address updated successfully', address: updatedAddress[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    next(error);
  }
};
