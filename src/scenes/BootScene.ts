import Phaser from 'phaser';
import { BUS, CHARACTERS, GAME_HEIGHT, GAME_WIDTH } from '../config';

const BODY = 0xffc72c;
const BODY_DARK = 0xe3a90f;
const CREAM = 0xfff6e0;
const DARK_GLASS = 0x2b4257;
const METAL = 0x5c6169;
const GLASS = 0xbfe8ff;

/**
 * Carga los sprites CC0 de Kenney (personajes, casas, árboles, nubes, sol y
 * luna) y genera el resto de texturas proceduralmente (bus, calle, ciudad).
 * Las capas de casas y nubes se componen en RenderTextures para poder
 * repetirlas como tiles y para pintar ventanas encendidas en la variante
 * nocturna.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.setPath('assets/kenney');
    for (const c of CHARACTERS) {
      this.load.image(`${c}_idle`, `chars/character_${c}_idle.png`);
      for (let i = 0; i < 8; i++) {
        this.load.image(`${c}_walk${i}`, `chars/character_${c}_walk${i}.png`);
      }
    }
    this.load.image('sun', 'bg/sun.png');
    this.load.image('moon', 'bg/moon.png');
    this.load.image('k-cloud4', 'bg/cloud4.png');
    this.load.image('k-cloud6', 'bg/cloud6.png');
    this.load.image('k-tree-small', 'bg/tree08.png');
    this.load.image('k-tree-pine', 'bg/tree21.png');
    this.load.image('k-house-beige', 'bg/house_beige_front.png');
    this.load.image('k-house-grey', 'bg/house_grey_front.png');
    this.load.image('k-grass', 'bg/grass1.png');
    this.load.setPath();
  }

  create(): void {
    this.makeSky();
    this.makeStars();
    this.composeClouds();
    this.makeSkyline('skyline', 0xa7bdd1, 0x8ba3b8);
    this.makeSkyline('skyline-night', 0x51647a, 0xffd98a);
    this.composeHouses('houses', false);
    this.composeHouses('houses-night', true);
    this.makeZonaCentro('zona-centro', false);
    this.makeZonaCentro('zona-centro-night', true);
    this.makeZonaParque();
    this.makeZonaPlaya();
    this.makeSidewalk();
    this.makeRoad();
    this.makeBus();
    this.makeWheel();
    this.makeBeam();
    this.makeStopSign();
    this.makeWeather();
    this.makeStreetLife();
    this.makeButtons();
    this.createAnims();
    this.scene.start('Title');
  }

  private createAnims(): void {
    for (const c of CHARACTERS) {
      this.anims.create({
        key: `${c}-walk`,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `${c}_walk${i}` })),
        frameRate: 14,
        repeat: -1,
      });
    }
    this.anims.create({
      key: 'bird-fly',
      frames: [{ key: 'bird0' }, { key: 'bird1' }],
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: 'dog-run',
      frames: [{ key: 'dog0' }, { key: 'dog1' }],
      frameRate: 10,
      repeat: -1,
    });
  }

  /** Zona centro: edificios cercanos con locales; ventanas encendidas de noche. */
  private makeZonaCentro(key: string, night: boolean): void {
    const g = this.g();
    g.fillStyle(0xa0a0a0);
    g.fillRect(0, 196, 480, 14); // pavimento en vez de pasto
    const widths = [90, 110, 80, 100, 100]; // suman 480 → el tile empalma
    const heights = [150, 190, 130, 200, 165];
    const walls = [0x7f8ea0, 0x93a3b5, 0x8496a8, 0x76879a, 0x8da0b2];
    const awnings = [0xd0604e, 0x3f8f7a, 0xc98a2e, 0x5a7fc0, 0xb75e8a];
    let x = 0;
    widths.forEach((w, i) => {
      const h = heights[i];
      g.fillStyle(walls[i]);
      g.fillRect(x + 2, 196 - h, w - 4, h);
      g.fillStyle(night ? 0xffd98a : 0xc3d2df);
      for (let wy = 196 - h + 10; wy < 168; wy += 22) {
        for (let wx = x + 10; wx < x + w - 14; wx += 18) {
          g.fillRect(wx, wy, 9, 12);
        }
      }
      g.fillStyle(awnings[i]);
      g.fillRect(x + 6, 180, w - 12, 9); // toldo del local
      x += w;
    });
    g.fillStyle(0x76879a);
    g.fillRect(288, 196 - 220, 4, 20); // antena
    g.generateTexture(key, 480, 210);
    g.destroy();
  }

  /** Zona parque: puro verde con árboles de Kenney. */
  private makeZonaParque(): void {
    const canvas = this.textures.createCanvas('zona-parque', 560, 210)!;
    const ctx = canvas.context;
    ctx.fillStyle = '#8cc06e';
    ctx.fillRect(0, 196, 560, 14);
    this.stampBottom(ctx, 'k-tree-pine', 30, 196, 0.7);
    this.stampBottom(ctx, 'k-tree-small', 140, 196, 1.1);
    this.stampBottom(ctx, 'k-tree-pine', 230, 196, 0.5);
    this.stampBottom(ctx, 'k-tree-pine', 330, 196, 0.66);
    this.stampBottom(ctx, 'k-tree-small', 450, 196, 0.9);
    this.stampBottom(ctx, 'k-grass', 110, 200, 1);
    this.stampBottom(ctx, 'k-grass', 300, 200, 1);
    this.stampBottom(ctx, 'k-grass', 420, 200, 1);
    this.stampBottom(ctx, 'k-grass', 520, 200, 1);
    canvas.refresh();
  }

  /** Zona playa: mar, arena, sombrilla y pelota. */
  private makeZonaPlaya(): void {
    const g = this.g();
    g.fillStyle(0x4aa3d8);
    g.fillRect(0, 100, 480, 60); // mar
    g.fillStyle(0x7cc4ea);
    for (let row = 0; row < 3; row++) {
      for (let wx = row % 2 === 0 ? 10 : 40; wx < 470; wx += 60) {
        g.fillRect(wx, 112 + row * 16, 26, 4); // olitas
      }
    }
    g.fillStyle(0xe9d5a0);
    g.fillRect(0, 160, 480, 50); // arena
    g.fillStyle(0xf4e4b8);
    g.fillRect(0, 160, 480, 5);
    // sombrilla
    g.fillStyle(0x8a5a3b);
    g.fillRect(158, 112, 5, 62);
    g.fillStyle(0xe05548);
    g.slice(160, 116, 36, Math.PI, 0, false);
    g.fillPath();
    // toalla y pelota
    g.fillStyle(0x58b0e0);
    g.fillRect(210, 172, 44, 16);
    g.fillStyle(0xffffff);
    g.fillRect(210, 178, 44, 4);
    g.fillStyle(0xd05548);
    g.fillCircle(290, 180, 9);
    g.fillStyle(0xffffff);
    g.fillCircle(287, 177, 3);
    g.generateTexture('zona-playa', 480, 210);
    g.destroy();
  }

  private makeWeather(): void {
    let g = this.g();
    g.fillStyle(0xbfe0ff, 0.8);
    g.fillRect(0, 0, 2, 12);
    g.generateTexture('raindrop', 2, 12);
    g.destroy();

    g = this.g();
    g.fillStyle(0x6d93b8, 0.45);
    g.fillEllipse(45, 9, 90, 16);
    g.fillStyle(0xcfe8ff, 0.35);
    g.fillEllipse(38, 7, 34, 5);
    g.generateTexture('puddle', 90, 18);
    g.destroy();
  }

  private makeStreetLife(): void {
    // pájaro (dos frames de aleteo)
    for (const [key, wingUp] of [
      ['bird0', true],
      ['bird1', false],
    ] as const) {
      const g = this.g();
      g.fillStyle(0x4a4f57);
      g.fillEllipse(7, 7, 10, 7);
      g.fillCircle(12, 4, 3);
      g.fillStyle(0xf0a030);
      g.fillTriangle(14, 3, 17, 4, 14, 5);
      g.fillStyle(0x333840);
      if (wingUp) g.fillTriangle(5, 6, 9, 1, 10, 7);
      else g.fillTriangle(5, 7, 9, 11, 10, 6);
      g.generateTexture(key, 18, 12);
      g.destroy();
    }

    // perro (dos frames de carrera)
    for (const [key, legShift] of [
      ['dog0', 0],
      ['dog1', 2],
    ] as const) {
      const g = this.g();
      g.lineStyle(3, 0xc8935a);
      g.lineBetween(4, 8, 0, 3); // cola
      g.fillStyle(0xc8935a);
      g.fillRoundedRect(4, 6, 22, 10, 5);
      g.fillCircle(27, 8, 6);
      g.fillStyle(0xa8743e);
      g.fillTriangle(24, 3, 28, 0, 29, 6); // oreja
      g.fillRect(6 + legShift, 15, 3, 7);
      g.fillRect(12 - legShift / 2, 15, 3, 7);
      g.fillRect(18 + legShift / 2, 15, 3, 7);
      g.fillRect(24 - legShift, 15, 3, 7);
      g.fillStyle(0x2c2e33);
      g.fillCircle(29, 7, 1.5); // ojo
      g.generateTexture(key, 34, 24);
      g.destroy();
    }

    // semáforo (caja apagada) + foco 'lamp' que se prende encima
    let g = this.g();
    g.fillStyle(0x5a5f66);
    g.fillRect(9, 34, 6, 86);
    g.fillStyle(0x2e3238);
    g.fillRoundedRect(2, 2, 20, 52, 6);
    g.fillStyle(0x1a1d21);
    g.fillCircle(12, 14, 6);
    g.fillCircle(12, 28, 6);
    g.fillCircle(12, 42, 6);
    g.generateTexture('semaforo', 24, 120);
    g.destroy();

    g = this.g();
    g.fillStyle(0xffffff);
    g.fillCircle(5, 5, 5);
    g.generateTexture('lamp', 10, 10);
    g.destroy();
  }

  private makeButtons(): void {
    let g = this.g();
    g.fillStyle(0x16222e, 0.55);
    g.fillRoundedRect(0, 0, 90, 90, 20);
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeRoundedRect(0, 0, 90, 90, 20);
    g.generateTexture('btn', 90, 90);
    g.destroy();

    g = this.g();
    g.fillStyle(0x16222e, 0.72);
    g.fillRoundedRect(0, 0, 260, 120, 18);
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeRoundedRect(0, 0, 260, 120, 18);
    g.generateTexture('btn-route', 260, 120);
    g.destroy();
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.add.graphics();
  }

  // Las capas compuestas usan CanvasTexture (estática): un TileSprite NO
  // acepta RenderTextures/DynamicTextures como fuente.

  private src(key: string): HTMLImageElement {
    return this.textures.get(key).getSourceImage() as HTMLImageElement;
  }

  /** Dibuja una imagen cargada en el canvas, escalada y anclada abajo. */
  private stampBottom(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    yBottom: number,
    scale: number,
  ): void {
    const img = this.src(key);
    ctx.drawImage(img, x, yBottom - img.height * scale, img.width * scale, img.height * scale);
  }

  private composeClouds(): void {
    const canvas = this.textures.createCanvas('clouds', 480, 160)!;
    const ctx = canvas.context;
    const c6 = this.src('k-cloud6');
    const c4 = this.src('k-cloud4');
    ctx.drawImage(c6, 20, 15, c6.width * 0.65, c6.height * 0.65);
    ctx.drawImage(c4, 290, 80, c4.width * 0.5, c4.height * 0.5);
    canvas.refresh();
  }

  private composeHouses(key: string, night: boolean): void {
    const W = 560;
    const GROUND = 196;
    const canvas = this.textures.createCanvas(key, W, 210)!;
    const ctx = canvas.context;
    ctx.fillStyle = '#8cc06e';
    ctx.fillRect(0, GROUND, W, 14);

    this.stampBottom(ctx, 'k-house-beige', 30, GROUND, 1.3); //  133×150, techo en y46
    this.stampBottom(ctx, 'k-tree-pine', 180, GROUND, 0.62);
    this.stampBottom(ctx, 'k-house-grey', 255, GROUND, 1.1); //  112×191, techo en y5
    this.stampBottom(ctx, 'k-tree-small', 400, GROUND, 1);
    this.stampBottom(ctx, 'k-grass', 170, GROUND + 4, 1);
    this.stampBottom(ctx, 'k-grass', 470, GROUND + 4, 1);

    if (night) {
      // ventanas encendidas sobre las casas (coordenadas ya escaladas)
      ctx.fillStyle = 'rgba(255, 217, 138, 0.9)';
      ctx.fillRect(56, 114, 31, 47); //   beige, ventana izquierda
      ctx.fillRect(105, 114, 31, 47); //  beige, ventana derecha
      ctx.fillRect(277, 69, 26, 37); //   gris, planta alta izq
      ctx.fillRect(319, 69, 26, 37); //   gris, planta alta der
      ctx.fillRect(277, 131, 26, 37); //  gris, planta baja izq
      ctx.fillRect(319, 131, 26, 37); //  gris, planta baja der
    }
    canvas.refresh();
  }

  private makeSky(): void {
    const g = this.g();
    const top = Phaser.Display.Color.ValueToColor(0x4fa3dd);
    const bottom = Phaser.Display.Color.ValueToColor(0xdff3fb);
    const bands = 24;
    const bandH = GAME_HEIGHT / bands;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        top,
        bottom,
        bands - 1,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      g.fillRect(0, bandH * i, GAME_WIDTH, bandH + 1);
    }
    g.generateTexture('sky', GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }

  private makeStars(): void {
    const g = this.g();
    for (let i = 0; i < 90; i++) {
      const size = Math.random() < 0.2 ? 3 : 2;
      g.fillStyle(0xffffff, 0.4 + Math.random() * 0.6);
      g.fillRect(Math.random() * 957, Math.random() * 297, size, size);
    }
    g.generateTexture('stars', 960, 300);
    g.destroy();
  }

  private makeSkyline(key: string, wall: number, window: number): void {
    const g = this.g();
    const widths = [70, 90, 60, 80, 100, 80]; // suman 480 → el tile empalma
    const heights = [150, 210, 120, 250, 170, 200];
    let x = 0;
    widths.forEach((w, i) => {
      const h = heights[i];
      g.fillStyle(wall);
      g.fillRect(x + 3, 280 - h, w - 6, h);
      g.fillStyle(window);
      for (let wy = 280 - h + 12; wy < 264; wy += 24) {
        for (let wx = x + 12; wx < x + w - 16; wx += 20) {
          g.fillRect(wx, wy, 9, 13);
        }
      }
      x += w;
    });
    g.fillStyle(wall);
    g.fillRect(258, 6, 4, 24); // antena del edificio alto
    g.generateTexture(key, 480, 280);
    g.destroy();
  }

  private makeSidewalk(): void {
    const g = this.g();
    g.fillStyle(0xc7c3bd);
    g.fillRect(0, 0, 240, 34);
    g.fillStyle(0xd8d4ce);
    g.fillRect(0, 0, 240, 5);
    g.fillStyle(0xa9a5a0);
    g.fillRect(58, 0, 3, 34);
    g.fillRect(178, 0, 3, 34);
    g.fillStyle(0x98948e);
    g.fillRect(0, 28, 240, 6);
    g.generateTexture('sidewalk', 240, 34);
    g.destroy();
  }

  private makeRoad(): void {
    const g = this.g();
    g.fillStyle(0x45464e);
    g.fillRect(0, 0, 240, 110);
    g.fillStyle(0x33343a);
    g.fillRect(0, 0, 240, 4);
    g.fillStyle(0xdedede);
    g.fillRect(0, 52, 42, 7); // rayas con periodo 80 → el tile empalma
    g.fillRect(80, 52, 42, 7);
    g.fillRect(160, 52, 42, 7);
    g.generateTexture('road', 240, 110);
    g.destroy();
  }

  private makeBus(): void {
    // carrocería (con huecos oscuros donde van ventanas, puerta y conductor)
    let g = this.g();
    g.fillStyle(BODY);
    g.fillRoundedRect(0, 8, BUS.W, 92, { tl: 16, tr: 22, bl: 6, br: 10 });
    g.fillStyle(CREAM);
    g.fillRoundedRect(0, 8, BUS.W, 22, { tl: 16, tr: 22, bl: 0, br: 0 });
    g.fillStyle(BODY_DARK);
    g.fillRect(0, 82, BUS.W, 12);
    g.fillStyle(METAL);
    g.fillRoundedRect(BUS.W - 10, 66, 10, 26, 4);
    g.fillRoundedRect(0, 66, 10, 26, 4);
    g.fillStyle(0xfff1b8);
    g.fillCircle(BUS.W - 7, 62, 5);
    g.fillStyle(0xd9534f);
    g.fillCircle(6, 62, 4);
    g.fillStyle(0x333a44);
    g.fillRoundedRect(120, 12, 100, 14, 4);
    g.fillStyle(DARK_GLASS);
    for (const wx of BUS.WINDOWS) {
      g.fillRoundedRect(wx, BUS.WIN_Y, BUS.WIN_W, BUS.WIN_H, 6);
    }
    g.fillRoundedRect(BUS.DOOR_X, BUS.WIN_Y, BUS.DOOR_W, 72, {
      tl: 6,
      tr: 6,
      bl: 2,
      br: 2,
    });
    g.fillRoundedRect(BUS.DRIVER_X, BUS.WIN_Y, BUS.WIN_W, BUS.WIN_H, {
      tl: 6,
      tr: 10,
      bl: 6,
      br: 6,
    });
    g.generateTexture('bus-body', BUS.W, BUS.H);
    g.destroy();

    // cristales: capa translúcida que va ENCIMA de los pasajeros sentados
    g = this.g();
    const panes = [...BUS.WINDOWS, BUS.DRIVER_X];
    for (const wx of panes) {
      g.fillStyle(GLASS, 0.3);
      g.fillRoundedRect(wx, BUS.WIN_Y, BUS.WIN_W, BUS.WIN_H, 6);
      g.lineStyle(3, BODY_DARK, 1);
      g.strokeRoundedRect(wx, BUS.WIN_Y, BUS.WIN_W, BUS.WIN_H, 6);
      g.lineStyle(4, 0xffffff, 0.22);
      g.lineBetween(wx + 8, BUS.WIN_Y + 28, wx + 26, BUS.WIN_Y + 4);
    }
    g.generateTexture('bus-glass', BUS.W, BUS.H);
    g.destroy();

    // puerta (sprite aparte para animar apertura)
    g = this.g();
    g.fillStyle(GLASS, 0.5);
    g.fillRoundedRect(0, 0, BUS.DOOR_W, 72, { tl: 6, tr: 6, bl: 2, br: 2 });
    g.fillStyle(BODY, 1);
    g.fillRect(3, 42, BUS.DOOR_W - 6, 28);
    g.lineStyle(3, BODY_DARK, 1);
    g.strokeRoundedRect(0, 0, BUS.DOOR_W, 72, { tl: 6, tr: 6, bl: 2, br: 2 });
    g.lineBetween(BUS.DOOR_W / 2, 2, BUS.DOOR_W / 2, 70);
    g.generateTexture('bus-door', BUS.DOOR_W, 74);
    g.destroy();
  }

  private makeWheel(): void {
    const g = this.g();
    g.fillStyle(0x23252a);
    g.fillCircle(22, 22, 21);
    g.fillStyle(0x3a3d44);
    g.fillCircle(22, 22, 14);
    g.lineStyle(3, 0x83878e);
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      g.lineBetween(
        22 + 6 * Math.cos(a),
        22 + 6 * Math.sin(a),
        22 + 13 * Math.cos(a),
        22 + 13 * Math.sin(a),
      );
    }
    g.fillStyle(0xb7bcc4);
    g.fillCircle(22, 22, 8);
    g.fillStyle(0x2c2e33);
    g.fillCircle(22, 13, 2.5); // birlo excéntrico: hace visible el giro
    g.generateTexture('wheel', 44, 44);
    g.destroy();
  }

  private makeBeam(): void {
    const g = this.g();
    g.fillStyle(0xfff7cc, 0.1);
    g.fillTriangle(0, 35, 150, 0, 150, 70);
    g.fillStyle(0xfff7cc, 0.1);
    g.fillTriangle(0, 35, 150, 12, 150, 58);
    g.fillStyle(0xfff7cc, 0.12);
    g.fillTriangle(0, 35, 150, 22, 150, 48);
    g.generateTexture('headlight-beam', 150, 70);
    g.destroy();
  }

  private makeStopSign(): void {
    const g = this.g();
    g.fillStyle(0x6a7076);
    g.fillRect(25, 20, 6, 124);
    g.fillStyle(0x1f6fce);
    g.fillRoundedRect(4, 4, 48, 34, 8);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(12, 14, 32, 16, 4);
    g.fillStyle(0x1f6fce);
    g.fillRect(16, 18, 8, 6);
    g.fillRect(28, 18, 8, 6);
    g.fillCircle(20, 30, 3);
    g.fillCircle(36, 30, 3);
    g.generateTexture('stop-sign', 56, 144);
    g.destroy();
  }
}
