/**
 * CASO 01 — "¿Quién se ha llevado el pastel?"
 *
 * Plantas dibujadas a mano. El generador solo coloca pistas, salida, placas,
 * agujeros y posiciones iniciales dentro de estos moldes.
 *
 * Curva del caso (Rulebook §23 — enseñar, practicar, combinar, examinar):
 *
 *   001  el deslizamiento                    tutorial
 *   002  la sombra como tope                 tutorial
 *   003  el empujón                          push
 *   004  el empujón como herramienta         push
 *   005  la placa y la puerta                push
 *   006  placa + puerta + más pistas         push
 *   007  el puente irreversible              bridge
 *   008  MASTER PUZZLE                       bridge + push + puerta
 */

import type { Mold } from '../mold.js'

/** El despacho. Un escritorio en medio y poco más. */
export const DESPACHO: Mold = {
  id: 'despacho',
  case: 1,
  title: 'El despacho',
  place: 'Despacho · lunes por la mañana',
  grid: [
    '#######',
    '#.....#',
    '#..#..#',
    '#.....#',
    '#..#..#',
    '#.....#',
    '#######',
  ],
}

/** El archivo. Dos estanterías largas y un pasillo que las cruza. */
export const ARCHIVO: Mold = {
  id: 'archivo',
  case: 1,
  title: 'El archivo',
  place: 'Despacho · la sala de archivadores',
  grid: [
    '########',
    '#......#',
    '#.##...#',
    '#....#.#',
    '#.#....#',
    '#...##.#',
    '#......#',
    '########',
  ],
}

/**
 * El recibidor. Buzones sueltos por las paredes.
 *
 * Muchos pilares de una sola casilla: cada uno es un tope, y los topes son lo
 * que alarga una solución. Un salón vacío se cruza de una pasada; un salón con
 * columnas hay que recorrerlo.
 */
export const RECIBIDOR: Mold = {
  id: 'recibidor',
  case: 1,
  title: 'El recibidor',
  place: 'Portal · el felpudo que nadie sacude',
  grid: [
    '########',
    '#......#',
    '#.#..#.#',
    '#......#',
    '#..#...#',
    '#.#...##',
    '#......#',
    '########',
  ],
}

/** La cocina. Aquí estaba el pastel. La isla central lo cambia todo. */
export const COCINA: Mold = {
  id: 'cocina',
  case: 1,
  title: 'La cocina',
  place: 'Casa de la señora Molina · la escena del crimen',
  grid: [
    '########',
    '#......#',
    '#..##..#',
    '#..##..#',
    '#......#',
    '#.#..#.#',
    '#......#',
    '########',
  ],
}

/** El almacén. Dos salas y una puerta en medio: la placa manda. */
export const ALMACEN: Mold = {
  id: 'almacen',
  case: 1,
  title: 'El almacén',
  place: 'Trastienda · la puerta que no cierra sola',
  grid: [
    '#########',
    '#.......#',
    '#.#...#.#',
    '#....#..#',
    '####+####',
    '#..#....#',
    '#.......#',
    '#########',
  ],
  zones: [
    '#########',
    '#AAAAAAA#',
    '#A#AAA#A#',
    '#AAAA#AA#',
    '####+####',
    '#BB#BBBB#',
    '#BBBBBBB#',
    '#########',
  ],
  doorIds: ['d1'],
}

/**
 * El patio. Dos alas y una puerta en el eje.
 *
 * Zonas: A = ala norte (donde vive la placa), B = ala sur (donde está la salida).
 * El autor decide en qué ala va cada cosa; el generador, la casilla exacta.
 */
export const PATIO: Mold = {
  id: 'patio',
  case: 1,
  title: 'El patio',
  place: 'Patio de vecinos · el tendedero',
  grid: [
    '#########',
    '#.......#',
    '#.#...#.#',
    '#....#..#',
    '####+####',
    '#..#....#',
    '#.#...#.#',
    '#.......#',
    '#########',
  ],
  // Los muros de [3,5] y [5,3] no son decoración: son los topes que permiten
  // pararse en la columna de la puerta. Sin ellos el eje central es inalcanzable
  // salvo con la sombra, que está ocupada sujetando la placa.
  zones: [
    '#########',
    '#AAAAAAA#',
    '#A#AAA#A#',
    '#AAAA#AA#',
    '####+####',
    '#BB#BBBB#',
    '#B#BBB#B#',
    '#BBBBBBB#',
    '#########',
  ],
  doorIds: ['d1'],
}

/** El sótano. El suelo está mal. Aquí aparece el agujero. */
export const SOTANO: Mold = {
  id: 'sotano',
  case: 1,
  title: 'El sótano',
  place: 'Sótano · el suelo que cede',
  grid: [
    '########',
    '#......#',
    '#..#...#',
    '#......#',
    '#...#..#',
    '#......#',
    '#..#...#',
    '########',
  ],
}

/**
 * La azotea. MASTER PUZZLE del Caso 01.
 *
 * NO lleva puerta, y la razón es una restricción estructural que salió al
 * generar, no un capricho:
 *
 *   Una puerta con placa exige que la sombra se quede encima (S-06). El puente
 *   exige hundirla (S-05), que es irreversible. Hundirla cierra la puerta para
 *   siempre, así que cualquier nivel que combine ambas cosas está lleno de
 *   estados atrapa y suspende la validación 3. Medido: 40.000 candidatos, 96
 *   resolubles, 96 suspensos, todos por la misma validación.
 *
 * El examen se construye por tanto sobre el otro eje: espacio grande sembrado de
 * pilares, cuatro pistas, dos agujeros y una sola sombra que hay que administrar
 * como tope Y como puente. Combina las mecánicas aprendidas sin introducir
 * ninguna nueva (§24).
 *
 * Los pilares de una sola casilla no son decoración: cada uno es un tope, y los
 * topes son lo único que alarga una solución. Con esta planta el generador llega
 * a 22 movimientos exigiendo empujón y puente — el techo que §11-BIS midió para
 * el vocabulario del MVP.
 */
export const AZOTEA: Mold = {
  id: 'azotea',
  case: 1,
  title: 'Caso cerrado',
  place: 'Azotea · el pastel, por fin',
  grid: [
    '#########',
    '#.......#',
    '#..#..#.#',
    '#.#.....#',
    '#....#..#',
    '#.#..#..#',
    '#..#...##',
    '#.......#',
    '#########',
  ],
}

export const MOLDES_CASO_01 = [
  DESPACHO,
  ARCHIVO,
  RECIBIDOR,
  COCINA,
  ALMACEN,
  PATIO,
  SOTANO,
  AZOTEA,
] as const
