import { projectService } from '../services/projectService.js';

export const projectController = {
  async getAll(req, res, next) {
    try {
      const projects = await projectService.getAll(req.companyId, req.query);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const project = await projectService.getById(req.params.id, req.companyId);
      res.json(project);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const project = await projectService.create(req.body, req.companyId, req.userId);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const project = await projectService.update(req.params.id, req.companyId, req.body);
      res.json(project);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await projectService.delete(req.params.id, req.companyId);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};








