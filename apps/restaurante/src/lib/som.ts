/**
 * Bipe curto via WebAudio — sem arquivo de audio, para nao pesar o cache do
 * PWA. Navegadores bloqueiam audio antes de qualquer toque do usuario, entao
 * a primeira interacao destrava o contexto.
 */
let ctx: AudioContext | null = null;

export function destravarSom(): void {
  if (ctx) return;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctor) ctx = new Ctor();
  void ctx?.resume();
}

export function bipe(): void {
  if (!ctx) return;
  const agora = ctx.currentTime;
  for (const [i, hz] of [880, 1320].entries()) {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    vol.gain.setValueAtTime(0.0001, agora + i * 0.16);
    vol.gain.exponentialRampToValueAtTime(0.14, agora + i * 0.16 + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.16 + 0.14);
    osc.connect(vol).connect(ctx.destination);
    osc.start(agora + i * 0.16);
    osc.stop(agora + i * 0.16 + 0.16);
  }
}

export function vibrar(): void {
  if ('vibrate' in navigator) navigator.vibrate([90, 60, 90]);
}
