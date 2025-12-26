import { User } from '../../users/models/User.js';
import { Company } from '../../companies/models/Company.js';

export const authRepository = {
  async findUserByEmail(email, companyId) {
    return await User.findOne({ email, companyId });
  },

  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  },

  async updateLastLogin(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { lastLogin: new Date() },
      { new: true }
    ).select('-password');
  },

  async findCompanyBySubdomain(subdomain) {
    return await Company.findOne({ subdomain, isActive: true });
  },

  async createCompany(companyData) {
    const company = new Company(companyData);
    return await company.save();
  },

  async findUserById(userId, companyId = null) {
    if (companyId) {
      return await User.findOne({ _id: userId, companyId }).select('-password');
    }
    return await User.findById(userId).select('-password');
  }
};

