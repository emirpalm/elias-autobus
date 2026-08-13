import Phaser from 'phaser';

/** Envuelve un tween en una Promise para poder encadenar con async/await. */
export function tweenP(
  scene: Phaser.Scene,
  cfg: Phaser.Types.Tweens.TweenBuilderConfig,
): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...cfg, onComplete: () => resolve() });
  });
}

export function delay(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}
