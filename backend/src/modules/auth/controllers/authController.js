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
      // Obtener companyId del header si está disponible, sino será null y se buscará por email
      const companyId = req.companyId || null;

      const result = await authService.login(email, password, companyId);
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
      // Return avatar URL as stored in DB (should be full URL with domain)
      // If avatar is base64 (legacy), return null
      let avatarUrl = req.user.avatar || null;
      if (avatarUrl && avatarUrl.startsWith('data:image/')) {
        // Don't return base64, return null instead
        console.warn('Avatar in DB is base64 (legacy), should be URL. Returning null.');
        avatarUrl = null;
      }
      
      res.json({
        user: {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          companyId: req.user.companyId,
          avatar: avatarUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

