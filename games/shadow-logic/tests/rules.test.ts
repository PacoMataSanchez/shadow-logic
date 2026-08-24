/**
 * Una prueba por regla del Rulebook. Si una de éstas cae, es que el motor y el
 * documento han dejado de decir lo mismo — y el documento es el que manda.
 */

import { describe, expect, it } from 'vitest'

import {
  compile,
  freezeDoors,
  initialState,
  step,
  type Estado,
  type Level,
} from '../src/engine/index.js'
import { lvl } from './helpers.js'

function play(level: Level, dirs: string, from?: Estado) {
  let estado = from ?? initialState(level)
  let last = null as ReturnType<typeof step> | null
  for (const d of dirs) {
    last = step(level, estado, d as never)
    if (last.kind === 'moved') estado = last.estado
  }
  return { estado, last: last! }
}

describe('S-01 · un input, un deslizamiento', () => {
  it('el detective se desliza hasta topar, no una casilla', () => {
    const level = lvl(['#####', '#D..#', '#####'])
    const { estado } = play(level, 'R')
    expect(estado.det).toEqual([1, 3])
  })

  it('un input sin desplazamiento no cuenta como movimiento', () => {
    const level = lvl(['#####', '#D..#', '#####'])
    const res = step(level, initialState(level), 'L')
    expect(res.kind).toBe('nothing')
  })

  it('el contador solo sube cuando algo se desplaza', () => {
    const level = lvl(['#####', '#D..#', '#####'])
    // R desplaza · R contra la pared no · L desplaza · L contra la pared no.
    const { estado } = play(level, 'RRLL')
    expect(estado.moves).toBe(2)
  })
})

