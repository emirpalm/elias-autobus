# El Autobús de Elías 🚌

Juego web 2D de un autobús que recorre la ciudad recogiendo pasajeros.
Phaser 3 + TypeScript + Vite, corriendo en Docker.

**🎮 Juégalo en línea: https://emirpalm.github.io/elias-autobus/**
(se publica solo con cada push a `main` vía GitHub Actions)

Tres rutas: 🏘️ Vecindario (corta), 🌙 Nocturna (centro + noche) y
🏖️ A la Playa (larga, con lluvia). Cada una guarda tu récord (⭐ y puntos).

## Cómo jugar

- **← →** conducir (avanzar / frenar / reversa)
- **ESPACIO** claxon (mantener presionado) · **M** silenciar/activar sonido
- Sonidos: motor que sigue la velocidad, bip de reversa, chirrido de frenos
  al parar en seco, *pop* al subir/bajar gente y fanfarria al ganar — todo
  sintetizado con Web Audio, sin archivos de audio.
- Frena junto a una **parada** para que la gente suba (suena el *plim plim*,
  silbido de puerta neumática, y los pasajeros aparecen por las ventanas).
- Cada pasajero tiene un **destino**: al llegar a su parada baja del bus y se
  va caminando. Gana llevando a **todos** a su destino (⭐ en el HUD).
- Hay **ciclo día/noche** (~100 s): atardecer naranja, estrellas, luna,
  ventanas de la ciudad encendidas y faro del bus. Para probarlo rápido:
  `http://localhost:5180/?ciclo=16` (segundos por día completo).

## Desarrollo

```bash
docker compose up -d          # instala deps (primer arranque) y levanta Vite
# → http://localhost:5180
docker compose logs -f app    # ver el server
docker compose exec app npx tsc --noEmit   # typecheck
docker compose exec app npm run build      # build de producción → dist/
```

Notas de entorno (WSL2 + /mnt/c):

- `node_modules` vive en un named volume Linux (overlay) — no aparece en el
  filesystem de Windows; npm corre **dentro** del contenedor.
- Vite usa **polling** porque inotify no cruza el bind 9P.
- Puerto **5180** (el 5173 lo pelean otros proyectos).

## Arquitectura

- `src/scenes/BootScene.ts` — carga los sprites CC0 de
  [Kenney](https://kenney.nl) (`public/assets/kenney/`): personajes "Toon
  Characters" (caminata de 8 frames, bustos recortados en las ventanas) y
  "Background Elements" (casas, árboles, nubes, sol, luna). El resto (bus,
  calle, ciudad de fondo) sigue siendo procedural, con variantes nocturnas
  compuestas en RenderTextures (ventanas encendidas).
- `src/scenes/GameScene.ts` — parallax (nubes/ciudad/casas/banqueta/calle),
  paradas, secuencia de abordaje, HUD.
- `src/objects/Bus.ts` — física del bus, suspensión, puerta, asientos con
  pasajeros visibles por las ventanas.
- `src/objects/Passenger.ts` — peatones (adultos y niños) que esperan,
  caminan y suben.
- `src/audio/chime.ts` — *plim plim* y motor sintetizados con Web Audio.

## Deploy

`npm run build` genera un sitio 100% estático en `dist/` (base `./`):
sirve tal cual en GitHub Pages, Netlify o itch.io.
