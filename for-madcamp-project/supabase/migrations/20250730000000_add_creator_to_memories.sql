-- Add creator_id to MEMORIES table for tracking who uploaded each memory
ALTER TABLE "public"."MEMORIES" 
ADD COLUMN "creator_id" uuid;

-- Add updated_at column for tracking when memories are modified
ALTER TABLE "public"."MEMORIES" 
ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();

-- Add foreign key constraint to link with PROFILES table
ALTER TABLE "public"."MEMORIES" 
ADD CONSTRAINT "MEMORIES_creator_id_fkey" 
FOREIGN KEY (creator_id) REFERENCES "PROFILES"(id);

-- Add comments for the new columns
COMMENT ON COLUMN "public"."MEMORIES"."creator_id" IS 'ID of the user who uploaded this memory';
COMMENT ON COLUMN "public"."MEMORIES"."updated_at" IS 'Timestamp when the memory was last updated'; 