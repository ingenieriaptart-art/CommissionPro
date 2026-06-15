import type { InspeccionReportData } from "@/hooks/useInspeccionReport";

function getLogoUrl(company?: { logo_url?: string; metadata?: { logo_url?: string } }): string | null {
  if (!company) return null;
  return company.logo_url ?? company.metadata?.logo_url ?? null;
}

interface Props {
  data: InspeccionReportData;
}

export function InspeccionHeader({ data }: Props) {
  const { project, contractorCompany } = data;
  const clientCompany = project.client_company;

  const contractorLogo = getLogoUrl(contractorCompany);
  const clientLogo = getLogoUrl(clientCompany as Parameters<typeof getLogoUrl>[0]);

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "8px",
        marginBottom: 0,
        tableLayout: "fixed",
      }}
    >
      <colgroup>
        <col style={{ width: "80px" }} />
        <col style={{ width: "12px" }} />
        <col style={{ width: "56px" }} />
        <col style={{ width: "178px" }} />
        <col style={{ width: "24px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "56px" }} />
        <col style={{ width: "80px" }} />
      </colgroup>
      <tbody>
        <tr>
          <td
            rowSpan={4}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {contractorLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contractorLogo} alt="Logo empresa" style={{ maxHeight: "54px", maxWidth: "72px", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#2563eb", fontSize: "7px", fontWeight: 700, border: "1px dashed #2563eb", padding: "6px", display: "block" }}>
                LOGO<br />EMPRESA
              </span>
            )}
          </td>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Cliente
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {clientCompany?.name ?? "—"}
          </td>
          <td />
          <td
            colSpan={4}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px 8px",
              fontWeight: 700,
              fontSize: "9px",
              textAlign: "center",
              verticalAlign: "middle",
              background: "#f8fafc",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            LISTADO DE INSPECCIÓN DE EQUIPOS ELECTROMECÁNICOS
          </td>
          <td />
          <td
            rowSpan={3}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clientLogo} alt="Logo cliente" style={{ maxHeight: "42px", maxWidth: "72px", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#16a34a", fontSize: "7px", fontWeight: 700, border: "1px dashed #16a34a", padding: "6px", display: "block" }}>
                LOGO<br />CLIENTE
              </span>
            )}
          </td>
        </tr>
        <tr>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Proyecto
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {project.name}
          </td>
          <td />
          <td colSpan={4} />
          <td />
        </tr>
        <tr>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Ubicación
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {project.location ?? "—"}
          </td>
          <td />
          <td
            colSpan={4}
            style={{
              border: "1px solid #94a3b8",
              padding: "3px 8px",
              textAlign: "center",
              verticalAlign: "middle",
              fontSize: "8px",
              fontWeight: 600,
            }}
          >
            {project.name}
          </td>
          <td />
        </tr>
        <tr>
          <td />
          <td />
          <td />
          <td />
          <td colSpan={4} />
          <td />
        </tr>
        <tr>
          <td
            colSpan={11}
            style={{
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              padding: "3px 8px",
              fontSize: "8px",
              letterSpacing: "0.5px",
            }}
          >
            ESQUEMAS DE VERIFICACIÓN
          </td>
        </tr>
      </tbody>
    </table>
  );
}
