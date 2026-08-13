import Phaser from 'phaser';
import {
  BUS_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HOUSES_Y,
  ROAD_TOP,
  ROUTES,
  SIDEWALK_TOP,
  SKYLINE_Y,
  type RouteDef,
} from '../config';
import { startMusic, unlockAudio } from '../audio/chime';
import { Bus } from '../objects/Bus';

const FONT = '"Segoe UI", system-ui, sans-serif';

interface BestRecord {
  stars: number;
  score: number;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.add.image(0, 0, 'sky').setOrigin(0);
    this.add.image(760, 92, 'sun');
    this.add.tileSprite(0, SKYLINE_Y, GAME_WIDTH, 280, 'skyline').setOrigin(0);
    this.add.tileSprite(0, HOUSES_Y, GAME_WIDTH, 210, 'houses').setOrigin(0);
    this.add.tileSprite(0, SIDEWALK_TOP, GAME_WIDTH, 34, 'sidewalk').setOrigin(0);
    this.add.tileSprite(0, ROAD_TOP, GAME_WIDTH, 110, 'road').setOrigin(0);
    new Bus(this, 300, BUS_Y, 2000);

    this.add
      .text(GAME_WIDTH / 2, 92, 'El Autobús de Elías 🚌', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#16222e', 10);
    this.add
      .text(GAME_WIDTH / 2, 148, 'Elige tu ruta', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#16222e', 5);

    ROUTES.forEach((route, i) => {
      this.makeRouteButton(route, 190 + i * 290, 300);
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, 'ENTER = Ruta del Vecindario · también puedes tocar la pantalla', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#16222e', 4)
      .setAlpha(0.9);

    this.input.keyboard!.once('keydown-ENTER', () =>
      this.startRoute(ROUTES[0]),
    );
  }

  private best(id: string): BestRecord | null {
    try {
      const raw = localStorage.getItem(`elias-autobus:best:${id}`);
      return raw ? (JSON.parse(raw) as BestRecord) : null;
    } catch {
      return null;
    }
  }

  private makeRouteButton(route: RouteDef, x: number, y: number): void {
    const container = this.add.container(x, y);
    const bg = this.add
      .image(0, 0, 'btn-route')
      .setInteractive({ useHandCursor: true });
    const emoji = this.add
      .text(0, -32, route.emoji, { fontSize: '34px' })
      .setOrigin(0.5);
    const name = this.add
      .text(0, 6, route.name, {
        fontFamily: FONT,
        fontSize: '19px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const record = this.best(route.id);
    const stars = this.add
      .text(
        0,
        36,
        record ? `${'⭐'.repeat(record.stars)}  ${record.score} pts` : 'sin récord',
        { fontFamily: FONT, fontSize: '15px', color: '#ffe9a0' },
      )
      .setOrigin(0.5);
    container.add([bg, emoji, name, stars]);

    bg.on('pointerover', () => container.setScale(1.06));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerdown', () => this.startRoute(route));
  }

  private startRoute(route: RouteDef): void {
    unlockAudio();
    void startMusic();
    this.scene.start('Game', { routeId: route.id });
  }
}
