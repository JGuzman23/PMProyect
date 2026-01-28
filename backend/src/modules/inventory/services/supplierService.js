import { supplierRepository } from '../repositories/supplierRepository.js';

export const supplierService = {
  async getAll(companyId, filters = {}) {
    return await supplierRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const supplier = await supplierRepository.findById(id, companyId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  },

  async create(data, companyId) {
    return await supplierRepository.create({
      ...data,
      companyId
    });
  },

  async update(id, companyId, updateData) {
    const supplier = await supplierRepository.update(id, companyId, updateData);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  },

  async delete(id, companyId) {
    const supplier = await supplierRepository.delete(id, companyId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  }
};
