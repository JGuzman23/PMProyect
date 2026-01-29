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
  agentIds: [{
    type: String,
    trim: true
  }],
  agentNames: [{
    type: String,
    trim: true
  }],
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
  taskId: {
    type: String,
    trim: true,
    index: true
  },
  attachments: [{
    url: String,
    name: String,
    title: String,
    size: Number,
    statusId: String,
    statusName: String,
    uploadedAt: Date
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: Date
  }],
  activityLog: [{
    type: {
      type: String,
      enum: ['created', 'status_changed', 'priority_changed', 'assignees_changed', 'client_changed', 'due_date_changed', 'start_date_changed', 'title_changed', 'description_changed', 'comment_added', 'attachment_added', 'attachment_removed'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

taskSchema.index({ companyId: 1, boardId: 1, columnId: 1 });
taskSchema.index({ companyId: 1, projectId: 1 });
taskSchema.index({ companyId: 1, assignees: 1 });

export const Task = mongoose.model('Task', taskSchema);


