import { hashPassword, comparePassword } from '../../../utils/password.js';
import { generateTokens, verifyToken } from '../../../utils/jwt.js';
import { authRepository } from '../repositories/authRepository.js';

export const authService = {
  async register(data) {
    const { email, password, firstName, lastName, companyName, subdomain } = data;

    // Check if company subdomain already exists
    const existingCompany = await authRepository.findCompanyBySubdomain(subdomain);
    if (existingCompany) {
      throw new Error('Subdomain already taken');
    }

    // Create company
    const company = await authRepository.createCompany({
      name: companyName,
      subdomain,
      plan: 'free',
      isActive: true
    });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const user = await authRepository.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      companyId: subdomain,
      role: 'admin',
      isActive: true
    });

    // Validar que el usuario tenga un ID válido
    if (!user._id) {
      console.error('Error: User object does not have a valid _id after creation');
      throw new Error('Failed to create user account');
    }

    try {
      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      // Update user with refresh token
      await authRepository.updateUserRefreshToken(user._id, refreshToken);

      return {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId
        },
        company: {
          id: company._id,
          name: company.name,
          subdomain: company.subdomain,
          plan: company.plan
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      console.error('Error during token generation or user update in register:', error);
      if (error.message.includes('JWT') || error.message.includes('token')) {
        throw new Error('Registration service error: ' + error.message);
      }
      throw error;
    }

  },

  async login(email, password, companyId = null) {
    let user;
    
    // Si hay companyId, buscar por email y companyId
    if (companyId) {
      user = await authRepository.findUserByEmail(email, companyId);
    } else {
      // Si no hay companyId, buscar solo por email (asumimos que el email es único o tomamos el primero)
      const { User } = await import('../../users/models/User.js');
      user = await User.findOne({ email }).select('+password');

      console.log('user', user);
    }
    
    if (!user) {
      console.log('user not found');
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      console.log('user is inactive');
      throw new Error('Account is inactive');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.log('password is invalid');
      throw new Error('Invalid credentials');
    }

    // Validar que el usuario tenga un ID válido
    if (!user._id) {
      console.error('Error: User object does not have a valid _id');
      throw new Error('User data is invalid');
    }

    try {
      console.log('Calling generateTokens with userId:', user._id.toString());
      const tokens = generateTokens(user._id.toString());
      console.log('Tokens received from generateTokens:', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        accessTokenLength: tokens.accessToken ? tokens.accessToken.length : 0,
        refreshTokenLength: tokens.refreshToken ? tokens.refreshToken.length : 0
      });

      const { accessToken, refreshToken } = tokens;
      console.log('About to update user refresh token in database...');
      await authRepository.updateUserRefreshToken(user._id, refreshToken);
      console.log('User refresh token updated successfully');

      // Asegurar que todos los valores se serialicen correctamente
      console.log('Creating response object...');
      const response = {
        user: {
          id: user._id ? user._id.toString() : null,
          email: user.email || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          role: user.role || null,
          companyId: user.companyId || null
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };

      console.log('Response object created, returning...');
      return response;
    } catch (error) {
      console.error('Error during token generation or user update:', error);
      console.error('Error stack:', error.stack);
      // Si el error es de generación de tokens, propagarlo con un mensaje más claro
      if (error.message.includes('JWT') || error.message.includes('token')) {
        throw new Error('Authentication service error: ' + error.message);
      }
      throw error;
    }
  },

  async refreshAccessToken(refreshToken, companyId = null) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      const decoded = verifyToken(refreshToken, true);
      
      // Buscar usuario por userId y companyId (si se proporciona)
      let user;
      if (companyId) {
        user = await authRepository.findUserById(decoded.userId, companyId);
      } else {
        // Si no hay companyId, buscar solo por userId
        const { User } = await import('../../users/models/User.js');
        user = await User.findById(decoded.userId).select('-password');
      }

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.refreshToken || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // Validar que el usuario tenga un ID válido
      if (!user._id) {
        console.error('Error: User object does not have a valid _id');
        throw new Error('User data is invalid');
      }

      const { accessToken } = generateTokens(user._id.toString());
      return { accessToken };
    } catch (error) {
      if (error.message === 'User not found' || error.message === 'Invalid refresh token' || error.message === 'User account is inactive') {
        throw error;
      }
      throw new Error('Invalid refresh token');
    }
  },

  async logout(userId) {
    await authRepository.updateUserRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }
};

