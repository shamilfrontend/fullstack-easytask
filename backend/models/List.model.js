import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a list title'],
        trim: true
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true
    },
    position: {
        type: Number,
        default: 0
    },
    archived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('List', listSchema);
