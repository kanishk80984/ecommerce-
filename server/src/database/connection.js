import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export const getDBName = () => process.env.DB_NAME || 'ecommerce_platform';

// Create a generic connection without specifying a database (to create DB if missing)
export const createDatabaseIfNotExists = async () => {
    const dbName = getDBName();
    console.log(`[DB Initialization] Checking if database '${dbName}' exists...`);
    const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    try {
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`[DB Initialization] ✓ Database '${dbName}' is ready.`);
    } catch (error) {
        console.error(`[DB Initialization] ❌ Failed to create database:`, error.message);
        throw error;
    } finally {
        await tempConn.end();
    }
};

// Singleton pool instance for normal queries
let pool;

export const getPool = () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: getDBName(),
            multipleStatements: true,
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0
        });
    }
    return pool;
};
