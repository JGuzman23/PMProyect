import { supplierService } from '../services/supplierService.js';

export const supplierController = {
  async getAll(req, res, next) {
    try {
      const suppliers = await supplierService.getAll(req.companyId, req.query);
      res.json(suppliers);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const supplier = await supplierService.getById(req.params.id, req.companyId);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const supplier = await supplierService.create(req.body, req.companyId);
      res.status(201).json(supplier);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const supplier = await supplierService.update(req.params.id, req.companyId, req.body);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await supplierService.delete(req.params.id, req.companyId);
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
