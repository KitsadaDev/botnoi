-- Add IT repair service type (adds an enum value only; existing rows are unchanged)
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'IT_REPAIR';
