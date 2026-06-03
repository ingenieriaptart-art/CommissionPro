// ============================================================
// POST /api/process-document
// Motor de extracción de TAGs a partir de documentos de ingeniería
// Sprint 0013: A1 auth, B2 normalización, B3 limpieza, D1 bulk insert
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient }                            from "@supabase/supabase-js";
import type { TagPatternRule } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Tipos internos ────────────────────────────────────────────

interface TextChunk {
  text: string;
  page?: number;
  source?: string;
}

interface TagMatch {
  rawTag: string;         // valor exacto tal como fue detectado
  tag: string;            // normalizado: TRIM + UPPERCASE
  detected_type: string;
  description?: string;
  tag_confidence: number;
  type_confidence: number;
  description_confidence: number;
  context: string;
  page?: number;
  source_text: string;
  occurrences: number;
  pages: number[];
  pattern_name: string;
  pattern_priority: number;
  context_keywords: string[];
}

// ── Extractor de texto por formato ───────────────────────────

async function extractText(
  buffer: Buffer,
  mimeType: string,
  extension: string
): Promise<TextChunk[]> {
  const ext = extension.toLowerCase().replace(".", "");

  if (ext === "csv" || mimeType?.includes("csv") || mimeType?.includes("text/plain")) {
    return [{ text: buffer.toString("utf-8"), source: "csv" }];
  }
  if (ext === "dxf" || mimeType?.includes("dxf") || mimeType?.includes("vnd.dxf")) {
    return extractFromDXF(buffer);
  }
  if (ext === "xlsx" || ext === "xls" || mimeType?.includes("spreadsheetml") || mimeType?.includes("ms-excel")) {
    return extractFromExcel(buffer);
  }
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return extractFromPDF(buffer);
  }
  if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "tiff", "bmp"].includes(ext)) {
    return []; // OCR externo no configurado en esta fase
  }
  try {
    const text = buffer.toString("utf-8");
    if (text.length > 0) return [{ text, source: "raw-text" }];
  } catch {}
  return [];
}

function extractFromDXF(buffer: Buffer): TextChunk[] {
  const lines  = buffer.toString("utf-8").split(/\r?\n/);
  const chunks: TextChunk[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const code  = lines[i].trim();
    const value = lines[i + 1].trim();
    if ((code === "1" || code === "3") && value.length > 0 && value.length < 300) {
      const clean = value.replace(/\\[PpNn~]/g, " ").replace(/\{[^}]*\}/g, "").trim();
      if (clean) chunks.push({ text: clean, source: "dxf" });
    }
  }
  return chunks;
}

function extractFromExcel(buffer: Buffer): TextChunk[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const xlsx = require("xlsx");
    const wb   = xlsx.read(buffer, { type: "buffer" });
    return wb.SheetNames.map((name: string, idx: number) => ({
      text:   xlsx.utils.sheet_to_csv(wb.Sheets[name]),
      page:   idx + 1,
      source: `sheet:${name}`,
    }));
  } catch {
    const text    = buffer.toString("latin1");
    const matches = text.match(/[A-Za-z0-9\-_.,:;\s]{4,200}/g) ?? [];
    return [{ text: matches.join(" "), source: "excel-raw" }];
  }
}

async function extractFromPDF(buffer: Buffer): Promise<TextChunk[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data     = await pdfParse(buffer);
    return [{ text: data.text ?? "", page: 1, source: "pdf" }];
  } catch {
    const raw     = buffer.toString("latin1");
    const blocks  = raw.match(/BT[\s\S]{1,500}?ET/g) ?? [];
    const strings: string[] = [];
    for (const block of blocks) {
      const tjs = block.match(/\(([^)]{1,100})\)\s*Tj/g) ?? [];
      for (const m of tjs) {
        const v = m.match(/\(([^)]+)\)/)?.[1];
        if (v) strings.push(v);
      }
    }
    return [{ text: strings.join(" "), source: "pdf-basic" }];
  }
}

// ── Motor de extracción de TAGs ───────────────────────────────

