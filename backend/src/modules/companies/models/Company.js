import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    maxUsers: {
      type: Number,
      default: 5 // Free plan default
    },
    maxProjects: {
      type: Number,
      default: 3 // Free plan default
    },
    maxStorage: {
      type: Number,
      default: 1000 // MB
    }
  },
  subscription: {
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    }
  }
}, {
  timestamps: true
});

export const Company = mongoose.model('Company', companySchema);






