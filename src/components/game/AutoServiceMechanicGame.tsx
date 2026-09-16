import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  Wrench, Disc, Play, Pause, CheckCircle2,
  Coins, Volume2, VolumeX, Sparkles, Terminal, Activity, 
  Car, Upload, RefreshCw, X, ChevronRight, ChevronUp, ChevronDown,
  MoreHorizontal, Check, EyeOff, Camera, Eye,
  Warehouse, Sliders, RotateCcw, Loader2, Music, Radio
} from 'lucide-react';

// ========================================================
// ЗВУКОВОЙ ДВИЖОК АВТОСЕРВИСА (Web Audio API)
// ========================================================
class AutoServiceAudioEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playImpactWrench() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const t = now + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320 - i * 20, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.03);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      }
    } catch {}
  }

  playTorqueClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  playOilPour() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const f = 240 + Math.random() * 160;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f + 90, t + 0.09);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {}
  }

  playAirHiss() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {}
  }

  playDiagnosticBeep(frequency = 1200) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  startCarEngine(onStarted?: () => void) {
    if (this.muted) {
      this.isEngineRunning = true;
      if (onStarted) onStarted();
      return;
    }
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const st = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, st);
        osc.frequency.linearRampToValueAtTime(60, st + 0.08);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(st);
        osc.stop(st + 0.08);
      }

      setTimeout(() => {
        if (!this.ctx) return;
        this.stopEngine();

        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 240;

        this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.engineGain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 0.3);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.isEngineRunning = true;
        if (onStarted) onStarted();
      }, 550);
    } catch {}
  }

  revEngine(rpm = 3000) {
    if (!this.isEngineRunning || !this.engineOsc || !this.ctx || this.muted) return;
    try {
      const freq = 45 + (rpm / 6000) * 85;
      this.engineOsc.frequency.linearRampToValueAtTime(freq, this.ctx.currentTime + 0.15);
      if (this.engineGain) {
        const vol = 0.14 + (rpm / 6000) * 0.12;
        this.engineGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.15);
      }
    } catch {}
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    this.isEngineRunning = false;
  }

  playCashSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {}
  }

  // ========================================================
  // ФОНОВАЯ МУЗЫКА (BGM СТУДИЯ РАЗРАБОТЧИКА)
  // ========================================================
  private bgmGain: GainNode | null = null;
  private bgmLoopTimer: number | null = null;
  private customAudioEl: HTMLAudioElement | null = null;
  public bgmPlaying: boolean = false;
  public currentTrackId: string = 'lofi';
  public currentTrackTitle: string = 'Lo-Fi Garage Chill';
  public bgmVolume: number = 0.35;

  setBgmVolume(val: number) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.muted ? 0 : this.bgmVolume, this.ctx.currentTime);
    }
    if (this.customAudioEl) {
      this.customAudioEl.volume = this.muted ? 0 : this.bgmVolume;
    }
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmLoopTimer) {
      clearInterval(this.bgmLoopTimer);
      this.bgmLoopTimer = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  playStation(stationId: 'lofi' | 'synthwave' | 'ambient' | 'rock') {
    this.init();
    this.stopBgm();
    this.currentTrackId = stationId;

    const titles: Record<string, string> = {
      lofi: 'Lo-Fi Garage Chill',
      synthwave: 'Synthwave Night Workshop',
      ambient: 'Ambient Mechanic Lounge',
      rock: 'Radio Rock Garage 104.5'
    };
    this.currentTrackTitle = titles[stationId] || 'Фоновая музыка';
    this.bgmPlaying = true;

    if (!this.ctx) return;
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
    }
    this.bgmGain.gain.setValueAtTime(this.muted ? 0 : this.bgmVolume, this.ctx.currentTime);

    let step = 0;
    const playStep = () => {
      if (!this.bgmPlaying || !this.ctx || this.muted) return;
      const now = this.ctx.currentTime;

      try {
        if (stationId === 'lofi') {
          // Мягкие джазовые аккорды Fender Rhodes + лоу-фай бит
          const chords = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 392.00], // Am7
            [174.61, 220.00, 261.63, 329.63], // Fmaj7
            [196.00, 246.94, 293.66, 349.23]  // G7
          ];
          const chord = chords[Math.floor(step / 4) % chords.length];

          if (step % 4 === 0) {
            chord.forEach((freq) => {
              const osc = this.ctx!.createOscillator();
              const g = this.ctx!.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, now);
              g.gain.setValueAtTime(0.06, now);
              g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
              osc.connect(g);
              g.connect(this.bgmGain!);
              osc.start(now);
              osc.stop(now + 1.8);
            });
          }

          if (step % 2 === 0) {
            const bassOsc = this.ctx.createOscillator();
            const bassG = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(chord[0] / 2, now);
            bassG.gain.setValueAtTime(0.12, now);
            bassG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            bassOsc.connect(bassG);
            bassG.connect(this.bgmGain!);
            bassOsc.start(now);
            bassOsc.stop(now + 0.6);
          }

          if (step % 4 === 0) {
            const kickOsc = this.ctx.createOscillator();
            const kickG = this.ctx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(120, now);
            kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
            kickG.gain.setValueAtTime(0.18, now);
            kickG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            kickOsc.connect(kickG);
            kickG.connect(this.bgmGain!);
            kickOsc.start(now);
            kickOsc.stop(now + 0.12);
          } else if (step % 4 === 2) {
            const snareOsc = this.ctx.createOscillator();
            const snareG = this.ctx.createGain();
            snareOsc.type = 'triangle';
            snareOsc.frequency.setValueAtTime(240, now);
            snareG.gain.setValueAtTime(0.08, now);
            snareG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            snareOsc.connect(snareG);
            snareG.connect(this.bgmGain!);
            snareOsc.start(now);
            snareOsc.stop(now + 0.08);
          }
        } else if (stationId === 'synthwave') {
          // Пульсирующий синтвейв бас
          const bassFreqs = [110, 110, 130.81, 130.81, 98, 98, 87.31, 87.31];
          const f = bassFreqs[step % bassFreqs.length];
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(0.1, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(g);
          g.connect(this.bgmGain!);
          osc.start(now);
          osc.stop(now + 0.22);

          const arpNotes = [440, 523.25, 659.25, 523.25, 659.25, 783.99, 659.25, 523.25];
          const arpNote = arpNotes[step % arpNotes.length];
          const arpOsc = this.ctx!.createOscillator();
          const arpG = this.ctx!.createGain();
          arpOsc.type = 'sine';
          arpOsc.frequency.setValueAtTime(arpNote, now);
          arpG.gain.setValueAtTime(0.04, now);
          arpG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          arpOsc.connect(arpG);
          arpG.connect(this.bgmGain!);
          arpOsc.start(now);
          arpOsc.stop(now + 0.18);
        } else if (stationId === 'ambient') {
          // Теплые пэды
          if (step % 8 === 0) {
            const notes = [174.61, 220, 261.63, 349.23];
            notes.forEach((freq) => {
              const osc = this.ctx!.createOscillator();
              const g = this.ctx!.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, now);
              g.gain.setValueAtTime(0.05, now);
              g.gain.linearRampToValueAtTime(0.09, now + 1.2);
              g.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
              osc.connect(g);
              g.connect(this.bgmGain!);
              osc.start(now);
              osc.stop(now + 3.8);
            });
          }
        } else if (stationId === 'rock') {
          // Гаражный овердрайв
          const riffs = [164.81, 196.00, 220.00, 196.00];
          const rf = riffs[step % riffs.length];
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(rf, now);
          g.gain.setValueAtTime(0.08, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(g);
          g.connect(this.bgmGain!);
          osc.start(now);
          osc.stop(now + 0.28);
        }
      } catch {}

      step++;
    };

    const intervalMs = stationId === 'synthwave' ? 240 : stationId === 'ambient' ? 600 : 420;
    playStep();
    this.bgmLoopTimer = window.setInterval(playStep, intervalMs);
  }

  playCustomAudioFile(url: string, title: string) {
    this.stopBgm();
    this.currentTrackId = 'custom';
    this.currentTrackTitle = title;
    this.bgmPlaying = true;

    if (!this.customAudioEl) {
      this.customAudioEl = new Audio();
      this.customAudioEl.loop = true;
    }
    this.customAudioEl.src = url;
    this.customAudioEl.volume = this.muted ? 0 : this.bgmVolume;
    this.customAudioEl.play().catch(() => {});
  }
}

