import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#3B82F6'
  },
  companyId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

labelSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Label = mongoose.model('Label', labelSchema);






