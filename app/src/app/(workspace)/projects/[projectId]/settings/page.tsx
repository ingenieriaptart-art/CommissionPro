"use client";
import { use, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui.store";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Props { params: Promise<{ projectId: string }> }

const PRESETS = [
  { label: "3 seg", ms: 3000 },
  { label: "5 seg", ms: 5000 },
  { label: "10 seg", ms: 10000 },
  { label: "20 seg", ms: 20000 },
  { label: "30 seg", ms: 30000 },
  { label: "Nunca", ms: 0 },
];

export default function SettingsPage({ params }: Props) {
  const { projectId } = use(params);
  const { sidebarAutoCloseMs, setSidebarAutoCloseMs } = useUIStore();
  const seconds = sidebarAutoCloseMs > 0 ? sidebarAutoCloseMs / 1000 : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(155deg,#040C18 0%,#071524 60%,#040C18 100%)",
        color: "#E2E8F0",
        fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
        padding: "40px 32px",
      }}
    >
      <h1
        style={{
          fontSize: "22px",
          fontWeight: "700",
          letterSpacing: "1px",
          color: "#FFFFFF",
          marginBottom: "8px",
        }}
      >
        ⚙ Configuración
      </h1>
      <p style={{ fontSize: "12px", color: "#374151", marginBottom: "40px", letterSpacing: "0.5px" }}>
        Preferencias de interfaz — guardadas localmente en este dispositivo
      </p>

      {/* Card: Sidebar auto-cierre */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "24px 28px",
          maxWidth: "560px",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#E2E8F0", marginBottom: "4px" }}>
            Auto-cierre del menú lateral
          </div>
          <div style={{ fontSize: "11px", color: "#4B5563", lineHeight: "1.5" }}>
            En módulos de pantalla completa (Mapa de Planta, Instrumentos IC02), el menú lateral
            se abre al tocar la flecha ▶ y se cierra automáticamente pasado este tiempo.
            Elegí <strong style={{ color: "#94A3B8" }}>Nunca</strong> para mantenerlo abierto.
          </div>
        </div>

        {/* Valor actual */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: "800",
            color: sidebarAutoCloseMs > 0 ? "#38BDF8" : "#4B5563",
            marginBottom: "20px",
            lineHeight: 1,
          }}
        >
          {sidebarAutoCloseMs > 0 ? `${seconds} seg` : "Nunca"}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={seconds}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSidebarAutoCloseMs(val === 0 ? 0 : val * 1000);
          }}
          style={{ width: "100%", accentColor: "#38BDF8", marginBottom: "16px", cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#374151", marginBottom: "20px" }}>
          <span>Nunca</span>
          <span>15 seg</span>
          <span>30 seg</span>
        </div>

        {/* Presets rápidos */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {PRESETS.map((p) => {
            const active = p.ms === sidebarAutoCloseMs;
            return (
              <button
                key={p.ms}
                onClick={() => setSidebarAutoCloseMs(p.ms)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  border: `1px solid ${active ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.03)",
                  color: active ? "#38BDF8" : "#4B5563",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 150ms",
                  fontFamily: "inherit",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card: Logos del informe */}
      <ClientLogoCard projectId={projectId} />
    </div>
  );
}

function ClientLogoCard({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: project, refetch } = useQuery({
    queryKey: ["project-client-logo", projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("id, name, client_company:companies(id, name, logo_url)")
        .eq("id", projectId)
        .single();
      return data as { id: string; name: string; client_company?: { id: string; name: string; logo_url?: string | null } | null } | null;
    },
    enabled: !!projectId,
  });

  const clientCompany = project?.client_company;

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "24px 28px",
    maxWidth: "560px",
    marginTop: "24px",
  };

  const handleUpload = async (file: File) => {
    if (!clientCompany?.id) {
      setErrorMsg("El proyecto no tiene empresa cliente asignada.");
      setUploadState("error");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMsg(`Formato no soportado: ${file.type || file.name.split(".").pop()}. Usa PNG, JPG, SVG o WEBP.`);
      setUploadState("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("El archivo supera 5 MB.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setErrorMsg("");

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `logos/${clientCompany.id}/logo.${ext}`;

    // 1. Upload al Storage
    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setErrorMsg(`Storage: ${uploadErr.message}`);
      setUploadState("error");
      return;
    }

    // 2. Obtener URL pública
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    // 3. Guardar en companies.logo_url
    const { error: dbErr } = await supabase
      .from("companies")
      .update({ logo_url: urlData.publicUrl })
      .eq("id", clientCompany.id);

    if (dbErr) {
      setErrorMsg(`BD: ${dbErr.message}`);
      setUploadState("error");
      return;
    }

    setPreviewUrl(urlData.publicUrl);
    setUploadState("done");
    refetch();
  };

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#E2E8F0", marginBottom: "4px" }}>
          Logos del informe de inspección
        </div>
        <div style={{ fontSize: "11px", color: "#4B5563", lineHeight: "1.5" }}>
          Los logos aparecen en el encabezado del Listado de Inspección al imprimir o exportar.
        </div>
        {clientCompany && (
          <div style={{ fontSize: "10px", color: "#22c55e", marginTop: "6px" }}>
            ✓ Cliente detectado: <strong>{clientCompany.name}</strong>
          </div>
        )}
        {project && !clientCompany && (
          <div style={{ fontSize: "10px", color: "#f59e0b", marginTop: "6px" }}>
            ⚠ Este proyecto no tiene empresa cliente asignada en la base de datos.
          </div>
        )}
      </div>

      {/* Fila de logos */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Logo Biotec — fijo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-biotec.png" alt="Biotec" style={{ height: "52px", objectFit: "contain", background: "#fff", padding: "6px", borderRadius: "6px" }} />
          <span style={{ fontSize: "10px", color: "#4B5563", textAlign: "center" }}>Empresa<br />(Biotec)</span>
        </div>

        {/* Logo cliente — editable */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              height: "52px", width: "90px",
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: "6px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.02)",
              overflow: "hidden",
              position: "relative",
            }}
            title="Subir logo del cliente"
          >
            {(previewUrl ?? clientCompany?.logo_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl ?? clientCompany!.logo_url!} alt="Logo cliente" style={{ maxHeight: "44px", maxWidth: "82px", objectFit: "contain" }} />
            ) : (
              <UploadCloud size={20} style={{ color: "#4B5563" }} />
            )}
          </div>
          <span style={{ fontSize: "10px", color: "#4B5563", textAlign: "center" }}>
            {clientCompany?.name ?? "Cliente"}
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadState === "uploading" || !clientCompany}
            style={{
              fontSize: "10px", padding: "4px 10px",
              borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "#94A3B8",
              cursor: clientCompany ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            {uploadState === "uploading"
              ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Subiendo…</>
              : uploadState === "done"
              ? <><CheckCircle size={11} /> Listo</>
              : <><UploadCloud size={11} /> {clientCompany?.logo_url ? "Reemplazar" : "Subir logo"}</>
            }
          </button>
          {uploadState === "error" && (
            <span style={{ fontSize: "10px", color: "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={11} /> {errorMsg}
            </span>
          )}
          {!clientCompany && (
            <span style={{ fontSize: "10px", color: "#4B5563" }}>Sin empresa cliente asignada</span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
