import Phaser from 'phaser';
import { SIDEWALK_TOP } from '../config';

interface Semaforo {
  offset: number;
  lamps: Phaser.GameObjects.Image[];
}

interface Bird {
  sprite: Phaser.GameObjects.Sprite;
  flying: boolean;
}

const LAMP_TINTS = [0xff5040, 0xffd23e, 0x4be36a]; // rojo, ámbar, verde

/**
 * Decoración viva: semáforos que ciclan, pájaros que se espantan al pasar
 * y un perro que corre junto al bus una vez por ruta.
 */
export class StreetLife {
  private scene: Phaser.Scene;
  private semaforos: Semaforo[] = [];
  private birds: Bird[] = [];
  private dog?: Phaser.GameObjects.Sprite;
  private dogDone = false;

  constructor(scene: Phaser.Scene, worldWidth: number, stops: number[]) {
    this.scene = scene;
    const farFromStops = (x: number, d: number) =>
      stops.every((s) => Math.abs(s - x) > d);

    for (let x = 2100; x < worldWidth - 900; x += 2600) {
      if (!farFromStops(x, 380)) continue;
      scene.add.image(x, SIDEWALK_TOP + 6, 'semaforo').setOrigin(0.5, 1).setDepth(3);
      const boxTop = SIDEWALK_TOP + 6 - 120;
      const lamps = [14, 28, 42].map((dy, i) =>
        scene.add
          .image(x, boxTop + dy, 'lamp')
          .setDepth(3)
          .setTint(LAMP_TINTS[i])
          .setAlpha(0.15),
      );
      this.semaforos.push({ offset: (x / 700) % 8, lamps });
    }

    for (let x = 1000; x < worldWidth - 600; x += 1100 + ((x * 7) % 400)) {
      if (!farFromStops(x, 250)) continue;
      const sprite = scene.add
        .sprite(x, SIDEWALK_TOP - 1, 'bird0')
        .setOrigin(0.5, 1)
        .setDepth(5);
      this.birds.push({ sprite, flying: false });
    }

    this.dog = scene.add
      .sprite(Math.floor(worldWidth * 0.45), SIDEWALK_TOP + 24, 'dog0')
      .setOrigin(0.5, 1)
      .setDepth(7);
  }

  update(timeMs: number, busX: number, busSpeed: number): void {
    const t = timeMs / 1000;
    for (const s of this.semaforos) {
      const phase = (t + s.offset) % 8;
      const active = phase < 4 ? 2 : phase < 5 ? 1 : 0; // verde → ámbar → rojo
      s.lamps.forEach((lamp, i) => lamp.setAlpha(i === active ? 1 : 0.15));
    }

    for (const b of this.birds) {
      if (
        !b.flying &&
        b.sprite.active &&
        Math.abs(b.sprite.x - busX) < 170 &&
        Math.abs(busSpeed) > 60
      ) {
        b.flying = true;
        b.sprite.play('bird-fly');
        const dir = Math.sign(b.sprite.x - busX) || 1;
        b.sprite.setFlipX(dir < 0);
        this.scene.tweens.add({
          targets: b.sprite,
          x: b.sprite.x + 340 * dir,
          y: b.sprite.y - 240,
          alpha: 0,
          duration: 1400,
          ease: 'Sine.easeOut',
          onComplete: () => b.sprite.destroy(),
        });
      }
    }

    if (
      this.dog &&
      !this.dogDone &&
      Math.abs(this.dog.x - busX) < 140 &&
      Math.abs(busSpeed) > 120
    ) {
      this.dogDone = true;
      const dir = Math.sign(busSpeed) || 1;
      this.dog.play('dog-run');
      this.dog.setFlipX(dir < 0);
      this.scene.tweens.add({
        targets: this.dog,
        x: this.dog.x + 700 * dir,
        duration: 3600,
        onComplete: () => {
          this.dog!.stop();
          this.dog!.setTexture('dog0');
        },
      });
    }
  }
}
