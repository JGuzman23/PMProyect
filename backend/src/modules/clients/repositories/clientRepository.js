import { Client } from '../models/Client.js';

export const clientRepository = {
  async findAll(companyId, filters = {}) {
    return await Client.find({ companyId, ...filters })
      .populate('projects', 'name')
      .sort({ createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Client.findOne({ _id: id, companyId })
      .populate('projects', 'name');
  },

  async create(clientData) {
    const client = new Client(clientData);
    return await client.save();
  },

  async update(id, companyId, updateData) {
    return await Client.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    )
      .populate('projects', 'name');
  },

  async delete(id, companyId) {
    return await Client.findOneAndDelete({ _id: id, companyId });
  }
};


