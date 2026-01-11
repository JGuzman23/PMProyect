import { clientRepository } from '../repositories/clientRepository.js';

export const clientService = {
  async getAll(companyId, filters = {}) {
    return await clientRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const client = await clientRepository.findById(id, companyId);
    if (!client) {
      throw new Error('Client not found');
    }
    return client;
  },

  async create(data, companyId) {
    return await clientRepository.create({
      ...data,
      companyId
    });
  },

  async update(id, companyId, updateData) {
    const client = await clientRepository.update(id, companyId, updateData);
    if (!client) {
      throw new Error('Client not found');
    }
    return client;
  },

  async delete(id, companyId) {
    const client = await clientRepository.delete(id, companyId);
    if (!client) {
      throw new Error('Client not found');
    }
    return client;
  }
};









