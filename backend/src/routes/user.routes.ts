import { Router } from 'express';
import * as UserController from '@/controllers/user.controller';
import { requireAuth } from '@/middleware/auth';

export const userRoutes = Router();

userRoutes.post('/login/', UserController.login);
userRoutes.post('/logout/', requireAuth, UserController.logout);

userRoutes.post('/register/student/', UserController.registerStudent);
userRoutes.post('/register/teacher/', UserController.registerTeacher);

userRoutes.get('/profile/', requireAuth, UserController.getProfile);
userRoutes.put('/profile/', requireAuth, UserController.updateProfile);

userRoutes.post('/password/change/', requireAuth, UserController.changePassword);

