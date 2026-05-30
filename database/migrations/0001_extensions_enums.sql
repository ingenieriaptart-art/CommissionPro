-- ============================================================
-- 0001 — Extensiones y tipos enumerados
-- CommissionPro / Plataforma de Comisionamiento Industrial
-- ============================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ---------- ENUMs de dominio ----------
create type company_type      as enum ('cliente','contratista','integrador','epc','otro');
create type user_status        as enum ('active','inactive','blocked');
create type project_status     as enum ('planificacion','en_ejecucion','suspendido','cerrado');
create type criticality        as enum ('alta','media','baja');

create type equipment_status   as enum (
  'pendiente','en_ejecucion','aprobado','rechazado','bloqueado',
  'listo_energizacion','listo_arranque','operativo');

create type test_type          as enum (
  'precomisionamiento','fat','sat','loop_check','energizacion','funcional');

create type test_status        as enum (
  'borrador','ejecutado','revisado','aprob_supervisor',
  'aprob_qaqc','aprob_cliente','cerrado','rechazado');

create type checklist_result   as enum ('cumple','no_cumple','no_aplica');

create type field_type         as enum (
  'texto','numero','fecha','hora','moneda','select','checkbox','radio',
  'firma','imagen','video','pdf','archivo','textarea');

create type evidence_type      as enum ('foto','video','pdf','archivo');
create type evidence_stage     as enum ('antes','durante','despues','general');

create type punch_priority     as enum ('critica','alta','media','baja');
create type punch_status       as enum ('abierto','en_proceso','corregido','cerrado');

create type approval_status    as enum ('pendiente','aprobado','rechazado');
create type sync_direction     as enum ('push','pull');
create type sync_status_t      as enum ('ok','parcial','error');
create type record_sync_status as enum ('synced','pending','conflict');
