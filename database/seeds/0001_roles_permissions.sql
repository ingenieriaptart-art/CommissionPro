-- ============================================================
-- SEED — Roles y permisos base
-- ============================================================

insert into roles (key, name, description, is_system) values
  ('admin',      'Administrador General', 'Acceso total al sistema', true),
  ('supervisor', 'Supervisor',            'Asigna, revisa y aprueba', true),
  ('tecnico',    'Técnico',               'Ejecuta pruebas y evidencias', true),
  ('cliente',    'Cliente',               'Solo lectura', true)
on conflict (key) do nothing;

insert into permissions (key, category, description) values
  ('user.create','usuarios','Crear usuarios'),
  ('user.edit','usuarios','Editar usuarios'),
  ('user.delete','usuarios','Eliminar usuarios'),
  ('project.create','proyectos','Crear proyectos'),
  ('project.edit','proyectos','Editar proyectos'),
  ('form.configure','formularios','Configurar formularios'),
  ('test.create','pruebas','Crear/ejecutar pruebas'),
  ('test.execute','pruebas','Ejecutar pruebas'),
  ('test.approve','pruebas','Aprobar pruebas'),
  ('test.reject','pruebas','Rechazar pruebas'),
  ('checklist.fill','pruebas','Completar checklists'),
  ('evidence.upload','evidencias','Subir fotografías/evidencias'),
  ('punch.create','punch','Crear punch list'),
  ('punch.manage','punch','Gestionar punch list'),
  ('report.generate','informes','Generar informes'),
  ('report.export','informes','Exportar información'),
  ('dashboard.view','dashboard','Ver dashboards'),
  ('document.download','documental','Descargar documentos'),
  ('permission.configure','seguridad','Configurar permisos')
on conflict (key) do nothing;

-- admin: todos los permisos
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='admin'), p.id from permissions p
on conflict do nothing;

-- supervisor
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='supervisor'), p.id from permissions p
where p.key in ('test.approve','test.reject','test.create','checklist.fill',
  'punch.create','punch.manage','report.generate','dashboard.view',
  'document.download','evidence.upload')
on conflict do nothing;

-- tecnico
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='tecnico'), p.id from permissions p
where p.key in ('test.execute','test.create','checklist.fill','evidence.upload',
  'punch.create','dashboard.view','document.download')
on conflict do nothing;

-- cliente (solo lectura)
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='cliente'), p.id from permissions p
where p.key in ('dashboard.view','document.download','report.export')
on conflict do nothing;
