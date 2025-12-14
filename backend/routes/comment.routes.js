import express from 'express';

import {protect} from '../middleware/auth.middleware.js';
import Comment from '../models/Comment.model.js';
import Card from '../models/Card.model.js';
import Board from '../models/Board.model.js';
import Activity from '../models/Activity.model.js';
import Notification from '../models/Notification.model.js';

const router = express.Router();

// Helper function to check board access
const checkBoardAccess = async (boardId, userId) => {
    const board = await Board.findById(boardId);

    if (!board) return {
        hasAccess: false
    };

    if (board.owner.toString() === userId.toString()) {
        return {
            hasAccess: true
        };
    }

    const member = board.members.find(m => m.user.toString() === userId.toString());
    if (member) {
        return {
            hasAccess: true
        };
    }

    if (board.visibility === 'public') {
        return {
            hasAccess: true
        };
    }

    return {
        hasAccess: false
    };
};

// @route   GET /api/comments/card/:cardId
// @desc    Get all comments for a card
// @access  Private
router.get('/card/:cardId', protect, async (req, res) => {
    try {
        const card = await Card.findById(req.params.cardId);
        if (!card) {
            return res.status(404).json({
                message: 'Card not found'
            });
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const comments = await Comment.find({
            card: req.params.cardId
        })
            .populate('author', 'name email avatar')
            .sort({createdAt: 1});

        res.json({
            success: true,
            comments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   POST /api/comments
// @desc    Create new comment
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {text, cardId} = req.body;

        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({
                message: 'Card not found'
            });
        }

        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const comment = await Comment.create({
            text,
            card: cardId,
            author: req.user._id
        });

        await Activity.create({
            type: 'comment_added',
            board: card.board,
            card: cardId,
            user: req.user._id,
            description: `${req.user.name} commented on "${card.title}"`
        });

        // Notify card members
        const mentionedUsers = text.match(/@(\w+)/g);
        if (mentionedUsers) {
            // Extract user IDs from mentions (simplified - in production, use proper user lookup)
            for (const memberId of card.members) {
                if (memberId.toString() !== req.user._id.toString()) {
                    await Notification.create({
                        user: memberId,
                        type: 'comment_added',
                        title: 'New comment',
                        message: `${req.user.name} commented on "${card.title}"`,
                        relatedCard: cardId,
                        relatedBoard: card.board
                    });
                }
            }
        }

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'name email avatar');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${card.board}`).emit('comment-added', {
                comment: populatedComment,
                cardId
            });
        }

        res.status(201).json({
            success: true,
            comment: populatedComment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   PUT /api/comments/:id
// @desc    Update comment
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const {text} = req.body;
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                message: 'Comment not found'
            });
        }

        if (comment.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'Not authorized'
            });
        }

        comment.text = text;
        comment.edited = true;
        comment.editedAt = new Date();
        await comment.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'name email avatar');

        res.json({
            success: true,
            comment: populatedComment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/comments/:id
// @desc    Delete comment
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                message: 'Comment not found'
            });
        }

        const card = await Card.findById(comment.card);
        const {hasAccess} = await checkBoardAccess(card.board, req.user._id);

        if (comment.author.toString() !== req.user._id.toString() && !hasAccess) {
            return res.status(403).json({
                message: 'Not authorized'
            });
        }

        await comment.deleteOne();

        res.json({
            success: true,
            message: 'Comment deleted'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

export default router;
