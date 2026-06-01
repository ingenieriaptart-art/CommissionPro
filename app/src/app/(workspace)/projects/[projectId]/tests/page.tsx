"use client";
import { use, useState } from "react";
import { useTests, useCreateTest } from "@/hooks/useTests";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TestStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { fmtDate } from "@/lib/utils";
import { Plus, CheckSquare } from "lucide-react";
import type { TestType } from "@/types";

interface Props { params: Promise<{ projectId: string }> }

const typeLabel: Record<TestType, string> = {
  precomisionamiento: "Precomisionamiento",
  fat:        "FAT",
  sat:        "SAT",
  loop_check: "Loop Check",
  energizacion: "Energización",
  funcional:  "Funcional",
};

const typeColor: Record<TestType, string> = {
  precomisionamiento: "bg-slate-100 text-slate-700",
  fat:        "bg-purple-100 text-purple-700",
  sat:        "bg-blue-100 text-blue-700",
  loop_check: "bg-cyan-100 text-cyan-700",
  energizacion: "bg-amber-100 text-amber-700",
  funcional:  "bg-emerald-100 text-emerald-700",
};

export default function TestsPage({ params }: Props) {
  const { projectId } = use(params);
  const { data: tests = [], isLoading } = useTests(projectId);
  const createTest = useCreateTest();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<TestType | "">("");

  const filtered = tests.filter((t) => !filterType || t.type === filterType);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pruebas y Protocolos</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} protocolo(s)</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Nuevo protocolo
        </Button>
      </div>

      <Select
        options={Object.entries(typeLabel).map(([v, l]) => ({ value: v, label: l }))}
        placeholder="Todos los tipos"
        value={filterType}
        onChange={(e) => setFilterType(e.target.value as TestType | "")}
      />

      {showForm && (
        <Card className="border-blue-200 dark:border-blue-800">
          <NewTestForm
            projectId={projectId}
            onSave={async (data) => {
              await createTest.mutateAsync(data as Parameters<typeof createTest.mutateAsync>[0]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
            loading={createTest.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <CheckSquare size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay protocolos registrados</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[t.type]}`}>
                      {typeLabel[t.type]}
                    </span>
                    <TestStatusBadge status={t.status} />
                    {t.sync_status === "pending" && (
                      <Badge variant="warning">Pendiente sync</Badge>
                    )}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {t.code ?? `Protocolo ${t.type}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{fmtDate(t.created_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTestForm({ projectId, onSave, onCancel, loading }: {
  projectId: string;
  onSave: (data: object) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [type, setType] = useState<TestType>("precomisionamiento");
  const [code, setCode] = useState("");

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Nuevo Protocolo</h4>
      <Select
        label="Tipo de prueba"
        options={Object.entries(typeLabel).map(([v, l]) => ({ value: v, label: l }))}
        value={type}
        onChange={(e) => setType(e.target.value as TestType)}
      />
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        placeholder="Código (opcional)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          loading={loading}
          onClick={() => onSave({ project_id: projectId, type, code, status: "borrador" })}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
