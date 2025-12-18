import { User } from '../models/User.js';

export const userRepository = {
  async findAll(companyId, filters = {}) {
    return await User.find({ companyId, ...filters }).select('-password');
  },

  async findById(id, companyId) {
    return await User.findOne({ _id: id, companyId }).select('-password');
  },

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  },

  async update(id, companyId, updateData) {
    return await User.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    ).select('-password');
  },

  async delete(id, companyId) {
    return await User.findOneAndDelete({ _id: id, companyId });
  },

  async findByEmail(email, companyId) {
    return await User.findOne({ email, companyId }).select('-password');
  }
};





