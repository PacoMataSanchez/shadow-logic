# Plataforma — carcasa de juegos por niveles

Implementación de los pasos **M1 y M2** de la Aplicación Maestra v0.3: el
contrato, el kit determinista y las herramientas de autoría, extraídos de Shadow
Logic sin tocar ni una regla.

```bash
npm install
npm run typecheck    # tsc estricto sobre todos los paquetes
npm test             # 150 pruebas
npm run batch        # revalida el catálogo con el motor actual
npm run check        # las tres cosas seguidas

npm run solve -- games/shadow-logic/src/levels/case01/008.json --steps
npm run generate -- --seed 20260820 --tries 40000
```

## Criterio de aceptación del refactor

Se cumplieron los tres, y son la única prueba que importa:

| Criterio | Resultado |
|---|---|
| Ninguna regla cambia | `rulesHash` **`rulebook-2.7:4956b884a538dd79`**, idéntico al de antes |
| El catálogo sigue válido | **8/8** niveles correctos en `batch` |
| El generador produce lo mismo | Misma semilla → los 8 JSON **bit a bit idénticos** |

Y las pruebas pasaron de 86 a **150**, sin escribir 64 pruebas nuevas a mano: 65
las aporta el `testkit` del contrato, que cualquier juego futuro hereda con una
línea.

## Los paquetes

```
packages/
  core/          @game/core        el contrato + capacidades + progresión + tema
  puzzle-kit/    @puzzle/kit       deshacer · previsualización · escalera de pistas · testkit
  authoring/     @puzzle/authoring solver · validaciones genéricas · generador · batch
games/
  shadow-logic/  @game/shadow-logic motor intacto + adaptador + contenido + autoría propia
```

**Regla de dependencias.** `core` no depende de nada. `authoring` depende de
`kit`. Un juego **no puede importar de la carcasa**: si lo necesitara, el
contrato tendría un agujero.

## Qué demuestra el reparto

El solver es la herramienta más acoplada a las reglas de todo el proyecto — el
Prompt Maestro §37 exige que comparta reglas con el motor. Ahora está escrito
**sin conocer el juego**: solo llama a `initialState`, `inputs`, `step`,
`hashState` e `isVictory`. Lo mismo con tres de las seis validaciones, con el
bucle de generación y con el deshacer.

Lo que quedó del lado del juego es exactamente lo que habla de sombras, pistas y
casillas. Esa línea no se dibujó a mano: cayó sola.

### Reparto real, medido

| Pieza | Genérica | Del juego |
|---|---|---|
| Solver BFS | todo | — |
| Validaciones | 1 resolubilidad · 3 estados atrapa · 5 justicia ciega · ratio de pasillo | 2 relevancia · 4 integridad · 6 salida alcanzable |
| Generador | bucle, criterios comunes, diagnóstico | `propose()` y los moldes |
| Sesión | deshacer, contador, reinicio | — |
| Pistas | la escalera de 5 peldaños | `hintText` y la solución |
| Motor | — | todo |

## Lo que se ganó por el camino

**`solveFrom()`** — ruta óptima desde un estado arbitrario. Era el hueco que la
guía señalaba como pendiente: sin él, el quinto peldaño de S-15 no puede
recalcular cuando el jugador se ha desviado de la solución. Salió gratis al
generalizar el solver, porque un «estado inicial alternativo» es también lo que
necesita la validación de relevancia.

**Capacidades declarables** — un juego dice si es `deterministic`, `solvable` y
`timed`, y la carcasa enciende funciones en consecuencia. Es lo que permitirá que
un arcade sin solver use las mismas pantallas.

**El separador del `rulesHash`** — al mover la función de hash apareció que el
separador entre ficheros era un byte NUL invisible, no un espacio. Estaba bien
elegido (un NUL no puede aparecer en un fuente, así que no hay colisiones entre
repartos distintos del mismo texto) pero era invisible en el código. Ahora está
escrito como un escape explícito y documentado como parte de la huella.

## M3 · la carcasa y el prototipo jugable

`@game/shell` existe y está probada **sin ningún juego dentro**: sus pruebas usan
un contador de tres botones como inquilino. Si funcionan con eso, es que la
carcasa de verdad no sabe qué lleva encima.

