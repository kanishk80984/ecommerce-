import { getPool } from '../database/connection.js';
import slugify from 'slugify';

// === PUBLIC ENDPOINTS ===
export const getActiveCategories = async (req, res) => {
    try {
        const pool = getPool();
        const [categories] = await pool.query('SELECT id, name, slug FROM job_categories WHERE status = "ACTIVE" ORDER BY name ASC');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching active job categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

// === ADMIN ENDPOINTS ===
export const getAllCategories = async (req, res) => {
    try {
        const pool = getPool();
        const { search = '', status = 'All', page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT c.*, COUNT(j.id) as jobs_count 
            FROM job_categories c
            LEFT JOIN jobs j ON c.id = j.category_id
            WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) as total FROM job_categories c WHERE 1=1`;
        let params = [];
        
        if (search) {
            query += ` AND (c.name LIKE ? OR c.slug LIKE ?)`;
            countQuery += ` AND (c.name LIKE ? OR c.slug LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (status && status !== 'All') {
            query += ` AND c.status = ?`;
            countQuery += ` AND c.status = ?`;
            params.push(status);
        }
        
        query += ` GROUP BY c.id ORDER BY c.created_at DESC`;
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        
        // pool.query requires numbers for LIMIT/OFFSET, we must ensure they are casted or we pass string? 
        // With mysql2, numbers are fine.
        const [totalRows] = await pool.query(countQuery, params);
        const total = totalRows[0].total;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const [categories] = await pool.query(query, params);
        
        res.json({ success: true, data: categories, total });
    } catch (error) {
        console.error('Error fetching job categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req, res) => {
    try {
        const pool = getPool();
        let { name, slug, status } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        name = name.trim();
        
        if (!slug) {
            slug = slugify(name, { lower: true, strict: true });
        } else {
            slug = slugify(slug, { lower: true, strict: true });
        }
        
        // Check duplicates
        const [existing] = await pool.query('SELECT id FROM job_categories WHERE LOWER(name) = ? OR slug = ?', [name.toLowerCase(), slug]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'A job category with this name or slug already exists.' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO job_categories (name, slug, status) VALUES (?, ?, ?)',
            [name, slug, status || 'ACTIVE']
        );
        
        res.json({ success: true, message: 'Category created successfully', data: { id: result.insertId, name, slug, status } });
    } catch (error) {
        console.error('Error creating job category:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        let { name, slug, status } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        name = name.trim();
        
        if (!slug) {
            slug = slugify(name, { lower: true, strict: true });
        } else {
            slug = slugify(slug, { lower: true, strict: true });
        }
        
        // Check duplicates excluding current
        const [existing] = await pool.query('SELECT id FROM job_categories WHERE (LOWER(name) = ? OR slug = ?) AND id != ?', [name.toLowerCase(), slug, id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'A job category with this name or slug already exists.' });
        }
        
        await pool.query(
            'UPDATE job_categories SET name = ?, slug = ?, status = ? WHERE id = ?',
            [name, slug, status, id]
        );
        
        res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating job category:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        const { status } = req.body;
        
        await pool.query('UPDATE job_categories SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        
        // Check if referenced
        const [jobs] = await pool.query('SELECT id FROM jobs WHERE category_id = ? LIMIT 1', [id]);
        if (jobs.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'This category is currently used by jobs and cannot be permanently deleted. Please deactivate it instead.',
                canDeactivate: true
            });
        }
        
        await pool.query('DELETE FROM job_categories WHERE id = ?', [id]);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};
