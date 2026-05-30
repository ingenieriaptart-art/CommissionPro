import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const fmtDate = (iso?: string | null) =>
  iso ? format(parseISO(iso), "dd/MM/yyyy", { locale: es }) : "—";

export const fmtDateTime = (iso?: string | null) =>
  iso ? format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es }) : "—";

export const fmtRelative = (iso?: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es }) : "—";

export const fmtPercent = (value: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((value / total) * 100)}%`;

export const fmtNumber = (n: number) =>
  new Intl.NumberFormat("es-CO").format(n);
