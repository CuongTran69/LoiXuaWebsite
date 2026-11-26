import type { BGMPreset } from './types';

const noteHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const cap = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

const PARTIALS: Record<string, Array<[number, number, OscillatorType]>> = {
  keys: [[1, 0.75, 'sine'], [2, 0.2, 'sine'], [3, 0.07, 'sine']],
  bass: [[1, 0.88, 'sine'], [2, 0.17, 'sine']],
  pad: [[1, 0.55, 'sine'], [1.003, 0.32, 'sine'], [2, 0.12, 'sine']],
  flute: [[1, 0.85, 'sine'], [2, 0.1, 'sine'], [3, 0.04, 'sine']],
  zither: [[1, 0.7, 'sine'], [2, 0.31, 'sine'], [3, 0.15, 'sine']],
  celesta: [[1, 0.71, 'sine'], [2.01, 0.21, 'sine'], [3.93, 0.075, 'sine']],
  bell: [[1, 0.7, 'sine'], [2.006, 0.23, 'sine'], [2.71, 0.09, 'sine']],
  guitar: [[1, 0.76, 'sine'], [2, 0.31, 'sine'], [3, 0.13, 'sine']],
  marimba: [[1, 0.82, 'sine'], [3.98, 0.16, 'sine']],
};

const CONFIG: Record<string, [number, number, number]> = {
  keys: [0.018, 1.5, 0.22],
  bass: [0.012, 7.0, 0.1],
  pad: [0.75, 18.0, 1.05],
  flute: [0.14, 9.0, 0.22],
  zither: [0.003, 2.2, 0.19],
  celesta: [0.003, 1.75, 0.45],
  bell: [0.004, 2.6, 0.8],
  guitar: [0.004, 2.6, 0.15],
  marimba: [0.006, 2.0, 0.24],
};

interface ScheduledEvent {
  t: number;
  n: number | string;
  d: number;
  v: number;
  kind: string;
  volume: number;
  pan: number;
}

export class PoetryBGMPlayer {
  private volume: number;
  private duckFactor = 1;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private delay: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private events: ScheduledEvent[] = [];
  private idx = 0;
  private cycle = 0;
  private startAt = 0;
  private duration = 0;
  private sources: AudioScheduledSourceNode[] = [];
  public currentId: string | null = null;

  constructor(volume = 0.5) {
    this.volume = cap(volume, 0, 1);
  }

  private init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error('Web Audio API không khả dụng trên trình duyệt này');
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = this.volume * this.duckFactor;

    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8500;
    lowpass.Q.value = 0.4;
    this.master.connect(lowpass);
    lowpass.connect(c.destination);

    this.delay = c.createDelay(2);
    this.delay.delayTime.value = 0.17;
    const feedback = c.createGain();
    feedback.gain.value = 0.18;
    this.delay.connect(feedback);
    feedback.connect(this.delay);
    const wet = c.createGain();
    wet.gain.value = 0.13;
    this.delay.connect(wet);
    wet.connect(this.master);

