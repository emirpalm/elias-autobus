import Phaser from 'phaser';
import {
  BOARD_FEET_Y,
  BUS_Y,
  CLOUDS_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HOUSES_Y,
  ROAD_TOP,
  ROUTES,
  SIDEWALK_TOP,
  SKYLINE_Y,
  WAIT_FEET_Y,
  ZONE_TEXTURES,
  type RouteDef,
} from '../config';
import {
  isAudioReady,
  playBrakeSqueak,
  playDing,
  playFanfare,
  playReverseBeep,
  playSeatPop,
  setEngine,
  startHorn,
  startRain,
  stopHorn,
  stopRain,
  toggleMute,
  unlockAudio,
} from '../audio/chime';
import { Bus, type DriveInput } from '../objects/Bus';
import { BusStop } from '../objects/BusStop';
import { Passenger, type PassengerKind } from '../objects/Passenger';
import { StreetLife } from '../objects/StreetLife';
import { delay } from '../utils/tween';

const DOOR_RANGE = 75; // qué tan cerca de la señal debe frenar el bus
const DING_RANGE = 650; // distancia a la que avisa que alguien baja
const ZONE_BLEND = 400; // píxeles de mezcla entre zonas
const FONT = '"Segoe UI", system-ui, sans-serif';

type State = 'driving' | 'boarding' | 'ended';

export class GameScene extends Phaser.Scene {
  private route!: RouteDef;
  private bus!: Bus;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private stops: BusStop[] = [];
  private streetLife!: StreetLife;
  private clouds!: Phaser.GameObjects.TileSprite;
  private skyline!: Phaser.GameObjects.TileSprite;
  private skylineNight!: Phaser.GameObjects.TileSprite;
  private zoneDayA!: Phaser.GameObjects.TileSprite;
  private zoneDayB!: Phaser.GameObjects.TileSprite;
  private zoneNightA!: Phaser.GameObjects.TileSprite;
  private zoneNightB!: Phaser.GameObjects.TileSprite;
  private sidewalk!: Phaser.GameObjects.TileSprite;
  private road!: Phaser.GameObjects.TileSprite;
  private sun!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private stars!: Phaser.GameObjects.Image;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private duskOverlay!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private muteIcon!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Text;
  private state: State = 'driving';
  private delivered = 0;
  private totalSpawned = 0;
  private score = 0;
  private harshBrakes = 0;
  private dayCycleMs = 100_000;
  private lastBeepAt = 0;
  private recentSpeed = 0;
  private dingedStop = -1;
  private bubbleUntil = 0;
  private ended = false;
  private rainAudioOn = false;
  private touchLeft = false;
  private touchRight = false;
  private padHornHeld = false;

  constructor() {
    super('Game');
  }

  init(data: { routeId?: string }): void {
    // Phaser reutiliza la instancia de la escena: resetear TODO el estado aquí
    this.route = ROUTES.find((r) => r.id === data.routeId) ?? ROUTES[0];
    this.stops = [];
    this.state = 'driving';
    this.delivered = 0;
    this.totalSpawned = 0;
    this.score = 0;
    this.harshBrakes = 0;
    this.lastBeepAt = 0;
    this.recentSpeed = 0;
    this.dingedStop = -1;
    this.bubbleUntil = 0;
    this.ended = false;
    this.rainAudioOn = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.padHornHeld = false;
  }

