import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['card_assigned', 'card_mentioned', 'card_due', 'board_invited', 'comment_added', 'card_moved'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedCard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    },
    relatedBoard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board'
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Notification', notificationSchema);

