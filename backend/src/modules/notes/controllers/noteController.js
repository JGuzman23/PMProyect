import { noteService } from '../services/noteService.js';

export const noteController = {
  async getAll(req, res, next) {
    try {
      const notes = await noteService.getAllByUserId(req.userId);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const note = await noteService.getById(req.params.id, req.userId);
      res.json(note);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const note = await noteService.create({
        ...req.body,
        userId: req.userId
      });
      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const note = await noteService.update(req.params.id, req.userId, req.body);
      res.json(note);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await noteService.delete(req.params.id, req.userId);
      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
