import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let SQL;
let inTransaction = false;
const dbPath = path.join(__dirname, 'crew.db');

export async function initDb() {
    if (db) return db;
    
    SQL = await initSqlJs();
    const dbDir = __dirname;
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(filebuffer);
    } else {
        db = new SQL.Database();
    }

    // Schema setup
    db.run(`
        CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo_path TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER REFERENCES companies(id), login_id TEXT UNIQUE, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, first_name TEXT, last_name TEXT, phone TEXT, password_hash TEXT NOT NULL, role TEXT DEFAULT 'employee' CHECK(role IN ('admin','employee')), is_verified INTEGER DEFAULT 0, is_first_login INTEGER DEFAULT 1, profile_photo TEXT, department TEXT, designation TEXT, manager_id INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS employee_profiles (user_id INTEGER PRIMARY KEY REFERENCES users(id), about TEXT, job_love TEXT, interests_hobbies TEXT, date_of_birth TEXT, address TEXT, nationality TEXT, marital_status TEXT, gender TEXT, emergency_contact TEXT, date_of_joining TEXT);
        CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), skill_name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS certifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), cert_name TEXT NOT NULL, cert_url TEXT);
        CREATE TABLE IF NOT EXISTS salary_config (user_id INTEGER PRIMARY KEY REFERENCES users(id), month_wage REAL DEFAULT 0, yearly_wage REAL DEFAULT 0, working_days_per_week INTEGER DEFAULT 5, break_hours_per_day REAL DEFAULT 1, basic_salary_type TEXT DEFAULT 'percentage', basic_salary_value REAL DEFAULT 50, standard_allowance_type TEXT DEFAULT 'percentage', standard_allowance_value REAL DEFAULT 4.16, performance_bonus_type TEXT DEFAULT 'percentage', performance_bonus_value REAL DEFAULT 8.33, lta_type TEXT DEFAULT 'percentage', lta_value REAL DEFAULT 8.33, fixed_allowance_type TEXT DEFAULT 'fixed', fixed_allowance_value REAL DEFAULT 0, hra_type TEXT DEFAULT 'percentage', hra_value REAL DEFAULT 50, pf_employer_pct REAL DEFAULT 12, pf_employee_pct REAL DEFAULT 12, pf_rate REAL DEFAULT 12, professional_tax REAL DEFAULT 200);
        CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), date TEXT NOT NULL, check_in TEXT, check_out TEXT, status TEXT DEFAULT 'absent' CHECK(status IN ('present','absent','half-day','on-leave')), work_hours REAL DEFAULT 0, extra_hours REAL DEFAULT 0, UNIQUE(user_id, date));
        CREATE TABLE IF NOT EXISTS leave_allocations (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER REFERENCES companies(id), leave_type TEXT NOT NULL, total_days INTEGER NOT NULL, UNIQUE(company_id, leave_type));
        CREATE TABLE IF NOT EXISTS leave_balances (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), leave_type TEXT NOT NULL, available_days REAL NOT NULL, used_days REAL DEFAULT 0, UNIQUE(user_id, leave_type));
        CREATE TABLE IF NOT EXISTS leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, days REAL NOT NULL, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), attachment_path TEXT, reason TEXT, created_at TEXT DEFAULT (datetime('now')), reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT);
        CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), type TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER DEFAULT 0, reference_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
    `);
    
    saveDb();
    console.log('Database initialized successfully');
    return db;
}

export function saveDb() {
    if (db) {
        try {
            const data = db.export();
            fs.writeFileSync(dbPath, Buffer.from(data));
        } catch (e) {
            console.error('Failed to save DB:', e.message);
        }
    }
}

export function queryAll(sql, params = []) {
    if (!db) throw new Error("DB not initialized");
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

export function queryGet(sql, params = []) {
    if (!db) throw new Error("DB not initialized");
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

export function queryRun(sql, params = []) {
    if (!db) throw new Error("DB not initialized");
    db.run(sql, params);
    
    // Only save to disk if not in a transaction (transaction will save at commit)
    if (!inTransaction) {
        saveDb();
    }
    
    // Return last inserted row id
    const res = queryGet("SELECT last_insert_rowid() as id");
    return res ? res.id : null;
}

export function runTransaction(callback) {
    if (!db) throw new Error("DB not initialized");
    inTransaction = true;
    db.run("BEGIN TRANSACTION");
    try {
        const result = callback();
        db.run("COMMIT");
        inTransaction = false;
        saveDb();
        return result;
    } catch (e) {
        try { db.run("ROLLBACK"); } catch (re) { /* ignore rollback errors */ }
        inTransaction = false;
        throw e;
    }
}
