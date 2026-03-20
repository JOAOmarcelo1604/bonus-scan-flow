const beepCtx = typeof AudioContext !== "undefined" ? new AudioContext() : null;

export function playBeep(success: boolean) {
  if (!beepCtx) return;
  const osc = beepCtx.createOscillator();
  const gain = beepCtx.createGain();
  osc.connect(gain);
  gain.connect(beepCtx.destination);
  osc.frequency.value = success ? 1200 : 400;
  gain.gain.value = 0.15;
  osc.start();
  osc.stop(beepCtx.currentTime + (success ? 0.1 : 0.3));
}
