import { userRepository } from '../repositories/userRepository.js';
import { hashPassword } from '../../../utils/password.js';

export const userService = {
  async getAll(companyId, filters = {}) {
    return await userRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const user = await userRepository.findById(id, companyId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  async create(data, companyId) {
    const { password, ...userData } = data;
    const hashedPassword = await hashPassword(password);
    
    return await userRepository.create({
      ...userData,
      password: hashedPassword,
      companyId
    });
  },

  async update(id, companyId, updateData) {
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }
    
    const user = await userRepository.update(id, companyId, updateData);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  async delete(id, companyId) {
    const user = await userRepository.delete(id, companyId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
};







