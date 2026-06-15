import type { InspeccionReportData } from "@/hooks/useInspeccionReport";
import { InspeccionHeader } from "./InspeccionHeader";
import { InspeccionTable } from "./InspeccionTable";
import { InspeccionSignatures } from "./InspeccionSignatures";

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .inspeccion-print-root,
  .inspeccion-print-root * { visibility: visible; }
  .inspeccion-print-root { position: absolute; top: 0; left: 0; width: 100%; }
  .ui-controls { display: none !important; }
  @page { size: A4 landscape; margin: 10mm; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
`;

interface Props {
  data: InspeccionReportData;
}

export function InspeccionPrintView({ data }: Props) {
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
          maxWidth: "100%",
        }}
      >
        <InspeccionHeader data={data} />
        <InspeccionTable
          equipment={data.equipment}
          evidences={data.evidences}
          fatTests={data.fatTests}
        />
        <InspeccionSignatures />
      </div>
    </>
  );
}
