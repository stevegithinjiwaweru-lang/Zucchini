-- Add forcePasswordChange boolean to User table

ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