| Pieza | Qué resuelve |
|---|---|
| `commerce/interstitial` | El anuncio cada 5 niveles **y sus cuatro excepciones vinculantes** (§13-BIS), cada una con su prueba |
| `storage/progress` | Progreso con versión y migración; las marcas nunca empeoran al repetir |
| `telemetry/queue` | Append-only, con consentimiento por delante y solo eventos declarados en el manifiesto |
| `session/controller` | Une sesión, progresión, pistas y telemetría. El reloj entra inyectado (S-20) |
| `theme/noir` | **Un** tema, no **el** tema. Cambiarlo cambia la app entera |

Y hay un prototipo jugable que corre **el motor real**, no una segunda
implementación de las reglas para web:

```bash
npm run build:proto   # → apps/prototype/dist/shadow-logic.html (38 KB, autocontenido)
```

Los 8 niveles, con gesto y teclado, deslizamiento animado, previsualización en
sus tres modos, deshacer, la escalera de pistas en la voz de la sombra,
estrellas, PERFECTO y desbloqueo por nivel anterior.

**El empujón se anima después de que el detective se detenga**, nunca a la vez:
son dos hechos consecutivos y leerlos como simultáneos rompe la comprensión de
S-03. Está en el renderizador con nombre y comentario propios.

### Una valla que ahora es de compilador

`tsconfig.json` **no incluye `lib: dom`**. Solo `tsconfig.dom.json` lo hace, y
solo alcanza a `games/*/render` y `apps/`. El motor, el contrato, el kit y las
herramientas no pueden tocar el navegador ni por accidente: la regla de
dependencias dejó de ser una promesa y es un error de compilación.

---

## Llevarlo a GitHub

El repositorio ya viene con historia de git, CI y despliegue. Solo falta un
remoto:

```bash
# 1 · crea el repositorio vacío en github.com (sin README, sin .gitignore)
# 2 · desde esta carpeta:
git remote add origin git@github.com:TU-USUARIO/shadow-logic.git
git push -u origin main
```

Después, **una sola vez**: `Settings → Pages → Source: GitHub Actions`.

A partir de ahí, cada push a `main`:

| Workflow | Qué hace |
|---|---|
| `.github/workflows/check.yml` | `typecheck` + `test` + `batch` |
| `.github/workflows/pages.yml` | Construye el prototipo y lo publica en `https://TU-USUARIO.github.io/shadow-logic/` |

`batch` en CI no es un extra: revalida los 8 niveles contra el motor actual y
comprueba el `rulesHash`. Si alguien toca una regla y no regenera el catálogo,
se pone rojo antes de llegar a `main`. Es la red que hace seguro trabajar en el
motor.

### Continuar el juego

```bash
npm ci
npm run check          # typecheck + pruebas + revalidación
npm run build:proto    # el HTML jugable, autocontenido
npm run solve -- games/shadow-logic/src/levels/case01/008.json --steps
npm run generate       # regenera el Caso 01 (determinista)
```

**Dónde tocar según lo que quieras hacer:**

| Quiero… | Voy a |
|---|---|
| Cambiar una regla | `games/shadow-logic/src/engine/` — y luego `npm run generate` |
| Añadir un nivel | `games/shadow-logic/tools/molds/` + la receta en `build-case01.ts` |
| Empezar el Caso 02 (la luz) | `tools/molds/case02.ts` con `x` e `!`; exige `require.vanish` |
| Cambiar colores o marca | `packages/shell/src/theme/` y el manifiesto de la app |
| Cambiar estrellas, pistas o anuncios | `apps/prototype/src/manifest.ts` — sin tocar código |
| Retocar el prototipo | `apps/prototype/` y `games/shadow-logic/render/` |
| Enchufar un juego nuevo | Implementa `DeterministicGame` y hereda `describeContract` |

**Antes de tocar el motor**, lee las ocho invariantes del final de la guía de
implementación. La primera lo resume: `engine/` no sabe que existe React.

### Nota sobre la licencia

No se incluye fichero de licencia a propósito: sin él, el código queda con todos
los derechos reservados, que es lo que corresponde a una IP propia (§1 del
Prompt Maestro). Si algún día quieres abrir parte de la plataforma —la carcasa
tiene sentido abierta, el juego no— habría que separar los paquetes.

## Siguiente paso

**M4–M6** sobre React Native: las pantallas de la carcasa con los mismos
controladores que ya usa el prototipo. La lógica no cambia — cambia la piel.

Y **M7**, el inquilino canario. Sin un segundo juego, esto sigue siendo Shadow
Logic con las carpetas bien puestas.
