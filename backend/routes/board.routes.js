import express from 'express';
import {protect} from '../middleware/auth.middleware.js';
import Board from '../models/Board.model.js';
import List from '../models/List.model.js';
import Card from '../models/Card.model.js';
import Comment from '../models/Comment.model.js';
import Activity from '../models/Activity.model.js';
import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';

const router = express.Router();

// Helper function to check board access
const checkBoardAccess = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) return {hasAccess: false, board: null};

    // Owner has access
    if (board.owner.toString() === userId.toString()) {
        return {hasAccess: true, board, role: 'owner'};
    }

    // Check if user is a member
    const member = board.members.find(m => m.user.toString() === userId.toString());
    if (member) {
        return {hasAccess: true, board, role: member.role};
    }

    // Public boards are accessible
    if (board.visibility === 'public') {
        return {hasAccess: true, board, role: 'viewer'};
    }

    return {hasAccess: false, board: null};
};

// @route   GET /api/boards
// @desc    Get all boards for user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const boards = await Board.find({
            $or: [
                {owner: req.user._id},
                {'members.user': req.user._id},
                {visibility: 'public'}
            ],
            archived: false
        })
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar')
            .sort({updatedAt: -1});

        res.json({
            success: true,
            boards
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   GET /api/boards/:id
// @desc    Get single board
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const {hasAccess, board} = await checkBoardAccess(req.params.id, req.user._id);

        if (!hasAccess || !board) {
            return res.status(403).json({message: 'Access denied'});
        }

        const lists = await List.find({board: board._id, archived: false})
            .sort({position: 1})
            .lean();

        // Get cards for each list with comment counts
        const allCardIds = [];
        for (let list of lists) {
            const cards = await Card.find({list: list._id, archived: false})
                .populate('members', 'name email avatar')
                .sort({position: 1})
                .lean();
            list.cards = cards || [];
            allCardIds.push(...cards.map(c => c._id));
        }

        // Get comment counts for all cards in one query
        const commentCounts = await Comment.aggregate([
            {$match: {card: {$in: allCardIds}}},
            {$group: {_id: '$card', count: {$sum: 1}}}
        ]);

        const commentCountMap = {};
        commentCounts.forEach(item => {
            commentCountMap[item._id.toString()] = item.count;
        });

        // Add comment counts to cards
        for (let list of lists) {
            if (list.cards) {
                list.cards = list.cards.map(card => ({
                    ...card,
                    commentCount: commentCountMap[card._id.toString()] || 0
                }));
            }
        }

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar')
            .lean();

        res.json({
            success: true,
            board: {
                ...populatedBoard,
                lists
            }
        });
    } catch (error) {
        console.error('Error fetching board:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
});

// @route   POST /api/boards
// @desc    Create new board
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {title, description, visibility, background} = req.body;

        const board = await Board.create({
            title,
            description: description || '',
            owner: req.user._id,
            visibility: visibility || 'private',
            background: background || '#0079bf',
            members: [{
                user: req.user._id,
                role: 'owner'
            }]
        });

        await Activity.create({
            type: 'board_created',
            board: board._id,
            user: req.user._id,
            description: `${req.user.name} created this board`
        });

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        res.status(201).json({
            success: true,
            board: populatedBoard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/boards/:id
// @desc    Update board
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const {hasAccess, board, role} = await checkBoardAccess(req.params.id, req.user._id);

        if (!hasAccess || !board) {
            return res.status(403).json({message: 'Access denied'});
        }

        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({message: 'Insufficient permissions'});
        }

        const {title, description, visibility, background, labels} = req.body;

        if (title) board.title = title;
        if (description !== undefined) board.description = description;
        if (visibility) board.visibility = visibility;
        if (background) board.background = background;
        if (labels) board.labels = labels;

        await board.save();

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        res.json({
            success: true,
            board: populatedBoard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   DELETE /api/boards/:id
// @desc    Delete board
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({message: 'Board not found'});
        }

        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: 'Only owner can delete board'});
        }

        board.archived = true;
        await board.save();

        res.json({
            success: true,
            message: 'Board archived'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   POST /api/boards/:id/members
// @desc    Add member to board
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
    try {
        const {hasAccess, board, role} = await checkBoardAccess(req.params.id, req.user._id);

        if (!hasAccess || !board) {
            return res.status(403).json({message: 'Access denied'});
        }

        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({message: 'Insufficient permissions'});
        }

        const {userId, memberRole} = req.body;

        // Check if user is already a member
        const existingMember = board.members.find(m => m.user.toString() === userId);
        if (existingMember) {
            return res.status(400).json({message: 'User is already a member'});
        }

        board.members.push({
            user: userId,
            role: memberRole || 'member'
        });

        await board.save();

        // Create notification
        await Notification.create({
            user: userId,
            type: 'board_invited',
            title: 'You were invited to a board',
            message: `${req.user.name} invited you to join "${board.title}"`,
            relatedBoard: board._id
        });

        // Create activity
        const invitedUser = await User.findById(userId);
        await Activity.create({
            type: 'member_added',
            board: board._id,
            user: req.user._id,
            description: `${req.user.name} added ${invitedUser.name} to this board`
        });

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${board._id}`).emit('member-added', {
                board: populatedBoard,
                addedUser: invitedUser
            });
        }

        res.json({
            success: true,
            board: populatedBoard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   DELETE /api/boards/:id/members/:userId
// @desc    Remove member from board
// @access  Private
router.delete('/:id/members/:userId', protect, async (req, res) => {
    try {
        const {hasAccess, board, role} = await checkBoardAccess(req.params.id, req.user._id);

        if (!hasAccess || !board) {
            return res.status(403).json({message: 'Access denied'});
        }

        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({message: 'Insufficient permissions'});
        }

        board.members = board.members.filter(
            m => m.user.toString() !== req.params.userId
        );

        await board.save();

        const removedUser = await User.findById(req.params.userId);
        await Activity.create({
            type: 'member_removed',
            board: board._id,
            user: req.user._id,
            description: `${req.user.name} removed ${removedUser.name} from this board`
        });

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${board._id}`).emit('member-removed', {
                board: populatedBoard,
                removedUserId: req.params.userId
            });
        }

        res.json({
            success: true,
            board: populatedBoard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

export default router;
