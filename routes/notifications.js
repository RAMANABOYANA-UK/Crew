import express from 'express';
import { queryAll, queryRun } from '../database/init.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET / — get notifications for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const notifications = queryAll(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        const unreadCount = notifications.filter(n => !n.is_read).length;
        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /:id/read — mark single notification as read
router.put('/:id/read', requireAuth, (req, res) => {
    try {
        queryRun('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /read-all — mark all as read
router.put('/read-all', requireAuth, (req, res) => {
    try {
        queryRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
