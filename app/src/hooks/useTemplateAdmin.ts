"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface FormTemplate {
  id: string;
  key: string;
  name: string;
  test_type: string;
  project_id: string | null;
}

export interface EquipmentType {
  id: string;
  code: string;
  name: string;
  discipline: string;
  sort_order: number;
}

export type AssignmentSource =
  | "equipment"
  | "subsystem"
  | "system"
  | "equipment_type"
  | "default";

export interface TemplateAssignment {
  id: string;
  template_id: string;
  template: Pick<FormTemplate, "id" | "key" | "name" | "test_type">;
}

// Una fila de la resolución bulk (del RPC get_project_templates_resolution)
export interface EquipmentResolutionRow {
  equipment_id:   string;
  equipment_tag:  string;
  equipment_name: string;
  template_id:    string | null;
  template_key:   string | null;
  template_name:  string | null;
  discipline:     string | null;
  source:         AssignmentSource | null;
  assignment_id:  string | null;
  total_count:    number;
}

// Forma agrupada para la UI: un equipo con todos sus templates efectivos
export interface EquipmentResolved {
  id:        string;
  tag:       string;
  name:      string;
  templates: Array<{
    id:           string;
    key:          string;
    name:         string;
    discipline:   string;
    source:       AssignmentSource;
    assignmentId: string;
  }>;
  totalCount: number;
}

// ── Catálogo global de templates ─────────────────────────────────────────────

