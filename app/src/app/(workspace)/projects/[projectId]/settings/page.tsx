"use client";
import { useUIStore } from "@/stores/ui.store";

const PRESETS = [
  { label: "3 seg", ms: 3000 },
  { label: "5 seg", ms: 5000 },
  { label: "10 seg", ms: 10000 },
  { label: "20 seg", ms: 20000 },
  { label: "30 seg", ms: 30000 },
  { label: "Nunca", ms: 0 },
];

export default function SettingsPage() {
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
    </div>
  );
}
