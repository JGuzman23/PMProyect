import { userService } from '../services/userService.js';

export const userController = {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAll(req.companyId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id, req.companyId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body, req.companyId);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.companyId, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id, req.companyId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await userService.update(req.params.id, req.companyId, { avatar: avatarUrl });
      res.json({ avatar: avatarUrl, user });
    } catch (error) {
      next(error);
    }
  },

  async removeAvatar(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.companyId, { avatar: null });
      res.json({ message: 'Avatar removed successfully', user });
    } catch (error) {
      next(error);
    }
  }
};








