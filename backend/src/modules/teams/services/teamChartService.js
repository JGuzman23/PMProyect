import { teamChartRepository } from '../repositories/teamChartRepository.js';

export const teamChartService = {
  async getSettings(companyId) {
    return await teamChartRepository.getSettings(companyId);
  },

  async savePositions(companyId, positions) {
    return await teamChartRepository.savePositions(companyId, positions);
  },

  async saveConnections(companyId, connections) {
    return await teamChartRepository.saveConnections(companyId, connections);
  }
};

