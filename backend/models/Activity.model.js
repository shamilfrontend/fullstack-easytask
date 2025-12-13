import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['board_created', 'board_updated', 'board_deleted', 'card_created', 'card_updated', 'card_moved', 'card_deleted', 'comment_added', 'member_added', 'member_removed', 'list_created', 'list_updated', 'list_deleted'],
        required: true
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true
    },
    card: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    },
    list: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

export default mongoose.model('Activity', activitySchema);
