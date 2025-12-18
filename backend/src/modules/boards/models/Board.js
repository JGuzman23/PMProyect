import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  columns: [{
    name: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    color: {
      type: String,
      default: '#94A3B8'
    }
  }],
  settings: {
    defaultView: {
      type: String,
      enum: ['board', 'list', 'calendar'],
      default: 'board'
    }
  }
}, {
  timestamps: true
});

boardSchema.index({ companyId: 1, projectId: 1 });

export const Board = mongoose.model('Board', boardSchema);





