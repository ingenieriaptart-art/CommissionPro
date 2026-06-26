# cleanup-mbtest001.ps1 — Limpieza de artefactos de prueba (Gate QA)

## Propósito
Script de limpieza que elimina **exclusivamente** los artefactos de prueba asociados al equipo **MB-TEST-001** (`Motobomba Prueba Brasil`). Fue creado para el **gate de validación de P_MEC_010 (Motobomba Brasil)**, para dejar la base limpia una vez cerrado el smoke test, sin residuos de prueba en la base de producción compartida.

## Alcance

**Elimina (solo lo asociado a MB-TEST-001):**
- Equipo de prueba (`equipment`, tag = `MB-TEST-001`).
- Relaciones `equipment_templates` del equipo.
- `tests` del equipo (y por cascada: `checklist_items`, `approvals`, `signatures`).
- `certificates` ligados a esos tests (FK RESTRICT → se borran explícitamente antes).
- `evidences` del equipo (filas).
- `punch_items` del equipo.
- Objetos en **Storage** (bucket `evidences`) asociados a esas evidencias.

**NO elimina:**
- El template productivo **P_MEC_010** ni sus secciones/campos.
- Otros templates productivos.
- Equipos productivos (todo va filtrado por el `id` de MB-TEST-001).
- Formularios / `form_templates` / `template_sections` / `section_fields`.
- Configuración del proyecto (áreas, sistemas, subsistemas).
- Datos de cualquier otro equipo.

## Requisitos
- **PowerShell** (Windows PowerShell 5.1 o PowerShell 7).
- Variable de entorno **`SUPABASE_SERVICE_KEY`** con la service_role key (no se versiona en el script).
- Acceso al proyecto correcto: por defecto `https://nkjunkolsmjledzwuxgn.supabase.co` (override con `-SupabaseUrl`).

## Modo Dry-Run (por defecto)
No borra nada: solo lista lo que se eliminaría.
```powershell
$env:SUPABASE_SERVICE_KEY = "<service_role_key>"
powershell -ExecutionPolicy Bypass -File scripts\cleanup-mbtest\cleanup-mbtest001.ps1
```
**Cómo interpretar la salida:**
- `modo: DRY-RUN` confirma que NO se borrará nada.
- "Equipo(s) objetivo" debe listar **solo** MB-TEST-001. Si aparece otro equipo, **detenerse**.
- "ARTEFACTOS DETECTADOS" muestra los conteos por tabla + rutas de Storage + certificados.
- Revisa que los conteos sean coherentes con tu smoke antes de pasar a `-Execute`.

## Modo Execute (ejecución real)
```powershell
$env:SUPABASE_SERVICE_KEY = "<service_role_key>"
powershell -ExecutionPolicy Bypass -File scripts\cleanup-mbtest\cleanup-mbtest001.ps1 -Execute
```
Secuencia:
1. **Generación de backup** — vuelca todas las filas a `backups/mbtest-backup-<timestamp>.json`.
2. **Validación** — vuelve a localizar el equipo y recolectar artefactos (mismo filtrado).
3. **Eliminación** — en orden de dependencias: Storage → certificates → evidences → punch_items → tests → equipment_templates → equipment.
4. **Confirmación final** — re-consulta y reporta `equipment / evidences / tests` restantes (esperado: 0) y confirma que P_MEC_010 no fue tocado.

## Backups
- **Ubicación:** `scripts/cleanup-mbtest/backups/` (ignorada por git).
- **Formato:** JSON con `generated_at` y arrays por tabla (`equipment`, `equipment_templates`, `tests`, `evidences`, `punch_items`, `certificates`, `storage_paths`).
- **Recuperación básica (rollback de datos):** re-insertar las filas del JSON en sus tablas (vía SQL Editor o REST) respetando el orden inverso (equipment → equipment_templates/tests → evidences/punch). Los **binarios de Storage NO se restauran** (son datos de prueba); el JSON conserva las rutas para referencia.

## Validaciones de Seguridad
- Todos los `DELETE` van filtrados por `equipment_id=in.(<ids de MB-TEST-001>)` o por `test_id` de esos tests. No hay borrados globales.
- Si **no existe** ningún equipo con el tag, el script termina sin borrar nada.
- Si aparece **más de un** equipo con el tag, lo advierte antes de continuar.
- **Dry-run por defecto**: se requiere `-Execute` explícito para borrar.
- **Backup obligatorio** antes de cualquier borrado en modo real.
- La service key se lee de variable de entorno (no se versiona).
- El script **nunca** referencia `form_templates`, `template_sections` ni `section_fields` → P_MEC_010 queda intacto.

## Procedimiento recomendado
Ejecutar el cleanup **solo al final**, en este orden:
- ☐ Smoke completado.
- ☐ Resultados aprobados.
- ☐ GO emitido.
- ☐ PR realizado.
- ☐ Merge realizado.
- ☐ Deploy realizado.
- ☐ Ejecutar `cleanup-mbtest001.ps1 -Execute`.
- ☐ Verificar salida (0 registros restantes) y conservar el backup JSON.
- ☐ (Opcional) Limpiar borradores locales en DevTools → IndexedDB del dispositivo de prueba.

## Historial
- **Gate:** P_MEC_010 – Motobomba Brasil
- **Fecha:** 2026-06-24
- **Rama:** feat/brasil-motobomba
- **Autor:** CommissionPro QA Process
