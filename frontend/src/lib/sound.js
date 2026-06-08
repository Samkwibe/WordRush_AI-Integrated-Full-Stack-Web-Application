// Tiny WebAudio sound utility — no asset files needed.
let ctx = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function enabled() {
  try { return localStorage.getItem("wr_sound") !== "off"; } catch { return true; }
}
export function setSoundEnabled(on) {
  try { localStorage.setItem("wr_sound", on ? "on" : "off"); } catch { /* ignore */ }
}
export function isSoundEnabled() { return enabled(); }

function tone({ freq = 440, dur = 0.12, type = "sine", gain = 0.08, when = 0 }) {
  if (!enabled()) return;
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  tick: () => tone({ freq: 880, dur: 0.04, type: "square", gain: 0.04 }),
  flip: () => tone({ freq: 520, dur: 0.08, type: "triangle", gain: 0.06 }),
  match: () => { tone({ freq: 660, dur: 0.1 }); tone({ freq: 990, dur: 0.14, when: 0.07 }); },
  miss: () => tone({ freq: 220, dur: 0.14, type: "sawtooth", gain: 0.05 }),
  win: () => { tone({ freq: 660, dur: 0.12 }); tone({ freq: 880, dur: 0.12, when: 0.1 }); tone({ freq: 1320, dur: 0.18, when: 0.22 }); },
  click: () => tone({ freq: 320, dur: 0.03, type: "square", gain: 0.03 }),
};
