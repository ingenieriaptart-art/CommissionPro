"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Plus, Settings, Search, FileText } from "lucide-react";

interface FormTemplate {
  id: string;
  code: string;
  name: string;
  category: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("form_templates")
      .select("id, code, name, category, version, is_active, created_at")
      .order("name")
      .then(({ data }) => {
        setForms((data ?? []) as FormTemplate[]);
        setLoading(false);
      });
  }, []);

  const filtered = forms.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Formularios</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} plantilla(s) de formulario</p>
        </div>
        <Button icon={<Plus size={16} />}>Nueva plantilla</Button>
      </div>

      <Input
        placeholder="Buscar por nombre o código..."
        icon={<Search size={16} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Settings size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay plantillas de formulario</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{f.name}</p>
                    <Badge variant={f.is_active ? "success" : "default"}>
                      {f.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-600 font-mono mt-0.5">{f.code}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="info">v{f.version}</Badge>
                    {f.category && (
                      <span className="text-xs text-slate-400">{f.category}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
