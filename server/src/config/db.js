import { initializeDatabase } from '../database/databaseInitializer.js';
import { getPool } from '../database/connection.js';

export const connectDB = async () => {
    await initializeDatabase();
    try {
        const pool = getPool();
        await pool.query(`
            UPDATE vendor_profiles 
            SET slug = CONCAT(LOWER(REPLACE(REPLACE(COALESCE(business_name, 'business'), ' ', '-'), '&', 'and')), '-', id)
            WHERE slug IS NULL OR slug = ''
        `);
        await pool.query(`
            UPDATE vendor_profiles 
            SET public_id = CONCAT('vp_', id)
            WHERE public_id IS NULL OR public_id = ''
        `);

        // Check if mobile_image column exists in vendor_services
        const [serviceCols] = await pool.query("SHOW COLUMNS FROM vendor_services LIKE 'mobile_image'");
        if (serviceCols.length === 0) {
            await pool.query("ALTER TABLE vendor_services ADD COLUMN mobile_image VARCHAR(500) NULL AFTER image_path");
        }

        // Check if keywords column exists in vendor_profiles
        const [profileCols] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'keywords'");
        if (profileCols.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN keywords VARCHAR(1000) NULL AFTER subcategory");
        }

        const [profilesCountryCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'country'");
        if (profilesCountryCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN country VARCHAR(100) NULL AFTER pincode");
        }

        const [profilesPhoneCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'phone_number'");
        if (profilesPhoneCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN phone_number VARCHAR(20) NULL AFTER whatsapp_number");
        }

        const [profilesTurnoverCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'yearly_turnover'");
        if (profilesTurnoverCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN yearly_turnover VARCHAR(100) NULL AFTER keywords");
        }

        const [profilesEstCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'year_established'");
        if (profilesEstCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN year_established INT NULL AFTER yearly_turnover");
        }

        // --- JOBS MODULE TABLES ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                category_id INT NULL,
                description TEXT NULL,
                responsibilities TEXT NULL,
                requirements TEXT NULL,
                qualifications TEXT NULL,
                benefits TEXT NULL,
                employment_type VARCHAR(50) NULL,
                work_mode VARCHAR(50) NULL,
                experience_min INT NULL,
                experience_max INT NULL,
                salary_type VARCHAR(50) NULL,
                salary_min DECIMAL(10, 2) NULL,
                salary_max DECIMAL(10, 2) NULL,
                salary_period VARCHAR(50) NULL,
                country VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                district VARCHAR(100) NULL,
                city VARCHAR(100) NULL,
                area VARCHAR(100) NULL,
                pincode VARCHAR(20) NULL,
                number_of_openings INT NULL DEFAULT 1,
                application_method VARCHAR(50) NULL DEFAULT 'INTERNAL',
                application_email VARCHAR(255) NULL,
                application_phone VARCHAR(50) NULL,
                application_url VARCHAR(500) NULL,
                application_deadline DATE NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
                published_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_vendor_id (vendor_id),
                INDEX idx_status (status),
                INDEX idx_city (city),
                INDEX idx_district (district),
                INDEX idx_state (state),
                INDEX idx_created_at (created_at),
                INDEX idx_application_deadline (application_deadline)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS job_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id INT NOT NULL,
                user_id INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
                resume_url VARCHAR(500) NULL,
                cover_letter TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_job_id (job_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        // -------------------------

        const [profilesYoutubeCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'youtube_link'");
        if (profilesYoutubeCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN youtube_link VARCHAR(500) NULL AFTER website");
        }

        const [profilesGalleryOnlyCol] = await pool.query("SHOW COLUMNS FROM vendor_profiles LIKE 'gallery_only'");
        if (profilesGalleryOnlyCol.length === 0) {
            await pool.query("ALTER TABLE vendor_profiles ADD COLUMN gallery_only JSON NULL AFTER gallery_images");
        }

        // Add availability_to_join to jobs table
        const [jobsAvailabilityCol] = await pool.query("SHOW COLUMNS FROM jobs LIKE 'availability_to_join'");
        if (jobsAvailabilityCol.length === 0) {
            await pool.query("ALTER TABLE jobs ADD COLUMN availability_to_join VARCHAR(100) NULL");
        }

        // Add applicant details fields to job_applications table
        const [appExpCol] = await pool.query("SHOW COLUMNS FROM job_applications LIKE 'experience_years'");
        if (appExpCol.length === 0) {
            await pool.query("ALTER TABLE job_applications ADD COLUMN experience_years INT NULL");
        }
        const [appQualCol] = await pool.query("SHOW COLUMNS FROM job_applications LIKE 'highest_qualification'");
        if (appQualCol.length === 0) {
            await pool.query("ALTER TABLE job_applications ADD COLUMN highest_qualification VARCHAR(255) NULL");
        }
        const [appSkillsCol] = await pool.query("SHOW COLUMNS FROM job_applications LIKE 'primary_skills'");
        if (appSkillsCol.length === 0) {
            await pool.query("ALTER TABLE job_applications ADD COLUMN primary_skills VARCHAR(500) NULL");
        }

        // Create category_requests table if it does not exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS category_requests (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT UNSIGNED NOT NULL,
                suggested_name VARCHAR(255) NOT NULL,
                status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Create deleted_service_categories table if it does not exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deleted_service_categories (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // --- IBC BUSINESS NETWORK MODULE TABLES ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_categories (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                slug VARCHAR(255) NOT NULL UNIQUE,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_specialties (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                category_id INT UNSIGNED NOT NULL,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES business_network_categories(id) ON DELETE CASCADE,
                UNIQUE KEY cat_spec_unique (category_id, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_chapters (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(100) NOT NULL UNIQUE,
                description TEXT NULL,
                state VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL,
                area VARCHAR(100) NULL,
                meeting_location VARCHAR(255) NOT NULL,
                meeting_type ENUM('PHYSICAL', 'ONLINE', 'HYBRID') NOT NULL,
                meeting_day VARCHAR(50) NOT NULL,
                meeting_time VARCHAR(50) NOT NULL,
                max_members INT DEFAULT 40,
                min_members INT DEFAULT 10,
                status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
                duplicate_specialty_rule ENUM('ALLOWED', 'NOT_ALLOWED') DEFAULT 'NOT_ALLOWED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_chapter_admins (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chapter_id INT UNSIGNED NOT NULL,
                admin_id INT UNSIGNED NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chapter_id) REFERENCES business_network_chapters(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY chapter_admin_unique (chapter_id, admin_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_profiles (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT UNSIGNED NOT NULL UNIQUE,
                ideal_customer VARCHAR(255) NULL,
                preferred_referral_type VARCHAR(255) NULL,
                target_industries VARCHAR(500) NULL,
                service_areas VARCHAR(500) NULL,
                business_capacity VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_membership_requests (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chapter_id INT UNSIGNED NOT NULL,
                vendor_id INT UNSIGNED NOT NULL,
                specialty_id INT UNSIGNED NOT NULL,
                why_join TEXT NULL,
                expected_contribution TEXT NULL,
                referral_interests TEXT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'WAITLISTED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (chapter_id) REFERENCES business_network_chapters(id) ON DELETE CASCADE,
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (specialty_id) REFERENCES business_network_specialties(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_members (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chapter_id INT UNSIGNED NOT NULL,
                vendor_id INT UNSIGNED NOT NULL,
                specialty_id INT UNSIGNED NOT NULL,
                status ENUM('ACTIVE', 'SUSPENDED', 'REMOVED') DEFAULT 'ACTIVE',
                joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (chapter_id) REFERENCES business_network_chapters(id) ON DELETE CASCADE,
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (specialty_id) REFERENCES business_network_specialties(id) ON DELETE CASCADE,
                UNIQUE KEY chapter_specialty_member (chapter_id, specialty_id, vendor_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_referrals (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                referrer_id INT UNSIGNED NOT NULL,
                recipient_id INT UNSIGNED NOT NULL,
                referral_type ENUM('INSIDE', 'OUTSIDE') DEFAULT 'INSIDE',
                customer_name VARCHAR(255) NULL,
                customer_contact VARCHAR(100) NULL,
                requirement VARCHAR(255) NOT NULL,
                description TEXT NULL,
                budget_range VARCHAR(100) NULL,
                location VARCHAR(100) NULL,
                expected_timeline VARCHAR(100) NULL,
                referral_notes TEXT NULL,
                attachment_url VARCHAR(255) NULL,
                status ENUM('NEW', 'ACCEPTED', 'CONTACTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'REJECTED', 'CLOSED') DEFAULT 'NEW',
                privacy_level ENUM('FULL_CONTACT', 'PARTIAL_CONTACT', 'REQUEST_CONTACT', 'CONFIDENTIAL') DEFAULT 'FULL_CONTACT',
                estimated_value DECIMAL(12,2) DEFAULT 0.00,
                actual_value DECIMAL(12,2) DEFAULT 0.00,
                closed_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_referral_status_history (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                referral_id INT UNSIGNED NOT NULL,
                status VARCHAR(50) NOT NULL,
                updated_by INT UNSIGNED NOT NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referral_id) REFERENCES business_network_referrals(id) ON DELETE CASCADE,
                FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_referral_notes (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                referral_id INT UNSIGNED NOT NULL,
                author_id INT UNSIGNED NOT NULL,
                notes TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referral_id) REFERENCES business_network_referrals(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_requirements (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                creator_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                category_id INT UNSIGNED NOT NULL,
                specialty_id INT UNSIGNED NOT NULL,
                budget DECIMAL(12,2) DEFAULT 0.00,
                location VARCHAR(255) NULL,
                timeline VARCHAR(100) NULL,
                urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
                visibility ENUM('CHAPTER_ONLY', 'NETWORK', 'PRIVATE') DEFAULT 'CHAPTER_ONLY',
                status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES business_network_categories(id) ON DELETE CASCADE,
                FOREIGN KEY (specialty_id) REFERENCES business_network_specialties(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_meetings (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chapter_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                location VARCHAR(255) NOT NULL,
                meeting_type ENUM('PHYSICAL', 'ONLINE', 'HYBRID') NOT NULL,
                agenda TEXT NULL,
                description TEXT NULL,
                meeting_link VARCHAR(500) NULL,
                status ENUM('SCHEDULED', 'OPEN', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (chapter_id) REFERENCES business_network_chapters(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_meeting_attendance (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                meeting_id INT UNSIGNED NOT NULL,
                member_id INT UNSIGNED NOT NULL,
                status ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') DEFAULT 'PRESENT',
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES business_network_meetings(id) ON DELETE CASCADE,
                FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY meeting_member_unique (meeting_id, member_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_visitors (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chapter_id INT UNSIGNED NOT NULL,
                name VARCHAR(255) NOT NULL,
                business_name VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL,
                specialty VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(255) NOT NULL,
                reason_for_visit TEXT NULL,
                preferred_date DATE NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ATTENDED', 'NO_SHOW') DEFAULT 'PENDING',
                meeting_id INT UNSIGNED NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (chapter_id) REFERENCES business_network_chapters(id) ON DELETE CASCADE,
                FOREIGN KEY (meeting_id) REFERENCES business_network_meetings(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_connections (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_a_id INT UNSIGNED NOT NULL,
                user_b_id INT UNSIGNED NOT NULL,
                status ENUM('PENDING', 'ACCEPTED', 'DECLINED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY connection_unique (user_a_id, user_b_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_network_notifications (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(100) NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // SEO and Local Landing Page migrations
        // 1. Create locations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Create category_target_locations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS category_target_locations (
                category_id INT UNSIGNED NOT NULL,
                location_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (category_id, location_id),
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. Create category_seo_keywords table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS category_seo_keywords (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                category_id INT UNSIGNED NOT NULL,
                keyword VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                search_intent ENUM('Informational', 'Commercial', 'Transactional', 'Local', 'Service', 'Category') DEFAULT 'Category',
                location_id INT UNSIGNED NULL,
                priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
                is_active TINYINT(1) DEFAULT 1,
                index_status ENUM('Index', 'Noindex') DEFAULT 'Index',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Add SEO fields to categories table
        const [catCols] = await pool.query("SHOW COLUMNS FROM categories");
        const catColNames = catCols.map(c => c.Field);
        if (!catColNames.includes('primary_keyword')) {
            await pool.query("ALTER TABLE categories ADD COLUMN primary_keyword VARCHAR(255) NULL");
        }
        if (!catColNames.includes('seo_title')) {
            await pool.query("ALTER TABLE categories ADD COLUMN seo_title VARCHAR(255) NULL");
        }
        if (!catColNames.includes('seo_meta_description')) {
            await pool.query("ALTER TABLE categories ADD COLUMN seo_meta_description TEXT NULL");
        }
        if (!catColNames.includes('seo_h1')) {
            await pool.query("ALTER TABLE categories ADD COLUMN seo_h1 VARCHAR(255) NULL");
        }
        if (!catColNames.includes('seo_content')) {
            await pool.query("ALTER TABLE categories ADD COLUMN seo_content TEXT NULL");
        }
        if (!catColNames.includes('seo_status')) {
            await pool.query("ALTER TABLE categories ADD COLUMN seo_status VARCHAR(50) DEFAULT 'Active'");
        }
        if (!catColNames.includes('index_status')) {
            await pool.query("ALTER TABLE categories ADD COLUMN index_status VARCHAR(50) DEFAULT 'Index'");
        }
        if (!catColNames.includes('canonical_url')) {
            await pool.query("ALTER TABLE categories ADD COLUMN canonical_url VARCHAR(255) NULL");
        }

        // Backfill vendor_services slug & public_id if missing
        await pool.query(`
            UPDATE vendor_services 
            SET slug = CONCAT(LOWER(REPLACE(REPLACE(COALESCE(name, 'service'), ' ', '-'), '&', 'and')), '-', id)
            WHERE slug IS NULL OR slug = ''
        `);
        await pool.query(`
            UPDATE vendor_services 
            SET public_id = CONCAT('srv_', id)
            WHERE public_id IS NULL OR public_id = ''
        `);
    } catch (e) {
        console.warn('[DB] startup migrations note:', e.message);
    }
};

const pool = getPool();
export default pool;
