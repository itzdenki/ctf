import { z } from 'zod';

const requiredString = z.string().trim().min(1);

export const teamRegisterSchema = z.object({
  teamName: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(160),
});

export const teamLoginSchema = z.object({
  teamName: requiredString.max(160),
  password: z.string().min(1).max(160),
});

export const submitFlagSchema = z.object({
  challengeId: requiredString.max(120),
  flag: requiredString.max(500),
});

export const adminLoginSchema = z.object({
  mode: z.enum(['admin', 'team']).default('admin'),
  username: requiredString.max(160),
  password: z.string().min(1).max(160),
});

export const eventConfigSchema = z.object({
  name: requiredString.max(160),
  description: requiredString.max(4000),
  startTime: requiredString,
  endTime: requiredString,
  discordUrl: requiredString.max(500),
});

export const challengeSchema = z.object({
  id: z.string().trim().min(2).max(120).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  name: requiredString.max(200),
  description: requiredString.max(10000),
  category: requiredString.max(80),
  points: z.coerce.number().int().min(0).max(100000),
  flag: z.string().trim().max(500).optional(),
  connectionLink: z.string().trim().max(500).optional().nullable(),
  hints: z.array(z.string().trim().max(1000)).default([]),
  isPublished: z.boolean().default(false),
});

export const challengeCreateSchema = challengeSchema.extend({
  flag: requiredString.max(500),
});

export const challengeUpdateSchema = challengeSchema;

export const teamUpdateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  status: z.enum(['active', 'pending', 'banned']).optional(),
  isAdmin: z.boolean().optional(),
});

export const ctftimeRegisterCompleteSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(160),
});

export const ctftimeLoginCompleteSchema = z.object({
  password: z.string().min(1).max(160),
});

export const sponsorSchema = z.object({
  id: z.string().uuid().optional(),
  name: requiredString.max(160),
  linkUrl: requiredString.max(500),
  description: requiredString.max(1000),
  tier: z.enum(['Diamond', 'Gold', 'Silver']),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
});

export const prizeSchema = z.object({
  id: z.string().uuid().optional(),
  place: requiredString.max(160),
  reward: requiredString.max(1000),
  icon: requiredString.max(80),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
});
