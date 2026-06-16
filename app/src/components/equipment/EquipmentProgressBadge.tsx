import type { EquipmentStatus } from "@/types";

interface Props {
  status: EquipmentStatus;
  formPct?: number;
}

/**
 * Indicador dual: barra de ejecución (azul/verde) + check APROBADO (negro→verde).
 * No renderiza nada si el equipo está pendiente y sin progreso.
 */
export function EquipmentProgressBadge({ status, formPct }: Props) {
  if (status === "pendiente" && !formPct) return null;

  const pct        = formPct ?? 0;
  const isApproved = status === "aprobado";
  const barColor   = isApproved ? "#22C55E" : "#38BDF8";
  const checkColor = isApproved ? "#22C55E" : "#374151";

  return (
    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
      {/* Label ejecución */}
      <span style={{
        fontSize: "7px", color: "rgba(255,255,255,0.35)",
        fontWeight: "700", letterSpacing: "1px", flexShrink: 0,
      }}>
        EJEC
      </span>

      {/* Barra de progreso */}
      <div style={{
        flex: 1, height: "3px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: barColor, borderRadius: "2px",
          transition: "width 300ms ease",
        }} />
      </div>

      {/* Porcentaje */}
      <span style={{
        fontSize: "7px", color: barColor,
        fontWeight: "700", flexShrink: 0,
        minWidth: "22px", textAlign: "right",
      }}>
        {pct}%
      </span>

      {/* Check + label aprobado */}
      <span style={{ fontSize: "9px", color: checkColor, fontWeight: "700", flexShrink: 0 }}>
        ✓
      </span>
      <span style={{
        fontSize: "7px", color: checkColor,
        fontWeight: "700", letterSpacing: "0.5px", flexShrink: 0,
      }}>
        APR
      </span>
    </div>
  );
}
