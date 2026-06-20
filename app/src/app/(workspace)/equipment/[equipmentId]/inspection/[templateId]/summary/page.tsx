"use client";
import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

/**
 * Ruta legacy: el resumen ahora se renderiza INLINE dentro del formulario
 * (ver ../page.tsx). Esta página solo redirige al formulario para no romper
 * enlaces antiguos. El guardado ya no depende de cargar esta ruta — clave
 * para que el flujo funcione offline.
 */
export default function LegacySummaryRedirect() {
  const params = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo") ?? "/";

  useEffect(() => {
    const { equipmentId, templateId } = params;
    router.replace(
      `/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, [params, returnTo, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500">Redirigiendo…</p>
    </div>
  );
}
