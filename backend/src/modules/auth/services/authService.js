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
  },

  async login(email, password, companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const user = await authRepository.findUserByEmail(email, companyId);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

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
      tokens: {
        accessToken,
        refreshToken
      }
    };
  },

  async refreshAccessToken(refreshToken, companyId) {
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

