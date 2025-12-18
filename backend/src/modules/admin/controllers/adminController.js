import { adminService } from '../services/adminService.js';

export const adminController = {
  // Labels
  async getAllLabels(req, res, next) {
    try {
      const labels = await adminService.getAllLabels(req.companyId);
      res.json(labels);
    } catch (error) {
      next(error);
    }
  },

  async getLabelById(req, res, next) {
    try {
      const label = await adminService.getLabelById(req.params.id, req.companyId);
      res.json(label);
    } catch (error) {
      next(error);
    }
  },

  async createLabel(req, res, next) {
    try {
      const label = await adminService.createLabel(req.body, req.companyId);
      res.status(201).json(label);
    } catch (error) {
      next(error);
    }
  },

  async updateLabel(req, res, next) {
    try {
      const label = await adminService.updateLabel(req.params.id, req.companyId, req.body);
      res.json(label);
    } catch (error) {
      next(error);
    }
  },

  async deleteLabel(req, res, next) {
    try {
      await adminService.deleteLabel(req.params.id, req.companyId);
      res.json({ message: 'Label deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Board Statuses
  async getAllStatuses(req, res, next) {
    try {
      const projectId = req.query.projectId || null;
      const statuses = await adminService.getAllStatuses(req.companyId, projectId);
      res.json(statuses);
    } catch (error) {
      next(error);
    }
  },

  async getStatusById(req, res, next) {
    try {
      const status = await adminService.getStatusById(req.params.id, req.companyId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  },

  async createStatus(req, res, next) {
    try {
      const status = await adminService.createStatus(req.body, req.companyId);
      res.status(201).json(status);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const status = await adminService.updateStatus(req.params.id, req.companyId, req.body);
      res.json(status);
    } catch (error) {
      next(error);
    }
  },

  async deleteStatus(req, res, next) {
    try {
      await adminService.deleteStatus(req.params.id, req.companyId);
      res.json({ message: 'Status deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

