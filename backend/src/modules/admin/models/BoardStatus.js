import mongoose from 'mongoose';

const boardStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#94A3B8'
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

boardStatusSchema.index({ companyId: 1, boardId: 1 });

export const BoardStatus = mongoose.model('BoardStatus', boardStatusSchema);

