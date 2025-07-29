-- Add until column to SCHEDULES table
-- This migration adds an until column to track the end time of schedules

ALTER TABLE "public"."SCHEDULES" 
ADD COLUMN "until" timestamp with time zone;

-- Add constraint to ensure until is after when
ALTER TABLE "public"."SCHEDULES" 
ADD CONSTRAINT "check_until_after_when" 
CHECK ("until" IS NULL OR "until" > "when");

-- Add comment to explain the column
COMMENT ON COLUMN "public"."SCHEDULES"."until" IS 'End time of the schedule. Must be after the start time (when).'; 