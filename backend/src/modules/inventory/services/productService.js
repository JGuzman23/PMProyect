import { productRepository } from '../repositories/productRepository.js';

export const productService = {
  async getAll(companyId, filters = {}) {
    return await productRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const product = await productRepository.findById(id, companyId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  async create(data, companyId) {
    // Validar que la referencia sea única si se proporciona
    if (data.reference) {
      const existingProduct = await productRepository.findByReference(data.reference, companyId);
      if (existingProduct) {
        throw new Error('A product with this reference already exists');
      }
    }

    // Validar que el código de barras sea único si se proporciona
    if (data.barcode) {
      const existingProduct = await productRepository.findByBarcode(data.barcode, companyId);
      if (existingProduct) {
        throw new Error('A product with this barcode already exists');
      }
    }

    return await productRepository.create({
      ...data,
      companyId
    });
  },

  async update(id, companyId, updateData) {
    const product = await productRepository.findById(id, companyId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Validar que la referencia sea única si se está actualizando
    if (updateData.reference && updateData.reference !== product.reference) {
      const existingProduct = await productRepository.findByReference(updateData.reference, companyId);
      if (existingProduct && existingProduct._id.toString() !== id) {
        throw new Error('A product with this reference already exists');
      }
    }

    // Validar que el código de barras sea único si se está actualizando
    if (updateData.barcode && updateData.barcode !== product.barcode) {
      const existingProduct = await productRepository.findByBarcode(updateData.barcode, companyId);
      if (existingProduct && existingProduct._id.toString() !== id) {
        throw new Error('A product with this barcode already exists');
      }
    }

    return await productRepository.update(id, companyId, updateData);
  },

  async delete(id, companyId) {
    const product = await productRepository.delete(id, companyId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  async updateStock(id, companyId, quantity, operation = 'set') {
    return await productRepository.updateStock(id, companyId, quantity, operation);
  }
};
