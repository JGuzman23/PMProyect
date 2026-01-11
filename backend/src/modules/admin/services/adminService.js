import { adminRepository } from '../repositories/adminRepository.js';

export const adminService = {
  // Labels
  async getAllLabels(companyId) {
    return await adminRepository.findAllLabels(companyId);
  },

  async getLabelById(id, companyId) {
    const label = await adminRepository.findLabelById(id, companyId);
    if (!label) {
      throw new Error('Label not found');
    }
    return label;
  },

  async createLabel(data, companyId) {
    return await adminRepository.createLabel({
      ...data,
      companyId
    });
  },

  async updateLabel(id, companyId, updateData) {
    const label = await adminRepository.updateLabel(id, companyId, updateData);
    if (!label) {
      throw new Error('Label not found');
    }
    return label;
  },

  async deleteLabel(id, companyId) {
    const label = await adminRepository.deleteLabel(id, companyId);
    if (!label) {
      throw new Error('Label not found');
    }
    return label;
  },

  // Board Statuses
  async getAllStatuses(companyId, boardId = null) {
    return await adminRepository.findAllStatuses(companyId, boardId);
  },

  async getStatusById(id, companyId) {
    const status = await adminRepository.findStatusById(id, companyId);
    if (!status) {
      throw new Error('Status not found');
    }
    return status;
  },

  async createStatus(data, companyId) {
    if (!data.boardId) {
      throw new Error('Board ID is required');
    }
    return await adminRepository.createStatus({
      ...data,
      companyId
    });
  },

  async updateStatus(id, companyId, updateData) {
    const status = await adminRepository.updateStatus(id, companyId, updateData);
    if (!status) {
      throw new Error('Status not found');
    }
    return status;
  },

  async updateStatusOrder(statuses, companyId) {
    // Verificar que todos los estados pertenezcan a la compañía
    const statusIds = statuses.map(s => s._id);
    const existingStatuses = await adminRepository.findAllStatuses(companyId);
    const existingIds = existingStatuses.map(s => s._id.toString());
    
    for (const id of statusIds) {
      if (!existingIds.includes(id.toString())) {
        throw new Error('One or more statuses not found');
      }
    }
    
    return await adminRepository.updateStatusOrder(statuses);
  },

  async deleteStatus(id, companyId) {
    const status = await adminRepository.deleteStatus(id, companyId);
    if (!status) {
      throw new Error('Status not found');
    }
    return status;
  }
};

