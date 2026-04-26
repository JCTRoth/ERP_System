-- Authorization model schema

CREATE TABLE auth_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_auth_groups_company_id ON auth_groups(company_id);
CREATE INDEX idx_auth_groups_company_system ON auth_groups(company_id, is_system);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(150) NOT NULL UNIQUE,
    resource VARCHAR(100) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    description VARCHAR(1000)
);

CREATE INDEX idx_permissions_resource_operation ON permissions(resource, operation);

CREATE TABLE group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES auth_groups(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('COMPANY', 'OWN', 'DEPARTMENT')),
    scope_json TEXT,
    UNIQUE(group_id, permission_id, scope_type)
);

CREATE INDEX idx_group_permissions_group_id ON group_permissions(group_id);
CREATE INDEX idx_group_permissions_permission_id ON group_permissions(permission_id);

CREATE TABLE user_group_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES auth_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, company_id, group_id)
);

CREATE INDEX idx_user_group_assignments_user_company ON user_group_assignments(user_id, company_id);
CREATE INDEX idx_user_group_assignments_group_id ON user_group_assignments(group_id);
