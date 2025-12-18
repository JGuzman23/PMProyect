import { taskService } from '../services/taskService.js';

export const taskController = {
  async getAll(req, res, next) {
    try {
      const tasks = await taskService.getAll(req.companyId, req.query);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const task = await taskService.getById(req.params.id, req.companyId);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async getByBoard(req, res, next) {
    try {
      const tasks = await taskService.getByBoard(req.params.boardId, req.companyId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const task = await taskService.create(req.body, req.companyId, req.userId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const task = await taskService.update(req.params.id, req.companyId, req.body);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await taskService.delete(req.params.id, req.companyId);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async move(req, res, next) {
    try {
      const { columnId, order } = req.body;
      const task = await taskService.moveTask(req.params.id, req.companyId, columnId, order);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = `/uploads/tasks/${req.file.filename}`;
      res.json({
        url: fileUrl,
        name: req.file.originalname,
        title: req.body.title || req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  },

  async addComment(req, res, next) {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Comment text is required' });
      }

      const task = await taskService.addComment(
        req.params.id,
        req.companyId,
        req.userId,
        text.trim()
      );
      
      // Obtener el último comentario agregado
      const lastComment = task.comments[task.comments.length - 1];
      res.status(201).json(lastComment);
    } catch (error) {
      next(error);
    }
  }
};

