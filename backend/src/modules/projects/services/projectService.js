import { projectRepository } from '../repositories/projectRepository.js';

export const projectService = {
  async getAll(companyId, filters = {}) {
    return await projectRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const project = await projectRepository.findById(id, companyId);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  },

  async create(data, companyId, userId) {
    return await projectRepository.create({
      ...data,
      companyId,
      ownerId: userId,
      members: [userId]
    });
  },

  async update(id, companyId, updateData) {
    const project = await projectRepository.update(id, companyId, updateData);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  },

  async delete(id, companyId) {
    const project = await projectRepository.delete(id, companyId);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  }
};