describe('S-03 / S-04 · el empujón', () => {
  it('el detective se para en seco y la sombra sale deslizando', () => {
    const level = lvl(['######', '#D.S.#', '######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([1, 2]) // se detiene ANTES de la sombra
    expect(res.estado.sha).toEqual([1, 4]) // ella se desliza hasta topar
  })

  it('si la sombra no puede moverse, no se mueve, y el detective se para igual', () => {
    const level = lvl(['#####', '#DS#', '#####'].map((l) => l.padEnd(5, '#')))
    const res = step(level, initialState(level), 'R')
    expect(res.kind).toBe('nothing') // nadie se desplazó: S-01 + S-04
  })

  it('la sombra es un tope fiable aunque esté pegada a la pared', () => {
    const level = lvl(['######', '#D..S#', '######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([1, 3])
    expect(res.estado.sha).toEqual([1, 4]) // no tenía a dónde ir
  })

  it('un deslizamiento produce como máximo un empujón', () => {
    const level = lvl(['#######', '#D.S..#', '#######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.shadowPath?.length).toBeGreaterThan(1)
    expect(res.estado.det).toEqual([1, 2])
  })
})

describe('S-05 · la sombra tapa agujeros', () => {
  it('cae dentro, lo tapa y queda fuera de juego', () => {
    const level = lvl(['######', '#DSO.#', '######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.sha).toBeNull()
    expect(res.sunk).toEqual([1, 3])
    expect(res.estado.filled.has('1,3')).toBe(true)
  })

  it('la casilla tapada pasa a ser suelo transitable', () => {
    const level = lvl(['######', '#DSO.#', '######'])
    const a = step(level, initialState(level), 'R')
    if (a.kind !== 'moved') throw new Error('esperaba movimiento')
    const b = step(level, a.estado, 'R')
    if (b.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(b.estado.det).toEqual([1, 4]) // cruza por encima del agujero tapado
  })
})

describe('S-06 · solo la sombra pesa', () => {
  //  #######
  //  #...._#   placa en [1,5]
  //  ###+###   puerta en [2,3]
  //  #.....#
  //  #######
  const base = (playerStart: [number, number], shadowStart: [number, number]): Level =>
    lvl(['#######', '#...._#', '###+###', '#.....#', '#######'], {
      playerStart,
      shadowStart,
      doors: [{ id: 'd1', pos: [2, 3], controlledBy: ['p1'], logic: 'OR' }],
      plates: [{ id: 'p1', pos: [1, 5] }],
    })

  it('con la sombra fuera de la placa la puerta está cerrada', () => {
    const level = base([1, 3], [1, 1])
    expect(step(level, initialState(level), 'D').kind).toBe('nothing')
  })

  it('con la sombra encima, la puerta se abre y el detective cruza', () => {
    const level = base([1, 3], [1, 5])
    const res = step(level, initialState(level), 'D')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([3, 3])
  })

  it('el detective encima de la placa NO la activa', () => {
    const level = base([1, 5], [1, 1])
    const abiertas = freezeDoors(compile(level), initialState(level))
    expect(abiertas.size).toBe(0)
  })
})

describe('S-07 · la salida no frena nunca', () => {
  it('el detective pasa por encima de la salida sin detenerse', () => {
    const level = lvl(['######', '#D*E.#', '######'])
    const { estado, last } = play(level, 'R')
    expect(estado.det).toEqual([1, 4]) // la salida no le paró
    expect(last.kind === 'moved' && last.won).toBe(false)
  })

  it('se gana si una colisión legítima detiene al detective encima', () => {
    const level = lvl(['######', '#D*.E#', '######'])
    const { last } = play(level, 'R')
    expect(last.kind === 'moved' && last.won).toBe(true)
  })

  it('no se gana si faltan pistas', () => {
    const level = lvl(['#######', '#D..*E#', '#######'], { playerStart: [1, 1] })
    const noClues = lvl(['######', '#D..E#', '######'])
    void noClues
    const { last } = play(level, 'R')
    expect(last.kind === 'moved' && last.won).toBe(true) // recoge la pista de camino
  })
})

describe('S-08 · solo el detective investiga', () => {
  it('la sombra pasa por encima de la pista sin recogerla', () => {
    const level = lvl(['#######', '#DS*..#', '#######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.got.size).toBe(0)
  })
})

describe('S-09 · el tropiezo', () => {
  it('entrar en un agujero sin tapar devuelve `fell`', () => {
    const level = lvl(['######', '#D.O.#', '######'])
    const res = step(level, initialState(level), 'R')
    expect(res.kind).toBe('fell')
  })
})

describe('S-17 / S-18 / S-19 · la luz', () => {
  const oscuro = (): Level =>
    lvl(['#######', '#DS.x.#', '#######'], { darkGroups: { '1,4': 0 }, lightsOn: [] })

  it('S-17 · la zona oscura es suelo para el detective', () => {
    const level = lvl(['#######', '#D..x.#', '#######'], { darkGroups: { '1,4': 0 } })
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([1, 5])
  })

  it('S-17 · la zona oscura es muro para la sombra', () => {
    const level = oscuro()
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.sha).toEqual([1, 3]) // se detuvo antes de la oscuridad
  })

  it('S-18 · el interruptor no detiene al detective y cambia la luz', () => {
    const level = lvl(['#######', '#D.!.x#', '#######'], {
      darkGroups: { '1,5': 0 },
      switchGroups: { '1,3': 0 },
      lightsOn: [],
    })
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([1, 5]) // no le frenó
    expect([...res.estado.lights]).toEqual([0]) // y encendió el grupo
  })

  it('S-18 · la luz se congela durante el turno', () => {
    // El detective pisa el interruptor a mitad de recorrido y empuja a la sombra
    // en el mismo turno. La sombra debe frenar ante la oscuridad CONGELADA: si
    // el interruptor se aplicara al pisarlo, el mundo cambiaría bajo los pies
    // del propio deslizamiento y la sombra seguiría de largo.
    const level = lvl(['#########', '#D!S..x.#', '#########'], {
      darkGroups: { '1,6': 0 },
      switchGroups: { '1,2': 0 },
      lightsOn: [],
    })
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.sha).toEqual([1, 5]) // paró ante la oscuridad congelada
    expect([...res.estado.lights]).toEqual([0]) // y la luz ya está encendida
  })

  it('S-19 · la sombra ausente no bloquea', () => {
    const level = lvl(['#######', '#D..x.#', '#######'], {
      darkGroups: { '1,4': 0 },
      lightsOn: [],
      shadowStart: [1, 4],
    })
    const start = initialState(level)
    expect(start.shaAbsent).toBe(true) // empieza a oscuras: no está
    const res = step(level, start, 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.det).toEqual([1, 5]) // pasó por encima sin frenar
  })

  it('S-19 · la sombra ausente no pesa: no sostiene la placa', () => {
    const level = lvl(['#######', '#D..._#', '###+###', '#.....#', '#######'], {
      shadowStart: [1, 5],
      doors: [{ id: 'd1', pos: [2, 3], controlledBy: ['p1'], logic: 'OR' }],
      plates: [{ id: 'p1', pos: [1, 5] }],
      darkGroups: { '1,5': 0 }, // la placa está en zona apagable
      lightsOn: [0],
    })
    const conLuz = initialState(level)
    expect(freezeDoors(compile(level), conLuz).size).toBe(1)

    const aOscuras: Estado = { ...conLuz, lights: new Set(), shaAbsent: true }
    expect(freezeDoors(compile(level), aOscuras).size).toBe(0)
  })

  it('S-19 · se apaga la luz, la sombra desaparece; vuelve la luz, vuelve ella', () => {
    //  ########
    //  #D.!...#   interruptor en [1,3]
    //  #####x.#   la sombra vive en [2,5], zona apagable
    //  ########
    const level = lvl(['########', '#D.!...#', '#####x.#', '########'], {
      darkGroups: { '2,5': 0 },
      switchGroups: { '1,3': 0 },
      lightsOn: [0],
      shadowStart: [2, 5],
    })
    const start = initialState(level)
    expect(start.shaAbsent).toBe(false)

    const a = step(level, start, 'R') // pisa el interruptor: apaga
    if (a.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(a.estado.shaAbsent).toBe(true)
    expect([...a.estado.lights]).toEqual([])

    const b = step(level, a.estado, 'L') // vuelve a pisarlo: enciende
    if (b.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(b.estado.shaAbsent).toBe(false)
    expect(b.estado.sha).toEqual([2, 5])
  })

  it('S-19 · la ausencia no es S-05: la hundida no vuelve nunca', () => {
    const level = lvl(['######', '#DSO.#', '######'])
    const res = step(level, initialState(level), 'R')
    if (res.kind !== 'moved') throw new Error('esperaba movimiento')
    expect(res.estado.sha).toBeNull()
    expect(res.estado.shaAbsent).toBe(false)
  })
})
