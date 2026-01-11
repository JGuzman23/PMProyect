import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

export const Project = mongoose.model('Project', projectSchema);









