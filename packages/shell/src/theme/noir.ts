/**
 * Tema NOIR — el que estrena Shadow Logic.
 *
 * Es **un** tema, no **el** tema: la carcasa no tiene colores propios, solo
 * consume tokens. Cambiar esta constante por otra cambia la app entera sin tocar
 * una línea de las pantallas. Es la prueba práctica de que el tema es un dato.
 *
 * `board` es opaco para la carcasa: se lo entrega tal cual al renderizador del
 * juego, que es el único que sabe cómo se dibuja una pared.
 */

import type { Theme } from '@game/core'

export const NOIR: Theme = {
  mode: 'dark',

  color: {
    bg: '#0d1117',
    surface: '#161b22',
    surfaceAlt: '#21262d',
    ink: '#e6edf3',
    inkMuted: '#8b949e',
    accent: '#d9a441', // ámbar de lámpara de despacho
    accentInk: '#0d1117',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    star: '#d9a441',
    starEmpty: '#30363d',
  },

  type: {
    display: 'Georgia, serif',
    title: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    scale: [12, 14, 16, 20, 26, 34, 44],
  },

  space: [0, 4, 8, 12, 16, 24, 32, 48],
  radius: { sm: 4, md: 8, lg: 16, pill: 999 },
  motion: { fast: 120, base: 220, slow: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
  sound: { tap: null, success: null, fail: null, star: null, hint: null },
  icons: {},

  board: {
    floor: '#171e27',
    floorAlt: '#1a222c',
    wall: '#2e3846',
    wallEdge: '#3e4b5d',
    detective: '#e8c07d',
    shadow: '#6f42c1',
    shadowAbsent: '#2b2440',
    clue: '#58a6ff',
    exit: '#3fb950',
    hole: '#05070a',
    filled: '#2a3340',
    plate: '#8b6d3f',
    door: '#a06b3c',
    dark: '#0a0d12',
    switch: '#d9a441',
  },
}
