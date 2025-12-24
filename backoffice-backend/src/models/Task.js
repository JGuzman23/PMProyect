import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
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

export const Task = mongoose.model('Task', taskSchema);







