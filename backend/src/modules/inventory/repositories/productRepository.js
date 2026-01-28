import { Product } from '../models/Product.js';

export const productRepository = {
  async findAll(companyId, filters = {}) {
    const query = { companyId, ...filters };
    
    // Si hay búsqueda por texto, buscar en nombre, referencia o código de barras
    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { reference: searchRegex },
        { barcode: searchRegex },
        { description: searchRegex }
      ];
      delete query.search;
    }
    
    return await Product.find(query)
      .sort({ createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Product.findOne({ _id: id, companyId });
  },

  async findByReference(reference, companyId) {
    return await Product.findOne({ reference, companyId });
  },

  async findByBarcode(barcode, companyId) {
    return await Product.findOne({ barcode, companyId });
  },

  async create(productData) {
    const product = new Product(productData);
    return await product.save();
  },

  async update(id, companyId, updateData) {
    return await Product.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    );
  },

  async delete(id, companyId) {
    return await Product.findOneAndDelete({ _id: id, companyId });
  },

  async updateStock(id, companyId, quantity, operation = 'set') {
    const product = await Product.findOne({ _id: id, companyId });
    if (!product) {
      throw new Error('Product not found');
    }

    let newStock;
    if (operation === 'add') {
      newStock = product.stock + quantity;
    } else if (operation === 'subtract') {
      newStock = Math.max(0, product.stock - quantity);
    } else {
      newStock = quantity;
    }

    product.stock = newStock;
    return await product.save();
  }
};
