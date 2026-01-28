import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

supplierSchema.index({ companyId: 1, isActive: 1 });
supplierSchema.index({ companyId: 1, name: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
