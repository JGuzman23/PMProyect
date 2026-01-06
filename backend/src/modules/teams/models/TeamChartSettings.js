import mongoose from 'mongoose';

const teamChartSettingsSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  chartPositions: {
    orgNodes: [{
      id: String,
      x: Number,
      y: Number
    }],
    flowNodes: [{
      id: String,
      x: Number,
      y: Number
    }]
  },
  chartConnections: [{
    from: String,
    to: String,
    id: String
  }]
}, {
  timestamps: true
});

// Compound index for companyId uniqueness
teamChartSettingsSchema.index({ companyId: 1 }, { unique: true });

export const TeamChartSettings = mongoose.model('TeamChartSettings', teamChartSettingsSchema);

