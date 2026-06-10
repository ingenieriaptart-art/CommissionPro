"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

export interface TemplateAssignment {
  id: string;
  template_id: string;
  template: Pick<FormTemplate, "id" | "key" | "name" | "test_type">;
}

export interface EntityWithAssignments<TEntity> {
  entity: TEntity;
  assignments: TemplateAssignment[];
}

// ── Plantillas globales ───────────────────────────────────────────────────────

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
        if (!map[row.equipment_type_id]) map[row.equipment_type_id] = [];
        map[row.equipment_type_id].push(entry);
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemAssignments(projectId: string) {
  return useQuery({
    queryKey: ["assignments", "system", projectId],
    queryFn: async (): Promise<{ systems: { id: string; name: string; area_name: string }[]; map: Record<string, TemplateAssignment[]> }> => {
      const supabase = createClient();

      // Obtener sistemas del proyecto vía areas
      const { data: areas } = await supabase
        .from("areas").select("id").eq("project_id", projectId);
      const areaIds = (areas ?? []).map(a => a.id);
      if (!areaIds.length) return { systems: [], map: {} };

      const { data: systemRows } = await supabase
        .from("systems")
        .select("id, name, area_id, areas(name)")
        .in("area_id", areaIds)
        .order("name");

      const systems = (systemRows ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        area_name: s.areas?.name ?? "",
      }));

      const systemIds = systems.map(s => s.id);
      if (!systemIds.length) return { systems, map: {} };

      const { data: assignRows } = await supabase
        .from("system_templates")
        .select("id, system_id, template_id, form_templates(id, key, name, test_type)")
        .in("system_id", systemIds);

      const map: Record<string, TemplateAssignment[]> = {};
      for (const row of (assignRows ?? [])) {
        const ft = (row as any).form_templates;
        if (!ft) continue;
        const entry: TemplateAssignment = {
          id: row.id,
          template_id: row.template_id,
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
    queryFn: async (): Promise<{ subsystems: { id: string; name: string; system_name: string }[]; map: Record<string, TemplateAssignment[]> }> => {
      const supabase = createClient();

      const { data: areas } = await supabase
        .from("areas").select("id").eq("project_id", projectId);
      const areaIds = (areas ?? []).map(a => a.id);
      if (!areaIds.length) return { subsystems: [], map: {} };

      const { data: systemRows } = await supabase
        .from("systems").select("id, name").in("area_id", areaIds);
      const systemIds = (systemRows ?? []).map(s => s.id);
      const systemNames: Record<string, string> = Object.fromEntries((systemRows ?? []).map(s => [s.id, s.name]));
      if (!systemIds.length) return { subsystems: [], map: {} };

      const { data: subRows } = await supabase
        .from("subsystems")
        .select("id, name, system_id")
        .in("system_id", systemIds)
        .order("name");

      const subsystems = (subRows ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        system_name: systemNames[s.system_id] ?? "",
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
          id: row.id,
          template_id: row.template_id,
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

export function useEquipmentDirectAssignments(projectId: string, search: string) {
  return useQuery({
    queryKey: ["assignments", "equipment", projectId, search],
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
          id: row.id,
          template_id: row.template_id,
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

// ── Mutaciones ────────────────────────────────────────────────────────────────

type AssignLevel = "equipment_type" | "system" | "subsystem" | "equipment";

interface AssignPayload {
  level: AssignLevel;
  entityId: string;
  templateId: string;
  projectId?: string;
}

const LEVEL_TABLE: Record<AssignLevel, string> = {
  equipment_type: "equipment_type_templates",
  system:         "system_templates",
  subsystem:      "subsystem_templates",
  equipment:      "equipment_templates",
};

const LEVEL_FK: Record<AssignLevel, string> = {
  equipment_type: "equipment_type_id",
  system:         "system_id",
  subsystem:      "subsystem_id",
  equipment:      "equipment_id",
};

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, entityId, templateId }: AssignPayload) => {
      const supabase = createClient();
      const { error } = await supabase
        .from(LEVEL_TABLE[level])
        .insert({ [LEVEL_FK[level]]: entityId, template_id: templateId });
      if (error) throw error;
    },
    onSuccess: (_, { level, projectId }) => {
      if (level === "equipment_type") {
        qc.invalidateQueries({ queryKey: ["assignments", "equipment-type"] });
      } else {
        qc.invalidateQueries({ queryKey: ["assignments", level, projectId] });
      }
      qc.invalidateQueries({ queryKey: ["equipment-inspection-templates"] });
    },
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, assignmentId }: { level: AssignLevel; assignmentId: string; projectId?: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from(LEVEL_TABLE[level])
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: (_, { level, projectId }) => {
      if (level === "equipment_type") {
        qc.invalidateQueries({ queryKey: ["assignments", "equipment-type"] });
      } else {
        qc.invalidateQueries({ queryKey: ["assignments", level, projectId] });
      }
      qc.invalidateQueries({ queryKey: ["equipment-inspection-templates"] });
    },
  });
}
