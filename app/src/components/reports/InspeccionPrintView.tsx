import type { InspeccionReportData } from "@/hooks/useInspeccionReport";
import { InspeccionHeader } from "./InspeccionHeader";
import { InspeccionTable } from "./InspeccionTable";
import { InspeccionSignatures } from "./InspeccionSignatures";

const PRINT_STYLES = `
@media screen {
  .inspeccion-print-root {
    box-shadow: 0 0 0 1px #cbd5e1, 0 4px 24px rgba(0,0,0,0.10);
    margin: 0 auto;
  }
  .inspeccion-page-break-marker td {
    background: #eff6ff;
    border-top: 2px dashed #3b82f6;
    border-bottom: 2px dashed #3b82f6;
    border-left: none;
    border-right: none;
    color: #1d4ed8;
    font-weight: 700;
    font-size: 7.5px;
    text-align: center;
    padding: 3px 8px;
    letter-spacing: 0.5px;
  }
}
@media print {
  body * { visibility: hidden; }
  .inspeccion-print-root,
  .inspeccion-print-root * { visibility: visible; }
  .inspeccion-print-root { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none; }
  .ui-controls { display: none !important; }
  .inspeccion-page-break-marker { display: none; }
  @page { size: A4 landscape; margin: 10mm; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
}
`;

interface Props {
  data: InspeccionReportData;
  title?: string;
}

export function InspeccionPrintView({ data, title }: Props) {
  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div
        className="inspeccion-print-root"
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "8px",
          color: "#1e293b",
          background: "#fff",
          padding: "8px",
          width: "277mm",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
      >
        <InspeccionTable
          equipment={data.equipment}
          evidences={data.evidences}
          fatTests={data.fatTests}
          repeatableHeader={<InspeccionHeader data={data} title={title} />}
        />
        <InspeccionSignatures />
      </div>
    </>
  );
}
