// Audio sintetizado con Web Audio: sin archivos que cargar.
// El contexto se crea en el primer gesto del usuario (política de autoplay)
// y todo pasa por un GainNode maestro (para silenciar con M).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

let engineOscs: OscillatorNode[] | null = null;
let engineGain: GainNode | null = null;
let hornOscs: OscillatorNode[] | null = null;
let hornGain: GainNode | null = null;
let rainSrc: AudioBufferSourceNode | null = null;
let musicTimer: number | null = null;
let musicStep = 0;

function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function out(): GainNode {
  return master!;
}

export function unlockAudio(): void {
  void audio();
}

export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === 'running';
}

/** Alterna el silencio general. Devuelve true si quedó silenciado. */
export function toggleMute(): boolean {
  muted = !muted;
  if (ctx && master) {
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
  return muted;
}

/** Timbre "plim plim" de dos notas (campana de puerta de autobús). */
export function playPlimPlim(): void {
  if (!ctx) return;
  const ac = audio();
  const t0 = ac.currentTime;
  const notes: Array<[number, number]> = [
    [988, 0], // si5  — "plim"
    [740, 0.22], // fa#5 — "plim"
  ];
  for (const [freq, dt] of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + dt);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.55);
    osc.connect(gain).connect(out());
    osc.start(t0 + dt);
    osc.stop(t0 + dt + 0.6);
  }
}

/** "Ding" del cordón del timbre: alguien quiere bajar en la próxima parada. */
export function playDing(): void {
  if (!ctx) return;
  const ac = audio();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1175; // re6
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(gain).connect(out());
  osc.start(t);
  osc.stop(t + 0.55);
}

/** Lluvia: lazo de ruido filtrado, suave y continuo. */
export function startRain(): void {
  if (!ctx || rainSrc) return;
  const ac = audio();
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  rainSrc = ac.createBufferSource();
  rainSrc.buffer = buf;
  rainSrc.loop = true;
  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 900;
  const gain = ac.createGain();
  gain.gain.value = 0.05;
  rainSrc.connect(lowpass).connect(gain).connect(out());
  rainSrc.start();
}

export function stopRain(): void {
  rainSrc?.stop();
  rainSrc = null;
}

// ---- Música de fondo: lazo generativo pentatónico (marimba + bajo) ----

const MUSIC_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const MUSIC_MELODY = [
  0, -1, 2, -1, 4, -1, 3, 2, 1, -1, 3, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1,
  4, 3, 2, -1, 1, -1, 0, -1, -1, -1,
];
const MUSIC_BASS = [261.63, 196.0, 220.0, 196.0];
const MUSIC_STEP = 0.27;

function scheduleMusicStep(t: number, step: number): void {
  if (!ctx) return;
  if (step % 8 === 0) {
    const bass = ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.value = MUSIC_BASS[(step / 8) % 4];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + MUSIC_STEP * 7.5);
    bass.connect(gain).connect(out());
    bass.start(t);
    bass.stop(t + MUSIC_STEP * 8);
  }
  const note = MUSIC_MELODY[step];
  if (note >= 0) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = MUSIC_SCALE[note];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.055, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(out());
    osc.start(t);
    osc.stop(t + 0.4);
  }
}

export function startMusic(): void {
  const ac = audio();
  if (musicTimer !== null) return;
  let next = ac.currentTime + 0.05;
  const tick = () => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.7) {
      scheduleMusicStep(next, musicStep);
      musicStep = (musicStep + 1) % MUSIC_MELODY.length;
      next += MUSIC_STEP;
    }
  };
  tick();
  musicTimer = window.setInterval(tick, 250);
}

export function stopMusic(): void {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

/** Silbido de puerta neumática: ráfaga de ruido filtrado con caída rápida. */
export function playDoorHiss(): void {
  if (!ctx) return;
  const ac = audio();
  const dur = 0.45;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bandpass = ac.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2600;
  bandpass.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.value = 0.18;
  src.connect(bandpass).connect(gain).connect(out());
  src.start();
}

/** Claxon: dos bocinas desafinadas; suena mientras se mantenga presionado. */
export function startHorn(): void {
  const ac = audio(); // el claxon ES un gesto del usuario: puede crear el ctx
  if (hornOscs) return;
  const t = ac.currentTime;
  hornGain = ac.createGain();
  hornGain.gain.setValueAtTime(0.0001, t);
  hornGain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 900;
  hornOscs = [330, 415].map((freq) => {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(lowpass);
    osc.start(t);
    return osc;
  });
  lowpass.connect(hornGain).connect(out());
}

export function stopHorn(): void {
  if (!ctx || !hornOscs) return;
  const t = ctx.currentTime;
  hornGain!.gain.setTargetAtTime(0.0001, t, 0.05);
  for (const osc of hornOscs) osc.stop(t + 0.4);
  hornOscs = null;
  hornGain = null;
}

/** Bip de reversa, como los camiones. */
export function playReverseBeep(): void {
  if (!ctx) return;
  const ac = audio();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 980;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
  gain.gain.setValueAtTime(0.05, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(out());
  osc.start(t);
  osc.stop(t + 0.2);
}

/** Chirrido corto de frenos al detenerse desde alta velocidad. */
export function playBrakeSqueak(): void {
  if (!ctx) return;
  const ac = audio();
  const t = ac.currentTime;
  const dur = 0.3;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bandpass = ac.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.Q.value = 6;
  bandpass.frequency.setValueAtTime(3400, t);
  bandpass.frequency.exponentialRampToValueAtTime(2400, t + dur);
  const gain = ac.createGain();
  gain.gain.value = 0.07;
  src.connect(bandpass).connect(gain).connect(out());
  src.start();
}

/** "Pop" suave cuando alguien sube o baja. */
export function playSeatPop(): void {
  if (!ctx) return;
  const ac = audio();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  const freq = 480 + Math.random() * 220;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.08);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  osc.connect(gain).connect(out());
  osc.start(t);
  osc.stop(t + 0.16);
}

/** Fanfarria de victoria (arpegio do-mi-sol-do). */
export function playFanfare(): void {
  if (!ctx) return;
  const ac = audio();
  const t0 = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const t = t0 + i * 0.14;
    const last = i === notes.length - 1;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (last ? 0.9 : 0.35));
    osc.connect(gain).connect(out());
    osc.start(t);
    osc.stop(t + 1);
  });
}

/** Motor: sierra + sub-oscilador graves que siguen la velocidad (0..1). */
export function setEngine(speedRatio: number): void {
  if (!ctx || ctx.state !== 'running') return;
  if (!engineOscs) {
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 180;
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    saw.connect(lowpass);
    sub.connect(lowpass);
    lowpass.connect(engineGain).connect(out());
    saw.start();
    sub.start();
    engineOscs = [saw, sub];
  }
  const t = ctx.currentTime;
  const freq = 42 + 75 * speedRatio;
  engineOscs[0].frequency.setTargetAtTime(freq, t, 0.1);
  engineOscs[1].frequency.setTargetAtTime(freq / 2, t, 0.1);
  engineGain!.gain.setTargetAtTime(0.02 + 0.055 * speedRatio, t, 0.12);
}
