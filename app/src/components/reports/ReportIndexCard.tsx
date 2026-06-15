import Link from "next/link";
import { Printer } from "lucide-react";

interface Props {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}

export function ReportIndexCard({ title, description, href, comingSoon }: Props) {
  const content = (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
        comingSoon
          ? "border-dashed border-slate-200 opacity-50"
          : "border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
        <Printer size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {!comingSoon && (
        <span className="text-xs font-medium text-blue-600 flex-shrink-0">
          Abrir →
        </span>
      )}
      {comingSoon && (
        <span className="text-xs text-slate-400 flex-shrink-0">Próximamente</span>
      )}
    </div>
  );

  if (comingSoon || !href) return content;
  return <Link href={href}>{content}</Link>;
}
