import { pool } from '../server/src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const [columns] = await pool.query('DESCRIBE jobs');
console.log(columns.map(c => ({ Field: c.Field, Type: c.Type })));
process.exit(0);
