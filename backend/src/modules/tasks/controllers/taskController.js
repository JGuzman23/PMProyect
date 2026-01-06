import { taskService } from '../services/taskService.js';
import fs from 'fs';
import path from 'path';

export const taskController = {
  async getAll(req, res, next) {
    try {
      const tasks = await taskService.getAll(req.companyId, req.query);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const task = await taskService.getById(req.params.id, req.companyId);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async getByBoard(req, res, next) {
    try {
      const tasks = await taskService.getByBoard(req.params.boardId, req.companyId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const task = await taskService.create(req.body, req.companyId, req.userId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const task = await taskService.update(req.params.id, req.companyId, req.body, req.userId);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await taskService.delete(req.params.id, req.companyId);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async move(req, res, next) {
    try {
      const { columnId, order } = req.body;
      const task = await taskService.moveTask(req.params.id, req.companyId, columnId, order);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { taskId } = req.body;
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      // Construir URL completa usando variable de entorno (similar a avatares)
      const baseUrl = process.env.ruta_data_avatar || process.env.RUTA_DATA_AVATAR || 'https://api.signops.pro';
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const fileUrl = `${cleanBaseUrl}/api/tasks/attachment/${req.file.filename}`;

      const attachment = {
        url: fileUrl,
        name: req.file.originalname,
        title: req.body.title || req.file.originalname,
        statusId: req.body.statusId || '',
        statusName: req.body.statusName || '',
        size: req.file.size,
        uploadedAt: new Date()
      };

      // Obtener la tarea actual
      const task = await taskService.getById(taskId, req.companyId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Agregar el adjunto al array de attachments
      const currentAttachments = task.attachments || [];
      currentAttachments.push(attachment);
      
      // Actualizar la tarea con los attachments y agregar log de actividad
      const updateData = {
        attachments: currentAttachments,
        $push: {
          activityLog: {
            type: 'attachment_added',
            userId: req.userId,
            details: {
              attachmentName: attachment.name,
              attachmentTitle: attachment.title
            },
            timestamp: new Date()
          }
        }
      };
      
      await taskService.update(taskId, req.companyId, updateData, req.userId);

      res.json(attachment);
    } catch (error) {
      next(error);
    }
  },

  async getAttachment(req, res, next) {
    try {
      const { filename } = req.params;
      
      // Use absolute path for uploads directory (works in Docker with volumes)
      // Try /app/uploads first (Docker), then fallback to process.cwd()/uploads
      let uploadsBasePath;
      if (fs.existsSync('/app/uploads')) {
        uploadsBasePath = '/app/uploads';
      } else {
        uploadsBasePath = path.join(process.cwd(), 'uploads');
      }
      const attachmentPath = path.join(uploadsBasePath, 'tasks', filename);

      // Verificar que el archivo existe
      if (!fs.existsSync(attachmentPath)) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      // Determinar el tipo MIME basado en la extensión del archivo
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.zip': 'application/zip',
        '.txt': 'text/plain'
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      // Enviar el archivo directamente
      res.setHeader('Content-Type', mimeType);
      res.sendFile(attachmentPath);
    } catch (error) {
      next(error);
    }
  },

  async addComment(req, res, next) {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Comment text is required' });
      }

      const task = await taskService.addComment(
        req.params.id,
        req.companyId,
        req.userId,
        text.trim()
      );
      
      // Obtener el último comentario agregado
      const lastComment = task.comments[task.comments.length - 1];
      res.status(201).json(lastComment);
    } catch (error) {
      next(error);
    }
  }
};

