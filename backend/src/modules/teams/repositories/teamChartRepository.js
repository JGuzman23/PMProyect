import { TeamChartSettings } from '../models/TeamChartSettings.js';

export const teamChartRepository = {
  async getSettings(companyId) {
    let settings = await TeamChartSettings.findOne({ companyId });
    
    if (!settings) {
      // Create default settings if they don't exist
      settings = new TeamChartSettings({
        companyId,
        chartPositions: {
          orgNodes: [],
          flowNodes: []
        },
        chartConnections: []
      });
      await settings.save();
    }
    
    return settings;
  },

  async savePositions(companyId, positions) {
    let settings = await TeamChartSettings.findOne({ companyId });
    
    if (!settings) {
      settings = new TeamChartSettings({
        companyId,
        chartPositions: positions,
        chartConnections: []
      });
    } else {
      settings.chartPositions = positions;
    }
    
    await settings.save();
    return settings;
  },

  async saveConnections(companyId, connections) {
    let settings = await TeamChartSettings.findOne({ companyId });
    
    if (!settings) {
      settings = new TeamChartSettings({
        companyId,
        chartPositions: {
          orgNodes: [],
          flowNodes: []
        },
        chartConnections: connections
      });
    } else {
      settings.chartConnections = connections;
    }
    
    await settings.save();
    return settings;
  }
};

