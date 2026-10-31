import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import {
  AuthToken,
  Program,
  Section as AcademicSection,
  SpecializationBranch,
  Student,
  StudentClassRegistration,
  Subject,
  Teacher,
  TeachingAssignment,
  User,
  ProctoringIncident,
} from '@/entities/User';
import { Assignment, AssignmentSubmission } from '@/entities/Assignment';
import { Notice } from '@/entities/Notice';
import { Section } from '@/entities/Section';
import {
  Question,
  QuestionOption,
  Quiz,
  QuizAttempt,
  StudentSelectedQuestionOption,
} from '@/entities/Quiz';
import { GradeCard } from '@/entities/GradeCard';
import { AttendanceSession } from '@/entities/Attendance';

dotenv.config();

const toInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  PORT: toInt(process.env.PORT, 8000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST ?? 'db.xxxxx.supabase.co',
  SUPABASE_DB_PORT: toInt(process.env.SUPABASE_DB_PORT, 5432),
  SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME ?? 'postgres',
  SUPABASE_DB_USER: process.env.SUPABASE_DB_USER ?? 'postgres',
  SUPABASE_DB_PASS: process.env.SUPABASE_DB_PASS ?? 'password',

  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  TOKEN_BYTES: toInt(process.env.TOKEN_BYTES, 32),
} as const;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.SUPABASE_DB_HOST,
  port: env.SUPABASE_DB_PORT,
  database: env.SUPABASE_DB_NAME,
  username: env.SUPABASE_DB_USER,
  password: env.SUPABASE_DB_PASS,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: env.NODE_ENV !== 'production',
  extra: {
    max: toInt(process.env.DB_POOL_MAX, 20),
    connectionTimeoutMillis: toInt(process.env.DB_TIMEOUT_MS, 10000),
  },
  logging: env.NODE_ENV === 'development',
  migrations: ['src/migrations/**/*.ts', 'dist/migrations/**/*.js'],
  entities: [
    User,
    AuthToken,
    Program,
    SpecializationBranch,
    AcademicSection,
    Section,
    Student,
    Teacher,
    Subject,
    TeachingAssignment,
    StudentClassRegistration,
    Assignment,
    AssignmentSubmission,
    Notice,
    Quiz,
    Question,
    QuestionOption,
    QuizAttempt,
    StudentSelectedQuestionOption,
    GradeCard,
    AttendanceSession,
    ProctoringIncident,
  ],
});

export async function initDb() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}

