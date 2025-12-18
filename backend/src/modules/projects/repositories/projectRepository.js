import { Project } from '../models/Project.js';

export const projectRepository = {
  async findAll(companyId, filters = {}) {
    return await Project.find({ companyId, ...filters })
      .populate('ownerId', 'firstName lastName email')
      .populate('members', 'firstName lastName email')
      .sort({ createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Project.findOne({ _id: id, companyId })
      .populate('ownerId', 'firstName lastName email')
      .populate('members', 'firstName lastName email');
  },

  async create(projectData) {
    const project = new Project(projectData);
    return await project.save();
  },

  async update(id, companyId, updateData) {
    return await Project.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    ).populate('ownerId', 'firstName lastName email')
     .populate('members', 'firstName lastName email');
  },

  async delete(id, companyId) {
    return await Project.findOneAndDelete({ _id: id, companyId });
  }
};





