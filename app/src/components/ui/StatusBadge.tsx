import { Badge } from "./Badge";
import type { EquipmentStatus, TestStatus, PunchStatus, PunchPriority } from "@/types";

const equipmentStatusMap: Record<EquipmentStatus, { label: string; variant: "default"|"success"|"warning"|"danger"|"info"|"purple" }> = {
  pendiente:          { label: "Pendiente",             variant: "default" },
  en_ejecucion:       { label: "En ejecución",          variant: "info" },
  aprobado:           { label: "Aprobado",              variant: "success" },
  rechazado:          { label: "Rechazado",             variant: "danger" },
  bloqueado:          { label: "Bloqueado",             variant: "warning" },
  listo_energizacion: { label: "Listo energización",   variant: "purple" },
  listo_arranque:     { label: "Listo arranque",        variant: "purple" },
  operativo:          { label: "Operativo",             variant: "success" },
};

const testStatusMap: Record<TestStatus, { label: string; variant: "default"|"success"|"warning"|"danger"|"info"|"purple" }> = {
  borrador:       { label: "Borrador",          variant: "default" },
  ejecutado:      { label: "Ejecutado",         variant: "info" },
  revisado:       { label: "Revisado",          variant: "info" },
  aprob_supervisor:{ label: "Aprobado Sup.",    variant: "purple" },
  aprob_qaqc:     { label: "Aprobado QA/QC",   variant: "warning" },
  aprob_cliente:  { label: "Aprobado Cliente",  variant: "success" },
  cerrado:        { label: "Cerrado",           variant: "success" },
  rechazado:      { label: "Rechazado",         variant: "danger" },
};

const punchStatusMap: Record<PunchStatus, { label: string; variant: "default"|"success"|"warning"|"danger"|"info"|"purple" }> = {
  abierto:    { label: "Abierto",     variant: "danger" },
  en_proceso: { label: "En proceso",  variant: "warning" },
  corregido:  { label: "Corregido",  variant: "info" },
  cerrado:    { label: "Cerrado",    variant: "success" },
};

const punchPriorityMap: Record<PunchPriority, { label: string; variant: "default"|"success"|"warning"|"danger"|"info"|"purple" }> = {
  critica: { label: "Crítica", variant: "danger" },
  alta:    { label: "Alta",    variant: "warning" },
  media:   { label: "Media",   variant: "info" },
  baja:    { label: "Baja",    variant: "default" },
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const m = equipmentStatusMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const m = testStatusMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function PunchStatusBadge({ status }: { status: PunchStatus }) {
  const m = punchStatusMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function PunchPriorityBadge({ priority }: { priority: PunchPriority }) {
  const m = punchPriorityMap[priority];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
