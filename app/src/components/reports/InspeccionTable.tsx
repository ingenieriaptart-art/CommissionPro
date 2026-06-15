import type { EquipmentWithArea, Evidence, FatTest } from "@/hooks/useInspeccionReport";
import type { EquipmentStatus } from "@/types";

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  pendiente: "PEND",
  en_ejecucion: "EJEC",
  aprobado: "OK",
  rechazado: "NC",
  bloqueado: "BLOQ",
  listo_energizacion: "L-EN",
  listo_arranque: "L-AR",
  operativo: "OPER",
  futuro: "FUT",
};

const STATUS_BG: Partial<Record<EquipmentStatus, string>> = {
  aprobado: "#f0fdf4",
  pendiente: "#fefce8",
  rechazado: "#fee2e2",
};

const cell: React.CSSProperties = {
  border: "1px solid #94a3b8",
  padding: "2px 4px",
  fontSize: "7.5px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const cellWrap: React.CSSProperties = {
  ...cell,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const thStyle: React.CSSProperties = {
  ...cell,
  background: "#1e3a5f",
  color: "#fff",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "7px",
};

interface Props {
  equipment: EquipmentWithArea[];
  evidences: Evidence[];
  fatTests: FatTest[];
}

export function InspeccionTable({ equipment, evidences, fatTests }: Props) {
  const byArea: Record<string, EquipmentWithArea[]> = {};
  for (const eq of equipment) {
    const key = eq.area_name ?? "Sin área";
    if (!byArea[key]) byArea[key] = [];
    byArea[key].push(eq);
  }

  const evidencesByEquipment: Record<string, Evidence[]> = {};
  for (const ev of evidences) {
    if (!ev.equipment_id) continue;
    if (!evidencesByEquipment[ev.equipment_id]) evidencesByEquipment[ev.equipment_id] = [];
    evidencesByEquipment[ev.equipment_id].push(ev);
  }

  const fatByEquipment: Record<string, FatTest[]> = {};
  for (const t of fatTests) {
    if (t.equipment_id) {
      if (!fatByEquipment[t.equipment_id]) fatByEquipment[t.equipment_id] = [];
      fatByEquipment[t.equipment_id].push(t);
    }
  }

  let seqNum = 0;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "7.5px",
        tableLayout: "fixed",
      }}
    >
      <colgroup>
        <col style={{ width: "28px" }} />
        <col style={{ width: "28px" }} />
        <col style={{ width: "52px" }} />
        <col style={{ width: "52px" }} />
        <col style={{ width: "110px" }} />
        <col style={{ width: "32px" }} />
        <col style={{ width: "32px" }} />
        <col style={{ width: "38px" }} />
        <col style={{ width: "38px" }} />
        <col style={{ width: "38px" }} />
        <col style={{ width: "38px" }} />
        <col style={{ width: "22px" }} />
        <col style={{ width: "22px" }} />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th style={thStyle} rowSpan={2}>Est.</th>
          <th style={thStyle} rowSpan={2}>ITEM</th>
          <th style={thStyle} rowSpan={2}>TAG</th>
          <th style={thStyle} rowSpan={2}>ÁREA</th>
          <th style={thStyle} rowSpan={2} colSpan={2}>APLICACIÓN</th>
          <th style={thStyle} colSpan={2}>POTENCIA DEMANDADA</th>
          <th style={thStyle} rowSpan={2}>Pot. Inst.<br />kW</th>
          <th style={thStyle} rowSpan={2}>FOTO<br />EQUIPO</th>
          <th style={thStyle} rowSpan={2}>FOTO<br />PLACA</th>
          <th style={thStyle} colSpan={2}>CONFORME</th>
          <th style={thStyle} rowSpan={2}>OBSERVACIONES</th>
        </tr>
        <tr>
          <th style={thStyle}>kW</th>
          <th style={thStyle}>HP</th>
          <th style={thStyle}>SI</th>
          <th style={thStyle}>NO</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(byArea).map(([areaName, eqs]) => (
          <>
            <tr key={`area-${areaName}`}>
              <td
                colSpan={14}
                style={{
                  background: "#1e3a5f",
                  color: "#93c5fd",
                  fontWeight: 700,
                  padding: "3px 8px",
                  fontSize: "7.5px",
                }}
              >
                ▸ ÁREA: {areaName.toUpperCase()}
              </td>
            </tr>
            {eqs.map((eq) => {
              seqNum++;
              const bg = STATUS_BG[eq.status] ?? "#fff";
              const eqEvidences = evidencesByEquipment[eq.id] ?? [];
              const fotoEquipo = eqEvidences.find((e) => e.stage === "durante");
              const fotoPlaca = eqEvidences.find((e) => e.stage === "antes");
              const fats = fatByEquipment[eq.id] ?? [];
              const hpVal = eq.power_kw ? (eq.power_kw * 1.341022).toFixed(1) : "";
              const obs = fats[0]?.data?.observations ?? "";

              return (
                <tr key={eq.id} style={{ background: bg }}>
                  <td style={{ ...cell, textAlign: "center", fontWeight: 700 }}>
                    {STATUS_LABEL[eq.status] ?? eq.status}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>{seqNum}</td>
                  <td style={cell}>{eq.tag}</td>
                  <td style={cellWrap}>{eq.area_name ?? ""}</td>
                  <td style={{ ...cellWrap, whiteSpace: "normal" }} colSpan={2}>
                    {eq.name}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{eq.power_kw ?? ""}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{hpVal}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{eq.power_installed_kw ?? ""}</td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {fotoEquipo?.storage_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoEquipo.storage_url} alt="foto" style={{ maxWidth: "32px", maxHeight: "24px", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>📷</span>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {fotoPlaca?.storage_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoPlaca.storage_url} alt="placa" style={{ maxWidth: "32px", maxHeight: "24px", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>📷</span>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                    {eq.status === "aprobado" ? "✓" : ""}
                  </td>
                  <td style={{ ...cell, textAlign: "center", color: "#dc2626", fontWeight: 700 }}>
                    {eq.status === "rechazado" ? "✓" : ""}
                  </td>
                  <td style={cellWrap}>{obs}</td>
                </tr>
              );
            })}
          </>
        ))}
      </tbody>
    </table>
  );
}
