import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Please add a comment text']
    },
    card: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: Date
}, {
    timestamps: true
});

export default mongoose.model('Comment', commentSchema);

