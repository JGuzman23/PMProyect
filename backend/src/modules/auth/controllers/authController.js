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

      console.log('Login attempt for:', email);
      const result = await authService.login(email, password, companyId);
      console.log('Login successful for:', email);
      console.log('Result structure:', {
        hasUser: !!result.user,
        hasTokens: !!result.tokens,
        userKeys: result.user ? Object.keys(result.user) : [],
        tokensKeys: result.tokens ? Object.keys(result.tokens) : []
      });
      
      // Asegurar que la respuesta se envíe correctamente
      console.log('Sending response to client...');
      res.json(result);
      console.log('Response sent successfully');
    } catch (error) {
      console.error('Login error:', error);
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

