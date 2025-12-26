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

    const { accessToken } = generateTokens(user._id.toString());

    // Update last login
    await authRepository.updateLastLogin(user._id);

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
        accessToken
      }
    };
  },

  async login(email, password, companyId = null) {
    let user;
    
    // // Si hay companyId, buscar por email y companyId
    // if (companyId) {
    //   user = await authRepository.findUserByEmail(email, companyId);
    // } else {
      // Si no hay companyId, buscar solo por email (asumimos que el email es único o tomamos el primero)
      const { User } = await import('../../users/models/User.js');
      user = await User.findOne({ email }).select('+password');
   // }
    
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

    const { accessToken } = generateTokens(user._id.toString());

    await authRepository.updateLastLogin(user._id);

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
        accessToken
      }
    };
  },

  async logout(userId) {
    // Con solo accessToken, el logout es simplemente invalidar el token del lado del cliente
    // No necesitamos hacer nada en el servidor
    return { message: 'Logged out successfully' };
  }
};

