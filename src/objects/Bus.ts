import Phaser from 'phaser';
import { BUS, CHAR_FRAME } from '../config';
import { playDoorHiss, playPlimPlim } from '../audio/chime';
import { tweenP } from '../utils/tween';
import type { PassengerKind } from './Passenger';

const ACCEL = 380;
const BRAKE = 560;
const FRICTION = 220;
const MAX_SPEED = 430;
const REVERSE_MAX = -170;
const WHEEL_RADIUS = 22;
const DOOR_LOCAL_X = BUS.DOOR_X + BUS.DOOR_W / 2 - BUS.W / 2;

/** Entrada de manejo ya mezclada (teclado + táctil + gamepad). */
export interface DriveInput {
  left: boolean;
  right: boolean;
}

/** Pasajero sentado: su busto en la ventana y la parada donde baja. */
export interface Occupant {
  seatIndex: number;
  sprite: Phaser.GameObjects.Image;
  kind: PassengerKind;
  charKey: string;
  dest: number;
}

export class Bus extends Phaser.GameObjects.Container {
  private cab: Phaser.GameObjects.Container;
  private glass: Phaser.GameObjects.Image;
  private door: Phaser.GameObjects.Image;
  private beam: Phaser.GameObjects.Image;
  private wheels: Phaser.GameObjects.Image[];
  private seats: Array<{ x: number; y: number }> = [];
  private occupants: Array<Occupant | null> = [];
  private dancers: Array<{
    img: Phaser.GameObjects.Image;
    baseY: number;
    subtle: boolean;
  }> = [];
  private danceTweens: Phaser.Tweens.Tween[] = [];
  private dancing = false;
  private _speed = 0;
  private elapsed = 0;
  private worldWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, worldWidth: number) {
    super(scene, x, y);
    this.worldWidth = worldWidth;

    const body = scene.add.image(0, 0, 'bus-body');
    this.glass = scene.add.image(0, 0, 'bus-glass');
    this.door = scene.add.image(DOOR_LOCAL_X, 8, 'bus-door');
    const driverX = BUS.DRIVER_X + BUS.WIN_W / 2 - BUS.W / 2;
    // el conductor va DEBAJO del cristal para verse "dentro" de la cabina;
    // origen en los "pies" (fuera de la ventana) para que el vaivén mueva la cabeza
    const driver = scene.add
      .image(driverX, -29 + CHAR_FRAME.H * 0.45, 'maleAdventurer_idle')
      .setOrigin(0.5, 1)
      .setScale(0.45);
    driver.setCrop(0, 0, CHAR_FRAME.W, CHAR_FRAME.BUST_H);
    this.registerDancer(driver, true);
    this.cab = scene.add.container(0, 0, [
      body,
      driver,
      this.glass,
      this.door,
    ]);
    this.wheels = [
      scene.add.image(-100, 55, 'wheel'),
      scene.add.image(40, 55, 'wheel'),
    ];
    this.beam = scene.add
      .image(166, 7, 'headlight-beam')
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.add([this.beam, this.cab, ...this.wheels]);

    // dos asientos por ventana, llenando desde el frente (junto a la puerta);
    // y = borde superior de la ventana (los bustos usan origin 0.5,0)
    for (const wx of [...BUS.WINDOWS].reverse()) {
      const cx = wx + BUS.WIN_W / 2 - BUS.W / 2;
      this.seats.push({ x: cx - 8, y: -29 }, { x: cx + 8, y: -29 });
    }
    this.occupants = this.seats.map(() => null);

    this.setDepth(10);
    scene.add.existing(this);
  }

  get speed(): number {
    return this._speed;
  }

  get maxSpeed(): number {
    return MAX_SPEED;
  }

  get capacity(): number {
    return this.seats.length;
  }

  get seatedCount(): number {
    return this.occupants.filter(Boolean).length;
  }

  get isFull(): boolean {
    return this.occupants.every((o) => o !== null);
  }

  get doorWorldX(): number {
    return this.x + DOOR_LOCAL_X;
  }

  hasAlightingAt(stopIndex: number): boolean {
    return this.occupants.some((o) => o?.dest === stopIndex);
  }

  alightingAt(stopIndex: number): Occupant[] {
    return this.occupants.filter(
      (o): o is Occupant => o !== null && o.dest === stopIndex,
    );
  }

  halt(): void {
    this._speed = 0;
  }

  /** Enciende el faro según qué tan de noche es (0..1). */
  setNight(amount: number): void {
    this.beam.setAlpha(amount * 0.85);
  }

  update(deltaMs: number, input: DriveInput, locked: boolean): void {
    const dt = deltaMs / 1000;

    if (!locked && input.right) {
      this._speed += (this._speed < 0 ? BRAKE : ACCEL) * dt;
    } else if (!locked && input.left) {
      this._speed -= (this._speed > 0 ? BRAKE : ACCEL) * dt;
    } else {
      const f = FRICTION * dt * (locked ? 3 : 1);
      this._speed =
        Math.abs(this._speed) <= f
          ? 0
          : this._speed - Math.sign(this._speed) * f;
    }
    this._speed = Phaser.Math.Clamp(this._speed, REVERSE_MAX, MAX_SPEED);

    const nx = Phaser.Math.Clamp(
      this.x + this._speed * dt,
      220,
      this.worldWidth - 220,
    );
    if (nx !== this.x + this._speed * dt) this._speed = 0;
    this.x = nx;

    for (const wheel of this.wheels) {
      wheel.rotation += (this._speed * dt) / WHEEL_RADIUS;
    }

    // suspensión: la cabina rebota y se inclina según la velocidad
    this.elapsed += deltaMs;
    const k = Math.abs(this._speed) / MAX_SPEED;
    this.cab.y = Math.sin(this.elapsed * 0.02) * 2.4 * k;
    this.cab.angle = (-this._speed / MAX_SPEED) * 1.3;
  }

  async openDoor(): Promise<void> {
    playPlimPlim();
    playDoorHiss();
    await tweenP(this.scene, {
      targets: this.door,
      alpha: 0.15,
      scaleX: 0.75,
      duration: 380,
      ease: 'Sine.easeInOut',
    });
  }

  async closeDoor(): Promise<void> {
    playDoorHiss();
    await tweenP(this.scene, {
      targets: this.door,
      alpha: 1,
      scaleX: 1,
      duration: 380,
      ease: 'Sine.easeInOut',
    });
    playPlimPlim();
  }

  /** Sienta a un pasajero en la primera ventana libre (aparece por la ventana). */
  addPassenger(kind: PassengerKind, charKey: string, dest: number): boolean {
    const seatIndex = this.occupants.findIndex((o) => o === null);
    if (seatIndex === -1) return false;
    const seat = this.seats[seatIndex];
    // busto recortado: solo cabeza y hombros asoman por la ventana;
    // origen en los "pies" para que el bailecito incline la cabeza
    const scale = kind === 'kid' ? 0.34 : 0.45;
    const topY = seat.y + (kind === 'kid' ? 8 : 0);
    const seated = this.scene.add
      .image(seat.x, topY + CHAR_FRAME.H * scale, `${charKey}_idle`)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setAlpha(0);
    seated.setCrop(0, 0, CHAR_FRAME.W, CHAR_FRAME.BUST_H);
    this.cab.addAt(seated, this.cab.getIndex(this.glass));
    this.scene.tweens.add({ targets: seated, alpha: 1, duration: 260 });
    this.registerDancer(seated);
    this.occupants[seatIndex] = { seatIndex, sprite: seated, kind, charKey, dest };
    return true;
  }

  /** Da de alta un bailarín; empieza a moverse solo si ya suena la música. */
  private registerDancer(
    img: Phaser.GameObjects.Image,
    subtle = false,
  ): void {
    const dancer = { img, baseY: img.y, subtle };
    this.dancers.push(dancer);
    if (this.dancing) this.startDanceFor(dancer);
  }

  /** Bailecito: cabeceo hacia abajo (nunca asoma sobre la ventana) + vaivén. */
  private startDanceFor(d: {
    img: Phaser.GameObjects.Image;
    baseY: number;
    subtle: boolean;
  }): void {
    if (!d.img.active) return;
    const bob = d.subtle ? 1.2 : 2.6;
    const sway = d.subtle ? 1.2 : 3;
    d.img.setAngle(-sway);
    this.danceTweens.push(
      this.scene.tweens.add({
        targets: d.img,
        y: d.baseY + bob,
        duration: 280 + Math.random() * 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 400,
      }),
      this.scene.tweens.add({
        targets: d.img,
        angle: sway,
        duration: 460 + Math.random() * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 400,
      }),
    );
  }

  /** Prende/apaga el baile de todos (se llama según suene la música). */
  setDancing(on: boolean): void {
    if (on === this.dancing) return;
    this.dancing = on;
    if (on) {
      for (const d of this.dancers) this.startDanceFor(d);
    } else {
      for (const tween of this.danceTweens) tween.stop();
      this.danceTweens = [];
      for (const d of this.dancers) {
        if (d.img.active) {
          d.img.setY(d.baseY);
          d.img.setAngle(0);
        }
      }
    }
  }

  /** Baja a un ocupante: desvanece su sprite y libera el asiento. */
  async removePassenger(occ: Occupant): Promise<void> {
    this.occupants[occ.seatIndex] = null;
    this.dancers = this.dancers.filter((d) => d.img !== occ.sprite);
    await tweenP(this.scene, { targets: occ.sprite, alpha: 0, duration: 240 });
    occ.sprite.destroy();
  }
}
