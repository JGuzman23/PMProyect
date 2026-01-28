import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  reference: {
    type: String,
    trim: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    index: true
  },
  unitOfMeasure: {
    type: String,
    required: true,
    enum: ['unidad', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'm²', 'm³', 'caja', 'paquete', 'otro'],
    default: 'unidad'
  },
  customUnit: {
    type: String,
    trim: true
  },
  supplier: {
    name: {
      type: String,
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
    }
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  price: {
    type: Number,
    min: 0,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
  },
  location: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
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
  },
  image: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

productSchema.index({ companyId: 1, isActive: 1 });
productSchema.index({ companyId: 1, reference: 1 });
productSchema.index({ companyId: 1, barcode: 1 });
productSchema.index({ companyId: 1, name: 1 });

export const Product = mongoose.model('Product', productSchema);
