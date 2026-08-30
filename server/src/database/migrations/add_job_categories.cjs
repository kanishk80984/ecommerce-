const mysql = require('mysql2/promise');
require('dotenv').config(); // Automatically uses current working directory's .env

const categories = [
  { id: 94, name: "Admin Executive" },
  { id: 121, name: "Advocate" },
  { id: 130, name: "Agriculture Officer" },
  { id: 32, name: "AI / ML Engineer" },
  { id: 134, name: "Airport Operations" },
  { id: 115, name: "Architect" },
  { id: 18, name: "Artificial Intelligence" },
  { id: 77, name: "Assembly Operator" },
  { id: 46, name: "Auditor" },
  { id: 114, name: "Automobile Engineer" },
  { id: 23, name: "Backend Developer" },
  { id: 47, name: "Banking Officer" },
  { id: 68, name: "Business Development Executive" },
  { id: 132, name: "Cabin Crew" },
  { id: 40, name: "Call Center Executive" },
  { id: 104, name: "Cashier" },
  { id: 42, name: "Chat Support Executive" },
  { id: 98, name: "Chef" },
  { id: 111, name: "Civil Engineer" },
  { id: 29, name: "Cloud Engineer" },
  { id: 74, name: "CNC Operator" },
  { id: 123, name: "Company Secretary" },
  { id: 127, name: "Content Writer" },
  { id: 99, name: "Cook" },
  { id: 128, name: "Copy Writer" },
  { id: 39, name: "Customer Support Executive" },
  { id: 33, name: "Cyber Security" },
  { id: 20, name: "Data Analyst" },
  { id: 30, name: "Data Analyst" },
  { id: 17, name: "Data Science" },
  { id: 31, name: "Data Scientist" },
  { id: 35, name: "Database Administrator" },
  { id: 118, name: "Defence Jobs" },
  { id: 80, name: "Delivery Executive" },
  { id: 16, name: "DevOps" },
  { id: 28, name: "DevOps Engineer" },
  { id: 64, name: "Digital Marketing Executive" },
  { id: 53, name: "Doctor" },
  { id: 81, name: "Driver" },
  { id: 113, name: "Electrical Engineer" },
  { id: 109, name: "Electrician" },
  { id: 43, name: "Email Support Executive" },
  { id: 131, name: "Farm Supervisor" },
  { id: 70, name: "Field Sales Executive" },
  { id: 48, name: "Financial Analyst" },
  { id: 137, name: "Freelancer" },
  { id: 102, name: "Front Office Executive" },
  { id: 22, name: "Frontend Developer" },
  { id: 24, name: "Full Stack Developer" },
  { id: 116, name: "Government Jobs" },
  { id: 124, name: "Graphic Designer" },
  { id: 133, name: "Ground Staff" },
  { id: 59, name: "Hospital Administration" },
  { id: 97, name: "Hotel Staff" },
  { id: 101, name: "Housekeeping Staff" },
  { id: 90, name: "HR Executive" },
  { id: 92, name: "HR Manager" },
  { id: 91, name: "HR Recruiter" },
  { id: 50, name: "Insurance Advisor" },
  { id: 138, name: "Internship" },
  { id: 84, name: "Inventory Executive" },
  { id: 52, name: "Investment Advisor" },
  { id: 129, name: "Journalist" },
  { id: 56, name: "Lab Technician" },
  { id: 88, name: "Lecturer" },
  { id: 122, name: "Legal Advisor" },
  { id: 49, name: "Loan Officer" },
  { id: 83, name: "Logistics Coordinator" },
  { id: 73, name: "Machine Operator" },
  { id: 76, name: "Maintenance Engineer" },
  { id: 63, name: "Marketing Executive" },
  { id: 110, name: "Mechanical Engineer" },
  { id: 57, name: "Medical Coder" },
  { id: 58, name: "Medical Transcription" },
  { id: 108, name: "Merchandiser" },
  { id: 25, name: "Mobile App Developer" },
  { id: 13, name: "Mobile App Development" },
  { id: 125, name: "Motion Graphic Designer" },
  { id: 34, name: "Network Engineer" },
  { id: 38, name: "Non Voice Process" },
  { id: 54, name: "Nurse" },
  { id: 96, name: "Office Administrator" },
  { id: 93, name: "Office Assistant" },
  { id: 139, name: "Part Time Jobs" },
  { id: 55, name: "Pharmacist" },
  { id: 60, name: "Physiotherapist" },
  { id: 119, name: "Police Jobs" },
  { id: 71, name: "Production Engineer" },
  { id: 72, name: "Production Supervisor" },
  { id: 86, name: "Professor" },
  { id: 19, name: "Project Management" },
  { id: 136, name: "Property Consultant" },
  { id: 117, name: "Public Sector Jobs" },
  { id: 2, name: "Python" },
  { id: 27, name: "QA / Testing" },
  { id: 15, name: "Quality Assurance" },
  { id: 75, name: "Quality Inspector" },
  { id: 120, name: "Railway Jobs" },
  { id: 135, name: "Real Estate Executive" },
  { id: 95, name: "Receptionist" },
  { id: 69, name: "Relationship Manager" },
  { id: 103, name: "Restaurant Manager" },
  { id: 107, name: "Retail Executive" },
  { id: 106, name: "Sales Associate" },
  { id: 61, name: "Sales Executive" },
  { id: 62, name: "Sales Manager" },
  { id: 89, name: "School Coordinator" },
  { id: 66, name: "SEM Specialist" },
  { id: 65, name: "SEO Specialist" },
  { id: 112, name: "Site Engineer" },
  { id: 67, name: "Social Media Executive" },
  { id: 21, name: "Software Developer" },
  { id: 1, name: "Software Development" },
  { id: 105, name: "Store Manager" },
  { id: 82, name: "Supply Chain Executive" },
  { id: 51, name: "Tax Consultant" },
  { id: 85, name: "Teacher" },
  { id: 36, name: "Technical Support Engineer" },
  { id: 44, name: "Technical Support Executive" },
  { id: 41, name: "Telecaller" },
  { id: 87, name: "Trainer" },
  { id: 14, name: "UI/UX Design" },
  { id: 26, name: "UI/UX Designer" },
  { id: 126, name: "Video Editor" },
  { id: 37, name: "Voice Process" },
  { id: 100, name: "Waiter" },
  { id: 78, name: "Warehouse Executive" },
  { id: 79, name: "Warehouse Manager" },
  { id: 12, name: "Web Development" },
  { id: 140, name: "Work From Home" }
];

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ibc_mart'
  });

  try {
    console.log('Creating job_categories table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS job_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure slug is unique but handle the Data Analyst duplicate by appending -2
    console.log('Seeding initial categories...');
    
    for (const cat of categories) {
      let slug = slugify(cat.name);
      
      // Check if ID exists
      const [existing] = await db.query('SELECT id FROM job_categories WHERE id = ?', [cat.id]);
      if (existing.length === 0) {
        // Handle duplicate slug manually if needed
        const [existingSlug] = await db.query('SELECT id FROM job_categories WHERE slug = ?', [slug]);
        if (existingSlug.length > 0) {
          slug = slug + '-' + cat.id; // e.g., data-analyst-30
        }
        
        await db.query(
          'INSERT INTO job_categories (id, name, slug, status) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, slug, 'ACTIVE']
        );
      }
    }
    
    // Add foreign key to jobs table
    console.log('Adding foreign key to jobs table...');
    try {
      await db.query(`
        ALTER TABLE jobs
        ADD CONSTRAINT fk_jobs_category
        FOREIGN KEY (category_id) REFERENCES job_categories(id)
        ON DELETE RESTRICT
      `);
      console.log('Foreign key added successfully.');
    } catch (fkErr) {
      if (fkErr.code === 'ER_DUP_KEYNAME' || fkErr.code === 'ER_CANNOT_ADD_FOREIGN') {
        console.log('Foreign key may already exist or cannot be added (make sure data types match). Message:', fkErr.message);
      } else {
        console.log('Could not add foreign key:', fkErr.message);
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error during migration:', err.message);
  } finally {
    db.end();
  }
})();
