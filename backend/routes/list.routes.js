import express from 'express';
import {protect} from '../middleware/auth.middleware.js';
import List from '../models/List.model.js';
import Board from '../models/Board.model.js';
import Card from '../models/Card.model.js';
import Activity from '../models/Activity.model.js';

const router = express.Router();

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

// @route   POST /api/lists
// @desc    Create new list
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {title, boardId, position} = req.body;

        const {hasAccess} = await checkBoardAccess(boardId, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        const list = await List.create({
            title,
            board: boardId,
            position: position || 0
        });

        await Activity.create({
            type: 'list_created',
            board: boardId,
            list: list._id,
            user: req.user._id,
            description: `${req.user.name} added list "${list.title}"`
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${boardId}`).emit('list-created', {
                list
            });
        }

        res.status(201).json({
            success: true,
            list
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   PUT /api/lists/:id
// @desc    Update list
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const {title, position} = req.body;
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({message: 'List not found'});
        }

        const {hasAccess} = await checkBoardAccess(list.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        if (title !== undefined) list.title = title;
        if (position !== undefined) list.position = position;

        await list.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${list.board}`).emit('list-updated', {
                list
            });
        }

        res.json({
            success: true,
            list
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

// @route   DELETE /api/lists/:id
// @desc    Delete list
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({message: 'List not found'});
        }

        const {hasAccess} = await checkBoardAccess(list.board, req.user._id);
        if (!hasAccess) {
            return res.status(403).json({message: 'Access denied'});
        }

        // Archive all cards in the list
        await Card.updateMany(
            {list: list._id},
            {archived: true}
        );

        list.archived = true;
        await list.save();

        await Activity.create({
            type: 'list_deleted',
            board: list.board,
            list: list._id,
            user: req.user._id,
            description: `${req.user.name} archived list "${list.title}"`
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`board-${list.board}`).emit('list-deleted', {
                listId: list._id
            });
        }

        res.json({
            success: true,
            message: 'List archived'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

export default router;

