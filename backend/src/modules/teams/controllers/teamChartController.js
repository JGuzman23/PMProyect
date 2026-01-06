import { teamChartService } from '../services/teamChartService.js';

export const teamChartController = {
  async getSettings(req, res, next) {
    try {
      const settings = await teamChartService.getSettings(req.companyId);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  },

  async savePositions(req, res, next) {
    try {
      const { orgNodes, flowNodes } = req.body;
      const settings = await teamChartService.savePositions(req.companyId, { orgNodes, flowNodes });
      res.json(settings);
    } catch (error) {
      next(error);
    }
  },

  async saveConnections(req, res, next) {
    try {
      const { connections } = req.body;
      const settings = await teamChartService.saveConnections(req.companyId, connections);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }
};

