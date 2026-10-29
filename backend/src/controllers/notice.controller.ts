import type { RequestHandler } from 'express';
import * as NoticesService from '@/services/notices.service';

export const listNotices: RequestHandler = async (req, res) => {
  const notices = await NoticesService.listNotices(req.auth!.user);
  res.json(notices.map(NoticesService.noticeToDjangoShape));
};

export const createNotice: RequestHandler = async (req, res) => {
  const payload = await NoticesService.createNotice(req.auth!.user, req.body);
  res.status(201).json(payload);
};