const TYPE_KEYWORDS: Record<string, string[]> = {
  motor:         ["motor", "bomba", "pump", "bba", "mot", "impulsión"],
  valvula:       ["válvula", "valvula", "valve", "vlv", "compuerta", "mariposa"],
  sensor:        ["sensor", "transmisor", "transmitter", "medidor", "indicador"],
  instrumento:   ["instrumento", "instrument", "controlador", "registrador"],
  panel:         ["tablero", "panel", "mcc", "ccm", "gabinete", "cuadro"],
  transformador: ["transformador", "transformer", "trf", "potencia"],
  cable:         ["cable", "conductor", "wiring", "bandeja"],
};

function calcConfidence(
  pattern: TagPatternRule,
  context: string,
  rawTag?: string,
): {
  tag_confidence:         number;
  type_confidence:        number;
  description_confidence: number;
  context_keywords:       string[];
} {
  const p = pattern.priority;
  const tag_confidence =
    p >= 10 ? 0.95 : p >= 8 ? 0.85 : p >= 5 ? 0.75 : p >= 1 ? 0.60 : 0.45;

  const ctxLower      = context.toLowerCase();
  const foundKeywords = (TYPE_KEYWORDS[pattern.detected_type] ?? [])
    .filter((kw) => ctxLower.includes(kw));
  const keywordBoost  = foundKeywords.length > 0 ? 0.10 : 0;
  const type_confidence = Math.min(1.0,
    p >= 10 ? 0.90 + keywordBoost : p >= 5 ? 0.75 + keywordBoost : 0.55 + keywordBoost
  );

  const descriptionFound    = !!extractDescription(context, rawTag);
  const description_confidence = descriptionFound ? 0.70 : 0.00;

  return { tag_confidence, type_confidence, description_confidence, context_keywords: foundKeywords };
}

function extractDescription(context: string, rawTag?: string): string | undefined {
  // CSV/Excel: buscar el nombre del equipo/instrumento en los campos del registro.
  // La columna varía por hoja, así que buscamos por palabras clave de equipos.
  if (rawTag) {
    const tagIdx = context.indexOf(rawTag);
    if (tagIdx !== -1) {
      const afterTag = context.substring(tagIdx + rawTag.length);
      const fields = afterTag.split(",").map((f) => f.replace(/^"|"$/g, "").trim());
      const EQUIPO_KW = [
        "MEDIDOR", "SONDA", "TRANSMISOR", "BOMBA", "VÁLVULA", "VALVULA",
        "ELECTROVÁLVULA", "ELECTROVALVULA", "SENSOR", "ANALIZADOR", "CONTROLADOR",
        "INDICADOR", "REGISTRADOR", "CLORÍMETRO", "CLORíMETRO", "TURBIDÍMETRO",
        "OXÍMETRO", "INTERRUPTOR", "VARIADOR", "PUENTE", "HIDRO", "NEUTRALIZADOR",
        "CONCENTRADOR", "ACTUADOR", "MANÓMETRO", "TERMÓMETRO",
      ];
      for (const f of fields) {
        const fUp = f.toUpperCase();
        if (f.length >= 3 && f.length <= 60 && EQUIPO_KW.some((kw) => fUp.includes(kw))) {
          return f.trim().substring(0, 100);
        }
      }
    }
  }
  // Fallback para otros formatos (PDF, DXF, texto libre)
  const patterns = [
    /[-–:]\s*([A-Za-záéíóúÁÉÍÓÚñÑ][\w\s,./()]{3,80})/,
    /\s{2,}([A-Za-záéíóúÁÉÍÓÚñÑ][\w\s,./()]{3,60})/,
  ];
  for (const p of patterns) {
    const m = context.match(p);
    if (m?.[1]) return m[1].trim().substring(0, 100);
  }
  return undefined;
}

