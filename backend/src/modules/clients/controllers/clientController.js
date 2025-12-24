import { clientService } from '../services/clientService.js';

export const clientController = {
  async getAll(req, res, next) {
    try {
      const clients = await clientService.getAll(req.companyId, req.query);
      res.json(clients);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const client = await clientService.getById(req.params.id, req.companyId);
      res.json(client);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const client = await clientService.create(req.body, req.companyId);
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const client = await clientService.update(req.params.id, req.companyId, req.body);
      res.json(client);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await clientService.delete(req.params.id, req.companyId);
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};







