import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a board title'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'private'
    },
    background: {
        type: String,
        default: '#0079bf'
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member', 'viewer'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    labels: [{
        name: String,
        color: String
    }],
    archived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Board', boardSchema);

