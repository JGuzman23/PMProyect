import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['empresa', 'persona'],
    required: true,
    default: 'persona'
  },
  // Campos comunes
  name: {
    type: String,
    required: true,
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
  phones: [{
    type: String,
    trim: true
  }],
  companyId: {
    type: String,
    required: true,
    index: true
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
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  // Campos específicos para tipo empresa
  company: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  // Agentes (PMs) asignados a la empresa
  agents: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    }
  }],
  // Campos específicos para tipo persona
  lastName: {
    type: String,
    trim: true
  },
  documentType: {
    type: String,
    enum: ['DNI', 'NIE', 'Pasaporte', 'Otro'],
    trim: true
  },
  documentNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

clientSchema.index({ companyId: 1, isActive: 1 });

export const Client = mongoose.model('Client', clientSchema);


