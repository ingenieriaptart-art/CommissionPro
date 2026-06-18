"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AuditRow } from "@/types";

export interface AuditFilters {
  page:      number;
  pageSize:  number;
  userId?:   string;
  entity?:   string;
  action?:   "INSERT" | "UPDATE" | "DELETE" | "";
  from?:     string;
  to?:       string;
  q?:        string;
}

export interface AuditPage {
  rows:     AuditRow[];
  total:    number;
  page:     number;
  pageSize: number;
}

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AuditPage> => {
      const token = await getToken();
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.from)   params.set("from", filters.from);
      if (filters.to)     params.set("to", filters.to);
      if (filters.q)      params.set("q", filters.q);

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(error ?? "Error al cargar la bitácora");
      }
      return res.json();
    },
  });
}
