"use client";
import Link from "next/link";
import { ArrowLeft, Camera, AlertTriangle, CheckCircle, Lock, User, Calendar, MapPin } from "lucide-react";
import { usePunchDetail, useUserName } from "@/hooks/usePunch";
import { PunchStatusBadge, PunchPriorityBadge } from "@/components/ui/StatusBadge";
import { fmtDate } from "@/lib/utils";
import type { Evidence, EvidenceStage } from "@/types";

const STAGE_LABEL: Record<EvidenceStage, string> = {
  antes:        "Antes",
  durante:      "Durante",
  despues:      "Después",
  general:      "Novedad",
  correccion:   "Corrección",
  verificacion: "Verificación",
};

interface Props {
  projectId: string;
  punchId: string;
}

export function PunchDetail({ projectId, punchId }: Props) {
  const { data, isLoading, error } = usePunchDetail(punchId);

  if (isLoading) return <LoadingState />;
  if (error || !data?.punch) return <ErrorState projectId={projectId} />;

  const { punch, evidences, location } = data;

  const locationParts = [
    location.area,
    location.system,
    location.subsystem,
    location.equipment,
  ].filter(Boolean) as string[];

  const byStage = (stage: EvidenceStage) =>
    evidences.filter((e: Evidence) => e.stage === stage);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <Link
        href={`/projects/${projectId}/punch`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a Punch List
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <PunchPriorityBadge priority={punch.priority} />
          <PunchStatusBadge status={punch.status} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {punch.title}
        </h1>
        <div className="flex items-start gap-1.5 mt-1">
          <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
          {locationParts.length > 0 ? (
            <p className="text-sm text-slate-500 leading-snug">
              {locationParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-slate-300">›</span>}
                  <span className={i === locationParts.length - 1 ? "font-medium text-slate-700 dark:text-slate-300" : ""}>
                    {part}
                  </span>
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">Sin equipo asignado</p>
          )}
        </div>
        {punch.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
            {punch.description}
          </p>
        )}
      </div>

      {/* Línea de tiempo */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
          Trazabilidad
        </h2>
        <div className="space-y-3">
          <TimelineRow
            icon={<AlertTriangle size={16} className="text-amber-500" />}
            label="Registrado"
            date={punch.created_at}
            userId={punch.created_by}
            color="amber"
          />
          {punch.corrected_at && (
            <TimelineRow
              icon={<CheckCircle size={16} className="text-emerald-500" />}
              label="Corregido"
              date={punch.corrected_at}
              userId={punch.corrected_by}
              color="emerald"
            />
          )}
          {punch.closed_at && (
            <>
              <TimelineRow
                icon={<Lock size={16} className="text-blue-500" />}
                label="Cerrado"
                date={punch.closed_at}
                userId={punch.closed_by}
                color="blue"
              />
              {punch.verification_notes && (
                <div className="ml-8 text-sm text-slate-500 italic bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  "{punch.verification_notes}"
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Evidencias por etapa */}
      {(["general", "correccion", "verificacion"] as EvidenceStage[]).map((stage) => {
        const evs = byStage(stage);
        if (!evs.length) return null;
        return (
          <section key={stage}>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Camera size={15} />
              Evidencia — {STAGE_LABEL[stage]}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {evs.map((ev: Evidence) => (
                <EvidenceCard key={ev.id} evidence={ev} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TimelineRow({
  icon, label, date, userId, color,
}: {
  icon: React.ReactNode;
  label: string;
  date: string;
  userId?: string | null;
  color: "amber" | "emerald" | "blue";
}) {
  const name = useUserName(userId);
  const colorMap = {
    amber:   "border-amber-200 dark:border-amber-800",
    emerald: "border-emerald-200 dark:border-emerald-800",
    blue:    "border-blue-200 dark:border-blue-800",
  };

  return (
    <div className={`flex gap-3 pl-3 border-l-2 ${colorMap[color]}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar size={11} /> {fmtDate(date)}
          </span>
          {name && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <User size={11} /> {name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const src = evidence.storage_url;
  if (!src) {
    return (
      <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1">
        <Camera size={24} className="text-slate-400" />
        <p className="text-xs text-slate-400">Pendiente sync</p>
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Evidencia ${evidence.stage}`}
        className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity"
      />
    </a>
  );
}

function LoadingState() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse pt-4">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  );
}

function ErrorState({ projectId }: { projectId: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-slate-500 mb-4">No se pudo cargar el punch.</p>
      <Link href={`/projects/${projectId}/punch`} className="text-blue-600 hover:underline text-sm">
        Volver a la lista
      </Link>
    </div>
  );
}
