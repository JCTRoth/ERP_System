-- UserService Database Schema
-- Generated from EF Core EnsureCreated()

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    email_verified boolean NOT NULL,
    role character varying(20),
    preferred_language character varying(10),
    created_at timestamp with time zone NOT NULL,
    last_login_at timestamp with time zone,
    CONSTRAINT "PK_users" PRIMARY KEY (id)
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid NOT NULL,
    token text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    is_revoked boolean NOT NULL,
    revoked_reason text,
    CONSTRAINT "PK_refresh_tokens" PRIMARY KEY (id),
    CONSTRAINT "FK_refresh_tokens_users_user_id" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id uuid NOT NULL,
    token text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY (id),
    CONSTRAINT "FK_password_reset_tokens_users_user_id" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_email" ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_refresh_tokens_token" ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS "IX_refresh_tokens_user_id" ON refresh_tokens (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_password_reset_tokens_token" ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS "IX_password_reset_tokens_user_id" ON password_reset_tokens (user_id);

-- Insert default admin user
INSERT INTO users (id, created_at, email, email_verified, first_name, is_active, last_login_at, last_name, password_hash, role, preferred_language)
VALUES ('00000000-0000-0000-0000-000000000001', TIMESTAMPTZ '2024-01-01T00:00:00Z', 'admin@erp-system.local', TRUE, 'Super', TRUE, NULL, 'Admin', '$2a$11$4.WeerIrUPdNT/yK6G/yGe/pzrnrVfpcu4L9Bzu9dV35KX0dJ/Qdm', 'admin', 'en')
ON CONFLICT (id) DO NOTHING;