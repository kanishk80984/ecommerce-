import { getPool } from '../database/connection.js';
import slugify from 'slugify';
import StorageService from '../storage/StorageService.js';

export const getPublicJobs = async (req, res) => {
    try {
        const pool = getPool();
        const { location, search, type, mode, category } = req.query;
        let query = `
            SELECT j.*, v.business_name, v.business_logo, v.city as vendor_city, c.name as category_name
            FROM jobs j 
            JOIN vendor_profiles v ON j.vendor_id = v.user_id 
            LEFT JOIN job_categories c ON j.category_id = c.id
            WHERE j.status = 'ACTIVE' OR j.status = 'PUBLISHED'
        `;
        let params = [];

        // Basic filtering
        if (type) { query += ` AND j.employment_type = ?`; params.push(type); }
        if (mode) { query += ` AND j.work_mode = ?`; params.push(mode); }
        if (category) { query += ` AND j.category_id = ?`; params.push(category); }
        if (search) { 
            query += ` AND (j.title LIKE ? OR j.description LIKE ? OR v.business_name LIKE ?)`; 
            params.push(`%${search}%`, `%${search}%`, `%${search}%`); 
        }

        // Location strict filter
        if (location) {
            query += ` AND j.city = ?`;
            params.push(location);
        }

        query += ` ORDER BY j.created_at DESC`;

        const [jobs] = await pool.query(query, params);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching public jobs:', error);
        res.status(500).json({ message: 'Error fetching jobs' });
    }
};

export const getPublicJobBySlug = async (req, res) => {
    try {
        const pool = getPool();
        const { slug } = req.params;
        const [jobs] = await pool.query(`
            SELECT j.*, v.business_name, v.business_logo, v.city as vendor_city, v.state as vendor_state, v.slug as vendor_slug, v.store_description, v.public_id, v.year_established, c.name as category_name
            FROM jobs j 
            JOIN vendor_profiles v ON j.vendor_id = v.user_id 
            LEFT JOIN job_categories c ON j.category_id = c.id
            WHERE j.slug = ? AND (j.status = 'ACTIVE' OR j.status = 'PUBLISHED')
        `, [slug]);

        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json(jobs[0]);
    } catch (error) {
        console.error('Error fetching job by slug:', error);
        res.status(500).json({ message: 'Error fetching job details' });
    }
};

export const getVendorJobs = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        const [jobs] = await pool.query(`
            SELECT * FROM jobs WHERE vendor_id = ? ORDER BY created_at DESC
        `, [vendorId]);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching vendor jobs:', error);
        res.status(500).json({ message: 'Error fetching your jobs' });
    }
};

