import express from 'express';
import multer from 'multer';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';

import {protect} from '../middleware/auth.middleware.js';
import Card from '../models/Card.model.js';
import List from '../models/List.model.js';
import Board from '../models/Board.model.js';
import Activity from '../models/Activity.model.js';
import Notification from '../models/Notification.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/attachments');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, {recursive: true});
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {fileSize: 10 * 1024 * 1024}, // 10MB
});

// Helper function to check board access
const checkBoardAccess = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) return {hasAccess: false};

    if (board.owner.toString() === userId.toString()) {
        return {hasAccess: true};
    }

    const member = board.members.find(m => m.user.toString() === userId.toString());
    if (member) {
        return {hasAccess: true};
    }

    if (board.visibility === 'public') {
        return {hasAccess: true};
    }

    return {hasAccess: false};
};

// @route   GET /api/cards/:id
// @desc    Get single card
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id)
            .populate('list', 'title')
            .populate('board', 'title')
            .populate('members', 'name email avatar');

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board._id, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        // Populate comments
        const Comment = (await import('../models/Comment.model.js')).default;
        const comments = await Comment.find({card: card._id})
            .populate('author', 'name email avatar')
            .sort({createdAt: 1});

        res.json({
            success: true,
            card: {
                ...card.toObject(),
                comments
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/cards
// @desc    Create new card
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {title, listId, boardId, position} = req.body;

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({message: 'List not found'});
        }

        const {hasAccess} = await checkBoardAccess(boardId, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        const card = await Card.create({
            title,
            list: listId,
            board: boardId,
            position: position || 0
        });

        await Activity.create({
            type: 'card_created',
            board: boardId,
            card: card._id,
            list: listId,
            user: req.user._id,
            description: `${req.user.name} added "${card.title}" to ${list.title}`
        });

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${boardId}`).emit('card-created', {
                card: populatedCard,
                listId
            });
        }

        res.status(201).json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/cards/:id
// @desc    Update card
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        const {title, description, dueDate, startDate, priority, labels, cover} = req.body;

        const oldValues = {
            title: card.title,
            description: card.description,
            dueDate: card.dueDate,
            priority: card.priority
        };

        if (title !== undefined) card.title = title;
        if (description !== undefined) card.description = description;
        if (dueDate !== undefined) card.dueDate = dueDate;
        if (startDate !== undefined) card.startDate = startDate;
        if (priority !== undefined) card.priority = priority;
        if (labels !== undefined) card.labels = labels;
        if (cover !== undefined) card.cover = cover;

        await card.save();

        await Activity.create({
            type: 'card_updated',
            board: card.board,
            card: card._id,
            user: req.user._id,
            description: `${req.user.name} updated "${card.title}"`,
            oldValue: oldValues,
            newValue: {
                title: card.title,
                description: card.description,
                dueDate: card.dueDate,
                priority: card.priority
            }
        });

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${card.board}`).emit('card-updated', {
                card: populatedCard
            });
        }

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/cards/:id/move
// @desc    Move card to different list/position
// @access  Private
router.put('/:id/move', protect, async (req, res) => {
    try {
        const {listId, position} = req.body;
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        const oldListId = card.list.toString();
        const newList = await List.findById(listId);

        if (!newList) {
            return res.status(404).json({message: 'List not found'});
        }

        // Update positions of other cards in old list
        if (oldListId !== listId) {
            await Card.updateMany(
                {list: oldListId, position: {$gt: card.position}},
                {$inc: {position: -1}}
            );
        }

        // Update positions of cards in new list
        await Card.updateMany(
            {list: listId, position: {$gte: position}},
            {$inc: {position: 1}}
        );

        card.list = listId;
        card.position = position;
        await card.save();

        await Activity.create({
            type: 'card_moved',
            board: card.board,
            card: card._id,
            list: listId,
            user: req.user._id,
            description: `${req.user.name} moved "${card.title}" to ${newList.title}`
        });

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${card.board}`).emit('card-moved', {
                card: populatedCard,
                oldListId,
                newListId: listId
            });
        }

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/cards/:id/members
// @desc    Add member to card
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
    try {
        const {userId} = req.body;
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        if (!card.members.includes(userId)) {
            card.members.push(userId);
            await card.save();

            // Create notification
            await Notification.create({
                user: userId,
                type: 'card_assigned',
                title: 'You were assigned to a card',
                message: `${req.user.name} assigned you to "${card.title}"`,
                relatedCard: card._id,
                relatedBoard: card.board
            });
        }

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   DELETE /api/cards/:id/members/:userId
// @desc    Remove member from card
// @access  Private
router.delete('/:id/members/:userId', protect, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        card.members = card.members.filter(
            m => m.toString() !== req.params.userId
        );
        await card.save();

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/cards/:id/attachments
// @desc    Upload attachment to card
// @access  Private
router.post('/:id/attachments', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({message: 'No file uploaded'});
        }

        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        card.attachments.push({
            name: req.file.originalname,
            url: `/uploads/attachments/${req.file.filename}`,
            type: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user._id
        });

        await card.save();

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar')
            .populate('attachments.uploadedBy', 'name email avatar');

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/cards/:id/checklists
// @desc    Add checklist to card
// @access  Private
router.post('/:id/checklists', protect, async (req, res) => {
    try {
        const {title} = req.body;
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        card.checklists.push({title, items: []});
        await card.save();

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/cards/:id/checklists/:checklistId
// @desc    Update checklist
// @access  Private
router.put('/:id/checklists/:checklistId', protect, async (req, res) => {
    try {
        const {title, items} = req.body;
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        const checklist = card.checklists.id(req.params.checklistId);
        if (!checklist) {
            return res.status(404).json({message: 'Checklist not found'});
        }

        if (title !== undefined) checklist.title = title;
        if (items !== undefined) checklist.items = items;

        await card.save();

        const populatedCard = await Card.findById(card._id)
            .populate('members', 'name email avatar');

        res.json({
            success: true,
            card: populatedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   DELETE /api/cards/:id
// @desc    Delete card
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({message: 'Card not found'});
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        card.archived = true;
        await card.save();

        await Activity.create({
            type: 'card_deleted',
            board: card.board,
            card: card._id,
            user: req.user._id,
            description: `${req.user.name} archived "${card.title}"`
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${card.board}`).emit('card-deleted', {
                cardId: card._id,
                listId: card.list
            });
        }

        res.json({
            success: true,
            message: 'Card archived'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

export default router;
