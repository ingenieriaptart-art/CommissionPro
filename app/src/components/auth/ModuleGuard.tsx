"use client";
import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useMyModuleAccess } from "@/hooks/useMyModuleAccess";
import { MODULE_KEYS } from "@/lib/modules";

/** Siempre accesibles para cualquier miembro del proyecto (landing). */
const ALWAYS_ALLOWED = new Set(["dashboard"]);

/**
 * Bloquea el acceso a un módulo cuyo nivel sea 'none' para el usuario actual.
 * Redirige al dashboard. El admin pasa siempre. Mientras se resuelve el acceso
 * muestra un estado de carga para no parpadear contenido bloqueado.
 */
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const pathname = usePathname();
  const router = useRouter();
  const { isRole, getAccess } = useAuthStore();
  const isAdmin = isRole("admin");

  const q = useMyModuleAccess(projectId);

  // segment = primer tramo tras /projects/<id>/
  const parts = pathname.split("/").filter(Boolean); // ['projects', id, segment, ...]
  const segment = parts[2];

  const isKnownModule = !!segment && MODULE_KEYS.includes(segment);
  const allowed =
    isAdmin ||
    !isKnownModule ||
    ALWAYS_ALLOWED.has(segment) ||
    getAccess(projectId, segment) !== "none";

  // Esperar a conocer el acceso antes de enforcar (evita falso bloqueo inicial).
  const ready = isAdmin || q.isFetched || !isKnownModule;

  useEffect(() => {
    if (ready && !allowed) {
      router.replace(`/projects/${projectId}/dashboard`);
    }
  }, [ready, allowed, projectId, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full py-20 text-slate-400 text-sm">
        Cargando acceso…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <Lock size={28} className="text-slate-400 mb-3" />
        <p className="text-sm font-semibold text-slate-200">Sin acceso a este módulo</p>
        <p className="text-xs text-slate-400 mt-1">
          No tienes permisos para ver esta sección. Redirigiendo al dashboard…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