export function useFormTemplates() {
  return useQuery({
    queryKey: ["form-templates"],
    queryFn: async (): Promise<FormTemplate[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("form_templates")
        .select("id, key, name, test_type, project_id")
        .is("deleted_at", null)
        .order("key");
      if (error) throw error;
      return (data ?? []) as FormTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Tipos de equipo ───────────────────────────────────────────────────────────

export function useEquipmentTypes() {
  return useQuery({
    queryKey: ["equipment-types"],
    queryFn: async (): Promise<EquipmentType[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("equipment_types")
        .select("id, code, name, discipline, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as EquipmentType[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ── Asignaciones por nivel ────────────────────────────────────────────────────

export function useEquipmentTypeAssignments() {
  return useQuery({
    queryKey: ["assignments", "equipment-type"],
    queryFn: async (): Promise<Record<string, TemplateAssignment[]>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("equipment_type_templates")
        .select("id, equipment_type_id, template_id, form_templates(id, key, name, test_type)");
      if (error) throw error;
      const map: Record<string, TemplateAssignment[]> = {};
      for (const row of (data ?? [])) {
        const ft = (row as any).form_templates;
        if (!ft) continue;
        const entry: TemplateAssignment = {
          id: row.id,
          template_id: row.template_id,
          template: { id: ft.id, key: ft.key, name: ft.name, test_type: ft.test_type },
        };
        const k = row.equipment_type_id;
        if (!map[k]) map[k] = [];
        map[k].push(entry);
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemAssignments(projectId: string) {
  return useQuery({
    queryKey: ["assignments", "system", projectId],
    queryFn: async () => {
      const supabase = createClient();

      // Sistemas del proyecto (join a areas)
      const { data: areaRows } = await supabase
        .from("areas").select("id").eq("project_id", projectId);
      const areaIds = (areaRows ?? []).map(a => a.id);
      if (!areaIds.length) return { systems: [] as { id: string; name: string; area_name: string }[], map: {} as Record<string, TemplateAssignment[]> };

      const { data: sysRows } = await supabase
        .from("systems")
        .select("id, name, area_id, areas(name)")
        .in("area_id", areaIds)
        .order("name");

      const systems = (sysRows ?? []).map((s: any) => ({
        id: s.id, name: s.name, area_name: s.areas?.name ?? "",
      }));

      const sysIds = systems.map(s => s.id);
      if (!sysIds.length) return { systems, map: {} };

      const { data: assignRows } = await supabase
        .from("system_templates")
        .select("id, system_id, template_id, form_templates(id, key, name, test_type)")
        .in("system_id", sysIds);

      const map: Record<string, TemplateAssignment[]> = {};
      for (const row of (assignRows ?? [])) {
        const ft = (row as any).form_templates;
        if (!ft) continue;
        const entry: TemplateAssignment = {
          id: row.id, template_id: row.template_id,
          template: { id: ft.id, key: ft.key, name: ft.name, test_type: ft.test_type },
        };
        if (!map[row.system_id]) map[row.system_id] = [];
        map[row.system_id].push(entry);
      }
      return { systems, map };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubsystemAssignments(projectId: string) {
  return useQuery({
    queryKey: ["assignments", "subsystem", projectId],
    queryFn: async () => {
      const supabase = createClient();

      const { data: areaRows } = await supabase
        .from("areas").select("id").eq("project_id", projectId);
      const areaIds = (areaRows ?? []).map(a => a.id);
      if (!areaIds.length) return { subsystems: [] as { id: string; name: string; system_name: string }[], map: {} as Record<string, TemplateAssignment[]> };

      const { data: sysRows } = await supabase
        .from("systems").select("id, name").in("area_id", areaIds);
      const sysIds = (sysRows ?? []).map(s => s.id);
      const sysNames: Record<string, string> = Object.fromEntries((sysRows ?? []).map(s => [s.id, s.name]));
      if (!sysIds.length) return { subsystems: [], map: {} };

      const { data: subRows } = await supabase
        .from("subsystems")
        .select("id, name, system_id")
        .in("system_id", sysIds)
        .order("name");

      const subsystems = (subRows ?? []).map((s: any) => ({
        id: s.id, name: s.name, system_name: sysNames[s.system_id] ?? "",
      }));

      const subIds = subsystems.map(s => s.id);
      if (!subIds.length) return { subsystems, map: {} };

      const { data: assignRows } = await supabase
        .from("subsystem_templates")
        .select("id, subsystem_id, template_id, form_templates(id, key, name, test_type)")
        .in("subsystem_id", subIds);

      const map: Record<string, TemplateAssignment[]> = {};
      for (const row of (assignRows ?? [])) {
        const ft = (row as any).form_templates;
        if (!ft) continue;
        const entry: TemplateAssignment = {
          id: row.id, template_id: row.template_id,
          template: { id: ft.id, key: ft.key, name: ft.name, test_type: ft.test_type },
        };
        if (!map[row.subsystem_id]) map[row.subsystem_id] = [];
        map[row.subsystem_id].push(entry);
      }
      return { subsystems, map };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefaultTemplates(projectId: string) {
  return useQuery({
    queryKey: ["assignments", "default", projectId],
    queryFn: async (): Promise<TemplateAssignment[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_default_templates")
        .select("id, template_id, form_templates(id, key, name, test_type)")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).flatMap(row => {
        const ft = (row as any).form_templates;
        if (!ft) return [];
        return [{ id: row.id, template_id: row.template_id,
          template: { id: ft.id, key: ft.key, name: ft.name, test_type: ft.test_type } }];
      });
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// Asignaciones directas por equipo (solo nivel "equipment")
export function useEquipmentDirectAssignments(projectId: string, search: string) {
  return useQuery({
    queryKey: ["assignments", "equipment-direct", projectId, search],
    queryFn: async (): Promise<{ equipment: { id: string; tag: string; name: string }[]; map: Record<string, TemplateAssignment[]> }> => {
      const supabase = createClient();
      let query = supabase
        .from("equipment")
        .select("id, tag, name")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("tag")
        .limit(60);
      if (search.trim()) {
        query = query.or(`tag.ilike.%${search}%,name.ilike.%${search}%`);
      }
      const { data: eqRows } = await query;
      const equipment = (eqRows ?? []).map(e => ({ id: e.id, tag: e.tag, name: e.name }));
      const eqIds = equipment.map(e => e.id);
      if (!eqIds.length) return { equipment, map: {} };
      const { data: assignRows } = await supabase
        .from("equipment_templates")
        .select("id, equipment_id, template_id, form_templates(id, key, name, test_type)")
        .in("equipment_id", eqIds);
      const map: Record<string, TemplateAssignment[]> = {};
      for (const row of (assignRows ?? [])) {
        const ft = (row as any).form_templates;
        if (!ft) continue;
        const entry: TemplateAssignment = {
          id: row.id, template_id: row.template_id,
          template: { id: ft.id, key: ft.key, name: ft.name, test_type: ft.test_type },
        };
        if (!map[row.equipment_id]) map[row.equipment_id] = [];
        map[row.equipment_id].push(entry);
      }
      return { equipment, map };
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

// Resolución completa (bulk, paginada) — llama al RPC del servidor
export function useProjectEquipmentResolution(
  projectId: string,
  search: string,
  page: number,
  pageSize = 50,
) {
  return useQuery({
    queryKey: ["resolution", projectId, search, page, pageSize],
    queryFn: async (): Promise<{ rows: EquipmentResolved[]; totalCount: number }> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_project_templates_resolution", {
        p_project_id: projectId,
        p_search:     search.trim() || null,
        p_limit:      pageSize,
        p_offset:     page * pageSize,
      });
      if (error) throw error;

      // Agrupar filas por equipment_id
      const byEquipment = new Map<string, EquipmentResolved>();
      let totalCount = 0;
      for (const row of ((data ?? []) as EquipmentResolutionRow[])) {
        totalCount = row.total_count;
        if (!byEquipment.has(row.equipment_id)) {
          byEquipment.set(row.equipment_id, {
            id: row.equipment_id, tag: row.equipment_tag, name: row.equipment_name,
            templates: [], totalCount: row.total_count,
          });
        }
        if (row.template_id) {
          byEquipment.get(row.equipment_id)!.templates.push({
            id:           row.template_id,
            key:          row.template_key!,
            name:         row.template_name!,
            discipline:   row.discipline ?? "",
            source:       row.source!,
            assignmentId: row.assignment_id!,
          });
        }
      }
      return { rows: Array.from(byEquipment.values()), totalCount };
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    placeholderData: prev => prev,
  });
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

export type AssignLevel =
  | "equipment_type"
  | "system"
  | "subsystem"
  | "equipment"
  | "default";

interface AssignPayload {
  level:      AssignLevel;
  entityId:   string;      // equipment_type_id | system_id | subsystem_id | equipment_id
  templateId: string;
  projectId?: string;      // requerido para system, subsystem, default
}

const LEVEL_TABLE: Record<AssignLevel, string> = {
  equipment_type: "equipment_type_templates",
  system:         "system_templates",
  subsystem:      "subsystem_templates",
  equipment:      "equipment_templates",
  default:        "project_default_templates",
};

const LEVEL_FK: Record<AssignLevel, string> = {
  equipment_type: "equipment_type_id",
  system:         "system_id",
  subsystem:      "subsystem_id",
  equipment:      "equipment_id",
  default:        "project_id",
};

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, entityId, templateId, projectId }: AssignPayload) => {
      const supabase = createClient();
      const fk      = LEVEL_FK[level];
      const row: Record<string, string> = {
        [fk]:        level === "default" ? projectId! : entityId,
        template_id: templateId,
      };
      // Para system/subsystem, pasar project_id explícito (el trigger también lo rellena,
      // pero pasarlo garantiza que la política RLS lo vea antes de persistir)
      if ((level === "system" || level === "subsystem") && projectId) {
        row.project_id = projectId;
      }
      const { error } = await supabase.from(LEVEL_TABLE[level]).insert(row);
      if (error) throw error;
    },
    onSuccess: (_, { level, projectId }) => {
      const k = level === "equipment_type"
        ? ["assignments", "equipment-type"]
        : level === "default"
          ? ["assignments", "default", projectId]
          : ["assignments", level, projectId];
      qc.invalidateQueries({ queryKey: k });
      qc.invalidateQueries({ queryKey: ["equipment-inspection-templates"] });
      qc.invalidateQueries({ queryKey: ["resolution", projectId] });
    },
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, assignmentId }: { level: AssignLevel; assignmentId: string; projectId?: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from(LEVEL_TABLE[level]).delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: (_, { level, projectId }) => {
      const k = level === "equipment_type"
        ? ["assignments", "equipment-type"]
        : level === "default"
          ? ["assignments", "default", projectId]
          : ["assignments", level, projectId];
      qc.invalidateQueries({ queryKey: k });
      qc.invalidateQueries({ queryKey: ["equipment-inspection-templates"] });
      qc.invalidateQueries({ queryKey: ["resolution", projectId] });
    },
  });
}
