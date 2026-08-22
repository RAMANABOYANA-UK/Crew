import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { queryGet, queryRun, runTransaction } from '../database/init.js';
import { generateLoginId } from '../utils/loginIdGenerator.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'crew-hrms-secret-key-2026';

// POST /signup — create company + admin
router.post('/signup', upload.single('logo'), async (req, res) => {
    try {
        const { companyName, name, email, phone, password } = req.body;
        
        if (!companyName || !name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields: companyName, name, email, password' });
        }

        // Check if email already exists
        const existing = queryGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'Email already registered' });

        // Parse first/last name from full name
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || '';

        const logoPath = req.file ? `/uploads/${req.file.filename}` : null;

        let token, userData;

        runTransaction(() => {
            const companyId = queryRun('INSERT INTO companies (name, logo_path) VALUES (?, ?)', [companyName, logoPath]);

            // Default leave allocations
            queryRun('INSERT INTO leave_allocations (company_id, leave_type, total_days) VALUES (?, ?, ?)', [companyId, 'Paid Time Off', 24]);
            queryRun('INSERT INTO leave_allocations (company_id, leave_type, total_days) VALUES (?, ?, ?)', [companyId, 'Sick Leave', 7]);
            queryRun('INSERT INTO leave_allocations (company_id, leave_type, total_days) VALUES (?, ?, ?)', [companyId, 'Unpaid Leave', 365]);

            const currentYear = new Date().getFullYear();
            const loginId = generateLoginId(companyName, firstName, lastName, currentYear);
            const passwordHash = bcrypt.hashSync(password, 10);

            const userId = queryRun(`
                INSERT INTO users (company_id, login_id, email, name, first_name, last_name, phone, password_hash, role, is_verified, is_first_login) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 1, 0)
            `, [companyId, loginId, email, name, firstName, lastName, phone || null, passwordHash]);

            queryRun('INSERT INTO employee_profiles (user_id, date_of_joining) VALUES (?, ?)', [userId, new Date().toISOString().split('T')[0]]);
            queryRun('INSERT INTO salary_config (user_id) VALUES (?)', [userId]);

            // Create leave balances for admin
            queryRun('INSERT INTO leave_balances (user_id, leave_type, available_days) VALUES (?, ?, ?)', [userId, 'Paid Time Off', 24]);
            queryRun('INSERT INTO leave_balances (user_id, leave_type, available_days) VALUES (?, ?, ?)', [userId, 'Sick Leave', 7]);
            queryRun('INSERT INTO leave_balances (user_id, leave_type, available_days) VALUES (?, ?, ?)', [userId, 'Unpaid Leave', 365]);

            token = jwt.sign({ id: userId, role: 'admin', companyId }, JWT_SECRET, { expiresIn: '7d' });

            userData = {
                id: userId,
                login_id: loginId,
                email,
                name,
                role: 'admin',
                company_id: companyId,
                company_name: companyName,
                phone: phone || null
            };
        });

        res.json({ token, user: userData });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(400).json({ error: err.message });
    }
});

// POST /signin
router.post('/signin', async (req, res) => {
    try {
        const { loginId, password } = req.body;

        if (!loginId || !password) {
            return res.status(400).json({ error: 'Login ID/Email and password are required' });
        }

        // Try matching by login_id first, then by email
        let user = queryGet('SELECT * FROM users WHERE login_id = ?', [loginId]);
        if (!user) user = queryGet('SELECT * FROM users WHERE email = ?', [loginId]);

        if (!user) return res.status(404).json({ error: 'User not found. Check your Login ID or Email.' });

        const validPass = bcrypt.compareSync(password, user.password_hash);
        if (!validPass) return res.status(401).json({ error: 'Invalid password' });

        const company = queryGet('SELECT * FROM companies WHERE id = ?', [user.company_id]);

        const token = jwt.sign({ id: user.id, role: user.role, companyId: user.company_id }, JWT_SECRET, { expiresIn: '7d' });

        const { password_hash, ...safeUser } = user;

        res.json({
            token,
            user: { ...safeUser, company_name: company?.name, company_logo: company?.logo_path }
        });
    } catch (err) {
        console.error('Signin error:', err);
        res.status(400).json({ error: err.message });
    }
});

// PUT /change-password
router.put('/change-password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old and new password are required' });
        }

        const user = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const validPass = bcrypt.compareSync(oldPassword, user.password_hash);
        if (!validPass) return res.status(401).json({ error: 'Current password is incorrect' });

        const hash = bcrypt.hashSync(newPassword, 10);
        queryRun('UPDATE users SET password_hash = ?, is_first_login = 0 WHERE id = ?', [hash, req.user.id]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
