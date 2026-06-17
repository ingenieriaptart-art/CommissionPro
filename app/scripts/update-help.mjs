/**
 * Actualiza la tabla help_articles con el contenido completo del sistema.
 * Uso: node --env-file=.env.local scripts/update-help.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Ver estado actual
const { data: existing } = await sb
  .from("help_articles")
  .select("slug, category, title, sort_order")
  .order("category").order("sort_order");

console.log(`Artículos actuales en DB: ${existing?.length ?? 0}`);
existing?.forEach(a => console.log(`  [${a.category}] ${a.slug} — ${a.title}`));

// ── Artículos nuevos / actualizados ──────────────────────────────────────────

const articles = [

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Primeros pasos
  // ══════════════════════════════════════════════════════
  {
    slug: "bienvenida",
    category: "Primeros pasos",
    title: "Bienvenida a CommissionPro",
    sort_order: 10,
    published: true,
    content: `CommissionPro es la plataforma digital de precomisionamiento de Biotec. Permite gestionar el proceso completo de inspección y verificación de equipos antes de su puesta en marcha.

## ¿Qué puedes hacer?

- **Inspeccionar equipos** desde el mapa de planta o el diagrama SCADA interactivo
- **Completar formularios** de precomisionamiento por sección, con evidencias fotográficas
- **Monitorear el avance** por equipo y por área en tiempo real
- **Gestionar plantillas** de inspección por tipo de equipo
- **Reportar** el estado de aprobación con firma digital

## Flujo básico

1. Ingresa al proyecto desde **Proyectos**
2. Abre el **Mapa de Planta** y haz clic en un equipo
3. En el panel flotante, selecciona la plantilla de inspección
4. Completa las secciones del formulario
5. Agrega evidencias fotográficas donde sea necesario
6. Envía el formulario — el estado del equipo se actualiza automáticamente
`,
  },

  {
    slug: "navegacion-general",
    category: "Primeros pasos",
    title: "Navegación general",
    sort_order: 20,
    published: true,
    content: `## Sidebar principal

El menú lateral izquierdo da acceso a todas las secciones:

- **Dashboard** — resumen de KPIs del proyecto activo
- **Proyectos** — lista de proyectos asignados
- **Equipos** — listado completo de equipos con estado
- **Tests** — historial de formularios completados
- **Plantillas** — catálogo global de plantillas de inspección
- **Ayuda** — este manual

## Dentro de un proyecto

Al entrar a un proyecto aparece un sidebar secundario con:

- **Dashboard del proyecto** — avance por área
- **Mapa de Planta** — vista interactiva con diagrama SCADA
- **Equipos** — lista de equipos del proyecto
- **IC02 RTU** — instrumentos del nodo IC02
- **Ingeniería** — importación de TAGs desde Excel
- **Punch List** — lista de observaciones pendientes
- **Reportes** — exportación de informes de inspección

## Atajos de navegación

Puedes usar el botón **← Volver** en el encabezado del formulario de inspección para regresar al Mapa de Planta sin perder el progreso (guardado automático por sección).
`,
  },

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Mapa de Planta
  // ══════════════════════════════════════════════════════
  {
    slug: "mapa-de-planta",
    category: "Mapa de Planta",
    title: "Usar el Mapa de Planta",
    sort_order: 10,
    published: true,
    content: `El Mapa de Planta es el punto de entrada principal para inspeccionar equipos. Para el proyecto **LDC**, el mapa muestra el diagrama SCADA interactivo del unifilar eléctrico.

## Hacer clic en un equipo

Al hacer clic sobre cualquier equipo en el diagrama SCADA se abre el **Panel flotante de equipo** con:

- Tag, nombre y descripción del equipo
- Estado actual (pendiente / en ejecución / aprobado / rechazado)
- Barra de progreso del formulario (% completado)
- Lista de plantillas disponibles para ese equipo

## Panel flotante

Desde el panel flotante puedes:

1. **Iniciar inspección** — clic en el botón ▶ junto a la plantilla
2. **Ver estado** — el indicador de color muestra el estado actual
3. **Ver progreso** — barra azul/verde con porcentaje de formulario completado

## Indicadores de estado en el mapa

Cada equipo muestra un punto de color en la esquina superior derecha:

| Color | Estado |
|-------|--------|
| Gris | Pendiente |
| Azul | En ejecución |
| Verde | Aprobado |
| Rojo | Rechazado |
| Amarillo | Listo para energización |
| Naranja | Listo para arranque |
| Verde oscuro | Operativo |

## Barra de progreso (EquipmentProgressBadge)

Bajo el indicador de estado aparece una barra que muestra:
- **EJEC** + porcentaje: cuántas secciones del formulario están completas
- **✓ APR**: se vuelve verde cuando el equipo es aprobado por el supervisor
`,
  },

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Formulario de Inspección
  // ══════════════════════════════════════════════════════
  {
    slug: "formulario-inspeccion",
    category: "Formulario de Inspección",
    title: "Completar un formulario de inspección",
    sort_order: 10,
    published: true,
    content: `## Abrir un formulario

Desde el Panel flotante del Mapa de Planta, haz clic en **▶ Iniciar** junto a la plantilla que corresponde al equipo. Se abre la pantalla de formulario en modo full-screen.

## Estructura del formulario

El formulario tiene tres áreas:

- **Sidebar izquierdo** — lista de secciones con ícono de estado (pendiente / completo / con falla)
- **Área central** — campos de la sección activa
- **Mini-mapa derecho** — franja de 80 px con navegación visual por secciones

## Secciones universales (siempre presentes)

Todos los formularios incluyen estas secciones automáticamente:

| Sección | Qué registra |
|---------|-------------|
| Datos Generales | Tag, fabricante, modelo, N° serie, P&ID, ubicación — pre-llenados desde la base de datos |
| Inspección Visual | Estado físico, limpieza, daños visibles |
| Cambios de Diseño / Redline | Modificaciones respecto a los planos originales |
| Firmas | Firma del inspector y del supervisor |

## Tipos de campo

- **Texto / Número** — ingreso libre
- **Select** — lista desplegable de opciones
- **Checkbox** — verificación múltiple (ej: OK / FALLA / N/A)
- **Textarea** — observaciones libres
- **Evidencia** — cámara o galería de fotos (máx. 5 imágenes)

## Navegación entre secciones

Usa los botones **Anterior / Siguiente** en el pie del formulario, o haz clic directamente en el sidebar izquierdo. El progreso se guarda automáticamente al cambiar de sección.

## Enviar el formulario

Al llegar a la última sección y presionar **Enviar**, el sistema:
1. Guarda la inspección en la base de datos
2. Sube las evidencias fotográficas al Storage
3. Actualiza el estado del equipo a **En ejecución** con 100% de avance
4. Redirige al resumen del formulario

## Resumen de inspección

La pantalla de resumen muestra:
- Secciones completadas y con falla
- Lista de evidencias adjuntas
- Botón **Generar Certificado** para exportar el informe en Excel
`,
  },

  {
    slug: "secciones-especificas",
    category: "Formulario de Inspección",
    title: "Secciones por tipo de equipo",
    sort_order: 20,
    published: true,
    content: `Además de las secciones universales, cada plantilla incluye secciones específicas según el tipo de equipo.

## Eléctrica — Tablero / CCM (P_ELE_001)

- **Prueba de Aislamiento** — Meggueo en MΩ (tensión 500V / 1000V), fases entre sí y a tierra
- **Prueba de Continuidad** — Resistencia en Ω de conductores
- **Puesta a Tierra** — Resistencia de tierra del gabinete

## Eléctrica — Celda Media Tensión 13.8 kV (P_ELE_002)

- **Prueba de Aislamiento MT** — Meggueo a 2500V/5000V en GΩ (norma IEC 62271)
- **Resistencia de Contactos** — Micro-ohmímetro en μΩ por fase (referencia < 100 μΩ)
- **Verificación de Protecciones** — Relés ANSI 50/51 (sobrecorriente), 27 (subtensión), 59 (sobretensión), 81 (frecuencia) — setpoints y prueba de disparo
- **Prueba del Interruptor de Vacío (VCB)** — Tiempos de apertura/cierre en ms, mecanismo de resorte, enclavamientos

## Eléctrica — Transformador de Potencia / Seco (P_ELE_003)

- **Relación de Transformación** — Medición por fase, error < 0.5%, grupo vectorial
- **Resistencia de Devanados** — AT y BT en mΩ por fase, corrección a 75°C
- **Prueba de Aislamiento** — AT→tierra, BT→tierra, AT→BT en GΩ, Índice de Polarización (IP > 1.5)
- **Prueba en Vacío** — Corriente en vacío y pérdidas por fase

## Eléctrica — Variador de Frecuencia AC (P_ELE_004)

- **Configuración de Parámetros** — Frecuencia mín/máx, rampas de aceleración/desaceleración, protección térmica
- **Prueba de Comunicación** — Protocolo Modbus/Profibus, lectura de velocidad y escritura de setpoint desde PLC/SCADA
- **Prueba de Marcha** — Arranque sin carga y con carga, temperatura del variador, alarmas activas

## Eléctrica — Generador de Emergencia (P_ELE_005)

- **Motor Primario (Diesel)** — Nivel combustible, aceite, refrigerante, baterías de arranque
- **Prueba de Arranque** — Tiempo hasta estabilización, tensión y frecuencia generadas
- **Prueba de Carga** — Al 25%, 50% y 75% de carga nominal, temperatura de operación
- **Integración con ATS** — Tiempo de conmutación red→generador, retorno automático a red

## Mecánica — Motor Eléctrico (P_MEC_001)

- **Prueba de Aislamiento** — Meggueo en MΩ
- **Prueba de Continuidad** — Resistencia de bobinas
- **Puesta a Tierra** — Resistencia de tierra

## Mecánica — Bomba Centrífuga (P_MEC_002)

- **Alineamiento** — Alineación acoplamiento motor-bomba
- **Prueba Operativa** — Caudal, presión, temperatura de rodamientos

## I&C — Instrumento (P_IC_001)

- **Loop Check** — Verificación de lazo 4-20mA, señal de entrada/salida, comunicación con PLC
`,
  },

  {
    slug: "evidencias",
    category: "Formulario de Inspección",
    title: "Adjuntar evidencias fotográficas",
    sort_order: 30,
    published: true,
    content: `Cada sección del formulario permite adjuntar hasta **5 fotografías** como evidencia.

## Cómo adjuntar una foto

1. En cualquier sección del formulario, busca el campo **Evidencias** al final
2. Toca el ícono de cámara para tomar una foto directamente, o el ícono de galería para seleccionar desde el dispositivo
3. Las fotos se muestran como miniaturas debajo del campo
4. Toca una miniatura para verla en pantalla completa
5. Toca la **×** sobre una miniatura para eliminarla antes de enviar

## Al enviar el formulario

Las evidencias se suben automáticamente al servidor cuando presionas **Enviar**. Quedan asociadas a la inspección y aparecen en el **Resumen** y en el **Informe Excel** exportado.

## Límites

- Máximo 5 imágenes por sección de evidencias
- Formatos aceptados: JPG, PNG, HEIC
- Tamaño recomendado: menos de 10 MB por foto
`,
  },

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Plantillas
  // ══════════════════════════════════════════════════════
  {
    slug: "catalogo-plantillas",
    category: "Plantillas",
    title: "Catálogo de plantillas",
    sort_order: 10,
    published: true,
    content: `Las **plantillas de inspección** definen qué secciones y campos aparecen en cada formulario, según el tipo de equipo.

## Catálogo global actual

| Código | Nombre | Tipo de equipo |
|--------|--------|---------------|
| P_ELE_001 | Tablero / CCM | CCMs, tableros de distribución, ATS, UPS, blindobarras |
| P_ELE_002 | Celda de Media Tensión 13.8 kV | Celdas MT (REMONTE, C-MEDIDA, C-PROTEC) |
| P_ELE_003 | Transformador de Potencia / Seco | Transformadores (TR-1, TR2-E) |
| P_ELE_004 | Variador de Frecuencia AC (VFD) | Variadores de frecuencia |
| P_ELE_005 | Generador de Emergencia | Generadores (GGD) |
| P_IC_001 | Instrumento I&C | PLCs, transmisores, medidores de caudal |
| P_MEC_001 | Motor Eléctrico | Motores, sopladores, TEA |
| P_MEC_002 | Bomba Centrífuga | Bombas, filtros, tanques, chiller |

## Cómo se asigna una plantilla a un equipo

El sistema sigue una jerarquía de resolución (de más específico a más general):

1. **Asignación directa** al equipo individual
2. **Asignación al subsistema** al que pertenece el equipo
3. **Asignación al sistema** padre
4. **Asignación al tipo de equipo** (p.ej., todos los CCM → P_ELE_001)
5. **Plantilla por defecto del proyecto**

En la práctica, la mayoría de los equipos del proyecto LDC resuelven su plantilla por **tipo de equipo**.

## Ver las plantillas disponibles para un equipo

Abre el Panel flotante del equipo desde el Mapa de Planta. La lista de plantillas disponibles aparece en la parte inferior del panel. El botón ▶ al lado de cada plantilla inicia el formulario correspondiente.
`,
  },

  {
    slug: "configurar-plantillas",
    category: "Plantillas",
    title: "Configurar secciones y campos",
    sort_order: 20,
    published: true,
    content: `Los administradores pueden activar o desactivar secciones y campos de una plantilla sin eliminarlos.

## Acceder a la configuración

1. Ve a **Plantillas** en el sidebar principal
2. Busca la plantilla que quieres configurar
3. Haz clic en el ícono de engranaje **⚙** a la derecha del nombre

## Desactivar una sección

En la pantalla de configuración verás todas las secciones de la plantilla. Cada sección tiene un ícono de ojo **👁** a la derecha:

- **Ojo visible** = sección activa (aparece en el formulario)
- **Ojo tachado** = sección inactiva (oculta en el formulario)

Haz clic en el ojo para alternar el estado. El cambio es inmediato y afecta a todos los equipos que usen esa plantilla.

## Desactivar un campo individual

Haz clic en el nombre de una sección para expandirla y ver sus campos. Cada campo también tiene su propio ojo para activarlo o desactivarlo de forma independiente.

## Efecto en el formulario

- Las **secciones inactivas** muestran un placeholder con ícono de PowerOff y no son completables
- Los **campos inactivos** aparecen atenuados y no son editables
- En el sidebar de secciones, las inactivas aparecen con texto tachado y no son clickeables

> **Nota:** Desactivar una sección no borra los datos ya ingresados en inspecciones anteriores.
`,
  },

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Estados de Equipo
  // ══════════════════════════════════════════════════════
  {
    slug: "estados-equipo",
    category: "Estados de Equipo",
    title: "Ciclo de vida del estado de un equipo",
    sort_order: 10,
    published: true,
    content: `Cada equipo tiene un estado que refleja su avance en el proceso de precomisionamiento.

## Estados disponibles

| Estado | Descripción |
|--------|-------------|
| **Pendiente** | Sin inspección iniciada |
| **En ejecución** | Formulario parcialmente completado |
| **Aprobado** | Inspección completada y aprobada por supervisor |
| **Rechazado** | Inspección completada con observaciones críticas |
| **Listo para energización** | Aprobado + pre-requisitos eléctricos cumplidos |
| **Listo para arranque** | Listo para energización + prueba en vacío aprobada |
| **Operativo** | Equipo en operación normal |

## Cambio automático de estado

El sistema actualiza el estado automáticamente:

- Al iniciar a completar el formulario → **En ejecución** (con % de avance)
- Al enviar el formulario completado → **En ejecución** al 100%
- El supervisor cambia manualmente a **Aprobado** o **Rechazado**

## Barra de progreso

En el Mapa de Planta y en el listado de equipos, cada equipo muestra:

- **Barra azul** + porcentaje → formulario en ejecución (% de secciones completadas)
- **Barra verde** + porcentaje → formulario aprobado
- **✓ APR** en verde → aprobado por supervisor

## Progreso por área

El panel **AreaProgressDashboard** en el Mapa de Planta muestra el avance global del proyecto y por área. Se puede colapsar con el botón en la esquina inferior izquierda.
`,
  },

  // ══════════════════════════════════════════════════════
  // CATEGORÍA: Administración
  // ══════════════════════════════════════════════════════
  {
    slug: "gestion-usuarios",
    category: "Administración",
    title: "Gestión de usuarios",
    sort_order: 10,
    published: true,
    content: `Solo los administradores tienen acceso al panel de administración de usuarios.

## Acceder al panel

Ve a **Admin → Usuarios** en el menú principal (visible solo para rol Admin).

## Roles del sistema

| Rol | Permisos |
|-----|---------|
| **Admin** | Acceso total — crear usuarios, asignar proyectos, configurar plantillas |
| **Director** | Todos los permisos excepto crear/editar/eliminar usuarios |
| **Supervisor** | Aprobar/rechazar inspecciones, ver reportes |
| **Técnico** | Completar formularios de inspección |
| **Invitado** | Solo lectura |

## Crear un usuario

1. En el panel de Usuarios, haz clic en **+ Nuevo usuario**
2. Completa email, nombre, rol y contraseña temporal
3. Haz clic en **Crear**

El usuario recibirá un correo de verificación para activar su cuenta.

## Asignar un usuario a un proyecto

En el detalle del usuario (panel derecho), busca la sección **Proyectos asignados** y haz clic en **+ Asignar proyecto**.

## Bloquear / desactivar un usuario

En el detalle del usuario hay botones para **Bloquear** (acceso temporal suspendido) o **Desactivar** (cuenta inactiva permanentemente).
`,
  },

  {
    slug: "importacion-excel",
    category: "Administración",
    title: "Importar equipos desde Excel",
    sort_order: 20,
    published: true,
    content: `La plataforma permite importar equipos masivamente desde archivos Excel del proyecto de ingeniería.

## Acceder al importador

Ve a **Ingeniería** en el sidebar del proyecto y busca el panel **Importar desde Excel**.

## Formatos soportados

| Hoja | Descripción | Campos importados |
|------|-------------|-------------------|
| DATOS_INST | Instrumentos de proceso | Tag, servicio, IO type, RTU, P&ID |
| DATOS_POT | Equipos de potencia | Tag, descripción, potencia kW, CCM panel |
| LISTADO EQUIPOS | Listado general | Tag, descripción, P&ID |

## Proceso de importación

1. Sube el archivo Excel (formato .xlsx)
2. El sistema detecta automáticamente las hojas disponibles
3. Selecciona la hoja que quieres importar
4. El sistema muestra los contadores: **nuevos**, **actualizados**, **duplicados**, **omitidos**
5. Confirma la importación

## Deduplicación

Si un TAG ya existe en el proyecto, el sistema lo **actualiza** en lugar de crear un duplicado. Los equipos nuevos se crean en la categoría **SIN CLASIFICAR** y luego pueden reclasificarse manualmente.

## Después de la importación

Los equipos importados aparecen en la lista de **Equipos** con badge naranja "Sin clasificar". Desde ahí puedes asignarlos a sistemas y subsistemas del proyecto.
`,
  },
];

// ── Upsert por slug ───────────────────────────────────────────────────────────

let created = 0, updated = 0;

for (const article of articles) {
  const { data: ex } = await sb.from("help_articles").select("id").eq("slug", article.slug).maybeSingle();

  if (ex) {
    const { error } = await sb.from("help_articles").update(article).eq("id", ex.id);
    if (error) { console.error(`❌ update ${article.slug}:`, error.message); continue; }
    updated++;
  } else {
    const { error } = await sb.from("help_articles").insert(article);
    if (error) { console.error(`❌ insert ${article.slug}:`, error.message); continue; }
    created++;
  }
}

console.log(`\n✅ ${created} artículos creados, ${updated} actualizados`);

// ── Resultado final ───────────────────────────────────────────────────────────
const { data: final } = await sb
  .from("help_articles")
  .select("category, title, sort_order")
  .eq("published", true)
  .order("category").order("sort_order");

console.log(`\nCatálogo de ayuda final (${final?.length} artículos):`);
let lastCat = "";
final?.forEach(a => {
  if (a.category !== lastCat) { console.log(`\n  [${a.category}]`); lastCat = a.category; }
  console.log(`    ${a.sort_order}. ${a.title}`);
});

console.log("\n🎉  Ayuda actualizada.");
