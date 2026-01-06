import { authService } from '../services/authService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const authController = {
  async register(req, res, next) {
    try {
      const data = req.body;
      const result = await authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      // Obtener companyId del header si está disponible, sino será null y se buscará por email
      const companyId = req.companyId || null;

      const result = await authService.login(email, password, companyId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.userId);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      let avatarBase64 = null;
      
      // If user has an avatar, convert it to base64
      if (req.user.avatar) {
        try {
          const avatarPath = req.user.avatar;
          let filename = null;
          
          // Extract filename from URL or path
          // IMPORTANT: In DB we only store the path/URL, never base64
          if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
            // Extract filename from URL like: https://api.signops.pro/api/users/avatar/1767722670661-278460117.jpg
            // or: https://api.signops.pro/uploads/avatars/1767722670661-278460117.jpg
            const urlParts = avatarPath.split('/');
            filename = urlParts[urlParts.length - 1] || null;
          } else if (avatarPath.startsWith('data:image/')) {
            // If somehow base64 is in DB (legacy data), we should not use it
            // Instead, try to extract filename if possible, or skip
            console.warn('Avatar in DB is base64, should be path/URL only. Skipping base64 conversion.');
            // Don't use base64 from DB, return null
            filename = null;
          } else {
            // Relative path like: /api/uploads/avatars/filename.jpg or /uploads/avatars/filename.jpg
            filename = avatarPath.split('/').pop() || null;
          }
          
          // If we have a filename, try to load the file
          if (filename && !avatarBase64) {
            const avatarFilePath = path.join(__dirname, '../../../uploads/avatars', filename);
            
            if (fs.existsSync(avatarFilePath)) {
              const fileBuffer = fs.readFileSync(avatarFilePath);
              const base64Image = fileBuffer.toString('base64');
              
              // Determine MIME type based on file extension
              const ext = path.extname(filename).toLowerCase();
              const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml'
              };
              const mimeType = mimeTypes[ext] || 'image/jpeg';
              
              avatarBase64 = `data:${mimeType};base64,${base64Image}`;
            } else {
              console.warn(`Avatar file not found: ${avatarFilePath}`);
            }
          }
        } catch (avatarError) {
          console.error('Error loading avatar for /me endpoint:', avatarError);
          // Continue without avatar if there's an error
        }
      }
      
      res.json({
        user: {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          companyId: req.user.companyId,
          avatar: avatarBase64 || null  // Always return base64 or null, never the URL
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