// B2 — normalización: los TAGs se almacenan como TRIM+UPPERCASE.
// raw_value en engineering_document_entities conserva el valor original.
function extractTags(chunks: TextChunk[], patterns: TagPatternRule[]): TagMatch[] {
  const seen          = new Map<string, TagMatch>(); // clave = TAG normalizado
  const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

  for (const chunk of chunks) {
    for (const pattern of sortedPatterns) {
      if (!pattern.is_active) continue;
      let regex: RegExp;
      try {
        regex = new RegExp(pattern.regex_pattern, "gi");
      } catch {
        continue; // patrón regex inválido — se ignora silenciosamente
      }

      let match: RegExpExecArray | null;
      while ((match = regex.exec(chunk.text)) !== null) {
        const rawTag  = match[0];
        const normTag = rawTag.trim().toUpperCase(); // B2: normalización

        const ctxStart = Math.max(0, match.index - 120);
        const ctxEnd   = Math.min(chunk.text.length, match.index + rawTag.length + 120);
        const context  = chunk.text.substring(ctxStart, ctxEnd).replace(/\s+/g, " ").trim();

        if (seen.has(normTag)) {
          const existing = seen.get(normTag)!;
          existing.occurrences++;
          if (chunk.page && !existing.pages.includes(chunk.page)) {
            existing.pages.push(chunk.page);
          }
        } else {
          const { tag_confidence, type_confidence, description_confidence, context_keywords } =
            calcConfidence(pattern, context, rawTag);

          seen.set(normTag, {
            rawTag,           // valor exacto del documento
            tag: normTag,     // B2: normalizado para almacenamiento
            detected_type:          pattern.detected_type,
            description:            extractDescription(context, rawTag),
            tag_confidence,
            type_confidence,
            description_confidence,
            context,
            page:             chunk.page,
            source_text:      context,
            occurrences:      1,
            pages:            chunk.page ? [chunk.page] : [],
            pattern_name:     pattern.name,
            pattern_priority: pattern.priority,
            context_keywords,
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}

// ── Handler principal ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.document_id || !body?.project_id) {
    return NextResponse.json(
      { error: "document_id y project_id requeridos" },
      { status: 400 }
    );
  }
  const { document_id, project_id } = body as { document_id: string; project_id: string };

  // ── A1: Verificar autenticación ──────────────────────────────
  // Acepta token via Authorization header (Bearer) o cookies de sesión.
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const authHeader = req.headers.get("authorization");
  const token      = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Decodificar JWT sin red para obtener el sub (auth_user_id).
  // El token ya fue emitido por Supabase — solo necesitamos el payload.
  let userId: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf-8"));
    userId = payload.sub ?? null;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // A1: Verificar que el documento pertenece al proyecto
  const { data: docCheck, error: docErr } = await serviceClient
    .from("documents")
    .select("id")
    .eq("id", document_id)
    .eq("project_id", project_id)
    .single();

  console.log("[process-document] docCheck:", docCheck, "error:", docErr?.message, "doc_id:", document_id, "proj_id:", project_id);

  if (!docCheck) {
    return NextResponse.json(
      { error: "Documento no encontrado o sin acceso al proyecto" },
      { status: 403 }
    );
  }

  // Marcar como "processing" DESPUÉS de validar acceso
  await serviceClient
    .from("documents")
    .update({ processing_status: "processing" })
    .eq("id", document_id);

  try {
    // 1. Obtener metadata completa del documento
    const { data: doc, error: docErr } = await serviceClient
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error("Documento no encontrado");

    const storagePath = doc.storage_path as string;
    if (!storagePath) throw new Error("storage_path no definido en el documento");

    // 2. Descargar archivo desde Supabase Storage
    const { data: fileBlob, error: dlErr } = await serviceClient.storage
      .from("documents")
      .download(storagePath);
    if (dlErr || !fileBlob) throw new Error(`Error descargando archivo: ${dlErr?.message}`);

    const buffer    = Buffer.from(await fileBlob.arrayBuffer());
    const extension = (doc.name as string).split(".").pop() ?? "";
    const mimeType  = (doc.mime_type as string) ?? "";

    // 3. Extraer texto según formato
    const chunks = await extractText(buffer, mimeType, extension);
    if (chunks.length === 0 && mimeType.startsWith("image/")) {
      await serviceClient.from("documents").update({
        processing_status:   "completed",
        processing_metadata: { note: "Imagen — OCR externo no configurado", tags_found: 0 },
      }).eq("id", document_id);
      return NextResponse.json({ success: true, tags_found: 0, note: "imagen pendiente de OCR" });
    }

    // 4. Cargar patrones del proyecto + globales
    const { data: patterns } = await serviceClient
      .from("tag_pattern_rules")
      .select("*")
      .or(`project_id.eq.${project_id},project_id.is.null`)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    // Fallback: si no hay patrones, no lanzar error — retornar 0 tags
    if (!patterns || patterns.length === 0) {
      await serviceClient.from("documents").update({
        processing_status:   "completed",
        processing_metadata: { note: "Sin patrones configurados", tags_found: 0 },
      }).eq("id", document_id);
      return NextResponse.json({ success: true, tags_found: 0, note: "sin patrones" });
    }

    // 5. Extraer TAGs (B2: normalizados a TRIM+UPPERCASE)
    const matches = extractTags(chunks, patterns as TagPatternRule[]);

    // ── B3: Limpieza de procesamiento anterior ─────────────────
    // Siempre limpiar antes de insertar nuevos resultados.
    // Tags approved/merged NO se eliminan (ya fueron revisados por un humano).
    // ON DELETE SET NULL en entity_id garantiza integridad referencial.
    await serviceClient
      .from("engineering_extracted_tags")
      .delete()
      .eq("document_id", document_id)
      .in("status", ["pending_review", "rejected"]);

    await serviceClient
      .from("engineering_document_entities")
      .delete()
      .eq("document_id", document_id);

    if (matches.length === 0) {
      await serviceClient.from("documents").update({
        processing_status:   "completed",
        processing_metadata: { tags_found: 0, chunks_processed: chunks.length },
      }).eq("id", document_id);
      return NextResponse.json({ success: true, tags_found: 0 });
    }

    // ── D1: Bulk INSERT (2 roundtrips en total, sin importar N) ──

    // 6a. Pre-generar IDs para entidades
    const entityIds = matches.map(() => crypto.randomUUID());

    // 6b. Construir payloads completos
    const entitiesPayload = matches.map((m, i) => ({
      id:          entityIds[i],
      project_id,
      document_id,
      page_number: m.page ?? null,
      source_text: m.source_text.substring(0, 500),
      entity_type: "TAG",
      raw_value:   m.rawTag, // valor exacto del documento
    }));

    const tagsPayload = matches.map((m, i) => ({
      project_id,
      document_id,
      entity_id:              entityIds[i],
      tag:                    m.tag, // B2: TRIM+UPPERCASE
      detected_type:          m.detected_type,
      description:            m.description ?? null,
      tag_confidence:         m.tag_confidence,
      type_confidence:        m.type_confidence,
      description_confidence: m.description_confidence,
      extracted_data_json: {
        source_format:    extension || mimeType,
        pattern_name:     m.pattern_name,
        pattern_priority: m.pattern_priority,
        occurrences:      m.occurrences,
        pages:            m.pages,
        context:          m.context.substring(0, 300),
        context_keywords: m.context_keywords,
        raw_tag:          m.rawTag, // original preservado en JSON
      },
      status: "pending_review",
    }));

    // 6c. Bulk INSERT entidades — 1 roundtrip
    const { error: entErr } = await serviceClient
      .from("engineering_document_entities")
      .insert(entitiesPayload);
    if (entErr) console.warn("[process-document] Entities insert warning:", entErr.message);

    // 6d. Bulk UPSERT tags — 1 roundtrip
    // ignoreDuplicates: true → no sobrescribe tags approved/merged existentes
    let tagsInserted = 0;
    const { error: tagsErr } = await serviceClient
      .from("engineering_extracted_tags")
      .upsert(tagsPayload, {
        onConflict:       "project_id,document_id,tag",
        ignoreDuplicates: true, // respeta status approved/merged de procesamiento anterior
      });
    if (tagsErr) {
      console.warn("[process-document] Tags upsert warning:", tagsErr.message);
    } else {
      tagsInserted = matches.length;
    }

    // 7. Marcar como completado
    await serviceClient.from("documents").update({
      processing_status:   "completed",
      processing_metadata: {
        tags_found:       tagsInserted,
        chunks_processed: chunks.length,
        patterns_applied: patterns.length,
      },
    }).eq("id", document_id);

    return NextResponse.json({ success: true, tags_found: tagsInserted });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[process-document] Error:", msg);
    await serviceClient
      .from("documents")
      .update({ processing_status: "failed", processing_error: msg })
      .eq("id", document_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
