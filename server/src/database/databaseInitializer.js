import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { getPool, getDBName } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_DB = 'railway';

async function getSchemaDifferences(conn, expectedDb, actualDb) {
    const diffs = [];
    const warnings = [];
    const stats = {
        tables: 0, columns: 0, indexes: 0, foreignKeys: 0, enums: 0,
        constraints: 0, charsets: 0, collations: 0, engines: 0,
        views: 0, procedures: 0, triggers: 0, events: 0
    };

    // 1. Tables
    const [expTables] = await conn.query(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [expectedDb]);
    const [actTables] = await conn.query(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [actualDb]);

    stats.tables = expTables.length;
    stats.engines = expTables.length;
    stats.charsets = expTables.length;
    stats.collations = expTables.length;

    const expTableMap = new Map(expTables.map(t => [t.TABLE_NAME, t]));
    const actTableMap = new Map(actTables.map(t => [t.TABLE_NAME, t]));

    for (const [name, expTbl] of expTableMap) {
        if (!actTableMap.has(name)) {
            diffs.push(`Missing Table: ${name}`);
            continue;
        }
        const actTbl = actTableMap.get(name);
        if (expTbl.ENGINE !== actTbl.ENGINE) diffs.push(`Table ${name} Engine mismatch: expected ${expTbl.ENGINE}, got ${actTbl.ENGINE}`);
        if (expTbl.TABLE_COLLATION !== actTbl.TABLE_COLLATION) diffs.push(`Table ${name} Collation mismatch`);

        // AUTO_INCREMENT value is non-critical metadata
        if (expTbl.AUTO_INCREMENT !== actTbl.AUTO_INCREMENT) {
            warnings.push(`AUTO_INCREMENT mismatch on Table ${name} (Expected: ${expTbl.AUTO_INCREMENT}, Got: ${actTbl.AUTO_INCREMENT})`);
        }
    }

    // 2. Columns
    const [expCols] = await conn.query(`SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_TYPE, EXTRA, COLLATION_NAME, COLUMN_COMMENT, GENERATION_EXPRESSION FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`, [expectedDb]);
    const [actCols] = await conn.query(`SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_TYPE, EXTRA, COLLATION_NAME, COLUMN_COMMENT, GENERATION_EXPRESSION FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`, [actualDb]);

    stats.columns = expCols.length;
    stats.enums = expCols.filter(c => c.COLUMN_TYPE.startsWith('enum')).length;

    const expColMap = new Map(expCols.map(c => [`${c.TABLE_NAME}.${c.COLUMN_NAME}`, c]));
    const actColMap = new Map(actCols.map(c => [`${c.TABLE_NAME}.${c.COLUMN_NAME}`, c]));

    for (const [key, expC] of expColMap) {
        if (!actColMap.has(key)) {
            diffs.push(`Missing Column: ${key}`);
            continue;
        }
        const actC = actColMap.get(key);
        if (expC.ORDINAL_POSITION !== actC.ORDINAL_POSITION) diffs.push(`Column ${key} Order mismatch`);
        if (expC.COLUMN_TYPE !== actC.COLUMN_TYPE) diffs.push(`Column ${key} Type/Enum mismatch (Expected: ${expC.COLUMN_TYPE}, Got: ${actC.COLUMN_TYPE})`);
        if (expC.IS_NULLABLE !== actC.IS_NULLABLE) diffs.push(`Column ${key} Nullable mismatch`);
        if (expC.COLUMN_DEFAULT !== actC.COLUMN_DEFAULT) diffs.push(`Column ${key} Default mismatch`);
        if (expC.EXTRA !== actC.EXTRA) diffs.push(`Column ${key} Extra mismatch`); // This correctly verifies "auto_increment" attribute exists
        if (expC.COLLATION_NAME !== actC.COLLATION_NAME) diffs.push(`Column ${key} Collation mismatch`);
        if (expC.COLUMN_COMMENT !== actC.COLUMN_COMMENT) diffs.push(`Column ${key} Comment mismatch`);
        if (expC.GENERATION_EXPRESSION !== actC.GENERATION_EXPRESSION) diffs.push(`Column ${key} Generation Expression mismatch`);
    }

    // 3. Indexes
    const [expIdx] = await conn.query(`SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX, INDEX_TYPE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ?`, [expectedDb]);
    const [actIdx] = await conn.query(`SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX, INDEX_TYPE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ?`, [actualDb]);

    const uniqueExpIdxNames = new Set(expIdx.map(i => `${i.TABLE_NAME}.${i.INDEX_NAME}`));
    stats.indexes = uniqueExpIdxNames.size;

    const expIdxMap = new Map(expIdx.map(i => [`${i.TABLE_NAME}.${i.INDEX_NAME}.${i.SEQ_IN_INDEX}`, i]));
    const actIdxMap = new Map(actIdx.map(i => [`${i.TABLE_NAME}.${i.INDEX_NAME}.${i.SEQ_IN_INDEX}`, i]));

    for (const [key, expI] of expIdxMap) {
        if (!actIdxMap.has(key)) {
            diffs.push(`Missing/Altered Index: ${key}`);
            continue;
        }
        const actI = actIdxMap.get(key);
        if (expI.COLUMN_NAME !== actI.COLUMN_NAME) diffs.push(`Index ${key} Column mismatch`);
        if (expI.NON_UNIQUE !== actI.NON_UNIQUE) diffs.push(`Index ${key} Unique mismatch`);
        if (expI.INDEX_TYPE !== actI.INDEX_TYPE) diffs.push(`Index ${key} Type mismatch`);
    }

    // 4. Foreign Keys
    const [expFk] = await conn.query(`SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [expectedDb]);
    const [actFk] = await conn.query(`SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [actualDb]);

    stats.foreignKeys = expFk.length;
    stats.constraints = expFk.length;

    const expFkMap = new Map(expFk.map(f => [`${f.TABLE_NAME}.${f.CONSTRAINT_NAME}`, f]));
    const actFkMap = new Map(actFk.map(f => [`${f.TABLE_NAME}.${f.CONSTRAINT_NAME}`, f]));

    for (const [key, expF] of expFkMap) {
        if (!actFkMap.has(key)) {
            diffs.push(`Missing Foreign Key: ${key}`);
            continue;
        }
        const actF = actFkMap.get(key);
        if (expF.COLUMN_NAME !== actF.COLUMN_NAME) diffs.push(`FK ${key} Column mismatch`);
        if (expF.REFERENCED_TABLE_NAME !== actF.REFERENCED_TABLE_NAME) diffs.push(`FK ${key} Ref Table mismatch`);
        if (expF.REFERENCED_COLUMN_NAME !== actF.REFERENCED_COLUMN_NAME) diffs.push(`FK ${key} Ref Column mismatch`);
    }

    // Check Constraints
    try {
        const [expChecks] = await conn.query(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?`, [expectedDb]);
        const [actChecks] = await conn.query(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?`, [actualDb]);
        stats.constraints += expChecks.length;

        const expCheckMap = new Map(expChecks.map(c => [c.CONSTRAINT_NAME, c]));
        const actCheckMap = new Map(actChecks.map(c => [c.CONSTRAINT_NAME, c]));
        for (const [name, _] of expCheckMap) {
            if (!actCheckMap.has(name)) diffs.push(`Missing Check Constraint: ${name}`);
        }
    } catch (e) { }

    // 5. Views
    const [expViews] = await conn.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`, [expectedDb]);
    const [actViews] = await conn.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`, [actualDb]);
    stats.views = expViews.length;
    const expViewMap = new Map(expViews.map(v => [v.TABLE_NAME, v]));
    const actViewMap = new Map(actViews.map(v => [v.TABLE_NAME, v]));
    for (const [name, _] of expViewMap) {
        if (!actViewMap.has(name)) diffs.push(`Missing View: ${name}`);
    }

    // 6. Procedures
    const [expProcs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`, [expectedDb]);
    const [actProcs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`, [actualDb]);
    stats.procedures = expProcs.length;
    const expProcMap = new Map(expProcs.map(r => [r.ROUTINE_NAME, r]));
    const actProcMap = new Map(actProcs.map(r => [r.ROUTINE_NAME, r]));
    for (const [name, _] of expProcMap) {
        if (!actProcMap.has(name)) diffs.push(`Missing Procedure: ${name}`);
    }

    // Functions
    const [expFuncs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'`, [expectedDb]);
    const [actFuncs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'`, [actualDb]);
    const expFuncMap = new Map(expFuncs.map(r => [r.ROUTINE_NAME, r]));
    const actFuncMap = new Map(actFuncs.map(r => [r.ROUTINE_NAME, r]));
    for (const [name, _] of expFuncMap) {
        if (!actFuncMap.has(name)) diffs.push(`Missing Function: ${name}`);
    }

    // 7. Triggers
    const [expTriggers] = await conn.query(`SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = ?`, [expectedDb]);
    const [actTriggers] = await conn.query(`SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = ?`, [actualDb]);
    stats.triggers = expTriggers.length;
    const expTriggerMap = new Map(expTriggers.map(t => [t.TRIGGER_NAME, t]));
    const actTriggerMap = new Map(actTriggers.map(t => [t.TRIGGER_NAME, t]));
    for (const [name, _] of expTriggerMap) {
        if (!actTriggerMap.has(name)) diffs.push(`Missing Trigger: ${name}`);
    }

    // 8. Events
    const [expEvents] = await conn.query(`SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = ?`, [expectedDb]);
    const [actEvents] = await conn.query(`SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = ?`, [actualDb]);
    stats.events = expEvents.length;
    const expEventMap = new Map(expEvents.map(e => [e.EVENT_NAME, e]));
    const actEventMap = new Map(actEvents.map(e => [e.EVENT_NAME, e]));
    for (const [name, _] of expEventMap) {
        if (!actEventMap.has(name)) diffs.push(`Missing Event: ${name}`);
    }

    return { diffs, warnings, stats };
}

async function cloneDatabase(conn, sourceDb, targetDb) {
    console.log(`[DB Initialization] Cloning structure from \`${sourceDb}\` to \`${targetDb}\` object-by-object...`);

    await conn.query(`SET SESSION sql_mode = '';`);
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0;`);

    try {
        // Clone Tables
        const [tables] = await conn.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [sourceDb]);
        for (const { TABLE_NAME } of tables) {
            const [createTableRes] = await conn.query(`SHOW CREATE TABLE \`${sourceDb}\`.\`${TABLE_NAME}\``);
            const createStmt = createTableRes[0]['Create Table'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP TABLE IF EXISTS \`${TABLE_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE TABLE ${TABLE_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

        // Clone Views
        const [views] = await conn.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`, [sourceDb]);
        for (const { TABLE_NAME } of views) {
            const [createViewRes] = await conn.query(`SHOW CREATE VIEW \`${sourceDb}\`.\`${TABLE_NAME}\``);
            const createStmt = createViewRes[0]['Create View'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP VIEW IF EXISTS \`${TABLE_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE VIEW ${TABLE_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

        // Clone Procedures
        const [procs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`, [sourceDb]);
        for (const { ROUTINE_NAME } of procs) {
            const [createProcRes] = await conn.query(`SHOW CREATE PROCEDURE \`${sourceDb}\`.\`${ROUTINE_NAME}\``);
            const createStmt = createProcRes[0]['Create Procedure'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP PROCEDURE IF EXISTS \`${ROUTINE_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE PROCEDURE ${ROUTINE_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

        // Clone Functions
        const [funcs] = await conn.query(`SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'`, [sourceDb]);
        for (const { ROUTINE_NAME } of funcs) {
            const [createFuncRes] = await conn.query(`SHOW CREATE FUNCTION \`${sourceDb}\`.\`${ROUTINE_NAME}\``);
            const createStmt = createFuncRes[0]['Create Function'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP FUNCTION IF EXISTS \`${ROUTINE_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE FUNCTION ${ROUTINE_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

        // Clone Triggers
        const [triggers] = await conn.query(`SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = ?`, [sourceDb]);
        for (const { TRIGGER_NAME } of triggers) {
            const [createTriggerRes] = await conn.query(`SHOW CREATE TRIGGER \`${sourceDb}\`.\`${TRIGGER_NAME}\``);
            const createStmt = createTriggerRes[0]['SQL Original Statement'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP TRIGGER IF EXISTS \`${TRIGGER_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE TRIGGER ${TRIGGER_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

        // Clone Events
        const [events] = await conn.query(`SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = ?`, [sourceDb]);
        for (const { EVENT_NAME } of events) {
            const [createEventRes] = await conn.query(`SHOW CREATE EVENT \`${sourceDb}\`.\`${EVENT_NAME}\``);
            const createStmt = createEventRes[0]['Create Event'];
            await conn.query(`USE \`${targetDb}\``);
            await conn.query(`DROP EVENT IF EXISTS \`${EVENT_NAME}\``);
            try {
                await conn.query(createStmt);
            } catch (err) {
                console.error(`\n[DB Initialization] ❌ FAILED TO CREATE EVENT ${EVENT_NAME}:`);
                console.error(err.message);
                throw err;
            }
        }

    } finally {
        await conn.query(`SET FOREIGN_KEY_CHECKS = 1;`);
    }
}

export const initializeDatabase = async () => {
    console.log('\n=========================================');
    console.log(`[DB Initialization] Master Schema Exact Cloner`);
    console.log('=========================================');

    const dbName = getDBName();

    if (dbName.toLowerCase() === MASTER_DB.toLowerCase()) {
        console.log(`[DB Initialization] ⚠️ Target database is the master (\`${MASTER_DB}\`). Skipping initialization.`);
        return getPool();
    }

    const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        console.log(`[DB Initialization] Ensuring target database \`${dbName}\` exists...`);
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Check if master db exists
        const [dbs] = await tempConn.query(`SHOW DATABASES LIKE '${MASTER_DB}'`);
        if (dbs.length === 0) {
            console.error(`[DB Initialization] ❌ CRITICAL: Master database \`${MASTER_DB}\` does not exist on this server.`);
            throw new Error(`Master database ${MASTER_DB} not found.`);
        }

        let isIdentical = false;
        let retries = 3;
        let finalStats = null;
        let finalWarnings = [];

        while (!isIdentical && retries > 0) {
            console.log(`[DB Initialization] Verifying schema parity between \`${MASTER_DB}\` and \`${dbName}\`...`);
            const { diffs, warnings, stats } = await getSchemaDifferences(tempConn, MASTER_DB, dbName);

            if (diffs.length === 0) {
                isIdentical = true;
                finalStats = stats;
                finalWarnings = warnings;
                break;
            }

            console.error(`\n[DB Initialization] ❌ CRITICAL SCHEMA MISMATCH DETECTED! Found ${diffs.length} differences.`);
            console.error(`[DB Initialization] Exact mismatches:`);
            diffs.forEach(d => console.error(`   - ${d}`));

            console.log(`\n[DB Initialization] Fixing automatically...`);
            await cloneDatabase(tempConn, MASTER_DB, dbName);

            retries--;
        }

        if (isIdentical && finalStats) {
            console.log('\n=========================================');
            console.log(`✓ Database Structure Verified`);
            console.log(`✓ Tables Verified: ${finalStats.tables}`);
            console.log(`✓ Columns Verified: ${finalStats.columns}`);
            console.log(`✓ Indexes Verified: ${finalStats.indexes}`);
            console.log(`✓ Foreign Keys Verified: ${finalStats.foreignKeys}`);
            console.log(`✓ ENUM Verified: ${finalStats.enums}`);
            console.log(`✓ Constraints Verified: ${finalStats.constraints}`);
            console.log(`✓ Charset Verified: ${finalStats.charsets}`);
            console.log(`✓ Collation Verified: ${finalStats.collations}`);
            console.log(`✓ Engine Verified: ${finalStats.engines}`);
            console.log(`✓ Views Verified: ${finalStats.views}`);
            console.log(`✓ Procedures Verified: ${finalStats.procedures}`);
            console.log(`✓ Triggers Verified: ${finalStats.triggers}`);
            console.log(`✓ Events Verified: ${finalStats.events}`);

            if (finalWarnings.length > 0) {
                console.log('\n✓ Metadata Warnings (if any)');
                finalWarnings.forEach(w => console.log(`   - WARNING: ${w}`));
                console.log('\nDATABASE SCHEMA IS 100% IDENTICAL TO THE ORIGINAL new1 DATABASE.');
                console.log('Database initialized successfully with warnings.');
            } else {
                console.log('\n✓ Metadata Warnings (if any) (0 warnings)');
                console.log('\nDATABASE SCHEMA IS 100% IDENTICAL TO THE ORIGINAL new1 DATABASE.');
                console.log('Database initialized successfully.');
            }
            console.log('✓ Server Started Successfully');
            console.log('=========================================\n');

            console.log(`[DB Initialization] Copying Super Admin from \`${MASTER_DB}\` to \`${dbName}\`...`);
            const [superAdmins] = await tempConn.query(`SELECT * FROM \`${MASTER_DB}\`.users WHERE role='SUPER_ADMIN'`);

            if (superAdmins.length === 0) {
                console.error('\nCRITICAL ERROR');
                console.error('No SUPER_ADMIN found inside master database.');
                throw new Error('No SUPER_ADMIN found inside master database.');
            }

            for (const admin of superAdmins) {
                const [existing] = await tempConn.query(`SELECT id FROM \`${dbName}\`.users WHERE email = ?`, [admin.email]);
                if (existing.length === 0) {
                    const { id, ...adminWithoutId } = admin;
                    const columns = Object.keys(adminWithoutId).map(col => `\`${col}\``).join(', ');
                    const placeholders = Object.keys(adminWithoutId).map(() => '?').join(', ');
                    const values = Object.values(adminWithoutId);

                    await tempConn.query(
                        `INSERT INTO \`${dbName}\`.users (${columns}) VALUES (${placeholders})`,
                        values
                    );

                    console.log('\n✓ Super Admin copied successfully');
                    console.log(`Email:\n${admin.email}`);
                    console.log(`Role:\nSUPER_ADMIN`);
                }
            }

        } else {
            console.error('\n[DB Initialization] ❌ Failed to achieve 100% parity after multiple cloning attempts. Aborting.');
            throw new Error(`Failed to clone ${MASTER_DB} to ${dbName} perfectly.`);
        }

        await tempConn.end();
        return getPool();
    } catch (err) {
        console.error('[DB Initialization] ❌ Initialization failed completely:', err.message);
        if (tempConn) await tempConn.end();
        throw err;
    }
};
