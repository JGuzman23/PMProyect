import { taskRepository } from '../repositories/taskRepository.js';
import { Task } from '../models/Task.js';
import { Board } from '../../boards/models/Board.js';

export const taskService = {
  async getAll(companyId, filters = {}) {
    // Si hay un filtro de título, usar búsqueda por regex (case-insensitive)
    if (filters.title) {
      const searchTerm = filters.title;
      // Buscar por título o por taskId
      return await taskRepository.findAll(companyId, {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { taskId: { $regex: searchTerm, $options: 'i' } }
        ]
      });
    }
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
    // Generar taskId automáticamente si no se proporciona
    let taskId = data.taskId;
    if (!taskId && data.boardId) {
      // Obtener el board para acceder al prefijo y contador
      const board = await Board.findOne({ _id: data.boardId, companyId });
      if (board && board.taskPrefix) {
        // Incrementar el contador del board
        board.taskCounter = (board.taskCounter || 0) + 1;
        await board.save();
        
        // Generar el taskId con formato: PREFIX-001
        const counterStr = board.taskCounter.toString().padStart(3, '0');
        taskId = `${board.taskPrefix}-${counterStr}`;
      }
    }

    const task = await taskRepository.create({
      ...data,
      companyId,
      createdBy: userId,
      taskId: taskId,
      activityLog: [{
        type: 'created',
        userId,
        description: 'Tarea creada',
        createdAt: new Date()
      }]
    });
    return task;
  },

  async update(id, companyId, updateData, userId) {
    // Obtener la tarea actual antes de actualizar
    const oldTask = await Task.findOne({ _id: id, companyId });
    if (!oldTask) {
      throw new Error('Task not found');
    }

    // Preparar el historial de cambios
    const activityLog = [];
    
    // Detectar cambios
    // Solo registrar cambio de estado si columnId está presente y es diferente
    if (updateData.columnId !== undefined && updateData.columnId !== oldTask.columnId) {
      activityLog.push({
        type: 'status_changed',
        userId,
        oldValue: oldTask.columnId,
        newValue: updateData.columnId,
        description: `Estado cambiado`,
        createdAt: new Date()
      });
    }
    
    if (updateData.priority !== undefined && updateData.priority !== oldTask.priority) {
      activityLog.push({
        type: 'priority_changed',
        userId,
        oldValue: oldTask.priority,
        newValue: updateData.priority,
        description: `Prioridad cambiada de ${oldTask.priority} a ${updateData.priority}`,
        createdAt: new Date()
      });
    }
    
    if (updateData.assignees !== undefined) {
      // Comparar arrays de asignados normalizados
      const oldAssignees = (oldTask.assignees || []).map(a => a.toString()).sort();
      const newAssignees = (updateData.assignees || []).map(a => a.toString()).sort();
      if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
        activityLog.push({
          type: 'assignees_changed',
          userId,
          oldValue: oldTask.assignees,
          newValue: updateData.assignees,
          description: 'Asignados modificados',
          createdAt: new Date()
        });
      }
    }
    
    if (updateData.clientId !== undefined && updateData.clientId?.toString() !== oldTask.clientId?.toString()) {
      activityLog.push({
        type: 'client_changed',
        userId,
        oldValue: oldTask.clientId,
        newValue: updateData.clientId,
        description: 'Cliente modificado',
        createdAt: new Date()
      });
    }
    
    if (updateData.dueDate !== undefined) {
      // Comparar fechas normalizadas (solo fecha, sin hora)
      const oldDate = oldTask.dueDate ? new Date(oldTask.dueDate).toISOString().split('T')[0] : null;
      const newDate = updateData.dueDate ? new Date(updateData.dueDate).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        activityLog.push({
          type: 'due_date_changed',
          userId,
          oldValue: oldTask.dueDate,
          newValue: updateData.dueDate,
          description: 'Fecha de fin modificada',
          createdAt: new Date()
        });
      }
    }
    
    if (updateData.startDate !== undefined) {
      // Comparar fechas normalizadas (solo fecha, sin hora)
      const oldDate = oldTask.startDate ? new Date(oldTask.startDate).toISOString().split('T')[0] : null;
      const newDate = updateData.startDate ? new Date(updateData.startDate).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        activityLog.push({
          type: 'start_date_changed',
          userId,
          oldValue: oldTask.startDate,
          newValue: updateData.startDate,
          description: 'Fecha de inicio modificada',
          createdAt: new Date()
        });
      }
    }
    
    if (updateData.title !== undefined && updateData.title !== oldTask.title) {
      activityLog.push({
        type: 'title_changed',
        userId,
        oldValue: oldTask.title,
        newValue: updateData.title,
        description: `Título cambiado de "${oldTask.title}" a "${updateData.title}"`,
        createdAt: new Date()
      });
    }
    
    if (updateData.description !== undefined && updateData.description !== oldTask.description) {
      activityLog.push({
        type: 'description_changed',
        userId,
        oldValue: oldTask.description,
        newValue: updateData.description,
        description: 'Descripción modificada',
        createdAt: new Date()
      });
    }

    // Agregar el historial al updateData
    if (activityLog.length > 0) {
      updateData.$push = { activityLog: { $each: activityLog } };
    }

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

    // Agregar al historial
    // task.activityLog.push({
    //   type: 'comment_added',
    //   userId,
    //   description: 'Comentario agregado',
    //   createdAt: new Date()
    // });

    await task.save();
    // Obtener la tarea actualizada con el usuario populado
    const updatedTask = await Task.findOne({ _id: taskId, companyId })
      .populate('comments.userId', 'firstName lastName email')
      .populate('activityLog.userId', 'firstName lastName email');
    
    return updatedTask;
  }
};

