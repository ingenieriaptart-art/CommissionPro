---
tags: [entidad]
tipo: Nivel de jerarquía 1
---

# Área

Primer nivel de subdivisión funcional de un [[Proyecto]]. Representa una zona geográfica o funcional de la planta (ej: Área Tratamiento, Área Bombeo).

## Pertenece a
[[Proyecto]]

## Contiene
[[Sistema|Sistemas]]

## Atributos
`código`, `nombre`, `descripción`, `sort_order`

## Nota técnica
Implementado en la tabla `areas` de Supabase. Offline-first: lectura disponible sin red; escritura requiere conexión.
