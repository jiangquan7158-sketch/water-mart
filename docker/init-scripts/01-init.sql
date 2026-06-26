-- WaterMart Database Initialization
-- Run on first container start if DB volume is empty

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Note: pgvector must be installed on the PostgreSQL server
-- For local dev, use the pgvector/pgvector:pg16 Docker image instead of postgres:16-alpine
-- CREATE EXTENSION IF NOT EXISTS "vector";
