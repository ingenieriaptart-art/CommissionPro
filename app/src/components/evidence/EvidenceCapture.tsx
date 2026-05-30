"use client";
import { useRef, useState } from "react";
import { Camera, Upload, MapPin, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { localDB, saveBlobLocally, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { Evidence, EvidenceStage, EvidenceType } from "@/types";

interface EvidenceCaptureProps {
  projectId?: string;
  testId?: string;
  equipmentId?: string;
  punchId?: string;
  stage?: EvidenceStage;
  capturedBy?: string;
  onSaved?: (evidence: Evidence) => void;
}

export function EvidenceCapture({
  projectId, testId, equipmentId, punchId,
  stage = "general", capturedBy, onSaved,
}: EvidenceCaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getGps = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    getGps();
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    const id = uuidv4();
    const now = new Date().toISOString();
    const type: EvidenceType = preview.startsWith("data:video") ? "video" : "foto";
    const response = await fetch(preview);
    const blob = await response.blob();
    const blobRef = String(await saveBlobLocally(id, blob));
    const evidence: Evidence = {
      id, project_id: projectId, test_id: testId,
      equipment_id: equipmentId, punch_id: punchId,
      type, stage, storage_url: undefined, local_blob_ref: blobRef,
      gps_lat: gps?.lat, gps_lng: gps?.lng,
      observations: obs, captured_by: capturedBy,
      captured_at: now, sync_status: "pending",
    };
    await localDB.evidences.add(evidence);
    await enqueueSync("evidences", id, "INSERT", evidence);
    if (navigator.onLine) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const ext = blob.type.split("/")[1] ?? "jpg";
        const path = "evidences/" + id + "." + ext;
        const { error: uploadError } = await supabase.storage
          .from("evidences").upload(path, blob, { contentType: blob.type });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("evidences").getPublicUrl(path);
          await supabase.from("evidences").insert({ ...evidence, storage_url: publicUrl, local_blob_ref: null });
          await localDB.evidences.update(id, { storage_url: publicUrl, sync_status: "synced" });
          evidence.storage_url = publicUrl;
        }
      } catch {}
    }
    setSaving(false);
    setSaved(true);
    onSaved?.(evidence);
    setTimeout(() => { setSaved(false); setPreview(null); setObs(""); setGps(null); }, 2000);
  };

  return (
    <div className="space-y-3">
      {!preview ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" icon={<Camera size={20} />}
            onClick={() => { if (fileRef.current) { fileRef.current.accept="image/*"; fileRef.current.setAttribute("capture","environment"); fileRef.current.click(); } }}
            fullWidth>
            Camara
          </Button>
          <Button variant="secondary" size="lg" icon={<Upload size={20} />}
            onClick={() => { if (fileRef.current) { fileRef.current.accept="image/*,video/*,application/pdf"; fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}
            fullWidth>
            Archivo
          </Button>
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full rounded-xl object-cover max-h-64" />
            <button onClick={() => setPreview(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">
              <X size={14} />
            </button>
          </div>
          {gps && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <MapPin size={12} /> {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            </p>
          )}
          <textarea value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Observaciones (opcional)..." rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Cancelar</Button>
            <Button size="sm" icon={saved ? <Check size={14} /> : undefined}
              variant={saved ? "success" : "primary"}
              loading={saving} onClick={handleSave} className="ml-auto">
              {saved ? "Guardada!" : "Guardar evidencia"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
