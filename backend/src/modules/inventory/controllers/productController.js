import { productService } from '../services/productService.js';

export const productController = {
  async getAll(req, res, next) {
    try {
      const products = await productService.getAll(req.companyId, req.query);
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id, req.companyId);
      res.json(product);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const product = await productService.create(req.body, req.companyId);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const product = await productService.update(req.params.id, req.companyId, req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id, req.companyId);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async updateStock(req, res, next) {
    try {
      const { quantity, operation } = req.body;
      const product = await productService.updateStock(
        req.params.id,
        req.companyId,
        quantity,
        operation || 'set'
      );
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
};