interface VehicleClientConfig {
  id: string;
  modelName: string;
  bodyType: 'hatchback';
  clientName: string;
  licensePlate: string;
  color: string;
  orderTitle: string;
  initialIssues: { dtc: string; description: string; fixed: boolean }[];
}

const PRESET_VEHICLES: VehicleClientConfig[] = [
  {
    id: 'hatchback_blista',
    modelName: 'Blista Compact Sport',
    bodyType: 'hatchback',
    clientName: 'Dmitry_S[42]',
    licensePlate: 'SA • LS 4920',
    color: '#eab308',
    orderTitle: 'Комплексное ТО: Диагностика, 5W-40, Свеча №2, Колесо',
    initialIssues: [
      { dtc: 'P0524', description: 'Низкое давление масла (грязное)', fixed: false },
      { dtc: 'P0302', description: 'Пропуск искры в цил. №2', fixed: false },
      { dtc: 'C0035', description: 'Низкое давление шины (< 1.6 Bar)', fixed: false }
    ]
  },
  {
    id: 'hatchback_flash',
    modelName: 'Flash GT Turbo',
    bodyType: 'hatchback',
    clientName: 'Alex_V[78]',
    licensePlate: 'SA • SF 8821',
    color: '#2563eb',
    orderTitle: 'Плановое обслуживание перед заездом',
    initialIssues: [
      { dtc: 'P0524', description: 'Износ масла после трека', fixed: false },
      { dtc: 'P0302', description: 'Нагар на электроде свечи', fixed: false },
      { dtc: 'C0035', description: 'Утечка воздуха в шине', fixed: false }
    ]
  },
  {
    id: 'hatchback_club',
    modelName: 'Club City Edition',
    bodyType: 'hatchback',
    clientName: 'Mikhail_G[105]',
    licensePlate: 'SA • LV 3302',
    color: '#059669',
    orderTitle: 'Предпродажное ТО и сброс ошибок ЭБУ',
    initialIssues: [
      { dtc: 'P0524', description: 'Замена масла на синтетику 5W-40', fixed: false },
      { dtc: 'P0302', description: 'Слабая искра свечи зажигания', fixed: false },
      { dtc: 'C0035', description: 'Падение давления в шине 1.5 Bar', fixed: false }
    ]
  }
];

// Координаты хотспотов на 3D автомобиле
const HOTSPOTS_CONFIG = [
  { id: 'scan', label: 'OBD-II', icon: Terminal, pos: new THREE.Vector3(0, 1.15, 0.45) },
  { id: 'engine', label: 'Мотор', icon: Wrench, pos: new THREE.Vector3(0, 0.95, 1.35) },
  { id: 'wheel', label: 'Колесо', icon: Disc, pos: new THREE.Vector3(1.05, 0.45, 1.15) },
  { id: 'test', label: 'Сдача', icon: Activity, pos: new THREE.Vector3(-0.7, 1.1, -0.2) }
];

// Пресеты кинематографичных ракурсов камеры
const CAMERA_PRESETS = {
  overview: { pos: new THREE.Vector3(3.6, 1.8, 3.8), look: new THREE.Vector3(0, 0.65, 0) },
  scan: { pos: new THREE.Vector3(1.1, 1.4, 2.1), look: new THREE.Vector3(0, 0.85, 0.5) },
  engine: { pos: new THREE.Vector3(0.15, 1.65, 2.3), look: new THREE.Vector3(0, 0.75, 1.35) },
  wheel: { pos: new THREE.Vector3(1.9, 0.55, 1.35), look: new THREE.Vector3(0.95, 0.36, 1.15) },
  test: { pos: new THREE.Vector3(-2.8, 1.5, 1.6), look: new THREE.Vector3(-0.3, 0.7, 0) }
};

interface AutoServiceMechanicGameProps {
  onBackToFarm?: () => void;
  onClose?: () => void;
  onServiceFinish?: (reward: { money: number; exp?: number }) => void;
}

