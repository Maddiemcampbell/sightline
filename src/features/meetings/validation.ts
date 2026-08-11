import { z } from "zod";

import { MEETING_TYPES } from "@/features/meetings/types";

export const agendaItemSchema = z.object({
  id: z.string().min(1).max(200),
  section: z.enum([
    "opening",
    "attention",
    "decisions",
    "commitments",
    "closeout",
  ]),
  title: z.string().min(1).max(500),
  detail: z.string().min(1).max(3000),
  sourceHref: z.string().max(1000).nullable(),
  sourceLabel: z.string().max(160).nullable(),
});

export const meetingAgendaSchema = z.array(agendaItemSchema).max(30);

export const createMeetingSchema = z.object({
  title: z.string().trim().min(3).max(160),
  meetingType: z.enum(MEETING_TYPES),
  startsAt: z.iso.datetime({ local: true }),
  projectIds: z.array(z.uuid()).max(50),
});

export const meetingDecisionSchema = z.object({
  meetingId: z.uuid(),
  riskId: z.uuid().nullable(),
  projectId: z.uuid().nullable(),
  summary: z.string().trim().min(3).max(1000),
  rationale: z.string().trim().max(3000).nullable(),
});

export const meetingFollowUpSchema = z.object({
  meetingId: z.uuid(),
  riskId: z.uuid(),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(3).max(3000),
  ownerUserId: z.uuid().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.iso.datetime({ local: true }).nullable(),
});

export const meetingIdSchema = z.uuid();
