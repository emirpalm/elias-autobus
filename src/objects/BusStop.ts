import Phaser from 'phaser';
import { SIDEWALK_TOP } from '../config';
import type { Passenger } from './Passenger';

/** Señal de parada; los pasajeros en espera viven en `waiting`. */
export class BusStop extends Phaser.GameObjects.Container {
  readonly waiting: Passenger[] = [];
  readonly index: number;

  private badge: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, index: number) {
    super(scene, x, SIDEWALK_TOP + 4);
    this.index = index;
    this.add(scene.add.image(0, 0, 'stop-sign').setOrigin(0.5, 1));
    this.badge = scene.add
      .text(0, -148, '', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1)
      .setStroke('#16222e', 4);
    this.add(this.badge);
    this.setDepth(4);
    scene.add.existing(this);
  }

  /** Muestra cuánta gente espera en la parada. */
  refreshBadge(): void {
    this.badge.setText(this.waiting.length > 0 ? `🧍×${this.waiting.length}` : '');
  }
}
