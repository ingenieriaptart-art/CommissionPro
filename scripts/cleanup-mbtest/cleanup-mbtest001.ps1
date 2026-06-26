<#
=====================================================================
 cleanup-mbtest001.ps1 — Limpieza COMPLETA del equipo de prueba MB-TEST-001
=====================================================================
 Elimina TODOS los artefactos de prueba creados para validar P_MEC_010:
   - Equipo MB-TEST-001
   - Relaciones de templates (equipment_templates)
   - Tests asociados
   - Evidencias asociadas (filas + archivos en Storage)
   - Punch items huerfanos del equipo

 NO toca:
   - El template P_MEC_010 ni sus secciones/campos (entregable global)
   - Ningun equipo productivo (todo filtrado por el id de MB-TEST-001)

 Seguridad:
   - La service key se lee de la variable de entorno SUPABASE_SERVICE_KEY
     (NO se versiona en este archivo).
   - Modo DRY-RUN por defecto: solo muestra que se eliminaria.
   - Modo real: -Execute. Antes de borrar hace BACKUP JSON de las filas.

 Uso:
   $env:SUPABASE_SERVICE_KEY = "<service_role_key>"
   # Vista previa (no borra nada):
   powershell -ExecutionPolicy Bypass -File .\cleanup-mbtest001.ps1
   # Ejecucion real (con backup):
   powershell -ExecutionPolicy Bypass -File .\cleanup-mbtest001.ps1 -Execute
=====================================================================
#>
param(
  [switch]$Execute,
  [string]$BackupDir = "$PSScriptRoot\backups",
  [string]$SupabaseUrl = "https://nkjunkolsmjledzwuxgn.supabase.co",
  [string]$Tag = "MB-TEST-001"
)
$ErrorActionPreference = "Stop"

$svc = $env:SUPABASE_SERVICE_KEY
if (-not $svc) {
  Write-Host "ERROR: falta la variable de entorno SUPABASE_SERVICE_KEY." -ForegroundColor Red
  Write-Host '  Ejemplo:  $env:SUPABASE_SERVICE_KEY = "<service_role_key>"' -ForegroundColor Yellow
  exit 1
}
$rest = "$SupabaseUrl/rest/v1"
$h = @{ apikey=$svc; Authorization="Bearer $svc"; "Content-Type"="application/json" }
function Get-($path){ Invoke-RestMethod -Uri "$rest/$path" -Headers $h }
function Del-($path){ Invoke-RestMethod -Uri "$rest/$path" -Method Delete -Headers $h }

$mode = if ($Execute) { "EJECUCION REAL" } else { "DRY-RUN (vista previa, no borra)" }
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Limpieza $Tag  -  modo: $mode" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ---- 1. Localizar el equipo (incluye soft-deleted) ----
$eq = Get- "equipment?select=id,tag,name,project_id,deleted_at&tag=eq.$Tag"
if (-not $eq -or $eq.Count -eq 0) {
  Write-Host "No existe ningun equipo con tag=$Tag. Nada que limpiar." -ForegroundColor Green
  exit 0
}
if ($eq.Count -gt 1) {
  Write-Host "ADVERTENCIA: hay $($eq.Count) equipos con tag=$Tag. Se procesaran todos." -ForegroundColor Yellow
}
$eqIds = @($eq | ForEach-Object { $_.id })
$eqFilter = ($eqIds -join ",")
Write-Host "`nEquipo(s) objetivo:" -ForegroundColor White
$eq | ForEach-Object { "   $($_.tag) | $($_.name) | id=$($_.id) | proj=$($_.project_id) | del=$($_.deleted_at)" }

# ---- 2. Recolectar artefactos hijos ----
$tpls   = Get- "equipment_templates?select=id,template_id,equipment_id&equipment_id=in.($eqFilter)"
$tests  = Get- "tests?select=id,code,revision,equipment_id&equipment_id=in.($eqFilter)"
$evs    = Get- "evidences?select=id,test_id,stage,storage_url,equipment_id&equipment_id=in.($eqFilter)"
$punch  = Get- "punch_items?select=id,equipment_id&equipment_id=in.($eqFilter)"

# Certificados: certificates.test_id es RESTRICT (no cascada) -> hay que borrarlos
# ANTES que los tests o el DELETE de tests fallaria.
$testIds = @($tests | ForEach-Object { $_.id })
$certs = @()
if ($testIds.Count -gt 0) {
  $certs = Get- ("certificates?select=id,certificate_number,test_id&test_id=in.({0})" -f ($testIds -join ","))
}

