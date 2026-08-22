import express from 'express';
import { queryGet, queryAll, queryRun } from '../database/init.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /check-in
router.post('/check-in', requireAuth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        
        const existing = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
        if (existing && existing.check_in) {
            return res.status(400).json({ error: 'Already checked in today' });
        }

        if (existing) {
            queryRun('UPDATE attendance SET check_in = ?, status = ? WHERE id = ?', [now, 'present', existing.id]);
        } else {
            queryRun('INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, ?)', [req.user.id, today, now, 'present']);
        }

        res.json({ success: true, check_in: now });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /check-out
router.post('/check-out', requireAuth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const record = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
        if (!record || !record.check_in) {
            return res.status(400).json({ error: 'You have not checked in today' });
        }
        if (record.check_out) {
            return res.status(400).json({ error: 'Already checked out today' });
        }

        // Calculate work hours
        const [inH, inM] = record.check_in.split(':').map(Number);
        const [outH, outM] = now.split(':').map(Number);
        const workHours = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
        const extraHours = Math.max(0, workHours - 8);
        const status = workHours < 4 ? 'half-day' : 'present';

        queryRun('UPDATE attendance SET check_out = ?, work_hours = ?, extra_hours = ?, status = ? WHERE id = ?',
            [now, Math.round(workHours * 100) / 100, Math.round(extraHours * 100) / 100, status, record.id]);

        res.json({ success: true, check_out: now, work_hours: workHours, extra_hours: extraHours });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /today — current user's today record
router.get('/today', requireAuth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
        res.json({ attendance: attendance || null });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /my — own attendance for a month
router.get('/my', requireAuth, (req, res) => {
    try {
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const monthStr = String(month).padStart(2, '0');
        const datePrefix = `${year}-${monthStr}`;

        const attendance = queryAll(
            `SELECT * FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date`,
            [req.user.id, `${datePrefix}%`]
        );

        // Calculate summary
        const daysPresent = attendance.filter(a => a.status === 'present').length;
        const halfDays = attendance.filter(a => a.status === 'half-day').length;
        const leavesCount = attendance.filter(a => a.status === 'on-leave').length;
        
        // Calculate total working days in month (excluding weekends)
        const daysInMonth = new Date(year, month, 0).getDate();
        let totalWorkingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month - 1, d).getDay();
            if (day !== 0 && day !== 6) totalWorkingDays++;
        }

        res.json({
            attendance,
            summary: {
                days_present: daysPresent + halfDays * 0.5,
                leaves_count: leavesCount,
                total_working_days: totalWorkingDays
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /all — admin view: all employees for a date
router.get('/all', requireAdmin, (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // Get all employees with their attendance for the date
        const attendance = queryAll(`
            SELECT u.id as user_id, u.name, u.department, u.profile_photo,
                   COALESCE(a.check_in, '') as check_in,
                   COALESCE(a.check_out, '') as check_out,
                   COALESCE(a.work_hours, 0) as work_hours,
                   COALESCE(a.extra_hours, 0) as extra_hours,
                   COALESCE(a.status, 'absent') as status
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
            WHERE u.company_id = ?
            ORDER BY u.name
        `, [date, req.user.companyId]);

        res.json({ attendance });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
