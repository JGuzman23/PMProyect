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
    // Asegurar que el avatar solo sea una ruta/URL, nunca base64
    if (updateData.avatar && updateData.avatar.startsWith('data:image/')) {
      console.warn('Attempted to save base64 avatar to DB. Only paths/URLs should be saved.');
      // Remove base64 from updateData - don't save it
      delete updateData.avatar;
    }
    
    // Si se quiere cambiar la contraseña, validar la contraseña actual
    if (updateData.newPassword) {
      if (!updateData.currentPassword) {
        throw new Error('Current password is required to change password');
      }
      
      // Obtener el usuario con la contraseña para validarla
      const { User } = await import('../models/User.js');
      const user = await User.findOne({ _id: id, companyId }).select('+password');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Validar la contraseña actual
      const { comparePassword } = await import('../../../utils/password.js');
      const isPasswordValid = await comparePassword(updateData.currentPassword, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash de la nueva contraseña
      updateData.password = await hashPassword(updateData.newPassword);
      delete updateData.currentPassword;
      delete updateData.newPassword;
    } else if (updateData.currentPassword) {
      // Si se envía currentPassword pero no newPassword, es un error
      throw new Error('New password is required when providing current password');
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








