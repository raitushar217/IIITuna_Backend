import type { RequestHandler } from 'express';
import * as AuthService from '@/services/auth.service';
import { HttpError } from '@/utils/httpError';

export const login: RequestHandler = async (req, res) => {
  const identification_number = req.body?.identification_number;
  const password = req.body?.password;

  if (!identification_number || !password) {
    throw new HttpError(400, 'Please provide both identification_number and password');
  }

  const payload = await AuthService.login(String(identification_number), String(password));
  res.json(payload);
};

export const logout: RequestHandler = async (req, res) => {
  const payload = await AuthService.logout(req.auth!.user);
  res.json(payload);
};

export const registerStudent: RequestHandler = async (req, res) => {
  const payload = await AuthService.registerStudent(req.body);
  res.status(201).json(payload);
};

export const registerTeacher: RequestHandler = async (req, res) => {
  const payload = await AuthService.registerTeacher(req.body);
  res.status(201).json(payload);
};

export const getProfile: RequestHandler = async (req, res) => {
  const payload = await AuthService.getProfile(req.auth!.user);
  res.json(payload);
};

export const updateProfile: RequestHandler = async (req, res) => {
  const payload = await AuthService.updateProfile(req.auth!.user, req.body ?? {});
  res.json(payload);
};

export const changePassword: RequestHandler = async (req, res) => {
  const old_password = req.body?.old_password;
  const new_password = req.body?.new_password;
  const payload = await AuthService.changePassword(req.auth!.user, String(old_password), String(new_password));
  res.json(payload);
};

