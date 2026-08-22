import express from 'express';
import bcrypt from 'bcryptjs';
import { queryGet, queryAll, queryRun, runTransaction } from '../database/init.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { generateLoginId } from '../utils/loginIdGenerator.js';

const router = express.Router();

// GET / — list all employees with today's status
router.get('/', requireAuth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const employees = queryAll(`
            SELECT u.id, u.name, u.login_id, u.email, u.designation, u.department, u.role, u.profile_photo, u.manager_id,
                   COALESCE(a.status, 'absent') as today_status
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
            WHERE u.company_id = ?
            ORDER BY u.name
        `, [today, req.user.companyId]);
        res.json({ employees });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /:id — get full employee profile
router.get('/:id', requireAuth, (req, res) => {
    try {
        const id = req.params.id;
        const user = queryGet('SELECT * FROM users WHERE id = ? AND company_id = ?', [id, req.user.companyId]);
        if (!user) return res.status(404).json({ error: 'Employee not found' });

        // Resolve manager name for display
        let manager_name = null;
        if (user.manager_id) {
            const manager = queryGet('SELECT name FROM users WHERE id = ? AND company_id = ?', [user.manager_id, req.user.companyId]);
            manager_name = manager?.name || null;
        }

        const profile = queryGet('SELECT * FROM employee_profiles WHERE user_id = ?', [id]) || {};
        const skills = queryAll('SELECT * FROM skills WHERE user_id = ?', [id]);
        const certifications = queryAll('SELECT * FROM certifications WHERE user_id = ?', [id]);

        let salary = null;
        if (req.user.role === 'admin' || req.user.id == id) {
            salary = queryGet('SELECT * FROM salary_config WHERE user_id = ?', [id]);
        }

        delete user.password_hash;
        res.json({ user: { ...user, manager_name }, employee: { ...user, manager_name }, profile, skills, certifications, salary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST / — admin creates new employee
router.post('/', requireAdmin, (req, res) => {
    try {
        const { first_name, last_name, email, phone, department, designation, manager_id, date_of_joining } = req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }

        // Check email uniqueness
        const existing = queryGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const company = queryGet('SELECT * FROM companies WHERE id = ?', [req.user.companyId]);
        const joiningYear = date_of_joining ? new Date(date_of_joining).getFullYear() : new Date().getFullYear();
        const loginId = generateLoginId(company.name, first_name, last_name, joiningYear);

        const companyPrefix = company.name.substring(0, 2).toUpperCase();
        const tempPassword = `${companyPrefix}${joiningYear}!`;
        const passwordHash = bcrypt.hashSync(tempPassword, 10);
        const fullName = `${first_name} ${last_name}`;

        let newUserId;
        runTransaction(() => {
            newUserId = queryRun(`
                INSERT INTO users (company_id, login_id, email, name, first_name, last_name, phone, password_hash, role, department, designation, manager_id, is_verified, is_first_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'employee', ?, ?, ?, 1, 1)
            `, [req.user.companyId, loginId, email, fullName, first_name, last_name, phone || null, passwordHash, department || null, designation || null, manager_id || null]);

            queryRun('INSERT INTO employee_profiles (user_id, date_of_joining) VALUES (?, ?)', [newUserId, date_of_joining || new Date().toISOString().split('T')[0]]);
            queryRun('INSERT INTO salary_config (user_id) VALUES (?)', [newUserId]);

            // Create leave balances from company allocations
            const allocations = queryAll('SELECT * FROM leave_allocations WHERE company_id = ?', [req.user.companyId]);
            for (const alloc of allocations) {
                queryRun('INSERT INTO leave_balances (user_id, leave_type, available_days) VALUES (?, ?, ?)', [newUserId, alloc.leave_type, alloc.total_days]);
            }
        });

        res.json({
            employee: { id: newUserId, name: fullName, login_id: loginId },
            login_id: loginId,
            temp_password: tempPassword
        });
    } catch (err) {
        console.error('Create employee error:', err);
        res.status(400).json({ error: err.message });
    }
});

// PUT /:id — update employee profile
router.put('/:id', requireAuth, (req, res) => {
    try {
        const id = req.params.id;

        if (req.user.role !== 'admin' && req.user.id != id) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own profile' });
        }

        const { name, phone, department, designation, manager_id, profile_photo,
                about, job_love, interests_hobbies,
                date_of_birth, address, nationality, marital_status, gender,
                emergency_contact, date_of_joining } = req.body;

        runTransaction(() => {
            if (req.user.role === 'admin') {
                // Admin can update all user fields
                const updates = [];
                const params = [];
                if (name !== undefined) { updates.push('name = ?'); params.push(name); }
                if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
                if (department !== undefined) { updates.push('department = ?'); params.push(department); }
                if (designation !== undefined) { updates.push('designation = ?'); params.push(designation); }
                if (manager_id !== undefined) { updates.push('manager_id = ?'); params.push(manager_id || null); }
                if (profile_photo !== undefined) { updates.push('profile_photo = ?'); params.push(profile_photo); }
                if (updates.length > 0) {
                    params.push(id);
                    queryRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
                }
            } else {
                // Employee can only update limited fields
                const updates = [];
                const params = [];
                if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
                if (profile_photo !== undefined) { updates.push('profile_photo = ?'); params.push(profile_photo); }
                if (updates.length > 0) {
                    params.push(id);
                    queryRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
                }
            }

            // Update employee_profiles (both admin and employee can update these)
            const profUpdates = [];
            const profParams = [];
            const profFields = { about, job_love, interests_hobbies, address, emergency_contact };
            // Admin-only profile fields
            const adminProfFields = { date_of_birth, nationality, marital_status, gender, date_of_joining };

            for (const [key, val] of Object.entries(profFields)) {
                if (val !== undefined) { profUpdates.push(`${key} = ?`); profParams.push(val); }
            }
            if (req.user.role === 'admin') {
                for (const [key, val] of Object.entries(adminProfFields)) {
                    if (val !== undefined) { profUpdates.push(`${key} = ?`); profParams.push(val); }
                }
            }
            if (profUpdates.length > 0) {
                profParams.push(id);
                queryRun(`UPDATE employee_profiles SET ${profUpdates.join(', ')} WHERE user_id = ?`, profParams);
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /:id — admin deletes employee
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const id = req.params.id;
        if (req.user.id == id) return res.status(400).json({ error: 'Cannot delete yourself' });
        
        runTransaction(() => {
            queryRun('DELETE FROM skills WHERE user_id = ?', [id]);
            queryRun('DELETE FROM certifications WHERE user_id = ?', [id]);
            queryRun('DELETE FROM salary_config WHERE user_id = ?', [id]);
            queryRun('DELETE FROM attendance WHERE user_id = ?', [id]);
            queryRun('DELETE FROM leave_balances WHERE user_id = ?', [id]);
            queryRun('DELETE FROM leave_requests WHERE user_id = ?', [id]);
            queryRun('DELETE FROM notifications WHERE user_id = ?', [id]);
            queryRun('DELETE FROM employee_profiles WHERE user_id = ?', [id]);
            queryRun('DELETE FROM users WHERE id = ?', [id]);
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /:id/skills
router.post('/:id/skills', requireAuth, (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.id != req.params.id) return res.status(403).json({ error: 'Forbidden' });
        const { skill_name } = req.body;
        const id = queryRun('INSERT INTO skills (user_id, skill_name) VALUES (?, ?)', [req.params.id, skill_name]);
        res.json({ skill: { id, skill_name, user_id: parseInt(req.params.id) } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /:id/skills/:skillId
router.delete('/:id/skills/:skillId', requireAuth, (req, res) => {
    if (req.user.role !== 'admin' && req.user.id != req.params.id) return res.status(403).json({ error: 'Forbidden' });
    queryRun('DELETE FROM skills WHERE id = ? AND user_id = ?', [req.params.skillId, req.params.id]);
    res.json({ success: true });
});

// POST /:id/certifications
router.post('/:id/certifications', requireAuth, (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.id != req.params.id) return res.status(403).json({ error: 'Forbidden' });
        const { cert_name, cert_url } = req.body;
        const id = queryRun('INSERT INTO certifications (user_id, cert_name, cert_url) VALUES (?, ?, ?)', [req.params.id, cert_name, cert_url || null]);
        res.json({ certification: { id, cert_name, cert_url, user_id: parseInt(req.params.id) } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /:id/certifications/:certId
router.delete('/:id/certifications/:certId', requireAuth, (req, res) => {
    if (req.user.role !== 'admin' && req.user.id != req.params.id) return res.status(403).json({ error: 'Forbidden' });
    queryRun('DELETE FROM certifications WHERE id = ? AND user_id = ?', [req.params.certId, req.params.id]);
    res.json({ success: true });
});

export default router;
