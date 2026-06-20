-- 0048_evidences_updated_at.sql
-- Agrega updated_at a evidences para habilitar el cursor de pull del motor offline.
-- evidences fue la única tabla sincronizable sin updated_at: el pull
-- (.gt("updated_at", since)) devolvía 400 en cada ciclo. Aditivo e idempotente.

ALTER TABLE public.evidences
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: filas existentes toman su created_at como updated_at inicial.
UPDATE public.evidences
  SET updated_at = COALESCE(created_at, now())
  WHERE updated_at IS NULL OR updated_at = now();

-- Trigger: mantener updated_at en cada UPDATE. set_updated_at() existe desde 0006.
DROP TRIGGER IF EXISTS trg_updated_evidences ON public.evidences;
CREATE TRIGGER trg_updated_evidences
  BEFORE UPDATE ON public.evidences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN public.evidences.updated_at IS
  'Cursor de sincronización (pull incremental del motor offline). Añadido en 0048.';
