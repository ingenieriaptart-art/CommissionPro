-- ============================================================
-- 0002 — RBAC: empresas, usuarios, roles, permisos
-- ============================================================

create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         company_type not null default 'contratista',
  nit          text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,          -- admin, supervisor, tecnico, cliente
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,          -- ej: user.create, test.approve
  description text,
  category    text
);

create table role_permissions (
  role_id       uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table users (
  id                   uuid primary key default gen_random_uuid(),
  auth_user_id         uuid unique,           -- enlace a auth.users de Supabase
  company_id           uuid references companies(id),
  role_id              uuid references roles(id),
  full_name            text not null,
  position             text,                  -- cargo
  email                text unique not null,
  phone                text,
  signature_url        text,
  status               user_status not null default 'active',
  must_change_password boolean not null default true,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- Permisos extra/override por usuario (grant o revoke explícito)
create table user_permissions (
  user_id       uuid references users(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  granted       boolean not null default true,
  primary key (user_id, permission_id)
);

create index idx_users_company on users(company_id);
create index idx_users_role on users(role_id);
