import { userService } from '../services/userService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const userController = {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAll(req.companyId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id, req.companyId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body, req.companyId);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.companyId, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id, req.companyId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Usar la ruta del archivo que multer ya guardó
      const filePath = req.file.path;
      
      // Verificar que el archivo se guardó correctamente
      if (!fs.existsSync(filePath)) {
        console.error('Error: Archivo no encontrado después de subir:', filePath);
        console.error('Detalles del archivo:', {
          filename: req.file.filename,
          destination: req.file.destination,
          path: req.file.path,
          size: req.file.size
        });
        return res.status(500).json({ error: 'Error al guardar el archivo' });
      }

      // Verificar permisos del archivo
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          console.error('Error: Archivo guardado está vacío:', filePath);
          return res.status(500).json({ error: 'El archivo subido está vacío' });
        }
      } catch (accessError) {
        console.error('Error de permisos al acceder al archivo:', accessError);
        return res.status(500).json({ error: 'Error de permisos al acceder al archivo' });
      }

      // Construir URL completa usando variable de entorno ruta_data_avatar
      const baseUrl = process.env.ruta_data_avatar || process.env.RUTA_DATA_AVATAR || 'https://api.signops.pro';
      // Asegurar que la URL base no termine con /
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const avatarUrl = `${cleanBaseUrl}/api/users/avatar/${req.file.filename}`;
      const user = await userService.update(req.params.id, req.companyId, { avatar: avatarUrl });
      
      console.log('✓ Avatar subido exitosamente:', {
        filename: req.file.filename,
        path: filePath,
        url: avatarUrl,
        fileExists: fs.existsSync(filePath),
        fileSize: fs.statSync(filePath).size,
        mimetype: req.file.mimetype
      });
      
      res.json({ avatar: avatarUrl, user });
    } catch (error) {
      console.error('✗ Error en uploadAvatar:', error);
      // Si hay un error, intentar eliminar el archivo parcial si existe
      if (req.file && req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('Archivo parcial eliminado:', req.file.path);
          }
        } catch (unlinkError) {
          console.error('Error al eliminar archivo parcial:', unlinkError);
        }
      }
      next(error);
    }
  },

  async removeAvatar(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.companyId, { avatar: null });
      res.json({ message: 'Avatar removed successfully', user });
    } catch (error) {
      next(error);
    }
  },

  async getAvatar(req, res, next) {
    try {
      const { filename } = req.params;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const avatarPath = path.join(__dirname, '../../../uploads/avatars', filename);

      // Verificar que el archivo existe
      if (!fs.existsSync(avatarPath)) {
        return res.status(404).json({ error: 'Avatar not found' });
      }

      // Enviar el archivo
      res.sendFile(avatarPath);
    } catch (error) {
      next(error);
    }
  }
};








