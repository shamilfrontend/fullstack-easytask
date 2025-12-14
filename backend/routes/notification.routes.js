import express from 'express';

import { protect } from '../middleware/auth.middleware.js';
import Notification from '../models/Notification.model.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({
            user: req.user._id
        })
            .populate('relatedCard', 'title')
            .populate('relatedBoard', 'title')
            .sort({createdAt: -1})
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            read: false
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({message: 'Notification not found'});
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: 'Not authorized'});
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            {user: req.user._id, read: false},
            {read: true}
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                message: 'Notification not found'
            });
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'Not authorized'
            });
        }

        await notification.deleteOne();

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

export default router;