export default function AutoServiceMechanicGame({ 
  onBackToFarm, 
  onClose, 
  onServiceFinish 
}: AutoServiceMechanicGameProps) {
  // Выбранный автомобиль
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState<number>(0);
  const currentVehicle = PRESET_VEHICLES[currentVehicleIndex];

  // Активная вкладка (Диагностика | Капот | Колёса | Сдача)
  const [activeTab, setActiveTab] = useState<'scan' | 'engine' | 'wheel' | 'test'>('scan');
  
  // Режим чистого экрана (Zen Showroom - скрывает весь интерфейс для осмотра)
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Развернута ли детальная панель текущего шага
  const [isDetailExpanded, setIsDetailExpanded] = useState<boolean>(false);

  // Выпадающее меню быстрых настроек
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Модальные окна
  const [isCarModelModalOpen, setIsCarModelModalOpen] = useState<boolean>(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState<boolean>(false);
  const [devActiveTab, setDevActiveTab] = useState<'env' | 'bgm'>('env');

  // 3D Окружение / Фон (Гараж / Локация)
  const [hasCustomEnv, setHasCustomEnv] = useState<boolean>(false);
  const [customEnvName, setCustomEnvName] = useState<string | null>(null);
  const [hideDefaultWorkshop, setHideDefaultWorkshop] = useState<boolean>(false);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);
  const [envScale, setEnvScale] = useState<number>(1);
  const [envOffsetY, setEnvOffsetY] = useState<number>(0);
  const [envRotationY, setEnvRotationY] = useState<number>(0);

  // Фоновая музыка разработчика (BGM)
  const [bgmPlaying, setBgmPlaying] = useState<boolean>(false);
  const [bgmTrackId, setBgmTrackId] = useState<string>('lofi');
  const [bgmTrackTitle, setBgmTrackTitle] = useState<string>('Lo-Fi Garage Chill');
  const [bgmVolume, setBgmVolumeState] = useState<number>(0.35);
  const [customAudioFileName, setCustomAudioFileName] = useState<string | null>(null);

  // Звук
  const [muted, setMuted] = useState<boolean>(false);
  const audioRef = useRef<AutoServiceAudioEngine>(new AutoServiceAudioEngine());
  const audio = audioRef.current;

  // Баланс
  const [balance, setBalance] = useState<number>(1450);

  // Тост
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'money' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'money' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2000);
  }, []);

  // Этапы ремонта
  const [isHoodOpen, setIsHoodOpen] = useState<boolean>(false);
  const [oilLevel, setOilLevel] = useState<number>(20);
  const [sparkPlugFixed, setSparkPlugFixed] = useState<boolean>(false);

  // Колёса
  const [wheelNuts, setWheelNuts] = useState<boolean[]>([false, false, false, false]);
  const [tirePressure, setTirePressure] = useState<number>(1.5);
  const [wheelServiced, setWheelServiced] = useState<boolean>(false);

  // Диагностика
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [dtcCleared, setDtcCleared] = useState<boolean>(false);

  // Тест мотора
  const [engineStarted, setEngineStarted] = useState<boolean>(false);
  const [engineRpm, setEngineRpm] = useState<number>(850);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);

  // Экранные 2D координаты 3D хотспотов
  const [hotspotCoords, setHotspotCoords] = useState<{ [id: string]: { x: number; y: number; visible: boolean } }>({});

  // Three.js рефы
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carGroupRef = useRef<THREE.Group | null>(null);
  const workshopGroupRef = useRef<THREE.Group | null>(null);
  const customEnvGroupRef = useRef<THREE.Group | null>(null);
  const hoodPivotRef = useRef<THREE.Group | null>(null);
  const nutMeshesRef = useRef<THREE.Mesh[]>([]);
  const exhaustSmokeRef = useRef<THREE.Points | null>(null);

  // Рефы для плавной кинематографичной интерполяции камеры
  const cameraTargetPos = useRef<THREE.Vector3>(CAMERA_PRESETS.overview.pos.clone());
  const cameraLookTarget = useRef<THREE.Vector3>(CAMERA_PRESETS.overview.look.clone());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.muted = next;
    if (next) {
      audio.stopEngine();
      audio.setBgmVolume(0);
    } else {
      audio.setBgmVolume(bgmVolume);
    }
  };

  // ========================================================
  // КИНЕМАТОГРАФИЧНЫЙ НАЕЗД КАМЕРЫ НА ДЕТАЛЬ АВТО
  // ========================================================
  const glideCameraTo = useCallback((tab: 'scan' | 'engine' | 'wheel' | 'test') => {
    const preset = CAMERA_PRESETS[tab];
    if (preset) {
      cameraTargetPos.current.copy(preset.pos);
      cameraLookTarget.current.copy(preset.look);
    }
  }, []);

  const selectTask = (tab: 'scan' | 'engine' | 'wheel' | 'test') => {
    setActiveTab(tab);
    glideCameraTo(tab);
  };

  const resetCameraToOverview = () => {
    cameraTargetPos.current.copy(CAMERA_PRESETS.overview.pos);
    cameraLookTarget.current.copy(CAMERA_PRESETS.overview.look);
    showToast('Общий ракурс 360°', 'info');
  };

  // ========================================================
  // ИНИЦИАЛИЗАЦИЯ ЛЕГКОВЕСНОЙ 3D СЦЕНЫ И КИНЕМАТОГРАФИИ
  // ========================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Сцена
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0f17);
    scene.fog = new THREE.FogExp2(0x0c0f17, 0.022);

    // Камера
    const isMobile = width < 640;
    const camera = new THREE.PerspectiveCamera(isMobile ? 54 : 45, width / height, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.overview.pos);
    camera.lookAt(CAMERA_PRESETS.overview.look);
    cameraRef.current = camera;

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Освещение студийного автосервиса
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.7);
    scene.add(ambientLight);

    // Верхний ключевой свет с мягкими тенями
    const ceilingKeyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    ceilingKeyLight.position.set(2, 6, 2.5);
    ceilingKeyLight.castShadow = true;
    ceilingKeyLight.shadow.mapSize.width = 1024;
    ceilingKeyLight.shadow.mapSize.height = 1024;
    ceilingKeyLight.shadow.bias = -0.0001;
    scene.add(ceilingKeyLight);

    // Неоновая контрастная подсветка бокса
    const neonCyan = new THREE.PointLight(0x0ea5e9, 0.9, 12);
    neonCyan.position.set(-3.5, 2.5, 1.5);
    scene.add(neonCyan);

    const neonAmber = new THREE.PointLight(0xf59e0b, 0.7, 10);
    neonAmber.position.set(3.5, 2, -1.5);
    scene.add(neonAmber);

    // ========================================================
    // МИНИМАЛЬНЫЙ ЛЁГКИЙ 3D ФОН АВТОМАСТЕРСКОЙ (<500 полигонов!)
    // Не нагружает процессор и видеочип смартфона совершенно!
    // ========================================================
    const workshopGroup = new THREE.Group();
    workshopGroupRef.current = workshopGroup;
    scene.add(workshopGroup);

    // Группа для кастомного 3D фона (гаража / локации)
    const customEnvGroup = new THREE.Group();
    customEnvGroupRef.current = customEnvGroup;
    scene.add(customEnvGroup);

    // 1. Полированный пол сервисного бокса с разметкой
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x11141c,
      roughness: 0.25,
      metalness: 0.35
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    workshopGroup.add(floor);

    // Желто-черная разметка сервисного слота
    const slotBorder = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.45, 4),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
    );
    slotBorder.rotation.x = -Math.PI / 2;
    slotBorder.rotation.z = Math.PI / 4;
    slotBorder.position.y = 0.005;
    workshopGroup.add(slotBorder);

    // 2. Задняя стена бокса (стильный индустриальный антураж)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 8, 0.3), wallMat);
    backWall.position.set(0, 4, -6.5);
    backWall.receiveShadow = true;
    workshopGroup.add(backWall);

    // Неоновые полосы детейлинга на задней стене (MeshBasicMaterial = 0ms render time)
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-2, 0, 2].forEach((yOffset) => {
      const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.04, 0.04), neonMat);
      neonStrip.position.set(0, 3 + yOffset * 0.8, -6.32);
      workshopGroup.add(neonStrip);
    });

    // 3. Инструментальный верстак и стеллажи (low-poly декор)
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
    const toolChest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.7), chestMat);
    toolChest.position.set(-3.8, 0.55, -5.8);
    toolChest.castShadow = true;
    toolChest.receiveShadow = true;
    workshopGroup.add(toolChest);

    // Стойка колес на стене
    const rackTireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    [0.7, 1.3, 1.9].forEach((xOff, i) => {
      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 14), rackTireMat);
      spareTire.rotation.x = Math.PI / 2;
      spareTire.position.set(3.2 + i * 0.45, 1.4, -6.1);
      workshopGroup.add(spareTire);
    });

    // 4. Потолочные LED-лайтбоксы (дают красивые реалистичные блики на капоте)
    const ceilingLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1.2, 1.2].forEach((x) => {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 5.5), ceilingLightMat);
      tube.position.set(x, 4.2, 0);
      workshopGroup.add(tube);
    });

    // ========================================================
    // 3D АВТОМОБИЛЬ
    // ========================================================
    const carGroup = new THREE.Group();
    carGroup.position.set(0, 0, 0);
    carGroupRef.current = carGroup;
    scene.add(carGroup);

    buildProceduralHatchback(carGroup, currentVehicle.color);

    // Выхлопные частицы
    const smokeGeo = new THREE.BufferGeometry();
    const smokeCount = 30;
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3 + 0] = -0.6 + (Math.random() - 0.5) * 0.1;
      smokePos[i * 3 + 1] = 0.35 + Math.random() * 0.2;
      smokePos[i * 3 + 2] = -2.1 - Math.random() * 0.4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.16,
      transparent: true,
      opacity: 0
    });
    const exhaustSmoke = new THREE.Points(smokeGeo, smokeMat);
    carGroup.add(exhaustSmoke);
    exhaustSmokeRef.current = exhaustSmoke;

    // --------------------------------------------------------
    // ЖЕСТОВОЕ ВРАЩЕНИЕ КАМЕРЫ (СВОБОДНЫЙ СВАЙП)
    // --------------------------------------------------------
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let camTheta = Math.PI * 0.25;
    let camPhi = Math.PI * 0.36;
    let camRadius = isMobile ? 5.5 : 4.8;

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      camTheta -= dx * 0.007;
      camPhi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, camPhi - dy * 0.007));
      cameraTargetPos.current.x = cameraLookTarget.current.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta);
      cameraTargetPos.current.y = cameraLookTarget.current.y + camRadius * Math.cos(camPhi);
      cameraTargetPos.current.z = cameraLookTarget.current.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.target !== renderer.domElement) return;
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevMouseX;
        const dy = e.touches[0].clientY - prevMouseY;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
        camTheta -= dx * 0.008;
        camPhi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, camPhi - dy * 0.008));
        cameraTargetPos.current.x = cameraLookTarget.current.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta);
        cameraTargetPos.current.y = cameraLookTarget.current.y + camRadius * Math.cos(camPhi);
        cameraTargetPos.current.z = cameraLookTarget.current.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta);
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --------------------------------------------------------
    // ЦИКЛ АНИМАЦИИ: ПЛАВНЫЙ НАЕЗД КАМЕРЫ (LERP 60FPS)
    // --------------------------------------------------------
    let animId: number;
    const clock = new THREE.Clock();
    const tempVec = new THREE.Vector3();
    const currentLookPos = new THREE.Vector3(0, 0.65, 0);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Кинематографичный сглаженный наезд камеры
      camera.position.lerp(cameraTargetPos.current, 0.075);
      currentLookPos.lerp(cameraLookTarget.current, 0.075);
      camera.lookAt(currentLookPos);

      // Проекция 3D точек на экран
      const w = container.clientWidth;
      const h = container.clientHeight;
      const newCoords: { [id: string]: { x: number; y: number; visible: boolean } } = {};

      HOTSPOTS_CONFIG.forEach((hs) => {
        tempVec.copy(hs.pos);
        tempVec.project(camera);
        const isBehind = tempVec.z > 1;
        const x = (tempVec.x * 0.5 + 0.5) * w;
        const y = (-tempVec.y * 0.5 + 0.5) * h;
        newCoords[hs.id] = {
          x,
          y,
          visible: !isBehind && x > 20 && x < w - 20 && y > 60 && y < h - 90
        };
      });
      setHotspotCoords(newCoords);

      // Анимация выхлопа
      if (exhaustSmokeRef.current && exhaustSmokeRef.current.material instanceof THREE.PointsMaterial) {
        if (engineStarted) {
          exhaustSmokeRef.current.material.opacity = 0.45;
          const posAttr = exhaustSmokeRef.current.geometry.attributes.position;
          for (let i = 0; i < smokeCount; i++) {
            let z = posAttr.getZ(i);
            let y = posAttr.getY(i);
            z -= delta * (1.2 + (engineRpm / 6000) * 2.0);
            y += delta * 0.4;
            if (z < -3.2) {
              z = -2.1;
              y = 0.35;
            }
            posAttr.setZ(i, z);
            posAttr.setY(i, y);
          }
          posAttr.needsUpdate = true;
        } else {
          exhaustSmokeRef.current.material.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);

      window.removeEventListener('resize', onResize);
      audio.stopEngine();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentVehicleIndex]);

  // Генератор кузова хэтчбека
  const buildProceduralHatchback = (parent: THREE.Group, paintColor: string) => {
    while (parent.children.length > 0) {
      parent.remove(parent.children[0]);
    }
    nutMeshesRef.current = [];

    const carPaintMat = new THREE.MeshStandardMaterial({
      color: paintColor,
      metalness: 0.65,
      roughness: 0.25
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x14161b,
      roughness: 0.85
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12
    });

    // 1. Нижний кузов
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 3.8), carPaintMat);
    lowerBody.position.set(0, 0.62, 0);
    lowerBody.castShadow = true;
    parent.add(lowerBody);

    // 2. Крыша и остекление
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.56, 2.05), glassMat);
    cabin.position.set(0, 1.14, -0.2);
    parent.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.9), carPaintMat);
    roof.position.set(0, 1.44, -0.25);
    parent.add(roof);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.06, 0.3), blackTrimMat);
    spoiler.position.set(0, 1.44, -1.22);
    parent.add(spoiler);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.28, 0.35), blackTrimMat);
    frontBumper.position.set(0, 0.48, 1.95);
    parent.add(frontBumper);

    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.28, 0.35), blackTrimMat);
    rearBumper.position.set(0, 0.48, -1.95);
    parent.add(rearBumper);

    [-0.6, -0.45].forEach((x) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.35, 16), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.36, -2.05);
      parent.add(pipe);
    });

    // Фары
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
    [-0.65, 0.65].forEach((x) => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.1), headlightMat);
      headlight.position.set(x, 0.68, 1.92);
      parent.add(headlight);
    });

    // Фонари
    const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.55 });
    [-0.68, 0.68].forEach((x) => {
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), taillightMat);
      taillight.position.set(x, 0.72, -1.92);
      parent.add(taillight);
    });

    // 3. Капот
    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, 0.89, 0.85);
    parent.add(hoodPivot);
    hoodPivotRef.current = hoodPivot;

    const hoodLid = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.05, 1.15), carPaintMat);
    hoodLid.position.set(0, 0, 0.57);
    hoodPivot.add(hoodLid);

    // 4. Подкапотка
    const engineBay = new THREE.Group();
    engineBay.position.set(0, 0.58, 1.35);
    parent.add(engineBay);

    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.42, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
    );
    engineBay.add(engineBlock);

    const valveCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.12, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.5 })
    );
    valveCover.position.set(0, 0.25, 0);
    engineBay.add(valveCover);

    const oilCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2 })
    );
    oilCap.position.set(-0.25, 0.33, -0.1);
    engineBay.add(oilCap);

    [-0.24, -0.08, 0.08, 0.24].forEach((sx, idx) => {
      const plug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8),
        new THREE.MeshStandardMaterial({
          color: idx === 1 && !sparkPlugFixed ? 0xef4444 : 0x38bdf8
        })
      );
      plug.position.set(sx, 0.32, 0.05);
      engineBay.add(plug);
    });

    // 5. Колёса
    const wheelPositions = [
      { x: -0.92, y: 0.36, z: 1.15, isRightFront: false },
      { x: 0.92, y: 0.36, z: 1.15, isRightFront: true },
      { x: -0.92, y: 0.36, z: -1.15, isRightFront: false },
      { x: 0.92, y: 0.36, z: -1.15, isRightFront: false }
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.25, 24),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16), chromeMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      );
      caliper.position.set(pos.x > 0 ? -0.06 : 0.06, 0.11, 0);
      wheelGroup.add(caliper);

      if (pos.isRightFront) {
        const nutOffsets = [[0, 0.085], [0.085, 0], [0, -0.085], [-0.085, 0]];
        nutOffsets.forEach(([ny, nz]) => {
          const nutMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
          );
          nutMesh.rotation.z = Math.PI / 2;
          nutMesh.position.set(0.13, ny, nz);
          wheelGroup.add(nutMesh);
          nutMeshesRef.current.push(nutMesh);
        });
      }

      parent.add(wheelGroup);
    });
  };

  // Синхронизация трансформаций 3D фона (масштаб, высота Y, поворот)
  useEffect(() => {
    if (customEnvGroupRef.current) {
      customEnvGroupRef.current.scale.set(envScale, envScale, envScale);
      customEnvGroupRef.current.position.y = envOffsetY;
      customEnvGroupRef.current.rotation.y = (envRotationY * Math.PI) / 180;
    }
  }, [envScale, envOffsetY, envRotationY]);

  // Капот
  const handleToggleHood = () => {
    const nextState = !isHoodOpen;
    setIsHoodOpen(nextState);
    audio.playTorqueClick();

    if (hoodPivotRef.current) {
      const targetAngle = nextState ? -Math.PI * 0.28 : 0;
      let startTime: number | null = null;
      const startAngle = hoodPivotRef.current.rotation.x;

      const step = (now: number) => {
        if (!startTime) startTime = now;
        const p = Math.min(1, (now - startTime) / 350);
        if (hoodPivotRef.current) {
          hoodPivotRef.current.rotation.x = startAngle + (targetAngle - startAngle) * p;
        }
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          showToast(nextState ? 'Капот открыт' : 'Капот закрыт', 'info');
        }
      };
      requestAnimationFrame(step);
    }
  };

  // 1: Диагностика
  const handleClearDTC = () => {
    audio.playDiagnosticBeep(2100);
    setDtcCleared(true);
    showToast('Коды ошибок сброшены! Check Engine погас', 'success');
  };

  // 2: Под капотом
  const handlePourOil = () => {
    if (oilLevel >= 100) return;
    audio.playOilPour();
    const nextOil = Math.min(100, oilLevel + 25);
    setOilLevel(nextOil);

    if (nextOil >= 100) {
      audio.playTorqueClick();
      showToast('Залито масло 5W-40 (MAX)', 'success');
    } else {
      showToast(`Масло залито (+25%): ${nextOil}%`, 'info');
    }
  };

  const handleReplaceSparkPlug = () => {
    if (sparkPlugFixed) return;
    audio.playTorqueClick();
    setSparkPlugFixed(true);
    showToast('Свеча NGK Platinum установлена', 'success');
  };

  // 3: Колёса
  const handleQuickLoosenAllNuts = () => {
    audio.playImpactWrench();
    setWheelNuts([true, true, true, true]);
    nutMeshesRef.current.forEach(m => { m.visible = false; });
    showToast('Все 4 болта сняты гайковёртом', 'success');
  };

  const handlePumpTire = () => {
    if (tirePressure >= 2.3) return;
    audio.playAirHiss();
    const nextP = Number((tirePressure + 0.2).toFixed(1));
    setTirePressure(nextP);

    if (nextP >= 2.3) {
      audio.playTorqueClick();
      setWheelServiced(true);
      showToast('Давление в норме: 2.3 Bar', 'success');
    } else {
      showToast(`Подкачка: ${nextP} Bar`, 'info');
    }
  };

  // 4: Тест & Сдача
  const handleStartEngine = () => {
    if (engineStarted) {
      audio.stopEngine();
      setEngineStarted(false);
      setEngineRpm(0);
      showToast('Двигатель заглушен', 'info');
      return;
    }

    audio.startCarEngine(() => {
      setEngineStarted(true);
      setEngineRpm(850);
      showToast('Двигатель заведён (850 RPM)', 'success');
    });
  };

  const handleGasPedal = () => {
    if (!engineStarted) return;
    const targetRpm = Math.min(6200, engineRpm + 1500);
    setEngineRpm(targetRpm);
    audio.revEngine(targetRpm);

    setTimeout(() => {
      setEngineRpm(850);
      audio.revEngine(850);
    }, 450);
  };

  const handleFinishOrder = () => {
    const reward = 450;
    setBalance(b => b + reward);
    setOrderCompleted(true);
    audio.playCashSuccess();
    showToast(`Заказ закрыт! Получено: +$${reward}`, 'money');
    if (onServiceFinish) {
      onServiceFinish({ money: reward, exp: 25 });
    }
  };

  const handleNextVehicle = () => {
    audio.stopEngine();
    setEngineStarted(false);
    setIsHoodOpen(false);
    setOilLevel(20);
    setSparkPlugFixed(false);
    setWheelNuts([false, false, false, false]);
    setTirePressure(1.5);
    setWheelServiced(false);
    setIsScanning(false);
    setDtcCleared(false);
    setOrderCompleted(false);
    setActiveTab('scan');
    setIsMenuOpen(false);

    const nextIdx = (currentVehicleIndex + 1) % PRESET_VEHICLES.length;
    setCurrentVehicleIndex(nextIdx);

    const nextV = PRESET_VEHICLES[nextIdx];
    showToast(`Заехал ${nextV.modelName}`, 'info');
    glideCameraTo('scan');
  };

  // Загрузка 3D авто
  const handleCarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !carGroupRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result;
      if (!contents) return;

      const loader = new GLTFLoader();
      loader.parse(
        contents as ArrayBuffer,
        '',
        (gltf) => {
          if (carGroupRef.current) {
            while (carGroupRef.current.children.length > 0) {
              carGroupRef.current.remove(carGroupRef.current.children[0]);
            }
            const model = gltf.scene;
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -bbox.min.y;
            model.position.z = -center.z;

            carGroupRef.current.add(model);
            setIsCarModelModalOpen(false);
            showToast(`Авто ${file.name} загружено!`, 'success');
          }
        },
        () => {
          showToast('Ошибка загрузки авто', 'info');
        }
      );
    };
    reader.readAsArrayBuffer(file);
  };

  // ========================================================
  // ЗАГРУЗКА 3D ФОНА / ЛОКАЦИИ ГАРАЖА
  // ========================================================
  const loadCustomEnvironment = (model: THREE.Group, name: string) => {
    if (!customEnvGroupRef.current) return;

    while (customEnvGroupRef.current.children.length > 0) {
      customEnvGroupRef.current.remove(customEnvGroupRef.current.children[0]);
    }

    // Вычисляем габариты модели и выравниваем по полу и центру
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());

    model.position.x = -center.x;
    model.position.y = -bbox.min.y;
    model.position.z = -center.z;

    // Включаем прием теней для пола и стен загруженной модели
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    customEnvGroupRef.current.add(model);
    setHasCustomEnv(true);
    setCustomEnvName(name);

    if (hideDefaultWorkshop && workshopGroupRef.current) {
      workshopGroupRef.current.visible = false;
    }

    showToast(`3D локация "${name}" загружена!`, 'success');
  };

  const handleLoadGarageGlb = () => {
    setIsLoadingEnv(true);
    showToast('Загрузка garage.glb...', 'info');

    const loader = new GLTFLoader();
    loader.load(
      '/models/3dlocation/garage.glb',
      (gltf) => {
        setIsLoadingEnv(false);
        loadCustomEnvironment(gltf.scene, 'garage.glb');
      },
      undefined,
      (err) => {
        setIsLoadingEnv(false);
        console.warn('garage.glb not found at /models/3dlocation/garage.glb', err);
        showToast('Файл garage.glb пока не найден в public/models/3dlocation/. Выберите файл с диска!', 'info');
      }
    );
  };

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingEnv(true);
    showToast(`Загрузка 3D фона ${file.name}...`, 'info');

    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result;
      if (!contents) {
        setIsLoadingEnv(false);
        return;
      }

      const loader = new GLTFLoader();
      loader.parse(
        contents as ArrayBuffer,
        '',
        (gltf) => {
          setIsLoadingEnv(false);
          loadCustomEnvironment(gltf.scene, file.name);
        },
        (error) => {
          setIsLoadingEnv(false);
          console.error(error);
          showToast('Ошибка парсинга 3D модели фона', 'info');
        }
      );
    };
    reader.onerror = () => {
      setIsLoadingEnv(false);
      showToast('Не удалось прочитать файл', 'info');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetToDefaultEnv = () => {
    if (customEnvGroupRef.current) {
      while (customEnvGroupRef.current.children.length > 0) {
        customEnvGroupRef.current.remove(customEnvGroupRef.current.children[0]);
      }
    }
    if (workshopGroupRef.current) {
      workshopGroupRef.current.visible = true;
    }
    setHasCustomEnv(false);
    setCustomEnvName(null);
    showToast('Стандартный абстрактный 3D бокс восстановлен', 'info');
  };

  const handleToggleHideDefaultWorkshop = () => {
    const next = !hideDefaultWorkshop;
    setHideDefaultWorkshop(next);
    if (workshopGroupRef.current) {
      workshopGroupRef.current.visible = !next || !hasCustomEnv;
    }
  };

  // ========================================================
  // УПРАВЛЕНИЕ ФОНОВОЙ МУЗЫКОЙ (DEV BGM STUDIO)
  // ========================================================
  const handleSelectBgmStation = (stationId: 'lofi' | 'synthwave' | 'ambient' | 'rock') => {
    audio.playStation(stationId);
    setBgmPlaying(true);
    setBgmTrackId(stationId);
    setBgmTrackTitle(audio.currentTrackTitle);
    showToast(`Радио: ${audio.currentTrackTitle}`, 'info');
  };

  const handleToggleBgmPlay = () => {
    if (bgmPlaying) {
      audio.stopBgm();
      setBgmPlaying(false);
      showToast('Фоновая музыка на паузе', 'info');
    } else {
      if (bgmTrackId === 'custom' && customAudioFileName) {
        audio.playStation('lofi');
        setBgmTrackId('lofi');
        setBgmTrackTitle('Lo-Fi Garage Chill');
      } else {
        audio.playStation(bgmTrackId as any);
      }
      setBgmPlaying(true);
      showToast(`Играет: ${audio.currentTrackTitle}`, 'info');
    }
  };

  const handleBgmVolumeChange = (vol: number) => {
    setBgmVolumeState(vol);
    audio.setBgmVolume(vol);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    audio.playCustomAudioFile(url, file.name);
    setBgmPlaying(true);
    setBgmTrackId('custom');
    setBgmTrackTitle(file.name);
    setCustomAudioFileName(file.name);
    showToast(`Трек ${file.name} запущен!`, 'success');
  };

  const allServicesDone = dtcCleared && oilLevel >= 100 && sparkPlugFixed && wheelServiced && tirePressure >= 2.2;

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0a0c13] font-sans text-stone-100">
      
      {/* ======================================================== */}
      {/* THREE.JS ПОЛНОЭКРАННЫЙ ВЬЮПОРТ (С КИНЕМАТОГРАФИЧНЫМИ НАЕЗДАМИ) */}
      {/* ======================================================== */}
      <div 
        ref={mountRef} 
        onClick={() => {
          if (isZenMode) setIsZenMode(false);
          if (isMenuOpen) setIsMenuOpen(false);
        }}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-10" 
      />

      {/* ======================================================== */}
      {/* ВСПЛЫВАЮЩИЙ ТОСТ */}
      {/* ======================================================== */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[90vw]">
          <div className={`px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-2xl border flex items-center gap-2 text-xs font-semibold tracking-wide whitespace-nowrap ${
            toast.type === 'money'
              ? 'bg-emerald-500/90 text-stone-950 border-emerald-300 shadow-emerald-500/20'
              : toast.type === 'success'
              ? 'bg-sky-500/90 text-stone-950 border-sky-300 shadow-sky-500/20'
              : 'bg-zinc-900/90 text-zinc-100 border-zinc-700/70 shadow-black/80'
          }`}>
            {toast.type === 'money' ? <Coins size={13} /> : <Sparkles size={13} />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ИНТЕРАКТИВНЫЕ 3D ХОТСП-МАРКЕРЫ НАД МАШИНОЙ В СЦЕНЕ */}
      {/* ======================================================== */}
      {!isZenMode && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {HOTSPOTS_CONFIG.map((hs) => {
            const coords = hotspotCoords[hs.id];
            if (!coords || !coords.visible) return null;

            const isDone = 
              (hs.id === 'scan' && dtcCleared) ||
              (hs.id === 'engine' && oilLevel >= 95 && sparkPlugFixed) ||
              (hs.id === 'wheel' && wheelServiced && wheelNuts.every(Boolean)) ||
              (hs.id === 'test' && orderCompleted);

            const isSelected = activeTab === hs.id;
            const Icon = hs.icon;

            return (
              <div
                key={hs.id}
                style={{
                  transform: `translate(${coords.x}px, ${coords.y}px) translate(-50%, -50%)`,
                  position: 'absolute'
                }}
                className="pointer-events-auto transition-transform duration-75"
              >
                <button
                  onClick={() => selectTask(hs.id as any)}
                  className={`group relative flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full backdrop-blur-xl border transition-all active:scale-95 shadow-xl ${
                    isSelected
                      ? 'bg-white text-zinc-950 border-white ring-4 ring-sky-400/30 scale-110 font-bold'
                      : isDone
                      ? 'bg-zinc-950/70 text-emerald-400 border-emerald-500/40 hover:bg-zinc-900'
                      : 'bg-zinc-950/75 text-zinc-300 border-white/20 hover:border-white/40 hover:bg-zinc-900'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected
                      ? 'bg-zinc-950 text-white'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-zinc-200'
                  }`}>
                    {isDone ? <Check size={11} /> : <Icon size={11} />}
                  </span>
                  
                  <span className="text-[11px] whitespace-nowrap tracking-tight font-medium">
                    {hs.label}
                  </span>

                  {!isDone && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping opacity-75" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ВЕРХНИЙ МИКРО-ПИЛЛ (ЧИСТЫЙ МИНИМАЛИЗМ) */}
      {/* ======================================================== */}
      {!isZenMode && (
        <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/75 border border-white/10 shadow-2xl backdrop-blur-2xl pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-xs font-bold text-white tracking-tight truncate max-w-[130px] xs:max-w-none">
              {currentVehicle.modelName}
            </span>
            <span className="text-[10px] font-mono text-amber-300/90 pl-1 border-l border-white/10">
              {currentVehicle.licensePlate}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/75 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl">
              <Coins size={13} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 font-mono tracking-tight">${balance}</span>
            </div>

            {/* Кнопка сброса на общий кинематографичный ракурс */}
            <button
              onClick={resetCameraToOverview}
              className="p-2 rounded-full bg-zinc-950/75 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all shadow-xl active:scale-95"
              title="Общий вид 360°"
            >
              <Camera size={14} />
            </button>

            {/* Режим чистого экрана (Zen Showroom) */}
            <button
              onClick={() => {
                setIsZenMode(true);
                showToast('Режим чистого экрана (тапните экран для возврата)', 'info');
              }}
              className="p-2 rounded-full bg-zinc-950/75 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all shadow-xl active:scale-95"
              title="Скрыть интерфейс"
            >
              <EyeOff size={14} />
            </button>

            {/* Меню дополнительных действий */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full bg-zinc-950/75 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all shadow-xl active:scale-95"
                title="Меню настроек"
              >
                <MoreHorizontal size={14} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-10 w-48 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-3xl p-1.5 space-y-1 z-40 animate-in fade-in">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      resetCameraToOverview();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                  >
                    <Camera size={13} className="text-amber-400" />
                    <span>Общий ракурс 360°</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      toggleMute();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                  >
                    {muted ? <VolumeX size={13} className="text-rose-400" /> : <Volume2 size={13} className="text-emerald-400" />}
                    <span>{muted ? 'Включить звук' : 'Выключить звук'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Кнопка закрытия / возврата */}
            {(onClose || onBackToFarm) && (
              <button
                onClick={() => {
                  if (onClose) onClose();
                  else if (onBackToFarm) onBackToFarm();
                }}
                className="p-2 rounded-full bg-zinc-950/75 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 transition-all shadow-xl active:scale-95"
                title="Выйти из автосервиса"
              >
                <X size={14} />
              </button>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ДИНАМИЧЕСКИЙ ОСТРОВОК ДЕЙСТВИЯ (ВЫСОТА ВСЕГО ~58px) */}
      {/* ======================================================== */}
      {!isZenMode && (
        <div className="fixed bottom-3 left-0 right-0 z-30 max-w-md mx-auto w-full px-3 pointer-events-auto">
          <div className="rounded-2xl bg-zinc-950/85 border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden flex flex-col transition-all">
            
            <div className="p-2 flex items-center justify-between gap-2">
              
              <div className="flex items-center gap-1 pl-1">
                {[
                  { id: 'scan', icon: Terminal, done: dtcCleared },
                  { id: 'engine', icon: Wrench, done: oilLevel >= 95 && sparkPlugFixed },
                  { id: 'wheel', icon: Disc, done: wheelServiced && wheelNuts.every(Boolean) },
                  { id: 'test', icon: Activity, done: orderCompleted }
                ].map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = activeTab === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectTask(s.id as any)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all relative ${
                        isActive
                          ? 'bg-white text-zinc-950 font-bold shadow-md'
                          : s.done
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                      title={`Шаг ${idx + 1}`}
                    >
                      {s.done ? <Check size={12} /> : <Icon size={12} />}
                    </button>
                  );
                })}
              </div>

              <div className="w-[1px] h-6 bg-white/10" />

              <div className="flex-1 flex items-center justify-end gap-1.5">
                
                {/* 1. ДИАГНОСТИКА */}
                {activeTab === 'scan' && (
                  <>
                    {!dtcCleared ? (
                      <button
                        onClick={handleClearDTC}
                        className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                      >
                        <Terminal size={14} />
                        <span>Сбросить 3 DTC</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => selectTask('engine')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} />
                        <span>ЭБУ чисто • К капоту</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </>
                )}

                {/* 2. ПОД КАПОТОМ */}
                {activeTab === 'engine' && (
                  <>
                    {!isHoodOpen ? (
                      <button
                        onClick={handleToggleHood}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                      >
                        <Wrench size={14} />
                        <span>Открыть капот</span>
                      </button>
                    ) : oilLevel < 100 ? (
                      <button
                        onClick={handlePourOil}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                      >
                        <Sparkles size={14} />
                        <span>Залить 5W-40 ({oilLevel}%)</span>
                      </button>
                    ) : !sparkPlugFixed ? (
                      <button
                        onClick={handleReplaceSparkPlug}
                        className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                      >
                        <Sparkles size={14} />
                        <span>Заменить свечу #2</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => selectTask('wheel')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} />
                        <span>Мотор готов • К колесу</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </>
                )}

                {/* 3. КОЛЕСО */}
                {activeTab === 'wheel' && (
                  <>
                    {!wheelNuts.every(Boolean) ? (
                      <button
                        onClick={handleQuickLoosenAllNuts}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                      >
                        <Disc size={14} />
                        <span>Снять болты ({wheelNuts.filter(Boolean).length}/4)</span>
                      </button>
                    ) : tirePressure < 2.3 ? (
                      <button
                        onClick={handlePumpTire}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                      >
                        <Sparkles size={14} />
                        <span>Подкачать ({tirePressure} Bar)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => selectTask('test')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} />
                        <span>Колесо OK • К сдаче</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </>
                )}

                {/* 4. ТЕСТ И СДАЧА */}
                {activeTab === 'test' && (
                  <>
                    {!engineStarted ? (
                      <button
                        onClick={handleStartEngine}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        <Play size={14} />
                        <span>Завести мотор</span>
                      </button>
                    ) : !orderCompleted ? (
                      <button
                        onClick={handleFinishOrder}
                        disabled={!allServicesDone}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/25"
                      >
                        <CheckCircle2 size={14} />
                        <span>Сдать авто (+$450)</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleNextVehicle}
                        className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <RefreshCw size={14} />
                        <span>Следующий авто</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  title={isDetailExpanded ? 'Скрыть детали' : 'Подробности'}
                >
                  {isDetailExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>

            {/* Раскрывающиеся подробности */}
            {isDetailExpanded && (
              <div className="p-3 bg-white/[0.02] border-t border-white/5 space-y-2 text-xs animate-in slide-in-from-bottom-2">
                {activeTab === 'scan' && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-zinc-400 font-medium">Диагностические коды:</div>
                    {currentVehicle.initialIssues.map((issue, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-black/40">
                        <span className={dtcCleared ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
                          [{issue.dtc}]
                        </span>
                        <span className="text-zinc-300 truncate pl-2">{issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'engine' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Уровень масла 5W-40:</span>
                      <span className="font-mono font-bold text-amber-400">{oilLevel}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${oilLevel}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Свеча цилиндра #2:</span>
                      <span className={sparkPlugFixed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {sparkPlugFixed ? 'NGK Platinum ✓' : 'Нагар и пропуск'}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'wheel' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Ступичные болты:</span>
                      <span className="font-mono font-bold text-indigo-400">{wheelNuts.filter(Boolean).length} / 4 снято</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Давление шины:</span>
                      <span className="font-mono font-bold text-indigo-400">{tirePressure} Bar (норма 2.3)</span>
                    </div>
                  </div>
                )}

                {activeTab === 'test' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Обороты мотора:</span>
                      <span className="font-mono font-bold text-emerald-400">{engineStarted ? `${engineRpm} RPM` : '0 (Заглушен)'}</span>
                    </div>
                    {engineStarted && (
                      <button
                        onClick={handleGasPedal}
                        className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                      >
                        Педаль газа (Газануть)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* КНОПКА ЗАПУСКА РЕДАКТОРА РАЗРАБОТЧИКА В ФУТЕРЕ */}
            <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-white/5 bg-black/40">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <span>СТО 3D</span>
                <span>•</span>
                <span className="text-zinc-400 truncate max-w-[120px]">{hasCustomEnv ? customEnvName : 'Абстрактный бокс'}</span>
              </div>

              <button
                onClick={() => setIsDevModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/60 text-[11px] font-mono font-medium text-amber-300 shadow-md flex items-center gap-1.5 transition-all active:scale-95 group"
                title="Редактор разработчика: 3D Фон и Фоновая Музыка"
              >
                <Sliders size={12} className="text-amber-400 group-hover:rotate-45 transition-transform" />
                <span>Dev Studio</span>
                {hasCustomEnv && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="Кастомный фон активен" />
                )}
                {bgmPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_6px_#818cf8]" title="BGM играет" />
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* МОДАЛЬНОЕ ОКНО: ЗАГРУЗКА 3D АВТОМОБИЛЯ */}
      {/* ======================================================== */}
      {isCarModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Загрузка модели авто (.glb)</h3>
              <button
                onClick={() => setIsCarModelModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <label className="block w-full">
              <div className="w-full py-2.5 px-4 rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98">
                <Upload size={14} />
                <span>Выбрать .glb авто с диска</span>
              </div>
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleCarFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* РЕДАКТОР РАЗРАБОТЧИКА (DEV STUDIO: 3D ОКРУЖЕНИЕ И МУЗЫКА) */}
      {/* ======================================================== */}
      {isDevModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-amber-500/30 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 max-h-[90vh] overflow-y-auto [scrollbar-width:none]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Sliders size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">Dev Studio</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">Developer</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Редактор 3D окружения и фоновой музыки</p>
                </div>
              </div>
              <button
                onClick={() => setIsDevModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Вкладки переключения: Окружение / Музыка */}
            <div className="flex p-1 rounded-2xl bg-white/[0.04] border border-white/10 gap-1">
              <button
                onClick={() => setDevActiveTab('env')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  devActiveTab === 'env'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Warehouse size={14} />
                <span>3D Окружение</span>
                {hasCustomEnv && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>

              <button
                onClick={() => setDevActiveTab('bgm')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  devActiveTab === 'bgm'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Music size={14} />
                <span>Фоновая музыка</span>
                {bgmPlaying && <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />}
              </button>
            </div>

            {/* TAB 1: 3D ОКРУЖЕНИЕ */}
            {devActiveTab === 'env' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Текущий статус локации */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasCustomEnv ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {hasCustomEnv ? customEnvName : 'Минимальный абстрактный 3D бокс'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {hasCustomEnv ? 'Пользовательская 3D локация активна' : 'Стандартный минималистичный бокс (60 FPS)'}
                      </div>
                    </div>
                  </div>

                  {hasCustomEnv && (
                    <button
                      onClick={handleResetToDefaultEnv}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                      title="Вернуть дефолтный бокс"
                    >
                      <RotateCcw size={12} />
                      <span>Сброс</span>
                    </button>
                  )}
                </div>

                {/* Варианты загрузки */}
                <div className="space-y-2">
                  {/* Кнопка 1: garage.glb */}
                  <button
                    disabled={isLoadingEnv}
                    onClick={handleLoadGarageGlb}
                    className="w-full p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-amber-500/40 text-left transition-all group active:scale-98 flex items-center justify-between gap-3 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {isLoadingEnv ? <Loader2 size={16} className="animate-spin" /> : <Warehouse size={16} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                          Загрузить garage.glb
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          public/models/3dlocation/garage.glb
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                  </button>

                  {/* Кнопка 2: Выбрать .glb с диска */}
                  <label className="block w-full">
                    <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Upload size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            Загрузить свой 3D фон (.glb / .gltf)
                          </div>
                          <div className="text-[10px] text-amber-300/80">
                            Любой файл гаража, ангара или улицы с устройства
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-amber-400 shrink-0" />
                    </div>
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleEnvFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Настройки подгонки модели (Масштаб, высота Y, поворот) */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Sliders size={13} className="text-amber-400" />
                      <span>Подгонка 3D фона</span>
                    </div>
                    
                    {/* Чекбокс скрытия базового бокса */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideDefaultWorkshop}
                        onChange={handleToggleHideDefaultWorkshop}
                        className="w-3.5 h-3.5 rounded bg-zinc-800 border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-zinc-400">Скрыть абстрактный бокс</span>
                    </label>
                  </div>

                  {/* Слайдер Масштаб */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Масштаб (Scale):</span>
                      <span className="font-mono text-zinc-200 font-bold">{envScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={envScale}
                      onChange={(e) => setEnvScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Слайдер Высота Y */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Смещение по высоте (Y):</span>
                      <span className="font-mono text-zinc-200 font-bold">{envOffsetY > 0 ? `+${envOffsetY.toFixed(2)}` : envOffsetY.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="2.0"
                      step="0.05"
                      value={envOffsetY}
                      onChange={(e) => setEnvOffsetY(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Слайдер Поворот Y */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Поворот (Rotation):</span>
                      <span className="font-mono text-zinc-200 font-bold">{envRotationY}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={envRotationY}
                      onChange={(e) => setEnvRotationY(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        setEnvScale(1);
                        setEnvOffsetY(0);
                        setEnvRotationY(0);
                        showToast('Параметры сброшены', 'info');
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                    >
                      Сбросить масштаб и положение (1.0x / 0m / 0°)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ФОНОВАЯ МУЗЫКА (BGM STUDIO) */}
            {devActiveTab === 'bgm' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Текущий плеер-статус */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bgmPlaying ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40' : 'bg-white/10 text-zinc-400'}`}>
                        <Music size={15} className={bgmPlaying ? 'animate-bounce' : ''} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {bgmTrackTitle}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${bgmPlaying ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <span>{bgmPlaying ? 'Воспроизводится' : 'На паузе'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleBgmPlay}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
                        bgmPlaying 
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40' 
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-lg'
                      }`}
                    >
                      {bgmPlaying ? <Pause size={13} /> : <Play size={13} />}
                      <span>{bgmPlaying ? 'Пауза' : 'Играть'}</span>
                    </button>
                  </div>

                  {/* Слайдер громкости BGM */}
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Volume2 size={13} className="text-amber-400" />
                        <span>Громкость музыки:</span>
                      </span>
                      <span className="font-mono text-zinc-200 font-bold">{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={bgmVolume}
                      onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Встроенные радиостанции автосервиса */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Radio size={13} className="text-amber-400" />
                    <span>Радиостанции автосервиса (Встроенный синтезатор):</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'lofi', name: 'Lo-Fi Garage Chill', desc: 'Мягкий бит, Rhodes аккорды и спокойная атмосфера' },
                      { id: 'synthwave', name: 'Synthwave Night Workshop', desc: '80s пульсирующий арпеджио и ночной драйв' },
                      { id: 'ambient', name: 'Ambient Mechanic Lounge', desc: 'Глубокий релакс, теплые кинематографичные пэды' },
                      { id: 'rock', name: 'Radio Rock Garage 104.5', desc: 'Овердрайв риффы для активного ремонта' }
                    ].map((st) => {
                      const isSelected = bgmTrackId === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => handleSelectBgmStation(st.id as any)}
                          className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 active:scale-98 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-white'
                              : 'bg-zinc-900/70 hover:bg-zinc-800 border-white/5 text-zinc-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-zinc-200'}`}>
                              {st.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {st.desc}
                            </div>
                          </div>
                          {isSelected && bgmPlaying ? (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                          ) : (
                            <Play size={12} className="text-zinc-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Загрузка собственного аудио-трека */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Upload size={13} className="text-amber-400" />
                    <span>Загрузка своего аудиофайла:</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Программист может загрузить любой MP3 / WAV / OGG трек, и он будет воспроизводиться по кругу.
                  </p>

                  <label className="block w-full">
                    <div className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-amber-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98">
                      <Upload size={14} />
                      <span>Выбрать аудио (.mp3, .wav, .ogg)</span>
                    </div>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg"
                      onChange={handleCustomAudioUpload}
                      className="hidden"
                    />
                  </label>

                  {customAudioFileName && (
                    <div className="text-[10px] text-emerald-400 font-mono truncate">
                      Загружен: {customAudioFileName}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
