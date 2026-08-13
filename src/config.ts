export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Layout vertical de la escena (todas las capas se apilan sobre estas líneas)
export const CLOUDS_Y = 26;
export const SKYLINE_Y = 112; // alto 280 → base en 392
export const HOUSES_Y = 186; //  alto 210 → base en 396
export const SIDEWALK_TOP = 396; // alto 34 → guarnición en 430
export const ROAD_TOP = 430; //   alto 110 → hasta 540
export const WAIT_FEET_Y = 424; // pies de la gente esperando en la banqueta
export const BOARD_FEET_Y = 464; // pies al bajar de la banqueta para abordar
export const BUS_Y = 415; //      con esto las llantas tocan el asfalto

// Geometría de la textura del autobús (comparte BootScene y Bus)
export const BUS = {
  W: 340,
  H: 110,
  WINDOWS: [18, 64, 110, 156, 202],
  WIN_W: 38,
  WIN_Y: 26,
  WIN_H: 34,
  DOOR_X: 248,
  DOOR_W: 40,
  DRIVER_X: 296,
};

// Personajes de Kenney "Toon Characters" (CC0). El robot sale poco (es raro).
export const HUMAN_CHARACTERS = [
  'malePerson',
  'femalePerson',
  'maleAdventurer',
  'femaleAdventurer',
];
export const CHARACTERS = [...HUMAN_CHARACTERS, 'robot'];

// Recorte de busto para verse por la ventana: los 76px superiores del frame
export const CHAR_FRAME = { W: 96, H: 128, BUST_H: 76 };

// ---- Rutas y zonas ----

export type ZoneKey = 'centro' | 'residencial' | 'parque' | 'playa';

export interface ZoneDef {
  key: ZoneKey;
  until: number; // fracción del ancho del mundo donde termina la zona
}

export interface RouteDef {
  id: string;
  name: string;
  emoji: string;
  worldWidth: number;
  stops: number[];
  dayStart: number; // fase inicial del ciclo día/noche (0.25 = mediodía)
  cycleMs: number;
  weather: 'despejado' | 'lluvia';
  zones: ZoneDef[];
}

/** Texturas de la capa media según la zona (día y noche). */
export const ZONE_TEXTURES: Record<ZoneKey, { day: string; night: string }> = {
  centro: { day: 'zona-centro', night: 'zona-centro-night' },
  residencial: { day: 'houses', night: 'houses-night' },
  parque: { day: 'zona-parque', night: 'zona-parque' },
  playa: { day: 'zona-playa', night: 'zona-playa' },
};

export const ROUTES: RouteDef[] = [
  {
    id: 'vecindario',
    name: 'Ruta del Vecindario',
    emoji: '🏘️',
    worldWidth: 8000,
    stops: [1500, 2700, 3900, 5200, 6500],
    dayStart: 0.15,
    cycleMs: 100_000,
    weather: 'despejado',
    zones: [
      { key: 'residencial', until: 0.65 },
      { key: 'parque', until: 1 },
    ],
  },
  {
    id: 'nocturna',
    name: 'Ruta Nocturna',
    emoji: '🌙',
    worldWidth: 12_000,
    stops: [1500, 2700, 3900, 5200, 6500, 7800, 9100, 10_500],
    dayStart: 0.55,
    cycleMs: 140_000,
    weather: 'despejado',
    zones: [
      { key: 'centro', until: 0.45 },
      { key: 'residencial', until: 0.8 },
      { key: 'parque', until: 1 },
    ],
  },
  {
    id: 'playa',
    name: 'Ruta a la Playa',
    emoji: '🏖️',
    worldWidth: 14_000,
    stops: [1500, 2900, 4300, 5700, 7100, 8500, 9900, 11_300, 12_700],
    dayStart: 0.2,
    cycleMs: 160_000,
    weather: 'lluvia',
    zones: [
      { key: 'centro', until: 0.25 },
      { key: 'residencial', until: 0.55 },
      { key: 'parque', until: 0.8 },
      { key: 'playa', until: 1 },
    ],
  },
];