    this.noiseBuffer = c.createBuffer(1, Math.ceil(c.sampleRate * 0.4), c.sampleRate);
    const arr = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < arr.length; i++) arr[i] = Math.random() * 2 - 1;
  }

  private makeBus() {
    if (!this.ctx || !this.master || !this.delay) return;
    const c = this.ctx;
    this.bus = c.createGain();
    this.bus.gain.setValueAtTime(0.0, c.currentTime);
    this.bus.gain.linearRampToValueAtTime(0.72, c.currentTime + 0.22);
    this.bus.connect(this.master);
    this.bus.connect(this.delay);
  }

  async play(preset: BGMPreset) {
    this.init();
    this.stop();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.makeBus();
    this.currentId = preset.id;
    this.duration = preset.loopSeconds;
    this.events = [];
    for (const tr of preset.tracks) {
      for (const n of tr.notes) {
        this.events.push({
          t: n.t,
          n: n.n,
          d: n.d,
          v: n.v,
          kind: tr.instrument,
          volume: tr.volume,
          pan: tr.pan,
        });
      }
    }
    this.events.sort((a, b) => a.t - b.t);
    this.idx = 0;
    this.cycle = 0;
    this.startAt = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.tick(), 100);
    this.tick();
  }

  private tick() {
    if (!this.bus || !this.ctx || this.events.length === 0) return;
    const ahead = this.ctx.currentTime + 0.42;
    while (this.startAt + this.cycle * this.duration + this.events[this.idx].t < ahead) {
      const ev = this.events[this.idx];
      const at = this.startAt + this.cycle * this.duration + ev.t;
      if (at > this.ctx.currentTime - 0.06) {
        this.voice(ev, Math.max(at, this.ctx.currentTime));
      }
      this.idx += 1;
      if (this.idx === this.events.length) {
        this.idx = 0;
        this.cycle += 1;
      }
    }
    if (this.sources.length > 900) {
      this.sources.splice(0, 500);
    }
  }

  private voice(ev: ScheduledEvent, at: number) {
    if (!this.ctx || !this.bus) return;
    if (typeof ev.n === 'string') {
      this.percussion(ev, at);
      return;
    }
    const c = this.ctx;
    const kind = ev.kind;
    const conf = CONFIG[kind] || CONFIG.keys;
    const freq = noteHz(ev.n);
    const [attack, decay, release] = conf;
    const length = Math.max(ev.d, 0.11);
    const end = at + length + release + 0.08;

    const envelope = c.createGain();
    const intensity = ev.volume * ev.v * 0.49;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(intensity, at + attack);
    if (['zither', 'celesta', 'bell', 'guitar', 'marimba', 'keys'].includes(kind)) {
      const expEnd = cap(length * 0.8, attack + 0.001, length);
      envelope.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, intensity * Math.exp(-expEnd / decay)),
        at + expEnd
      );
    }
    envelope.gain.setTargetAtTime(0.0001, at + length, release / 3);
    envelope.gain.setValueAtTime(0.0001, end);

    let dest: AudioNode = this.bus;
    if (typeof c.createStereoPanner === 'function') {
      const pan = c.createStereoPanner();
      pan.pan.value = ev.pan || 0;
      pan.connect(this.bus);
      dest = pan;
    }
    envelope.connect(dest);

    for (const [ratio, amp, wave] of PARTIALS[kind] || PARTIALS.keys) {
      const osc = c.createOscillator();
      const partial = c.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq * ratio, at);
      partial.gain.value = amp;
      osc.connect(partial);
      partial.connect(envelope);
      osc.start(at);
      osc.stop(end + 0.02);
      this.sources.push(osc);
    }
  }

  private percussion(ev: ScheduledEvent, at: number) {
    if (!this.ctx || !this.bus) return;
    const c = this.ctx;
    if (ev.n === 'kick') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(125, at);
      o.frequency.exponentialRampToValueAtTime(50, at + 0.07);
      g.gain.setValueAtTime(ev.volume * ev.v * 0.2, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
      o.connect(g);
      g.connect(this.bus);
      o.start(at);
      o.stop(at + 0.2);
      this.sources.push(o);
      return;
    }
    if (!this.noiseBuffer) return;
    const s = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const g = c.createGain();
    s.buffer = this.noiseBuffer;
    filter.type = ev.n === 'shaker' ? 'highpass' : 'bandpass';
    filter.frequency.value = ev.n === 'shaker' ? 3500 : 1400;
    g.gain.setValueAtTime(ev.volume * ev.v * 0.1, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (ev.n === 'shaker' ? 0.09 : 0.045));
    s.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    s.start(at);
    s.stop(at + 0.2);
    this.sources.push(s);
  }

  setVolume(n: number) {
    this.volume = cap(Number(n), 0, 1);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume * this.duckFactor, this.ctx.currentTime, 0.05);
    }
  }

  setDucked(ducked: boolean) {
    this.duckFactor = ducked ? 0.28 : 1;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume * this.duckFactor, this.ctx.currentTime, 0.15);
    }
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.bus) {
      const now = this.ctx.currentTime;
      this.bus.gain.cancelScheduledValues(now);
      this.bus.gain.setValueAtTime(this.bus.gain.value, now);
      this.bus.gain.linearRampToValueAtTime(0.0001, now + 0.2);
    }
    for (const source of this.sources) {
      try {
        if (this.ctx) source.stop(this.ctx.currentTime + 0.21);
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    this.bus = null;
    this.currentId = null;
  }
}
