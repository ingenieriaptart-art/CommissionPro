-- ============================================================
-- 0034 — Agregar rol 'director' a la política equipment_update
-- El rol director (agregado en 0025) quedó fuera de la policy
-- de actualización, bloqueando la asignación de plano unifilar.
-- ============================================================

-- Reemplazar policy con los mismos permisos + director
drop policy if exists equipment_update on equipment;

create policy equipment_update on equipment
  for update using (
    app_user_role() in ('admin', 'supervisor', 'tecnico', 'director')
    and app_in_project(project_id)
  );
