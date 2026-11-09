/**
 * Pin Potha - Serene Buddhist Sound Effects & Haptics Engine
 * Uses Pure Web Audio API for zero latency, zero bandwidth, and offline capability.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = localStorage.getItem('pinPotha_sound_enabled') !== 'false';
  }

  _getCtx() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setSoundEnabled(enabled) {
    this.isEnabled = !!enabled;
    localStorage.setItem('pinPotha_sound_enabled', this.isEnabled ? 'true' : 'false');
  }

  getSoundEnabled() {
    return this.isEnabled;
  }

  /**
   * Resonant Buddhist Temple Bell / Singing Bowl (සාදු නාදය)
   * Plays harmonic pure tones (528 Hz - Solfeggio love/compassion) with rich warm decay.
   */
  playSadhu() {
    if (!this.isEnabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const fundamental = 528; // Serene temple tone
      const harmonics = [
        { freq: fundamental, gain: 0.28, decay: 1.6 },
        { freq: fundamental * 2, gain: 0.14, decay: 1.2 },
        { freq: fundamental * 3, gain: 0.06, decay: 0.8 },
        { freq: fundamental * 4.2, gain: 0.02, decay: 0.5 }
      ];

      // Master gain node
      const master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.setValueAtTime(1.0, now);

      harmonics.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Soft bell envelope: fast attack (15ms), long exponential decay
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(g);
        g.connect(master);

        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Celestial Sparkle Chime for Share (බෙදාගැනීමේ නාදය)
   * 3-note ascending crystalline arpeggio (C6 -> E6 -> G6)
   */
  playShare() {
    if (!this.isEnabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        g.gain.setValueAtTime(0.001, startTime);
        g.gain.exponentialRampToValueAtTime(0.18, startTime + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Warm Harmonic Dual Chime for Repost (යළි බෙදාගැනීම)
   */
  playRepost() {
    if (!this.isEnabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [784.0, 1046.5]; // G5 -> C6

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        g.gain.setValueAtTime(0.001, startTime);
        g.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Deep Golden Gong for Post Publish (පින්කම සටහන් කළ විට)
   */
  playPublish() {
    if (!this.isEnabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [220, 440, 660];

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const gainVal = 0.22 / (i + 1);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gainVal, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.9);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Subtle soft click for back / navigation
   */
  playClick() {
    if (!this.isEnabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(g);
      g.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

export const SoundService = new SoundEngine();

/**
 * Mobile Haptic Vibration Helper
 */
export function triggerHaptic(pattern = 20) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {}
}
