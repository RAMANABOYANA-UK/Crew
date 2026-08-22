import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { queryGet, queryAll, queryRun, runTransaction } from '../database/init.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, 'leave-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const router = express.Router();

// GET /balances — employee's leave balances
router.get('/balances', requireAuth, (req, res) => {
    try {
        const balances = queryAll('SELECT * FROM leave_balances WHERE user_id = ?', [req.user.id]);
        res.json({ balances });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /requests — leave requests (admin: all, employee: own)
router.get('/requests', requireAuth, (req, res) => {
    try {
        let requests;
        if (req.user.role === 'admin') {
            requests = queryAll(`
                SELECT lr.*, u.name 
                FROM leave_requests lr 
                JOIN users u ON lr.user_id = u.id 
                WHERE u.company_id = ?
                ORDER BY lr.created_at DESC
            `, [req.user.companyId]);
        } else {
            requests = queryAll('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        }
        res.json({ requests });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /request — employee submits leave request
router.post('/request', requireAuth, upload.single('attachment'), (req, res) => {
    try {
        const { leave_type, start_date, end_date, days, reason } = req.body;
        
        if (!leave_type || !start_date || !end_date || !days) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check balance
        const balance = queryGet('SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ?', [req.user.id, leave_type]);
        if (balance && parseFloat(days) > balance.available_days && leave_type !== 'Unpaid Leave') {
            return res.status(400).json({ error: `Insufficient ${leave_type} balance. Available: ${balance.available_days} days` });
        }

        // Sick leave requires attachment
        if (leave_type === 'Sick Leave' && !req.file) {
            return res.status(400).json({ error: 'Sick certificate is required for Sick Leave' });
        }

        const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;

        const id = queryRun(`
            INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days, reason, attachment_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, leave_type, start_date, end_date, parseFloat(days), reason || null, attachmentPath]);

        // Notify admins
        const admins = queryAll('SELECT id FROM users WHERE company_id = ? AND role = ?', [req.user.companyId, 'admin']);
        const userName = queryGet('SELECT name FROM users WHERE id = ?', [req.user.id]);
        for (const admin of admins) {
            queryRun('INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)',
                [admin.id, 'leave_request', `${userName?.name} requested ${leave_type} (${days} day${parseFloat(days) > 1 ? 's' : ''})`, id]);
        }

        res.json({ success: true, id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /:id/approve — admin approves leave
router.put('/:id/approve', requireAdmin, (req, res) => {
    try {
        const request = queryGet('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

        runTransaction(() => {
            // Update request status
            queryRun('UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
                ['approved', req.user.id, new Date().toISOString(), req.params.id]);

            // Deduct balance
            queryRun('UPDATE leave_balances SET available_days = available_days - ?, used_days = used_days + ? WHERE user_id = ? AND leave_type = ?',
                [request.days, request.days, request.user_id, request.leave_type]);

            // Mark attendance as on-leave for those dates
            const start = new Date(request.start_date);
            const end = new Date(request.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const existing = queryGet('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [request.user_id, dateStr]);
                if (existing) {
                    queryRun('UPDATE attendance SET status = ? WHERE id = ?', ['on-leave', existing.id]);
                } else {
                    queryRun('INSERT INTO attendance (user_id, date, status) VALUES (?, ?, ?)', [request.user_id, dateStr, 'on-leave']);
                }
            }

            // Notify employee
            queryRun('INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)',
                [request.user_id, 'leave_approved', `Your ${request.leave_type} request has been approved`, request.id]);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /:id/reject — admin rejects leave
router.put('/:id/reject', requireAdmin, (req, res) => {
    try {
        const request = queryGet('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

        runTransaction(() => {
            queryRun('UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
                ['rejected', req.user.id, new Date().toISOString(), req.params.id]);

            queryRun('INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)',
                [request.user_id, 'leave_rejected', `Your ${request.leave_type} request has been rejected`, request.id]);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /allocations — admin gets company leave allocations
router.get('/allocations', requireAdmin, (req, res) => {
    try {
        const allocations = queryAll('SELECT * FROM leave_allocations WHERE company_id = ?', [req.user.companyId]);
        res.json({ allocations });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /allocations — admin updates allocations
router.put('/allocations', requireAdmin, (req, res) => {
    try {
        const { allocations } = req.body;
        if (!allocations || !Array.isArray(allocations)) {
            return res.status(400).json({ error: 'Invalid allocations data' });
        }

        runTransaction(() => {
            for (const alloc of allocations) {
                queryRun('UPDATE leave_allocations SET total_days = ? WHERE company_id = ? AND leave_type = ?',
                    [alloc.total_days, req.user.companyId, alloc.leave_type]);
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
