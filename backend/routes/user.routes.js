import express from 'express';
import multer from 'multer';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';

import { protect } from '../middleware/auth.middleware.js';
import User from '../models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, {recursive: true});
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                preferences: user.preferences,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const {name, preferences} = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (preferences) {
            user.preferences = {...user.preferences, ...preferences};
        }

        await user.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded'
            });
        }

        const user = await User.findById(req.user._id);

        // Delete old avatar if exists
        if (user.avatar && fs.existsSync(path.join(__dirname, '../', user.avatar))) {
            fs.unlinkSync(path.join(__dirname, '../', user.avatar));
        }

        user.avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();

        res.json({
            success: true,
            avatar: user.avatar
        });
    } catch (error) {
        console.error('error:', error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', protect, async (req, res) => {
    try {
        const {q} = req.query;
        if (!q || q.length < 2) {
            return res.json({success: true, users: []});
        }

        const users = await User.find({
            $or: [
                {name: {$regex: q, $options: 'i'}},
                {email: {$regex: q, $options: 'i'}}
            ],
            _id: {$ne: req.user._id}
        }).select('name email avatar').limit(10);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

export default router;
