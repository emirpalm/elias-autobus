import Phaser from 'phaser';
import { HUMAN_CHARACTERS } from '../config';
import { tweenP } from '../utils/tween';

export type PassengerKind = 'adult' | 'kid';

/** Peatón (sprite Kenney) que espera, camina hasta la puerta y sube al bus. */
export class Passenger extends Phaser.GameObjects.Container {
  readonly kind: PassengerKind;
  readonly charKey: string;
  private sprite: Phaser.GameObjects.Sprite;
  private idleTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: PassengerKind,
    charKey?: string,
  ) {
    super(scene, x, y);
    this.kind = kind;
    this.charKey =
      charKey ??
      (Math.random() < 0.08
        ? 'robot'
        : Phaser.Utils.Array.GetRandom(HUMAN_CHARACTERS));

    this.sprite = scene.add
      .sprite(0, 0, `${this.charKey}_idle`)
      .setOrigin(0.5, 1)
      .setScale(kind === 'adult' ? 0.42 : 0.31); // los niños: el mismo toon, chiquito
    this.add(this.sprite);

    scene.add.existing(this);
    this.startIdle();
  }

  /** Balanceo sutil mientras espera (respiración). */
  private startIdle(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this,
      scaleY: 0.98,
      duration: 700 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Camina (animación de 8 frames) hasta targetX/targetY. */
  async walkTo(targetX: number, targetY = this.y): Promise<void> {
    this.idleTween?.stop();
    this.setScale(1, 1);
    const dir = Math.sign(targetX - this.x) || 1;
    this.sprite.setFlipX(dir < 0);
    this.sprite.play(`${this.charKey}-walk`);
    const duration = (Math.abs(targetX - this.x) / 95) * 1000;
    await tweenP(this.scene, { targets: this, x: targetX, y: targetY, duration });
    this.sprite.stop();
    this.sprite.setTexture(`${this.charKey}_idle`);
  }

  /** Aparece saliendo por la puerta del bus (inverso de enterBus). */
  async appear(): Promise<void> {
    this.idleTween?.stop();
    this.setAlpha(0);
    this.setScale(1, 0.5);
    await tweenP(this.scene, {
      targets: this,
      alpha: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });
  }

  /** Camina hasta su punto de salida y se desvanece; se destruye. */
  async walkAwayAndVanish(targetX: number, targetY: number): Promise<void> {
    await this.walkTo(targetX, targetY);
    await tweenP(this.scene, { targets: this, alpha: 0, duration: 350 });
    this.destroy();
  }

  /** Se encoge y desvanece al entrar por la puerta; se destruye. */
  async enterBus(): Promise<void> {
    await tweenP(this.scene, {
      targets: this,
      alpha: 0,
      scaleY: 0.5,
      y: this.y - 16,
      duration: 320,
      ease: 'Sine.easeIn',
    });
    this.destroy();
  }
}
