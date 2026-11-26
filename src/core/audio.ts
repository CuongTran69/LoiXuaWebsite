import type { AudioManifest, BGMPreset, Saying } from './types';
import { PoetryBGMPlayer } from './bgm-player';

export const ZEN_MODES = [
  { id: 'off', title: 'Tắt', subtitle: 'Không nhạc nền', icon: '🔇' },
  { id: 'dem_trang', title: 'Đêm Trăng', subtitle: 'Ambient, không nhịp trống', icon: '🌙' },
  { id: 'loi_ru_que', title: 'Lời Ru Quê', subtitle: 'Ngũ cung, khúc ru 6/8', icon: '🎋' },
  { id: 'ben_hien_mua', title: 'Bên Hiên Mưa', subtitle: 'Waltz buồn, 3/4', icon: '🌧️' },
  { id: 'som_tren_lang', title: 'Sớm Trên Làng', subtitle: 'Acoustic pluck, 4/4', icon: '🌅' },
  { id: 'trang_tho', title: 'Trang Thơ', subtitle: 'Jazz-hop, piano điện', icon: '📖' },
] as const;

type Listener = () => void;

class WebAudioController {
  private audioEl: HTMLAudioElement | null = null;
  private bgm = new PoetryBGMPlayer(0.45);
  private listeners = new Set<Listener>();
  private playingId: string | null = null;
  private playingKind: 'verse' | 'meaning' | null = null;
  private isLoading = false;
  private zenModeId = 'off';
  private zenVolume = 0.45;
  private presets: Record<string, BGMPreset> | null = null;
  private manifest: AudioManifest | null = null;
  private speechSpeed = 1.0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    window.dispatchEvent(new CustomEvent('loixua-audio-change'));
    for (const fn of this.listeners) fn();
  }

  getState() {
    return {
      playingId: this.playingId,
      playingKind: this.playingKind,
      isLoading: this.isLoading,
      zenModeId: this.zenModeId,
      zenVolume: this.zenVolume,
      speechSpeed: this.speechSpeed,
    };
  }

  setManifest(manifest: AudioManifest) {
    this.manifest = manifest;
  }

  setPresets(presets: Record<string, BGMPreset>) {
    this.presets = presets;
  }

  setSpeechSpeed(rate: number) {
    this.speechSpeed = Math.max(0.7, Math.min(1.3, rate));
    if (this.audioEl) {
      this.audioEl.playbackRate = this.speechSpeed;
    }
    this.emit();
  }

  getAudioUrl(sayingId: string, kind: 'verse' | 'meaning'): string | null {
    if (!this.manifest) return null;
    const entry = this.manifest.files[sayingId];
    if (!entry) return null;
    const hash = kind === 'verse' ? entry.v : entry.m;
    if (!hash) return null;
    const base = this.manifest.cdnBaseUrl.replace(/\/+$/, '');
    return `${base}/${this.manifest.voice}/${sayingId}_${kind}_${hash}.m4a`;
  }

  stopSpeech() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.playingId = null;
    this.playingKind = null;
    this.isLoading = false;
    this.bgm.setDucked(false);
    this.emit();
  }

  async playSaying(
    saying: Saying,
    kind: 'verse' | 'meaning' = 'verse',
    explicitUrl?: string | null
  ): Promise<void> {
    if (this.playingId === saying.id && this.playingKind === kind) {
      this.stopSpeech();
      return;
    }

    this.stopSpeech();
    this.playingId = saying.id;
    this.playingKind = kind;
    this.isLoading = true;
    this.bgm.setDucked(true);
    this.emit();

    const url = explicitUrl ?? this.getAudioUrl(saying.id, kind);
    if (url) {
      const ok = await this.playUrl(url, saying.id, kind);
      if (ok) return;
    }

    // Fallback to browser Web Speech API (vi-VN)
    await this.playWebSpeech(
      kind === 'meaning' && saying.meaning ? saying.meaning : saying.text,
      saying.id,
      kind
    );
  }

  private playUrl(url: string, sayingId: string, kind: 'verse' | 'meaning'): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.playbackRate = this.speechSpeed;
      this.audioEl = audio;

      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const timeout = window.setTimeout(() => {
        audio.pause();
        done(false);
      }, 6000);

      audio.onplaying = () => {
        window.clearTimeout(timeout);
        if (this.playingId === sayingId && this.playingKind === kind) {
          this.isLoading = false;
          this.emit();
        }
      };

      audio.onended = () => {
        window.clearTimeout(timeout);
        if (this.playingId === sayingId && this.playingKind === kind) {
          this.playingId = null;
          this.playingKind = null;
          this.isLoading = false;
          this.bgm.setDucked(false);
          this.emit();
        }
        done(true);
      };

      audio.onerror = () => {
        window.clearTimeout(timeout);
        done(false);
      };

      audio.play().catch(() => {
        window.clearTimeout(timeout);
        done(false);
      });
    });
  }

  private playWebSpeech(text: string, sayingId: string, kind: 'verse' | 'meaning'): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        this.stopSpeech();
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'vi-VN';
      utter.rate = this.speechSpeed * 0.95;
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (viVoice) utter.voice = viVoice;

      this.isLoading = false;
      this.emit();

      utter.onend = () => {
        if (this.playingId === sayingId && this.playingKind === kind) {
          this.playingId = null;
          this.playingKind = null;
          this.bgm.setDucked(false);
          this.emit();
        }
        resolve();
      };
      utter.onerror = () => {
        this.stopSpeech();
        resolve();
      };
      window.speechSynthesis.speak(utter);
    });
  }

  async setZenMode(modeId: string, presets?: Record<string, BGMPreset>) {
    if (presets) this.presets = presets;
    this.zenModeId = modeId;
    if (modeId === 'off') {
      this.bgm.stop();
      this.emit();
      return;
    }
    const preset = this.presets?.[modeId];
    if (!preset) return;
    await this.bgm.play(preset);
    this.emit();
  }

  setZenVolume(v: number) {
    this.zenVolume = Math.max(0, Math.min(1, v));
    this.bgm.setVolume(this.zenVolume);
    this.emit();
  }

  stopZen() {
    this.zenModeId = 'off';
    this.bgm.stop();
    this.emit();
  }
}

export const audioController = new WebAudioController();
