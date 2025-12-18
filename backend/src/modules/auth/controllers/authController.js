import { authService } from '../services/authService.js';

export const authController = {
  async register(req, res, next) {
    try {
      const data = req.body;
      const result = await authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const companyId = req.companyId;

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const result = await authService.login(email, password, companyId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const companyId = req.companyId; // Obtener companyId del middleware de tenant
      const result = await authService.refreshAccessToken(refreshToken, companyId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.userId);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      res.json({
        user: {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          companyId: req.user.companyId
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

