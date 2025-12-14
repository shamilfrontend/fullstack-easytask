import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: Date
});

const checklistSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    items: [checklistItemSchema]
});

const attachmentSchema = new mongoose.Schema({
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const cardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a card title'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    list: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List',
        required: true
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
    labels: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dueDate: Date,
    startDate: Date,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    cover: {
        type: String,
        default: ''
    },
    attachments: [attachmentSchema],
    checklists: [checklistSchema],
    archived: {
        type: Boolean,
        default: false
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Card', cardSchema);
