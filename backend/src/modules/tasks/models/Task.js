import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
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
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  columnId: {
    type: String,
    required: true
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  agentId: {
    type: String,
    trim: true
  },
  agentName: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  dueDate: Date,
  startDate: Date,
  order: {
    type: Number,
    default: 0
  },
  attachments: [{
    url: String,
    name: String,
    size: Number,
    uploadedAt: Date
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: Date
  }]
}, {
  timestamps: true
});

taskSchema.index({ companyId: 1, boardId: 1, columnId: 1 });
taskSchema.index({ companyId: 1, projectId: 1 });
taskSchema.index({ companyId: 1, assignees: 1 });

export const Task = mongoose.model('Task', taskSchema);


