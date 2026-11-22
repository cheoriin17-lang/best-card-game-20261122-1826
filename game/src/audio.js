// Ember Court — tiny WebAudio bleeps. No audio files; everything is synthesised
// at play time, and silence is the fallback when audio is unavailable.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, gain, when = 0) {
  const c = ac();
  if (!c || muted) return;
  try {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(c.currentTime + when); osc.stop(c.currentTime + when + dur);
  } catch { /* sound is decoration; never break the game */ }
}

export const sfx = {
  play() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.1, 'sine', 0.08, 0.05); },
  hit() { tone(180, 0.18, 'sawtooth', 0.1); tone(90, 0.22, 'square', 0.06, 0.02); },
  heal() { tone(660, 0.16, 'sine', 0.09); tone(880, 0.2, 'sine', 0.07, 0.08); },
  block() { tone(300, 0.1, 'triangle', 0.09); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.09, i * 0.14)); },
  toggleMute() { muted = !muted; return muted; },
};