  create(): void {
    // `?ciclo=N` (segundos) acelera el ciclo día/noche para probarlo
    const cycleOverride = Number(
      new URLSearchParams(window.location.search).get('ciclo'),
    );
    this.dayCycleMs =
      cycleOverride > 0 ? cycleOverride * 1000 : this.route.cycleMs;

    this.createBackground();
    this.createStops();
    this.streetLife = new StreetLife(
      this,
      this.route.worldWidth,
      this.route.stops,
    );
    this.bus = new Bus(this, 300, BUS_Y, this.route.worldWidth);
    this.createOverlays();
    if (this.route.weather === 'lluvia') this.createRain();

    this.cameras.main.setBounds(0, 0, this.route.worldWidth, GAME_HEIGHT);
    this.cameras.main.startFollow(this.bus, false, 0.12, 0);

    this.createInput();
    this.createHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setEngine(0);
      stopHorn();
      stopRain();
    });
  }

  // ---------- creación ----------

  private createBackground(): void {
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0);
    this.stars = this.add
      .image(0, 0, 'stars')
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0);
    this.sun = this.add.image(-100, 300, 'sun').setScrollFactor(0);
    this.moon = this.add
      .image(-100, 300, 'moon')
      .setScrollFactor(0)
      .setAlpha(0);
    this.clouds = this.add
      .tileSprite(0, CLOUDS_Y, GAME_WIDTH, 160, 'clouds')
      .setOrigin(0)
      .setScrollFactor(0);
    this.skyline = this.add
      .tileSprite(0, SKYLINE_Y, GAME_WIDTH, 280, 'skyline')
      .setOrigin(0)
      .setScrollFactor(0);
    this.skylineNight = this.add
      .tileSprite(0, SKYLINE_Y, GAME_WIDTH, 280, 'skyline-night')
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0);

    const zone0 = ZONE_TEXTURES[this.route.zones[0].key];
    const zoneTS = (key: string) =>
      this.add
        .tileSprite(0, HOUSES_Y, GAME_WIDTH, 210, key)
        .setOrigin(0)
        .setScrollFactor(0);
    this.zoneDayA = zoneTS(zone0.day);
    this.zoneDayB = zoneTS(zone0.day).setAlpha(0);
    this.zoneNightA = zoneTS(zone0.night).setAlpha(0);
    this.zoneNightB = zoneTS(zone0.night).setAlpha(0);

    this.sidewalk = this.add
      .tileSprite(0, SIDEWALK_TOP, GAME_WIDTH, 34, 'sidewalk')
      .setOrigin(0)
      .setScrollFactor(0);
    this.road = this.add
      .tileSprite(0, ROAD_TOP, GAME_WIDTH, 110, 'road')
      .setOrigin(0)
      .setScrollFactor(0);
  }

  private createStops(): void {
    this.route.stops.forEach((x, i) => {
      const stop = new BusStop(this, x, i);
      const count = i === 0 ? 2 : Phaser.Math.Between(1, 3);
      for (let p = 0; p < count; p++) {
        const kind: PassengerKind =
          i === 0
            ? p === 0
              ? 'adult'
              : 'kid'
            : Math.random() < 0.35
              ? 'kid'
              : 'adult';
        const passenger = new Passenger(this, x - 44 - p * 30, WAIT_FEET_Y, kind);
        passenger.setDepth(6);
        stop.waiting.push(passenger);
        this.totalSpawned++;
      }
      stop.refreshBadge();
      this.stops.push(stop);
    });
  }

  private createOverlays(): void {
    this.nightOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1a33)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(0);
    this.duskOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff7733)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(51)
      .setAlpha(0);
  }

  private createRain(): void {
    this.clouds.setTint(0x93a0ab);
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5a6c7a, 0.14)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(52);
    this.add
      .particles(0, -20, 'raindrop', {
        x: { min: -100, max: GAME_WIDTH + 100 },
        speedY: { min: 520, max: 680 },
        speedX: { min: -80, max: -40 },
        lifespan: 1100,
        quantity: 3,
        frequency: 30,
        alpha: { start: 0.6, end: 0.2 },
        rotate: -6,
      })
      .setScrollFactor(0)
      .setDepth(60);
    for (let x = 900; x < this.route.worldWidth - 400; x += 650) {
      const puddle = this.add
        .image(x + ((x * 13) % 300), 505 + ((x * 7) % 25), 'puddle')
        .setDepth(2)
        .setAlpha(0.6);
      this.tweens.add({
        targets: puddle,
        alpha: 0.35,
        duration: 900 + ((x * 3) % 600),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
    kb.once('keydown', unlockAudio);
    this.input.once('pointerdown', unlockAudio);

    const space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on('down', () => {
      unlockAudio();
      startHorn();
    });
    space.on('up', () => stopHorn());
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => {
      this.muteIcon.setText(toggleMute() ? '🔇' : '🔊');
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () =>
      this.scene.start('Title'),
    );

    if (this.sys.game.device.input.touch) this.createTouchButtons();
  }

  private createTouchButtons(): void {
    this.input.addPointer(2);
    const makeButton = (x: number, glyph: string) => {
      const img = this.add
        .image(x, GAME_HEIGHT - 64, 'btn')
        .setScrollFactor(0)
        .setDepth(90)
        .setAlpha(0.85)
        .setInteractive();
      this.add
        .text(x, GAME_HEIGHT - 64, glyph, { fontSize: '34px' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(91);
      return img;
    };
    const left = makeButton(70, '◀');
    const right = makeButton(174, '▶');
    const horn = makeButton(GAME_WIDTH - 70, '📢');
    left.on('pointerdown', () => {
      unlockAudio();
      this.touchLeft = true;
    });
    left.on('pointerup', () => (this.touchLeft = false));
    left.on('pointerout', () => (this.touchLeft = false));
    right.on('pointerdown', () => {
      unlockAudio();
      this.touchRight = true;
    });
    right.on('pointerup', () => (this.touchRight = false));
    right.on('pointerout', () => (this.touchRight = false));
    horn.on('pointerdown', () => {
      unlockAudio();
      startHorn();
    });
    horn.on('pointerup', () => stopHorn());
    horn.on('pointerout', () => stopHorn());
  }

  private createHud(): void {
    this.hud = this.add
      .text(16, 12, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
      .setStroke('#16222e', 5)
      .setScrollFactor(0)
      .setDepth(100);
    this.refreshHud();
    this.muteIcon = this.add
      .text(GAME_WIDTH - 16, 12, '🔊', { fontSize: '20px' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    // botón para volver al menú (también con ESC)
    this.add
      .text(GAME_WIDTH - 56, 12, '🏠', { fontSize: '20px' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Title'));
    this.bubble = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5, 1)
      .setStroke('#16222e', 6)
      .setDepth(30)
      .setVisible(false);

    const help = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 28,
        '←  →  conducir  ·  ESPACIO claxon  ·  M sonido  ·  ESC menú  ·  frena en la parada: suben y bajan',
        { fontFamily: FONT, fontSize: '18px', color: '#ffffff' },
      )
      .setOrigin(0.5)
      .setStroke('#16222e', 4)
      .setScrollFactor(0)
      .setDepth(100);
    this.tweens.add({ targets: help, alpha: 0, delay: 7000, duration: 900 });
  }

  // ---------- ciclo principal ----------

  update(time: number, delta: number): void {
    const locked = this.state !== 'driving';
    this.bus.update(delta, this.gatherInput(), locked);

    const scrollX = this.cameras.main.scrollX;
    this.clouds.tilePositionX = scrollX * 0.06 + time * 0.005;
    this.skyline.tilePositionX = scrollX * 0.2;
    this.skylineNight.tilePositionX = scrollX * 0.2;
    this.sidewalk.tilePositionX = scrollX;
    this.road.tilePositionX = scrollX;

    const night = this.updateDayNight(time);
    this.updateZones(scrollX, night);
    this.streetLife.update(time, this.bus.x, this.bus.speed);

    setEngine(Math.abs(this.bus.speed) / this.bus.maxSpeed);
    if (
      this.route.weather === 'lluvia' &&
      !this.rainAudioOn &&
      isAudioReady()
    ) {
      startRain();
      this.rainAudioOn = true;
    }

    // bip de reversa, como los camiones
    if (this.bus.speed < -30 && time - this.lastBeepAt > 650) {
      playReverseBeep();
      this.lastBeepAt = time;
    }
    // chirrido de frenos: venía rápido y se detuvo (resta puntos)
    this.recentSpeed = Math.max(
      Math.abs(this.bus.speed),
      this.recentSpeed * 0.99,
    );
    if (Math.abs(this.bus.speed) < 20 && this.recentSpeed > 170) {
      playBrakeSqueak();
      this.recentSpeed = 0;
      this.harshBrakes++;
      this.score = Math.max(0, this.score - 20);
      this.refreshHud();
    }

    this.updateDingBubble(time);

    if (this.state === 'driving' && Math.abs(this.bus.speed) < 8) {
      const stop = this.stops.find(
        (s) =>
          Math.abs(this.bus.doorWorldX - s.x) < DOOR_RANGE &&
          (this.bus.hasAlightingAt(s.index) ||
            (s.waiting.length > 0 && !this.bus.isFull)),
      );
      if (stop) void this.board(stop);
    }
  }

  /** Mezcla teclado, botones táctiles y gamepad en una sola entrada. */
  private gatherInput(): DriveInput {
    let left = this.cursors.left.isDown || this.touchLeft;
    let right = this.cursors.right.isDown || this.touchRight;
    let hornPad = false;
    const gamepads = this.input.gamepad;
    if (gamepads && gamepads.total > 0) {
      const pad = gamepads.getPad(0);
      if (pad) {
        const axis = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
        left = left || pad.left || axis < -0.35;
        right = right || pad.right || axis > 0.35;
        hornPad = pad.A;
      }
    }
    if (hornPad && !this.padHornHeld) {
      unlockAudio();
      startHorn();
    }
    if (!hornPad && this.padHornHeld) stopHorn();
    this.padHornHeld = hornPad;
    return { left, right };
  }

  /** Sol/luna, estrellas, ventanas encendidas y faro. Devuelve qué tan de noche es. */
  private updateDayNight(time: number): number {
    const phase = (time / this.dayCycleMs + this.route.dayStart) % 1;
    // 0 = amanecer, 0.25 = mediodía, 0.5 = atardecer, 0.5..1 = noche
    const daylight = Math.max(0, Math.sin(Math.PI * 2 * phase));
    const night = 1 - daylight;

    this.nightOverlay.setAlpha(night * 0.5);
    this.duskOverlay.setAlpha(0.2 * Math.pow(Math.cos(Math.PI * 2 * phase), 6));
    this.stars.setAlpha(Phaser.Math.Clamp((night - 0.35) / 0.65, 0, 1));
    this.skylineNight.setAlpha(night);
    this.bus.setNight(Phaser.Math.Clamp((night - 0.3) / 0.5, 0, 1));

    if (phase < 0.5) {
      const p = phase / 0.5;
      this.sun
        .setPosition(
          -80 + (GAME_WIDTH + 160) * p,
          300 - 230 * Math.sin(Math.PI * p),
        )
        .setAlpha(1);
      this.moon.setAlpha(0);
    } else {
      const q = (phase - 0.5) / 0.5;
      this.moon
        .setPosition(
          -80 + (GAME_WIDTH + 160) * q,
          300 - 230 * Math.sin(Math.PI * q),
        )
        .setAlpha(1);
      this.sun.setAlpha(0);
    }
    return night;
  }

  /** Crossfade de la capa media según la zona de la ruta (centro/casas/parque/playa). */
  private updateZones(scrollX: number, night: number): void {
    const zones = this.route.zones;
    const W = this.route.worldWidth;
    const worldX = scrollX + GAME_WIDTH / 2;
    let i = 0;
    while (i < zones.length - 1 && worldX > zones[i].until * W) i++;
    let t = 0;
    if (i < zones.length - 1) {
      const boundary = zones[i].until * W;
      t = Phaser.Math.Clamp((worldX - (boundary - ZONE_BLEND)) / ZONE_BLEND, 0, 1);
    }
    const texA = ZONE_TEXTURES[zones[i].key];
    const texB = ZONE_TEXTURES[zones[Math.min(i + 1, zones.length - 1)].key];
    if (this.zoneDayA.texture.key !== texA.day) this.zoneDayA.setTexture(texA.day);
    if (this.zoneDayB.texture.key !== texB.day) this.zoneDayB.setTexture(texB.day);
    if (this.zoneNightA.texture.key !== texA.night) this.zoneNightA.setTexture(texA.night);
    if (this.zoneNightB.texture.key !== texB.night) this.zoneNightB.setTexture(texB.night);
    this.zoneDayA.setAlpha(1 - t);
    this.zoneDayB.setAlpha(t);
    this.zoneNightA.setAlpha((1 - t) * night);
    this.zoneNightB.setAlpha(t * night);
    for (const ts of [this.zoneDayA, this.zoneDayB, this.zoneNightA, this.zoneNightB]) {
      ts.tilePositionX = scrollX * 0.45;
    }
  }

  /** "Ding" del timbre cuando alguien quiere bajar en la parada cercana. */
  private updateDingBubble(time: number): void {
    if (this.state === 'driving') {
      const near = this.stops.find(
        (s) =>
          this.bus.hasAlightingAt(s.index) &&
          Math.abs(s.x - this.bus.x) < DING_RANGE,
      );
      if (near && this.dingedStop !== near.index) {
        playDing();
        this.dingedStop = near.index;
        this.bubble.setText('🔔 ¡Bajan en esta parada!').setVisible(true);
        this.bubbleUntil = time + 2400;
      }
      if (!near) this.dingedStop = -1;
    }
    if (this.bubble.visible) {
      this.bubble.setPosition(this.bus.x, this.bus.y - 95);
      if (time > this.bubbleUntil) this.bubble.setVisible(false);
    }
  }

  /** Elige en qué parada bajará: alguna adelante (o atrás si es la última). */
  private pickDestination(from: number): number {
    const ahead = this.stops.map((_, i) => i).filter((i) => i > from);
    const pool = ahead.length
      ? ahead
      : this.stops.map((_, i) => i).filter((i) => i < from);
    return Phaser.Math.RND.pick(pool);
  }

  /** Secuencia en la parada: puerta, bajan los que llegan, suben los que esperan. */
  private async board(stop: BusStop): Promise<void> {
    this.state = 'boarding';
    this.bus.halt();
    await this.bus.openDoor();

    // ---- bajan los que van a esta parada ----
    let off = 0;
    for (const occ of this.bus.alightingAt(stop.index)) {
      await this.bus.removePassenger(occ);
      const walker = new Passenger(
        this,
        this.bus.doorWorldX,
        BOARD_FEET_Y,
        occ.kind,
        occ.charKey,
      );
      walker.setDepth(12);
      await walker.appear();
      playSeatPop();
      this.delivered++;
      this.score += 100;
      this.refreshHud();
      void walker.walkAwayAndVanish(stop.x - 90 - off * 26, WAIT_FEET_Y);
      off++;
      await delay(this, 120);
    }

    // ---- suben los que esperaban ----
    while (stop.waiting.length > 0 && !this.bus.isFull) {
      const p = stop.waiting.shift()!;
      stop.refreshBadge();
      p.setDepth(12); // pasa al frente del bus para que se vea cómo sube
      await p.walkTo(this.bus.doorWorldX, BOARD_FEET_Y);
      const { kind, charKey } = p;
      await p.enterBus();
      this.bus.addPassenger(kind, charKey, this.pickDestination(stop.index));
      playSeatPop();
      this.refreshHud();
      await delay(this, 150);
    }

    await delay(this, 250);
    await this.bus.closeDoor();

    if (this.delivered === this.totalSpawned) {
      this.finishRoute();
      return;
    }
    this.state = 'driving';
  }

  private refreshHud(): void {
    const full = this.bus?.isFull ? '  ·  ¡lleno!' : '';
    this.hud.setText(
      `🚌 ${this.bus?.seatedCount ?? 0}/${this.bus?.capacity ?? 10}  ·  ⭐ ${this.delivered}/${this.totalSpawned}  ·  🏆 ${this.score}${full}`,
    );
  }

  /** Fin de la ruta: estrellas, récord en localStorage y regreso al menú. */
  private finishRoute(): void {
    if (this.ended) return;
    this.ended = true;
    this.state = 'ended';
    playFanfare();

    const stars = this.harshBrakes <= 1 ? 3 : this.harshBrakes <= 3 ? 2 : 1;
    try {
      const key = `elias-autobus:best:${this.route.id}`;
      const prev = JSON.parse(localStorage.getItem(key) ?? 'null') as {
        stars: number;
        score: number;
      } | null;
      localStorage.setItem(
        key,
        JSON.stringify({
          stars: Math.max(stars, prev?.stars ?? 0),
          score: Math.max(this.score, prev?.score ?? 0),
        }),
      );
    } catch {
      // almacenamiento no disponible (modo privado): el récord no se guarda
    }

    const panel = this.add
      .rectangle(GAME_WIDTH / 2, 270, 580, 250, 0x16222e, 0.88)
      .setScrollFactor(0)
      .setDepth(120);
    panel.setStrokeStyle(3, 0xffffff, 0.6);
    const text = (y: number, msg: string, size: number, color = '#ffffff') =>
      this.add
        .text(GAME_WIDTH / 2, y, msg, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(121);
    text(190, '¡Ruta completada! 🎉', 34);
    text(248, '⭐'.repeat(stars), 44);
    text(302, `Puntos: ${this.score}`, 24, '#ffe9a0');
    text(348, 'ENTER o toca la pantalla para volver al menú', 16);

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('Title'));
    this.time.delayedCall(800, () =>
      this.input.once('pointerdown', () => this.scene.start('Title')),
    );
  }
}
