-- ============================================================
-- 0024 — Manual de ayuda: tabla help_articles
--
-- Artículos en Markdown, globales (sin project_id).
-- RLS: SELECT para todos los autenticados, escritura solo admin.
-- ============================================================

BEGIN;

CREATE TABLE public.help_articles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT        NOT NULL UNIQUE,
  category   TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  published  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_help_category  ON public.help_articles(category);
CREATE INDEX idx_help_slug      ON public.help_articles(slug);
CREATE INDEX idx_help_order     ON public.help_articles(category, sort_order);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public._help_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_help_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public._help_set_updated_at();

-- RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "help_read" ON public.help_articles
  FOR SELECT USING (auth.uid() IS NOT NULL AND published = TRUE);

CREATE POLICY "help_write" ON public.help_articles
  FOR ALL USING (public.app_is_admin());


-- ── Seed: artículos iniciales ─────────────────────────────────────────────────

INSERT INTO public.help_articles (slug, category, title, content, sort_order) VALUES

-- Categoría: Mapa de Planta
('mapa-navegacion', 'Mapa de Planta', 'Cómo navegar el mapa', $md$
## Navegación por niveles

El Mapa de Planta tiene **tres niveles de profundidad**:

1. **Visual** — Vista general de toda la planta. Muestra las áreas como rectángulos sobre el plano.
2. **Área** — Al hacer clic en un área y presionar "Explorar área" accedés al nivel de área.
3. **Sistema** — Desde el diagrama de área podés profundizar en sistemas y subsistemas.

## Nivel Visual

- Hacé clic sobre un rectángulo de área para ver el panel lateral con estadísticas.
- Usá el botón **Explorar área** para bajar al nivel área.
- El dashboard de progreso en la esquina inferior izquierda muestra el avance global.

## Nivel Área

La barra superior muestra **← Proyecto / Nombre del Área** más dos pestañas:

- **⚡ Unifilar** — Plano eléctrico del área con equipos marcados.
- **🔷 Diagrama** — Diagrama de flujo con sistemas y subsistemas.

Hacé clic en cualquier bloque del diagrama para ver los equipos asociados.

## Volver atrás

Hacé clic en **← Proyecto** en la barra superior para volver al nivel visual.
$md$, 10),

('mapa-unifilar', 'Mapa de Planta', 'Subir y editar el unifilar', $md$
## Subir el plano unifilar

En la pestaña **⚡ Unifilar** dentro de un área:

1. Hacé clic en **Subir unifilar** (estado vacío) o en el ícono de imagen en la toolbar.
2. Seleccioná una imagen (PNG, JPG, SVG).
3. La imagen queda guardada para esa área.

## Agregar overlays de equipo

1. Activá el **modo edición** con el botón del lápiz.
2. Hacé clic y arrastrá sobre la imagen para dibujar el área de un equipo.
3. Asigná el equipo correspondiente desde el selector.
4. Guardá con el botón ✓.

Al salir del modo edición los overlays son clickeables y muestran el estado del equipo.
$md$, 20),

-- Categoría: Equipos
('equipos-inspeccion', 'Equipos', 'Abrir el formulario de inspección', $md$
## Acceder a la inspección de un equipo

Hay dos formas de abrir el formulario de inspección:

### Desde el Mapa de Planta
1. Navegá al **nivel área** → pestaña **🔷 Diagrama**.
2. Hacé clic en un bloque de sistema/subsistema — aparece la lista de equipos (tags).
3. Hacé clic en un tag para abrir el **panel flotante** del equipo.
4. En el panel flotante seleccioná el template y presioná **Iniciar inspección**.

### Desde el listado de equipos
1. Entrá a **Equipos** en el menú lateral.
2. Buscá el equipo por tag o nombre.
3. Hacé clic en el equipo → botón **Inspeccionar**.

## Completar la inspección

El formulario está organizado en **secciones** (Datos generales, Prueba de aislamiento, etc.).

- Completá todos los campos requeridos (marcados con \*).
- Podés guardar el progreso en cualquier momento con **Guardar borrador**.
- Al terminar, usá **Finalizar inspección** para cerrar el formulario.
$md$, 10),

