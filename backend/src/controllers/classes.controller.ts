import type { RequestHandler } from 'express';
import * as ClassesService from '@/services/classes.service';

export const listAvailableClasses: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const classes = await ClassesService.listAvailableClasses(user);
  res.json(classes);
};

export const registerForClass: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const result = await ClassesService.registerForClass(user, req.body);
  res.status(201).json(result);
};

export const listStudentClasses: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const classes = await ClassesService.listStudentClasses(user);
  res.json(classes);
};

export const listTeacherClasses: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const classes = await ClassesService.listTeacherClasses(user);
  res.json(classes);
};

export const getStudyMaterials: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const subjectCode = typeof req.query.subject_code === 'string' ? req.query.subject_code : undefined;
  const materials = await ClassesService.getStudyMaterials(user, subjectCode);
  res.json(materials);
};

export const uploadStudyMaterial: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  const subjectCode = (req.body.subject_code || req.body.subjectCode || 'SUB1').toString();
  const caption = (req.body.caption || req.body.filename || req.body.title || '').toString();

  const material = await ClassesService.addStudyMaterial(user, {
    subject_code: subjectCode,
    caption,
    file: req.file,
  });

  res.status(201).json(material);
};

