import { Supplier } from '../models/Supplier.js';

export const supplierRepository = {
  async findAll(companyId, filters = {}) {
    const query = { companyId, ...filters };
    
    // Si hay búsqueda por texto, buscar en nombre o contacto
    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { contact: searchRegex },
        { email: searchRegex }
      ];
      delete query.search;
    }
    
    return await Supplier.find(query)
      .sort({ createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Supplier.findOne({ _id: id, companyId });
  },

  async create(supplierData) {
    const supplier = new Supplier(supplierData);
    return await supplier.save();
  },

  async update(id, companyId, updateData) {
    return await Supplier.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    );
  },

  async delete(id, companyId) {
    return await Supplier.findOneAndDelete({ _id: id, companyId });
  }
};
