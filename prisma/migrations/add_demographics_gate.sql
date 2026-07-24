-- Migration: add_demographics_gate
-- Adds demographicsCompletedAt and demographicsInvitationId to the invitations table.
-- These fields power the inline demographics preamble shown before every non-demographics survey.
-- demographicsCompletedAt: stamped when a respondent completes demographics for their org (fans out to all their invitations).
-- demographicsInvitationId: optional back-reference to the invitation where demographics were completed.

ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "demographicsCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "demographicsInvitationId" TEXT;

CREATE INDEX IF NOT EXISTS "invitations_demographicsCompletedAt_idx"
  ON "invitations" ("demographicsCompletedAt");
