-- Migration: Add sessionExpiresAt to anonymous_responses
-- Adds a 7-day expiry window to each anonymous survey session.
-- Run this in the Supabase SQL Editor.

ALTER TABLE "anonymous_responses"
ADD COLUMN IF NOT EXISTS "sessionExpiresAt" TIMESTAMP(3)
NOT NULL DEFAULT (now() + interval '7 days');