('equipos-importar', 'Equipos', 'Importar equipos desde Excel', $md$
## Importar equipos masivamente

Podés cargar cientos de equipos desde un archivo Excel (.xlsx):

1. Entrá a **Equipos** → botón **Importar Excel**.
2. Descargá la plantilla con el botón **Descargar plantilla**.
3. Completá la planilla con los datos de tus equipos.
4. Subí el archivo — la app valida los datos antes de insertar.

## Columnas requeridas

| Columna | Descripción |
|---------|-------------|
| TAG | Identificador único del equipo |
| NOMBRE | Descripción del equipo |
| ÁREA | Nombre del área (debe existir en el proyecto) |
| SISTEMA | Sistema al que pertenece |
| SUBSISTEMA | Subsistema (opcional) |
| TIPO | Tipo de equipo (Bomba, Motor, Válvula, etc.) |

## Errores comunes

- **Área no encontrada**: verificá que el nombre del área en el Excel coincida exactamente con el de la app.
- **TAG duplicado**: cada equipo debe tener un TAG único dentro del proyecto.
$md$, 20),

-- Categoría: Templates
('templates-que-son', 'Templates', 'Qué son los templates de inspección', $md$
## Templates de inspección

Un **template** es un formulario predefinido que determina qué campos se deben completar al inspeccionar un equipo. Cada template tiene un **código** (ej: `P_MEC_001`) y está compuesto por **secciones**.

## Secciones universales

Todos los templates incluyen automáticamente:

- **Datos Generales** — TAG, nombre, área, sistema, responsable.
- **Condiciones de Seguridad** — Verificaciones previas a la inspección.
- **Documentación** — Lista de planos y documentos requeridos.
- **Firma y Cierre** — Firmantes y fecha de cierre.

## Templates globales incluidos

| Código | Equipo | Secciones adicionales |
|--------|--------|-----------------------|
| P_MEC_001 | Motor Eléctrico | Aislamiento, Continuidad, Puesta a Tierra |
| P_MEC_002 | Bomba Centrífuga | Alineamiento, Prueba Operativa |
| P_IC_001 | Instrumento I&C | Loop Check |
| P_ELE_001 | Tablero / CCM | Aislamiento, Continuidad, Puesta a Tierra |

## Jerarquía de asignación

Los templates se asignan con la siguiente prioridad (de mayor a menor):

1. Asignación directa al **equipo**
2. Asignación al **subsistema**
3. Asignación al **sistema**
4. Asignación al **tipo de equipo**
5. Template **default del proyecto**
$md$, 10),

-- Categoría: General
('general-primer-proyecto', 'General', 'Crear tu primer proyecto', $md$
## Crear un proyecto nuevo

1. En la pantalla de inicio, hacé clic en **Nuevo proyecto**.
2. Completá: nombre del proyecto, cliente, ubicación y fecha estimada.
3. Confirmá — el proyecto se crea y te lleva al panel principal.

## Configurar la jerarquía

Un proyecto en CommissionPro se organiza en:

**Proyecto → Áreas → Sistemas → Subsistemas → Equipos**

Podés crear la jerarquía de dos formas:
- **Manual**: desde el menú Áreas, Sistemas, etc.
- **Importando equipos**: al importar el Excel, las áreas y sistemas se crean automáticamente si no existen.

## Invitar miembros del equipo

Desde **Configuración del proyecto** → **Miembros** podés agregar otros usuarios por email.
$md$, 10)

ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP TABLE IF EXISTS public.help_articles CASCADE;
-- DROP FUNCTION IF EXISTS public._help_set_updated_at();
-- COMMIT;
-- ============================================================
