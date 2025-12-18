import { taskRepository } from '../repositories/taskRepository.js';
import { Task } from '../models/Task.js';

export const taskService = {
  async getAll(companyId, filters = {}) {
    return await taskRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const task = await taskRepository.findById(id, companyId);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  },

  async getByBoard(boardId, companyId) {
    return await taskRepository.findByBoard(boardId, companyId);
  },

  async create(data, companyId, userId) {
    return await taskRepository.create({
      ...data,
      companyId,
      createdBy: userId
    });
  },

  async update(id, companyId, updateData) {
    const task = await taskRepository.update(id, companyId, updateData);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  },

  async delete(id, companyId) {
    const task = await taskRepository.delete(id, companyId);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  },

  async moveTask(taskId, companyId, newColumnId, newOrder) {
    return await taskRepository.update(taskId, companyId, {
      columnId: newColumnId,
      order: newOrder
    });
  },

  async reorderTasks(taskIds, companyId) {
    const updates = taskIds.map((taskId, index) => ({
      updateOne: {
        filter: { _id: taskId, companyId },
        update: { $set: { order: index } }
      }
    }));

    return await Task.bulkWrite(updates);
  },

  async addComment(taskId, companyId, userId, text) {
    const task = await Task.findOne({ _id: taskId, companyId });
    if (!task) {
      throw new Error('Task not found');
    }

    task.comments.push({
      userId,
      text,
      createdAt: new Date()
    });

    await task.save();
    // Obtener la tarea actualizada con el usuario populado
    const updatedTask = await Task.findOne({ _id: taskId, companyId })
      .populate('comments.userId', 'firstName lastName email');
    
    return updatedTask;
  }
};

