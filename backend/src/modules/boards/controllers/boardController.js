import { boardService } from '../services/boardService.js';

export const boardController = {
  async getAll(req, res, next) {
    try {
      const boards = await boardService.getAll(req.companyId, req.query);
      res.json(boards);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const board = await boardService.getById(req.params.id, req.companyId);
      res.json(board);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const board = await boardService.create(req.body, req.companyId, req.userId);
      res.status(201).json(board);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const board = await boardService.update(req.params.id, req.companyId, req.body);
      res.json(board);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await boardService.delete(req.params.id, req.companyId);
      res.json({ message: 'Board deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};