export const createJob = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        const jobData = req.body;
        
        let slug = slugify(jobData.title, { lower: true, strict: true });
        // Ensure unique slug
        const [existing] = await pool.query('SELECT id FROM jobs WHERE slug LIKE ?', [`${slug}%`]);
        if (existing.length > 0) {
            slug = `${slug}-${Date.now()}`;
        }

        const query = `
            INSERT INTO jobs (
                vendor_id, title, slug, description, responsibilities, requirements, qualifications, benefits, 
                employment_type, work_mode, experience_min, experience_max, salary_type, salary_min, salary_max, 
                salary_period, country, state, district, city, area, pincode, number_of_openings, 
                application_method, application_email, application_phone, application_url, application_deadline, 
                availability_to_join, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            vendorId, jobData.title, slug, jobData.description, jobData.responsibilities, jobData.requirements, 
            jobData.qualifications, jobData.benefits, jobData.employment_type, jobData.work_mode, jobData.experience_min, 
            jobData.experience_max, jobData.salary_type, jobData.salary_min, jobData.salary_max, jobData.salary_period, 
            jobData.country, jobData.state, jobData.district, jobData.city, jobData.area, jobData.pincode, 
            jobData.number_of_openings, jobData.application_method, jobData.application_email, jobData.application_phone, 
            jobData.application_url, jobData.application_deadline, jobData.availability_to_join || null, jobData.status || 'DRAFT'
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Job created successfully', id: result.insertId, slug });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Error creating job' });
    }
};

export const updateJob = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        const jobId = req.params.id;
        const jobData = req.body;
        
        // Verify ownership
        const [existing] = await pool.query('SELECT vendor_id FROM jobs WHERE id = ?', [jobId]);
        if (existing.length === 0) return res.status(404).json({ message: 'Job not found' });
        if (existing[0].vendor_id !== vendorId) return res.status(403).json({ message: 'Unauthorized' });

        const updateFields = [];
        const values = [];
        for (const [key, value] of Object.entries(jobData)) {
            if (key !== 'id' && key !== 'vendor_id' && key !== 'slug' && key !== 'created_at') {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        }
        values.push(jobId);

        if (updateFields.length > 0) {
            await pool.query(`UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ?`, values);
        }
        
        res.json({ message: 'Job updated successfully' });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ message: 'Error updating job' });
    }
};

export const updateJobStatus = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        const jobId = req.params.id;
        const { status } = req.body;
        
        // Verify ownership
        const [existing] = await pool.query('SELECT vendor_id FROM jobs WHERE id = ?', [jobId]);
        if (existing.length === 0) return res.status(404).json({ message: 'Job not found' });
        if (existing[0].vendor_id !== vendorId) return res.status(403).json({ message: 'Unauthorized' });

        await pool.query(`UPDATE jobs SET status = ? WHERE id = ?`, [status, jobId]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        const jobId = req.params.id;
        
        const [existing] = await pool.query('SELECT vendor_id FROM jobs WHERE id = ?', [jobId]);
        if (existing.length === 0) return res.status(404).json({ message: 'Job not found' });
        if (existing[0].vendor_id !== vendorId) return res.status(403).json({ message: 'Unauthorized' });

        await pool.query(`DELETE FROM jobs WHERE id = ?`, [jobId]);
        res.json({ message: 'Job deleted' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Error deleting job' });
    }
};

export const getJobApplications = async (req, res) => {
    try {
        const pool = getPool();
        const vendorId = req.user.id;
        // Verify vendor owns the jobs
        const [applications] = await pool.query(`
            SELECT a.*, j.title as job_title, u.name as applicant_name, u.email as applicant_email, u.phone as applicant_phone
            FROM job_applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users u ON a.user_id = u.id
            WHERE j.vendor_id = ?
            ORDER BY a.created_at DESC
        `, [vendorId]);
        
        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

export const applyToJob = async (req, res) => {
    try {
        const pool = getPool();
        const userId = req.user.id;
        const { jobId, coverLetter, resumeUrl, experienceYears, highestQualification, primarySkills } = req.body;
        
        // If already applied, update application details instead of throwing error (better UX & testing)
        const [existing] = await pool.query(`SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?`, [jobId, userId]);
        if (existing.length > 0) {
            await pool.query(`
                UPDATE job_applications 
                SET cover_letter = ?, resume_url = ?, experience_years = ?, highest_qualification = ?, primary_skills = ?, status = 'APPLIED', updated_at = CURRENT_TIMESTAMP
                WHERE job_id = ? AND user_id = ?
            `, [coverLetter, resumeUrl, experienceYears ? parseInt(experienceYears) : null, highestQualification || null, primarySkills || null, jobId, userId]);
            return res.status(200).json({ message: 'Application updated successfully' });
        }

        await pool.query(`
            INSERT INTO job_applications (job_id, user_id, cover_letter, resume_url, experience_years, highest_qualification, primary_skills)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [jobId, userId, coverLetter, resumeUrl, experienceYears ? parseInt(experienceYears) : null, highestQualification || null, primarySkills || null]);
        
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Error applying to job:', error);
        res.status(500).json({ message: 'Error applying to job' });
    }
};

export const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided.' });
        }

        const ext = `.${(req.file.originalname || '').toLowerCase().split('.').pop()}`;
        const fileName = `resume_${req.user.id}_${Date.now()}${ext}`;

        const uploadResult = await StorageService.upload(req.file.buffer, {
            module: 'resumes',
            fileName: fileName,
            mimeType: req.file.mimetype
        });

        res.json({
            success: true,
            message: 'Resume uploaded successfully.',
            url: uploadResult.publicUrl
        });
    } catch (error) {
        console.error('Error uploading resume:', error);
        res.status(500).json({ success: false, message: 'Error uploading resume' });
    }
};

export const getUserJobApplications = async (req, res) => {
    try {
        const pool = getPool();
        const userId = req.user.id;
        
        const [applications] = await pool.query(`
            SELECT a.*, j.title as job_title, j.slug as job_slug, j.city as job_city, j.state as job_state, vp.business_name, vp.business_logo
            FROM job_applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN vendor_profiles vp ON j.vendor_id = vp.user_id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
        `, [userId]);
        
        res.json(applications);
    } catch (error) {
        console.error('Error fetching user applications:', error);
        res.status(500).json({ message: 'Error fetching applied jobs history' });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        const { status, interview_date, interview_link } = req.body;
        const vendorId = req.user.id;

        // Check if the application belongs to a job posted by this vendor
        const [appCheck] = await pool.query(`
            SELECT a.id 
            FROM job_applications a
            JOIN jobs j ON a.job_id = j.id
            WHERE a.id = ? AND j.vendor_id = ?
        `, [id, vendorId]);

        if (appCheck.length === 0) {
            return res.status(403).json({ message: 'Unauthorized to update this application status' });
        }

        // Validate status values
        const validStatuses = ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'SELECTED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        if (status === 'INTERVIEWING') {
            await pool.query(
                'UPDATE job_applications SET status = ?, interview_date = ?, interview_link = ? WHERE id = ?',
                [status, interview_date || null, interview_link || null, id]
            );
        } else {
            await pool.query('UPDATE job_applications SET status = ? WHERE id = ?', [status, id]);
        }
        
        res.json({ success: true, message: 'Application status updated successfully', status });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Error updating application status' });
    }
};
