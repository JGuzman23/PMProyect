import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
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
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
});

projectSchema.index({ companyId: 1, status: 1 });

export const Project = mongoose.model('Project', projectSchema);









