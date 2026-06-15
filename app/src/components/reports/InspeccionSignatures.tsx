const SIGNATORIES = [
  { org: "POR BIOTEC", role: "Responsable" },
  { org: "POR BIOTEC", role: "Revisa" },
  { org: "POR LDC",   role: "Aprueba" },
];

export function InspeccionSignatures() {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "24px",
        fontSize: "8px",
      }}
    >
      <tbody>
        <tr>
          {SIGNATORIES.map((sig, i) => (
            <td
              key={i}
              style={{
                width: "33.33%",
                border: "1px solid #94a3b8",
                padding: "8px 16px",
                verticalAlign: "top",
              }}
            >
              <div style={{ color: "#1d4ed8", fontWeight: 700, fontSize: "9px", marginBottom: "2px" }}>
                {sig.org}
              </div>
              <div style={{ color: "#475569", marginBottom: "22px" }}>{sig.role}</div>
              <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px" }} />
              <div style={{ color: "#94a3b8", marginBottom: "6px" }}>Nombre: ___________________________</div>
              <div style={{ color: "#94a3b8", marginBottom: "10px" }}>Cargo: ____________________________</div>
              <div style={{ color: "#cbd5e1", fontSize: "7px" }}>
                Fecha: <em style={{ color: "#94a3b8" }}>DD / MM / AAAA</em>
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
