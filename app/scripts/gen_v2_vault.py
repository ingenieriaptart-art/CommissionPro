"""
Generate CommissionPro v2 Obsidian vault.
Copies all v1 notes, then adds 42 new notes for v2 communities.
"""
import shutil
from pathlib import Path

SRC = Path('graphify-out/obsidian-business')
DST = Path('graphify-out/obsidian-business-v2')

# ---- 1. Copy v1 vault ----
if DST.exists():
    shutil.rmtree(DST)
DST.mkdir(parents=True)

for f in SRC.iterdir():
    if not f.name.startswith('.') or f.name == '.obsidian':
        dst_f = DST / f.name
        if f.is_dir():
            shutil.copytree(f, dst_f)
        else:
            shutil.copy2(f, dst_f)

print(f"Copied {len(list(SRC.glob('*.md')))} v1 notes to {DST}")

# ---- 2. V2 new notes ----
NOTES = {

# ===== ACTORES Y ORGANIZACIONES =====
"Empresa.md": """\
---
tags: [actor]
tipo: Organización
comunidad: Actores y Organizaciones
---

# Empresa

Organización propietaria o contratante del proyecto de comisionamiento.
Puede ser el dueño del activo ([[Cliente]]) o la empresa ejecutora ([[Contratista]]).

## Parte de
[[CommissionPro]] — modelo de multi-tenancy

## Roles en CommissionPro
- Contiene uno o más [[Proyecto|Proyectos]]
- Autoriza al [[Contratista]] para ejecutar el comisionamiento
- Define los niveles de acceso por [[Empresa]]

## Relacionado con
[[Cliente]], [[Contratista]], [[Proyecto]], [[Usuario]]
""",

"Contratista.md": """\
---
tags: [actor]
tipo: Organización ejecutora
comunidad: Actores y Organizaciones
---

# Contratista

Empresa especializada que ejecuta físicamente el comisionamiento bajo contrato.
Provee el [[Supervisor Comisionamiento]] y el [[Inspector QAQC]].

## Parte de
[[Empresa]] → [[Contratista]]

## Responsabilidades
- Ejecutar los [[Protocolo|Protocolos]] de comisionamiento
- Asignar al [[Supervisor Comisionamiento]]
- Gestionar [[PunchItem|Punch Items]] y cierres

## Relacionado con
[[Empresa]], [[Supervisor Comisionamiento]], [[Inspector QAQC]], [[Protocolo]]
""",

"Supervisor Comisionamiento.md": """\
---
tags: [actor]
tipo: Rol técnico
comunidad: Actores y Organizaciones
---

# Supervisor de Comisionamiento

Responsable técnico en campo de la ejecución de los protocolos.
Lidera al equipo del [[Contratista]] durante las pruebas de [[FAT]], [[SAT]] y [[Loop Check]].

## Pertenece a
[[Contratista]] → [[Supervisor Comisionamiento]]

## Acciones en CommissionPro
- Aprueba [[Protocolo|Protocolos]] completados
- Firma [[Firma Aprobación|Firmas]] de aceptación
- Crea y cierra [[PunchItem|Punch Items]] críticos
- Ejecuta [[Walkdown|Walkdowns]] de subsistemas

## Relacionado con
[[Contratista]], [[Inspector QAQC]], [[Protocolo]], [[Firma Aprobación]], [[ITR]], [[Walkdown]]
""",

"Inspector QAQC.md": """\
---
tags: [actor]
tipo: Rol de calidad
comunidad: Actores y Organizaciones
---

# Inspector QA/QC

Auditor independiente que verifica la calidad de los trabajos de comisionamiento.
Puede pertenecer al [[Cliente]] o ser un tercero certificado.

## Parte de
[[Empresa]] (independiente de [[Contratista]])

## Acciones en CommissionPro
- Revisa [[Protocolo|Protocolos]] y [[Checklist|Checklists]]
- Genera y cierra [[PunchItem|Punch Items]] de calidad
- Valida [[Evidencia|Evidencias]] fotográficas
- Aprueba [[Dossier Precomisionamiento|Dossiers]]

## Relacionado con
[[Supervisor Comisionamiento]], [[Protocolo]], [[PunchItem]], [[Dossier Precomisionamiento]], [[ITR]]
""",

"Responsable Tecnico.md": """\
---
tags: [actor]
tipo: Rol técnico
comunidad: Actores y Organizaciones
---

# Responsable Técnico

Ingeniero de planta responsable del sistema o subsistema durante el comisionamiento.
Conoce en detalle el proceso PTAR y valida que el equipo opera según especificación.

## Parte de
[[Cliente]] o [[Empresa]]

## Acciones en CommissionPro
- Acepta formalmente [[Equipo|Equipos]] comisionados
- Firma [[ITR|ITRs]] de aceptación técnica
- Aprueba el [[Walkdown]] de subsistemas
- Define setpoints y valores de [[Punto de Control]]

## Relacionado con
[[Cliente]], [[Equipo]], [[ITR]], [[Walkdown]], [[Punto de Control]]
""",

"Cliente.md": """\
---
tags: [actor]
tipo: Propietario del activo
comunidad: Actores y Organizaciones
---

# Cliente

Dueño del activo ([[Planta de Tratamiento]]) que recibe el trabajo comisionado.
En PTAR Zipaquirá: la entidad operadora de la planta de tratamiento de agua.

## Parte de
[[Empresa]] (propietario)

## Rol en CommissionPro
- Aprueba el [[Dossier Precomisionamiento]]
- Firma la aceptación final con [[Firma Aprobación]]
- Accede a los dashboards de [[Fase F Dashboards|Fase F]]
- Define los criterios de aceptación por [[Protocolo]]

## Relacionado con
[[Empresa]], [[Proyecto]], [[Firma Aprobación]], [[Dossier Precomisionamiento]]
""",

"Usuario App.md": """\
---
tags: [actor]
tipo: Usuario de sistema
comunidad: Actores y Organizaciones
---

# Usuario App

Persona que interactúa con CommissionPro en campo o en oficina.
Puede ser [[Supervisor Comisionamiento]], [[Inspector QAQC]] o [[Responsable Tecnico]].

## Parte de
[[Empresa]] (cualquier rol)

## Acciones en CommissionPro
- Ejecuta [[Protocolo|Protocolos]] y llena [[Checklist|Checklists]]
- Adjunta [[Evidencia|Evidencias]] fotográficas con GPS
- Reporta [[PunchItem|Punch Items]]
- Trabaja en modo offline con sincronización automática

## Relacionado con
[[CommissionPro]], [[Protocolo]], [[Evidencia]], [[PunchItem]], [[Inspector QAQC]]
""",

# ===== MODELO DE UBICACIÓN =====
"Ubicacion Fisica.md": """\
---
tags: [entidad]
tipo: Modelo espacial
comunidad: Modelo de Ubicación
---

# Ubicación Física

Posición espacial de un [[Equipo]] dentro de la [[Planta de Tratamiento]].
Combina [[Coordenada GPS]], referencia a [[Zona]] y posición en [[Plano de Planta]].

## Parte de
[[Planta de Tratamiento]] → [[Zona]] → Ubicación Física

## Atributos
- Coordenadas GPS (lat/lon)
- Referencia de zona (ej: "Zona Reactores - Nivel 2")
- Posición en plano (X, Y en PDF)
- Sala o área funcional

## Relacionado con
[[Equipo]], [[Coordenada GPS]], [[Zona]], [[Plano de Planta]], [[Sala de Control]]
""",

"Coordenada GPS.md": """\
---
tags: [entidad]
tipo: Dato espacial
comunidad: Modelo de Ubicación
---

# Coordenada GPS

Posición geográfica real (latitud/longitud) de un [[Equipo]] o [[Evidencia]] en campo.
Capturada automáticamente por CommissionPro en dispositivos móviles.

## Parte de
[[Ubicacion Fisica]] → [[Coordenada GPS]]

## Uso en CommissionPro
- Geoetiquetado de [[Evidencia|Evidencias]] fotográficas
- Localización de [[Equipo|Equipos]] en mapa
- Trazabilidad geográfica del recorrido de [[Walkdown]]

## Relacionado con
[[Equipo]], [[Evidencia]], [[Ubicacion Fisica]], [[Walkdown]]
""",

"Zona.md": """\
---
tags: [entidad]
tipo: Agrupación espacial
comunidad: Modelo de Ubicación
---

# Zona

Agrupación funcional o geográfica dentro de la [[Planta de Tratamiento]].
Corresponde a un sector de la planta (ej: Zona de Cribado, Zona de Reactores, Sala Eléctrica).

## Parte de
[[Planta de Tratamiento]] → [[Zona]] → [[Subsistema|Subsistemas]]

## Relación con la jerarquía de comisionamiento
Una [[Zona]] puede contener múltiples [[Subsistema|Subsistemas]] y [[Equipo|Equipos]].

## Relacionado con
[[Subsistema]], [[Ubicacion Fisica]], [[Plano de Planta]], [[Tren de Tratamiento]]
""",

"Plano de Planta.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería espacial
comunidad: Modelo de Ubicación
---

# Plano de Planta

Documento CAD/PDF que muestra la distribución física de la [[Planta de Tratamiento]].
Permite navegar visualmente a [[Equipo|Equipos]] y [[Zona|Zonas]] directamente en CommissionPro.

## Parte de
[[Documento]] (tipo: plano de planta)

## Uso en CommissionPro
- Base para navegación por mapa en campo
- Referencia de posición de [[Equipo|Equipos]]
- Marcado de [[PunchItem|Punch Items]] georreferenciados

## Relacionado con
[[Zona]], [[Documento]], [[Ubicacion Fisica]], [[Sala de Control]]
""",

"Sala de Control.md": """\
---
tags: [entidad]
tipo: Ubicación especial
comunidad: Modelo de Ubicación
---

# Sala de Control

Recinto centralizado donde se concentran los tableros de control, PLC/DCS y HMI de la [[Planta de Tratamiento]].
Punto focal para la ejecución de [[Loop Check|Loop Checks]] y [[Energización|Energizaciones]].

## Parte de
[[Planta de Tratamiento]] → [[Sala de Control]]

## Relacionado con
[[Equipo]], [[Plano de Planta]], [[Loop Check]], [[Energización]], [[Gemelo Digital]]
""",

# ===== JERARQUÍA PTAR =====
"Planta de Tratamiento.md": """\
---
tags: [entidad]
tipo: Activo industrial
comunidad: Jerarquía PTAR
---

# Planta de Tratamiento

Instalación industrial de tratamiento de aguas residuales (PTAR).
El activo raíz de la jerarquía de proceso, contenido dentro de un [[Proyecto]] de comisionamiento.

## Proyecto piloto
PTAR Zipaquirá — 360 instrumentos, 29 equipos de potencia, 136 equipos adicionales.

## Jerarquía de proceso
Planta de Tratamiento → [[Tren de Tratamiento]] → [[Etapa de Proceso]] → [[Línea de Proceso]]

## Relacionado con
[[Proyecto]], [[Tren de Tratamiento]], [[Zona]], [[Subsistema]], [[Gemelo Digital]]
""",

"Tren de Tratamiento.md": """\
---
tags: [entidad]
tipo: Agrupación de proceso
comunidad: Jerarquía PTAR
---

# Tren de Tratamiento

Línea paralela completa de tratamiento dentro de la [[Planta de Tratamiento]].
Una PTAR puede tener múltiples trenes para redundancia o carga (ej: Tren A, Tren B).

## Parte de
[[Planta de Tratamiento]] → [[Tren de Tratamiento]]

## Relacionado con
[[Planta de Tratamiento]], [[Etapa de Proceso]], [[Subsistema]], [[Zona]]
""",

"Etapa de Proceso.md": """\
---
tags: [entidad]
tipo: Fase de proceso
comunidad: Jerarquía PTAR
---

# Etapa de Proceso

Fase funcional del tratamiento de aguas: cribado, sedimentación, tratamiento biológico, desinfección, etc.
Cada etapa contiene [[Tanque Canal|Tanques/Canales]] y [[Equipo|Equipos]] específicos.

## Parte de
[[Tren de Tratamiento]] → [[Etapa de Proceso]]

## Ejemplos PTAR Zipaquirá
- Pretratamiento (cribado + desarenado)
- Tratamiento primario (sedimentación)
- Tratamiento biológico (reactor SBR)
- Desinfección (UV / cloro)

## Relacionado con
[[Tren de Tratamiento]], [[Línea de Proceso]], [[Tanque Canal]], [[Equipo]]
""",

"Línea de Proceso.md": """\
---
tags: [entidad]
tipo: Flujo de proceso
comunidad: Jerarquía PTAR
---

# Línea de Proceso

Flujo físico de agua o lodo dentro de una [[Etapa de Proceso]].
Define la ruta del fluido entre [[Tanque Canal|Tanques]], [[Equipo|Equipos]] y [[Punto de Control|Puntos de Control]].

## Parte de
[[Etapa de Proceso]] → [[Línea de Proceso]]

## Relacionado con
[[Etapa de Proceso]], [[Punto de Control]], [[Tanque Canal]], [[TAG]]
""",

"Punto de Control.md": """\
---
tags: [entidad]
tipo: Nodo de instrumentación
comunidad: Jerarquía PTAR
---

# Punto de Control

Ubicación física de un instrumento de medición o actuación en la [[Línea de Proceso]].
Cada punto de control está asociado a uno o más [[TAG|TAGs]] de instrumentación.

## Parte de
[[Línea de Proceso]] → [[Punto de Control]]

## En CommissionPro
- Origen de [[TAG|TAGs]] en el Instrument Index (DATOS_INST)
- Target del [[Loop Check]]
- Sensor real del [[Sensor Virtual]] en el [[Gemelo Digital]]

## Relacionado con
[[Línea de Proceso]], [[TAG]], [[Loop Check]], [[Sensor Virtual]]
""",

"Tanque Canal.md": """\
---
tags: [entidad]
tipo: Estructura de proceso
comunidad: Jerarquía PTAR
---

# Tanque / Canal

Recipiente o canal abierto donde ocurre una [[Etapa de Proceso]] de tratamiento.
Ej: tanque SBR, canal de cribado, cámara de desinfección.

## Parte de
[[Etapa de Proceso]] → [[Tanque Canal]]

## Relacionado con
[[Etapa de Proceso]], [[Equipo]], [[Línea de Proceso]], [[Zona]]
""",

# ===== DOCUMENTOS DE INGENIERÍA =====
"PID.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería
comunidad: Documentos de Ingeniería
---

# P&ID — Piping and Instrumentation Diagram

Diagrama que muestra la instrumentación, tuberías y equipos de control de un proceso.
Fuente primaria de [[TAG|TAGs]] de instrumentación antes del Instrument Index.

## Parte de
[[Documento]] (tipo: P&ID)

## En CommissionPro
- Referencia para validar [[TAG|TAGs]] extraídos del Instrument Index
- Trazabilidad del [[Pipeline TAG Equipo|Pipeline TAG→Equipo]]
- Base para el [[Diagrama de Lazo]]

## Relacionado con
[[Documento]], [[TAG]], [[Diagrama de Lazo]], [[Revisión Documental]], [[Digitalizacion Ingenieria]]
""",

"Diagrama de Lazo.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería
comunidad: Documentos de Ingeniería
---

# Diagrama de Lazo (Loop Diagram)

Diagrama detallado de un lazo de control: instrumento → cable → tablero → PLC → pantalla.
Documento de referencia indispensable para ejecutar el [[Loop Check]].

## Parte de
[[Documento]] (tipo: Loop Diagram)

## En CommissionPro
- Referencia obligatoria durante [[Loop Check]]
- Vinculado al [[TAG]] del instrumento bajo prueba
- Generado a partir del [[PID]]

## Relacionado con
[[Documento]], [[TAG]], [[Loop Check]], [[PID]], [[Revisión Documental]]
""",

"Hoja de Datos.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería
comunidad: Documentos de Ingeniería
---

# Hoja de Datos (Datasheet)

Especificación técnica individual de un [[Equipo]] o instrumento: fabricante, modelo, rango, material, etc.
Base para configurar setpoints y verificar instalación en el [[Precomisionamiento]].

## Parte de
[[Documento]] (tipo: Datasheet)

## Relacionado con
[[Documento]], [[Equipo]], [[TAG]], [[Especificación Técnica]], [[Precomisionamiento]]
""",

"Diagrama Unifilar.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería eléctrica
comunidad: Documentos de Ingeniería
---

# Diagrama Unifilar (Single Line Diagram)

Representación simplificada del sistema eléctrico de la planta.
Referencia para los protocolos de [[Energización]] y verificación de protecciones.

## Parte de
[[Documento]] (tipo: Diagrama Unifilar)

## En CommissionPro
- Referencia durante [[Energización]]
- Trazabilidad de equipos de potencia (DATOS_POT: 29 equipos)

## Relacionado con
[[Documento]], [[Equipo]], [[Energización]], [[Sala de Control]]
""",

"Lista de Materiales.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería
comunidad: Documentos de Ingeniería
---

# Lista de Materiales (BOM)

Inventario completo de equipos, instrumentos y materiales del proyecto.
Fuente para la importación masiva de [[Equipo|Equipos]] y [[TAG|TAGs]] en CommissionPro.

## Parte de
[[Documento]] (tipo: Lista de Materiales)

## En CommissionPro
- Base para [[Importación Excel|Importación Excel]] de equipos
- Validación del [[Instrument Index]] (360 instrumentos Zipaquirá)
- Trazabilidad de instalación en [[Precomisionamiento]]

## Relacionado con
[[Documento]], [[Equipo]], [[Importación Excel]], [[TAG]]
""",

"Especificación Técnica.md": """\
---
tags: [entidad]
tipo: Documento de ingeniería
comunidad: Documentos de Ingeniería
---

# Especificación Técnica

Documento que define los requisitos técnicos de diseño de un [[Equipo]] o sistema.
Referencia durante el [[Precomisionamiento]] para verificar que la instalación cumple el diseño.

## Parte de
[[Documento]] (tipo: Especificación Técnica)

## Relacionado con
[[Documento]], [[Equipo]], [[Hoja de Datos]], [[Precomisionamiento]]
""",

"Revisión Documental.md": """\
---
tags: [proceso]
tipo: Control de versiones
comunidad: Documentos de Ingeniería
---

# Revisión Documental

Control de versiones de documentos de ingeniería. Los documentos como [[PID]] y [[Diagrama de Lazo]]
pasan por revisiones (Rev. 0, Rev. A, Rev. B) antes de llegar a la revisión "As-Built".

## En CommissionPro
- Trazabilidad de qué revisión se usó en cada [[Protocolo]]
- Validación documental de [[Fase E Documental|Fase E]]
- Cierre de [[PunchItem|Punch Items]] documentales

## Relacionado con
[[Documento]], [[PID]], [[Diagrama de Lazo]], [[Digitalizacion Ingenieria]], [[Fase E Documental]]
""",

# ===== GEMELO DIGITAL =====
"Gemelo Digital.md": """\
---
tags: [entidad]
tipo: Arquitectura de datos en tiempo real
comunidad: Gemelo Digital
---

# Gemelo Digital

Representación digital en tiempo real del estado físico de los [[Equipo|Equipos]] de la [[Planta de Tratamiento]].
Alimentado por [[Sensor Virtual|Sensores Virtuales]] conectados a instrumentación real vía SCADA/IoT.

## Valor en CommissionPro
Transforma la plataforma de gestión documental a monitoreo continuo post-comisionamiento.
360 instrumentos PTAR Zipaquirá → estado en tiempo real → [[Alarma|Alarmas]] automáticas.

## Arquitectura
[[TAG]] → [[Sensor Virtual]] → [[Gemelo Digital]] → [[Estado Tiempo Real]] + [[Histórico de Datos]]
→ [[Dashboard IoT]] (visible en [[Fase F Dashboards]])

## Relacionado con
[[Equipo]], [[Estado Tiempo Real]], [[Histórico de Datos]], [[Alarma]], [[Dashboard IoT]], [[Sensor Virtual]]
""",

"Estado Tiempo Real.md": """\
---
tags: [entidad]
tipo: Dato operacional
comunidad: Gemelo Digital
---

# Estado en Tiempo Real

Snapshot del estado actual de un [[Equipo]] o [[Punto de Control]]:
valor medido, estado ON/OFF, condición de alarma, timestamp.

## Parte de
[[Gemelo Digital]] → [[Estado Tiempo Real]]

## En CommissionPro
- Visible en [[Dashboard IoT]]
- Dispara [[Alarma|Alarmas]] cuando cruza umbrales
- Alimenta el [[Histórico de Datos]]

## Relacionado con
[[Gemelo Digital]], [[Equipo]], [[Dashboard IoT]], [[Alarma]]
""",

"Histórico de Datos.md": """\
---
tags: [entidad]
tipo: Serie temporal
comunidad: Gemelo Digital
---

# Histórico de Datos

Serie temporal de mediciones de [[Equipo|Equipos]] e instrumentos.
Permite análisis de tendencias post-comisionamiento y diagnóstico de desviaciones.

## Parte de
[[Gemelo Digital]] → [[Histórico de Datos]]

## Uso en PTAR
- Verificar estabilidad de proceso post [[SAT]]
- Base para curvas de operación normal
- Evidencia para [[Dossier Precomisionamiento]]

## Relacionado con
[[Gemelo Digital]], [[Equipo]], [[Dashboard IoT]], [[Evidencia]]
""",

"Alarma.md": """\
---
tags: [entidad]
tipo: Evento de proceso
comunidad: Gemelo Digital
---

# Alarma

Evento generado cuando un [[Equipo]] o [[Punto de Control]] cruza un umbral operacional.
En CommissionPro puede crear automáticamente un [[PunchItem]] para seguimiento.

## Parte de
[[Gemelo Digital]] → [[Alarma]]

## Ciclo de vida
1. Sensor detecta desviación
2. [[Gemelo Digital]] genera Alarma
3. CommissionPro crea [[PunchItem]] de alarma
4. Técnico investiga y resuelve
5. [[PunchItem]] cerrado con [[Evidencia]]

## Relacionado con
[[Gemelo Digital]], [[Equipo]], [[PunchItem]], [[Estado Tiempo Real]]
""",

"Dashboard IoT.md": """\
---
tags: [entidad]
tipo: Visualización operacional
comunidad: Gemelo Digital
---

# Dashboard IoT

Panel de visualización en tiempo real del estado de la [[Planta de Tratamiento]].
Integra datos del [[Gemelo Digital]], [[KPIs]] de comisionamiento y estado de [[Alarma|Alarmas]].

## Parte de
[[Fase F Dashboards]] → Dashboard IoT (nivel operacional)

## Usuarios
- [[Supervisor Comisionamiento]]: seguimiento en campo
- [[Responsable Tecnico]]: estado de proceso
- [[Cliente]]: vista ejecutiva del avance

## Relacionado con
[[Gemelo Digital]], [[Estado Tiempo Real]], [[Histórico de Datos]], [[Proyecto]], [[Fase F Dashboards]]
""",

"Sensor Virtual.md": """\
---
tags: [entidad]
tipo: Abstracción de instrumentación
comunidad: Gemelo Digital
---

# Sensor Virtual

Representación digital de un instrumento físico identificado por su [[TAG]].
Puente entre el mundo físico (instrumento de campo) y el [[Gemelo Digital]].

## En CommissionPro
- Creado automáticamente al registrar un [[TAG]] de tipo instrumento
- Conectado a la señal real via API SCADA/MQTT post-comisionamiento
- Alimenta el [[Estado Tiempo Real]] del [[Gemelo Digital]]

## Relacionado con
[[TAG]], [[Gemelo Digital]], [[Punto de Control]], [[Loop Check]]
""",

# ===== SEGURIDAD Y NORMATIVA =====
"Permiso de Trabajo.md": """\
---
tags: [protocolo]
tipo: Documento de seguridad
comunidad: Seguridad y Normativa
---

# Permiso de Trabajo (PTW)

Autorización formal para ejecutar trabajos en sistemas energizados o de riesgo.
Requerido antes de cualquier [[Energización]] o trabajo en campo sobre [[Equipo|Equipos]].

## En CommissionPro
- Prerrequisito para marcar un protocolo de [[Energización]] como "en ejecución"
- Vinculado al [[Análisis de Riesgo]] previo
- Adjuntado como [[Evidencia]] en el [[Dossier Precomisionamiento]]

## Relacionado con
[[Equipo]], [[Energización]], [[Análisis de Riesgo]], [[LOTO]], [[Evidencia]]
""",

"Análisis de Riesgo.md": """\
---
tags: [protocolo]
tipo: Evaluación de seguridad
comunidad: Seguridad y Normativa
---

# Análisis de Riesgo

Evaluación de peligros y medidas de control para trabajos de comisionamiento en campo.
Documento previo al [[Permiso de Trabajo]] y a los protocolos de [[Precomisionamiento]].

## Relacionado con
[[Permiso de Trabajo]], [[LOTO]], [[Equipo]], [[Precomisionamiento]], [[Normativa ISA IEC]]
""",

"LOTO.md": """\
---
tags: [protocolo]
tipo: Procedimiento de seguridad
comunidad: Seguridad y Normativa
---

# LOTO — Lockout / Tagout

Procedimiento para aislar y bloquear la energía de un [[Equipo]] antes de trabajar en él.
Crítico en [[Planta de Tratamiento|PTARs]] donde la energización accidental puede causar accidentes.

## En CommissionPro
- Prerrequisito para [[Precomisionamiento]] de equipos eléctricos
- Adjuntado como [[Evidencia]] (foto del candado en el tablero)
- Coordinado con la [[Sala de Control]]

## Relacionado con
[[Equipo]], [[Energización]], [[Precomisionamiento]], [[Permiso de Trabajo]], [[Análisis de Riesgo]]
""",

"Normativa ISA IEC.md": """\
---
tags: [entidad]
tipo: Marco normativo
comunidad: Seguridad y Normativa
---

# Normativa ISA / IEC

Estándares internacionales de instrumentación y control aplicables al comisionamiento de PTARs:
- ISA-5.1: Símbolos de instrumentación (P&IDs)
- ISA-18.2: Gestión de alarmas
- IEC 61511: Safety Instrumented Systems
- IEC 60079: Áreas clasificadas (ATEX)

## En CommissionPro
- Define los criterios de aceptación de [[Loop Check|Loop Checks]]
- Base de los formatos de [[Protocolo|Protocolos]]
- Requerido para [[PSSR]] y [[Certificado MC]]

## Relacionado con
[[Protocolo]], [[Loop Check]], [[PSSR]], [[Análisis de Riesgo]]
""",

"Certificado MC.md": """\
---
tags: [entidad]
tipo: Hito de aceptación
comunidad: Seguridad y Normativa
---

# Certificado de Mechanical Completion (MC)

Documento formal que certifica que un [[Subsistema]] o sistema ha sido construido conforme al diseño
y está listo para el comisionamiento. Emitido tras el [[Walkdown]] de aceptación.

## Prerequisitos
1. [[Walkdown]] completado sin [[PunchItem|Punch Items]] categoria A
2. Todos los documentos de [[Revisión Documental]] en revisión final
3. [[PSSR]] aprobado

## En CommissionPro
- Hito que habilita el inicio de pruebas [[FAT]]/[[SAT]]
- Incluido en [[Dossier Precomisionamiento]]

## Relacionado con
[[Subsistema]], [[Walkdown]], [[PSSR]], [[Dossier Precomisionamiento]], [[Hito]]
""",

"PSSR.md": """\
---
tags: [protocolo]
tipo: Revisión de seguridad
comunidad: Seguridad y Normativa
---

# PSSR — Pre-Startup Safety Review

Revisión formal de seguridad ejecutada inmediatamente antes de la primera [[Energización]].
Verifica que todos los sistemas de seguridad están operativos y el personal está entrenado.

## Checklist PSSR típico
- Bloqueos y enclavamientos verificados
- Extintores y duchas de emergencia operativas
- Personal con EPP y entrenado
- [[Permiso de Trabajo]] activo
- [[Normativa ISA IEC|Normas IEC 61511]] cumplidas

## Relacionado con
[[Energización]], [[Certificado MC]], [[Normativa ISA IEC]], [[Análisis de Riesgo]]
""",

# ===== GESTIÓN DE PROYECTO =====
"Hito.md": """\
---
tags: [entidad]
tipo: Punto de control de proyecto
comunidad: Gestión de Proyecto
---

# Hito (Milestone)

Punto de referencia en el [[Cronograma]] que marca la finalización de una fase o entregable clave.
Ejemplo: "Mechanical Completion Subsistema 1", "FAT completado", "Aceptación cliente".

## En CommissionPro
- Vinculado al [[Cronograma]] del [[Proyecto]]
- Trazado en la [[Curva S]] de avance
- Aprobado con [[Firma Aprobación]] o [[Certificado MC]]

## Relacionado con
[[Proyecto]], [[Cronograma]], [[Curva S]], [[Certificado MC]], [[Firma Aprobación]]
""",

"ITR.md": """\
---
tags: [entidad]
tipo: Registro de inspección
comunidad: Gestión de Proyecto
---

# ITR — Inspection Test Record

Registro formal de que un [[Equipo]] o sistema pasó una inspección o prueba específica.
Estándar de industria para trazabilidad de comisionamiento; uno por equipo por tipo de prueba.

## En CommissionPro
- Generado automáticamente al completar un [[Protocolo]]
- Firmado por [[Supervisor Comisionamiento]] y [[Inspector QAQC]]
- Constituye evidencia para el [[Certificado MC]]

## Relacionado con
[[Equipo]], [[Protocolo]], [[Walkdown]], [[Supervisor Comisionamiento]], [[Inspector QAQC]]
""",

"Cronograma.md": """\
---
tags: [entidad]
tipo: Plan de proyecto
comunidad: Gestión de Proyecto
---

# Cronograma

Plan de trabajo con fechas de inicio/fin para cada actividad de comisionamiento.
Referencia para calcular el avance real vs planificado en la [[Curva S]].

## En CommissionPro
- Fuente de datos para [[Fase F Dashboards|Fase F]]: % de avance planificado
- Vinculado a [[Hito|Hitos]] de aceptación
- Comparado con avance real de [[Protocolo|Protocolos]] completados

## Relacionado con
[[Proyecto]], [[Hito]], [[Curva S]], [[Fase F Dashboards]]
""",

"Walkdown.md": """\
---
tags: [protocolo]
tipo: Inspección física
comunidad: Gestión de Proyecto
---

# Walkdown

Recorrido físico de inspección de un [[Subsistema]] o sistema antes de declarar Mechanical Completion.
El equipo verifica que todo está instalado conforme al [[PID]] y a las [[Especificación Técnica|Especificaciones]].

## En CommissionPro
- Genera [[PunchItem|Punch Items]] de construcción (Categoría A y B)
- Prerrequisito para emitir [[Certificado MC]]
- Ejecutado por [[Supervisor Comisionamiento]] + [[Responsable Tecnico]]
- Evidencias fotográficas con [[Coordenada GPS]]

## Relacionado con
[[Subsistema]], [[Equipo]], [[PunchItem]], [[Certificado MC]], [[Supervisor Comisionamiento]]
""",

"Curva S.md": """\
---
tags: [entidad]
tipo: Indicador de avance
comunidad: Gestión de Proyecto
---

# Curva S

Gráfica de avance acumulado (%) vs tiempo: compara planificado vs real.
Herramienta visual estándar para el seguimiento de proyectos de comisionamiento.

## En CommissionPro
- Calculada automáticamente en [[Fase F Dashboards|Fase F]]
- Usa [[Cronograma]] para el avance planificado
- Usa [[ITR|ITRs]] completados para el avance real
- Vinculada a [[Hito|Hitos]] del [[Proyecto]]

## Relacionado con
[[Proyecto]], [[Hito]], [[Cronograma]], [[Fase F Dashboards]]
""",
}

count = 0
for fname, content in NOTES.items():
    (DST / fname).write_text(content, encoding='utf-8')
    count += 1

print(f"Created {count} new v2 notes in {DST}")
print(f"Total vault size: {len(list(DST.glob('*.md')))} notes")