# Rutas de storage a partir de storage_url (.../object/public/evidences/<path>)
$paths = @()
foreach ($e in $evs) {
  if ($e.storage_url) {
    $m = [regex]::Match($e.storage_url, "/evidences/(.+)$")
    if ($m.Success) { $paths += $m.Groups[1].Value }
  }
}
$paths = $paths | Select-Object -Unique

Write-Host "`n----- ARTEFACTOS DETECTADOS -----" -ForegroundColor White
Write-Host ("   equipment_templates : {0}" -f $tpls.Count)
Write-Host ("   tests               : {0}" -f $tests.Count)
$tests | ForEach-Object { "        - $($_.code) (rev $($_.revision)) $($_.id)" }
Write-Host ("   evidences (filas)   : {0}" -f $evs.Count)
Write-Host ("   storage (archivos)  : {0}" -f $paths.Count)
$paths | ForEach-Object { "        - evidences/$_" }
Write-Host ("   certificates        : {0}" -f $certs.Count)
$certs | ForEach-Object { "        - $($_.certificate_number) $($_.id)" }
Write-Host ("   punch_items         : {0}" -f $punch.Count)
Write-Host ("   equipment           : {0}" -f $eq.Count)

if (-not $Execute) {
  Write-Host "`nDRY-RUN: no se elimino nada. Para ejecutar de verdad usa -Execute." -ForegroundColor Yellow
  exit 0
}

# ---- 3. BACKUP antes de borrar ----
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = @{
  generated_at = (Get-Date).ToString("o")
  equipment = $eq; equipment_templates = $tpls; tests = $tests; evidences = $evs; punch_items = $punch; certificates = $certs; storage_paths = $paths
}
$backupFile = Join-Path $BackupDir "mbtest-backup-$stamp.json"
$backup | ConvertTo-Json -Depth 8 | Out-File -FilePath $backupFile -Encoding utf8
Write-Host "`nBackup escrito en: $backupFile" -ForegroundColor Green
Write-Host "(Rollback de filas: re-insertar desde el JSON. Los binarios de Storage no se restauran: son datos de prueba.)" -ForegroundColor DarkGray

# ---- 4. Borrado en orden de dependencias ----
Write-Host "`n----- ELIMINANDO -----" -ForegroundColor White

foreach ($p in $paths) {
  try { Invoke-RestMethod -Uri "$SupabaseUrl/storage/v1/object/evidences/$p" -Method Delete -Headers $h | Out-Null; "   storage borrado: $p" }
  catch { "   storage ERROR $p : $($_.Exception.Message)" }
}
if ($certs.Count -gt 0) { Del- ("certificates?test_id=in.({0})" -f ($testIds -join ",")) | Out-Null; "   certificates borrados: $($certs.Count)" }
if ($evs.Count   -gt 0) { Del- "evidences?equipment_id=in.($eqFilter)"          | Out-Null; "   evidences borradas: $($evs.Count)" }
if ($punch.Count -gt 0) { Del- "punch_items?equipment_id=in.($eqFilter)"        | Out-Null; "   punch_items borrados: $($punch.Count)" }
if ($tests.Count -gt 0) { Del- "tests?equipment_id=in.($eqFilter)"              | Out-Null; "   tests borrados: $($tests.Count)" }
if ($tpls.Count  -gt 0) { Del- "equipment_templates?equipment_id=in.($eqFilter)"| Out-Null; "   equipment_templates borrados: $($tpls.Count)" }
Del- "equipment?id=in.($eqFilter)" | Out-Null; "   equipment borrado: $($eq.Count)"

# ---- 5. Verificacion post-limpieza ----
Write-Host "`n----- VERIFICACION -----" -ForegroundColor White
$chk = Get- "equipment?select=id&tag=eq.$Tag"
$evChk = Get- "evidences?select=id&equipment_id=in.($eqFilter)"
$tChk  = Get- "tests?select=id&equipment_id=in.($eqFilter)"
Write-Host ("   equipment restantes : {0}" -f $chk.Count)
Write-Host ("   evidences restantes : {0}" -f $evChk.Count)
Write-Host ("   tests restantes     : {0}" -f $tChk.Count)
if ($chk.Count -eq 0 -and $evChk.Count -eq 0 -and $tChk.Count -eq 0) {
  Write-Host "`nLimpieza COMPLETA. P_MEC_010 (template) NO fue tocado." -ForegroundColor Green
} else {
  Write-Host "`nQuedan registros: revisar manualmente." -ForegroundColor Yellow
}
Write-Host "NOTA: los borradores en IndexedDB son locales del navegador; limpiar ahi con DevTools si es necesario." -ForegroundColor DarkGray
