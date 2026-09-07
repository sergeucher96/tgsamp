import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { 
  Truck, Volume2, VolumeX, RefreshCw, Trophy, Clock,
  DollarSign, Package, Footprints, AlertCircle, Compass, RotateCcw,
  User, Upload, Check, Sparkles, X, FileCode, Play, Layers,
  Maximize2, Minimize2
} from 'lucide-react';

// Web Audio API движок для аутентичных звуков SA-MP фермы
class SampFarmAudio {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playFootstep() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
    } catch {}
  }

  playPickBush() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.Q.setValueAtTime(2, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  playThrowInTruck() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.28);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.29);

      const bSize = this.ctx.sampleRate * 0.12;
      const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bSize; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.25));
      }
      const n = this.ctx.createBufferSource();
      n.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(800, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.35, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      n.connect(f);
      f.connect(ng);
      ng.connect(this.ctx.destination);
      n.start(t);
    } catch {}
  }

  playSampMoney() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + idx * 0.08);
        gain.gain.setValueAtTime(0.3, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.28);
      });
    } catch {}
  }
}

const sampAudio = new SampFarmAudio();

export interface FarmHarvestGameProps {
  onHarvestFinish?: (reward: { money: number; exp: number; cropsCount: number; bonus: string }) => void;
  onClose?: () => void;
}

interface BushData {
  id: number;
  mesh: THREE.Group;
  bushMesh: THREE.Mesh;
  worldPos: THREE.Vector3;
  isReady: boolean;
  growth: number;
}

export type SkinPreset = 'farmer' | 'cj' | 'grove' | 'builder' | 'custom';

export const FarmHarvestGame: React.FC<FarmHarvestGameProps> = ({
  onHarvestFinish,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game states
  const [hasBushInHands, setHasBushInHands] = useState(false);
  const [truckCropsCount, setTruckCropsCount] = useState(0);
  const truckMaxCapacity = 10;
  const [totalEarned, setTotalEarned] = useState(0);
  const [shiftTime, setShiftTime] = useState(90);
  const [isShiftComplete, setIsShiftComplete] = useState(false);
  const [actionTextDraw, setActionTextDraw] = useState('КЛИКНИТЕ НА СПЕЛЫЙ ЗЕЛЕНЫЙ КУСТ В ПОЛЕ');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [harvestProgress, setHarvestProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Character Skin & Custom Model states
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<SkinPreset>('farmer');
  const [customModelFileName, setCustomModelFileName] = useState<string | null>(null);
  const [customModelInfo, setCustomModelInfo] = useState<string | null>(null);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  // References for Three.js state
  const bushesRef = useRef<BushData[]>([]);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const playerVisualRootRef = useRef<THREE.Group | null>(null);
  const playerTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const playerCarryingBushRef = useRef<THREE.Mesh | null>(null);
  const truckBushesMeshesRef = useRef<THREE.Mesh[]>([]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);

  const hasBushRef = useRef(false);
  hasBushRef.current = hasBushInHands;
  const truckCropsCountRef = useRef(0);
  truckCropsCountRef.current = truckCropsCount;
  const totalEarnedRef = useRef(0);
  totalEarnedRef.current = totalEarned;

  // Refs for stable event handlers to avoid stale closures in Three.js event listeners
  const handleTruckClickRef = useRef<() => void>(() => {});
  const handleBushClickRef = useRef<(index: number) => void>(() => {});

  // Truck position in 3D scene
  const truckPosition = new THREE.Vector3(7.5, 0, 0);

  // Timer countdown
  useEffect(() => {
    if (isShiftComplete) return;
    const timer = setInterval(() => {
      setShiftTime(t => {
        if (t <= 1) {
          clearInterval(timer);
          completeShift();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isShiftComplete]);

  // Функция для сборки процедурных пресетов персонажей
  const buildPresetCharacter = useCallback((skin: SkinPreset, targetGroup: THREE.Group) => {
    targetGroup.clear();

    // Очистить миксер анимаций, если был кастомный
    mixerRef.current = null;
    walkActionRef.current = null;
    idleActionRef.current = null;

    if (skin === 'cj') {
      // КАРЛ "CJ" ДЖОНСОН (Skin ID 0)
      // Синие джинсы
      const legMat = new THREE.MeshLambertMaterial({ color: 0x1f3c66 });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.35), legMat);
      leftLeg.position.set(-0.2, 0.45, 0);
      leftLeg.castShadow = true;
      targetGroup.add(leftLeg);

      const rightLeg = leftLeg.clone();
      rightLeg.position.set(0.2, 0.45, 0);
      targetGroup.add(rightLeg);

      // Кеды
      const shoeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
      const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.45), shoeMat);
      leftShoe.position.set(-0.2, 0.08, 0.05);
      targetGroup.add(leftShoe);
      const rightShoe = leftShoe.clone();
      rightShoe.position.set(0.2, 0.08, 0.05);
      targetGroup.add(rightShoe);

      // Белая майка-алкоголичка (White Tank Top)
      const tankMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), tankMat);
      torso.position.set(0, 1.32, 0);
      torso.castShadow = true;
      targetGroup.add(torso);

      // Мускулистые руки цвета кожи CJ
      const skinTone = new THREE.MeshLambertMaterial({ color: 0x5c3826 });
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.25), skinTone);
      leftArm.position.set(-0.48, 1.3, 0);
      leftArm.castShadow = true;
      targetGroup.add(leftArm);
      const rightArm = leftArm.clone();
      rightArm.position.set(0.48, 1.3, 0);
      targetGroup.add(rightArm);

      // Золотая цепочка на шее
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), new THREE.MeshLambertMaterial({ color: 0xf6ad55 }));
      chain.rotation.x = Math.PI / 3;
      chain.position.set(0, 1.72, 0.08);
      targetGroup.add(chain);

      // Голова Карла
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.38), skinTone);
      head.position.set(0, 1.95, 0);
      head.castShadow = true;
      targetGroup.add(head);

      // Прическа Цезарь (короткие черные волосы)
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
      hair.position.set(0, 2.15, 0);
      targetGroup.add(hair);

    } else if (skin === 'grove') {
      // GROVE STREET GANGSTA (Skin ID 105)
      // Темные брюки
      const legMat = new THREE.MeshLambertMaterial({ color: 0x1a202c });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.35), legMat);
      leftLeg.position.set(-0.2, 0.45, 0);
      leftLeg.castShadow = true;
      targetGroup.add(leftLeg);
      const rightLeg = leftLeg.clone();
      rightLeg.position.set(0.2, 0.45, 0);
      targetGroup.add(rightLeg);

      // Фирменная зеленая худи оверсайз Grove Street
      const hoodieMat = new THREE.MeshLambertMaterial({ color: 0x276749 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.5), hoodieMat);
      torso.position.set(0, 1.35, 0);
      torso.castShadow = true;
      targetGroup.add(torso);

      // Рукава худи
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.3), hoodieMat);
      leftArm.position.set(-0.52, 1.32, 0);
      targetGroup.add(leftArm);
      const rightArm = leftArm.clone();
      rightArm.position.set(0.52, 1.32, 0);
      targetGroup.add(rightArm);

      // Голова
      const skinTone = new THREE.MeshLambertMaterial({ color: 0x5c3826 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.38), skinTone);
      head.position.set(0, 1.95, 0);
      head.castShadow = true;
      targetGroup.add(head);

      // Зеленая бейсболка задом наперед
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.2, 12), hoodieMat);
      cap.position.set(0, 2.15, 0);
      targetGroup.add(cap);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.3), hoodieMat);
      visor.position.set(0, 2.1, -0.3); // козырек назад
      targetGroup.add(visor);

    } else if (skin === 'builder') {
      // РАБОТЯГА В КАСКЕ (Skin ID 27)
      // Синие рабочие штаны
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2c5282 });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.35), pantsMat);
      leftLeg.position.set(-0.2, 0.45, 0);
      leftLeg.castShadow = true;
      targetGroup.add(leftLeg);
      const rightLeg = leftLeg.clone();
      rightLeg.position.set(0.2, 0.45, 0);
      targetGroup.add(rightLeg);

      // Рабочая куртка с оранжевым светоотражающим жилетом
      const vestMat = new THREE.MeshLambertMaterial({ color: 0xdd6b20 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), vestMat);
      torso.position.set(0, 1.35, 0);
      torso.castShadow = true;
      targetGroup.add(torso);

      // Светоотражающая полоса
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.47), new THREE.MeshLambertMaterial({ color: 0xedf2f7 }));
      stripe.position.set(0, 1.35, 0);
      targetGroup.add(stripe);

      // Голова
      const skinTone = new THREE.MeshLambertMaterial({ color: 0xe0a97c });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinTone);
      head.position.set(0, 1.95, 0);
      head.castShadow = true;
      targetGroup.add(head);

      // Защитная желтая каска строителя
      const hardhatMat = new THREE.MeshLambertMaterial({ color: 0xf6e05e });
      const hardhatDome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hardhatMat);
      hardhatDome.position.set(0, 2.1, 0);
      targetGroup.add(hardhatDome);
      const hardhatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), hardhatMat);
      hardhatBrim.position.set(0, 2.1, 0);
      targetGroup.add(hardhatBrim);

    } else {
      // ДЕФОЛТ: КЛАССИЧЕСКИЙ ФЕРМЕР RED COUNTY (Skin ID 158)
      const legMat = new THREE.MeshLambertMaterial({ color: 0x2b4c7e });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.35), legMat);
      leftLeg.position.set(-0.2, 0.45, 0);
      leftLeg.castShadow = true;
      targetGroup.add(leftLeg);

      const rightLeg = leftLeg.clone();
      rightLeg.position.set(0.2, 0.45, 0);
      targetGroup.add(rightLeg);

      // Клетчатая красно-коричневая рубашка
      const torsoMat = new THREE.MeshLambertMaterial({ color: 0x9c3d28 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), torsoMat);
      torso.position.set(0, 1.35, 0);
      torso.castShadow = true;
      targetGroup.add(torso);

      // Голова
      const headMat = new THREE.MeshLambertMaterial({ color: 0xe0a97c });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
      head.position.set(0, 1.95, 0);
      head.castShadow = true;
      targetGroup.add(head);

      // Соломенная шляпа фермера
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.08, 12), new THREE.MeshLambertMaterial({ color: 0xd4a359 }));
      hatBrim.position.set(0, 2.15, 0);
      targetGroup.add(hatBrim);
      const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.35, 12), new THREE.MeshLambertMaterial({ color: 0xb58238 }));
      hatCrown.position.set(0, 2.35, 0);
      targetGroup.add(hatCrown);
    }
  }, []);

  // Three.js Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd6a868); // Теплый сан-андреасовский воздух
    scene.fog = new THREE.FogExp2(0xd6a868, 0.025);

    // 2. Camera (Изометрический ракурс классической GTA)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 18);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight(0xffecd2, 0x8d6034, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.2);
    dirLight.position.set(15, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    const d = 16;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 5. Environment: Ground / Soil / Field furrow (Борозды поля)
    const groundGeo = new THREE.PlaneGeometry(36, 26, 32, 32);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a321f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Борозды земли (грядки слева)
    for (let i = -5; i <= 2; i++) {
      const furrowGeo = new THREE.BoxGeometry(16, 0.12, 1.2);
      const furrowMat = new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x3d2717 : 0x543924 });
      const furrow = new THREE.Mesh(furrowGeo, furrowMat);
      furrow.position.set(-4.5, 0.06, i * 1.8);
      furrow.receiveShadow = true;
      scene.add(furrow);
    }

    // Грунтовая дорога к пикапу справа
    const roadGeo = new THREE.PlaneGeometry(8, 26);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x826040 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(7.5, 0.02, 0);
    road.receiveShadow = true;
    scene.add(road);

    // Заборчик по периметру фермы
    for (let x = -16; x <= 16; x += 3.5) {
      const postGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);
      const postMat = new THREE.MeshLambertMaterial({ color: 0x6e523b });
      const postNorth = new THREE.Mesh(postGeo, postMat);
      postNorth.position.set(x, 0.6, -12);
      postNorth.castShadow = true;
      scene.add(postNorth);

      const postSouth = new THREE.Mesh(postGeo, postMat);
      postSouth.position.set(x, 0.6, 12);
      postSouth.castShadow = true;
      scene.add(postSouth);
    }
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(34, 0.1, 0.08), new THREE.MeshLambertMaterial({ color: 0x5a412e }));
    railNorth.position.set(0, 0.9, -12);
    scene.add(railNorth);
    const railSouth = railNorth.clone();
    railSouth.position.set(0, 0.9, 12);
    scene.add(railSouth);

    // 6. BUILD LOW-POLY TRUCK: WALTON / SADLER (ID 478)
    const truckGroup = new THREE.Group();
    truckGroup.position.copy(truckPosition);
    truckGroup.rotation.y = -Math.PI / 2;

    // Кабина (Cab)
    const cabGeo = new THREE.BoxGeometry(2.4, 1.6, 2.2);
    const cabMat = new THREE.MeshLambertMaterial({ color: 0x8a3324 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.3, -1.2);
    cab.castShadow = true;
    cab.receiveShadow = true;
    truckGroup.add(cab);

    // Крыша кабины
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 1.8), cabMat);
    roof.position.set(0, 2.2, -1.2);
    roof.castShadow = true;
    truckGroup.add(roof);

    // Лобовое стекло
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88c0d0, opacity: 0.85, transparent: true });
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 0.1), glassMat);
    windshield.position.set(0, 1.6, -2.25);
    windshield.rotation.x = 0.15;
    truckGroup.add(windshield);

    // Капот двигателя
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.6), cabMat);
    hood.position.set(0, 0.9, -2.9);
    hood.castShadow = true;
    truckGroup.add(hood);

    // Радиаторная решетка и фары
    const grill = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    grill.position.set(0, 0.9, -3.75);
    truckGroup.add(grill);

    const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff0aa });
    const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), lightMat);
    leftLight.position.set(-0.9, 0.9, -3.75);
    truckGroup.add(leftLight);
    const rightLight = leftLight.clone();
    rightLight.position.set(0.9, 0.9, -3.75);
    truckGroup.add(rightLight);

    // Металлический КУЗОВ
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 3.2), new THREE.MeshLambertMaterial({ color: 0x3d3d3d }));
    bedBase.position.set(0, 0.7, 1.4);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    truckGroup.add(bedBase);

    // Деревянные борта кузова
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6e4726 });
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 3.2), woodMat);
    leftSide.position.set(-1.15, 1.2, 1.4);
    leftSide.castShadow = true;
    truckGroup.add(leftSide);

    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 3.2), woodMat);
    rightSide.position.set(1.15, 1.2, 1.4);
    rightSide.castShadow = true;
    truckGroup.add(rightSide);

    const backGate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.15), woodMat);
    backGate.position.set(0, 1.2, 3.0);
    backGate.castShadow = true;
    truckGroup.add(backGate);

    // Колеса
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

    const wheelPositions = [
      [-1.3, 0.55, -2.4],
      [1.3, 0.55, -2.4],
      [-1.3, 0.55, 1.8],
      [1.3, 0.55, 1.8]
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.48, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);
      truckGroup.add(wheelGroup);
    });

    // Интерактивный увеличенный триггер клика на пикап Walton
    const truckHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 4.5, 9.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    truckHitbox.position.set(0, 1.5, -0.2);
    (truckHitbox as any).isTruckTrigger = true;
    truckGroup.add(truckHitbox);

    // Золотой чекпоинт-маркер SA-MP над кузовом пикапа при наличии куста в руках
    const truckMarkerGeo = new THREE.ConeGeometry(0.45, 0.9, 6);
    const truckMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const truckMarker = new THREE.Mesh(truckMarkerGeo, truckMarkerMat);
    truckMarker.rotation.x = Math.PI;
    truckMarker.position.set(0, 3.6, 1.4);
    truckMarker.name = 'truckMarker';
    truckMarker.visible = false;
    truckGroup.add(truckMarker);

    // Сетка слотов кузова под снопы
    const loadedBushes: THREE.Mesh[] = [];
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
    for (let i = 0; i < truckMaxCapacity; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const bMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.35, 1),
        bushMat
      );
      bMesh.position.set(
        (col === 0 ? -0.55 : 0.55),
        1.15 + (row > 3 ? 0.4 : 0),
        0.3 + (row % 4) * 0.65
      );
      bMesh.castShadow = true;
      bMesh.visible = false;
      truckGroup.add(bMesh);
      loadedBushes.push(bMesh);
    }
    truckBushesMeshesRef.current = loadedBushes;
    scene.add(truckGroup);

    // 7. BUILD LOW-POLY BUSHES IN THE FIELD (10 кустов на грядках)
    const bushesList: BushData[] = [];
    const bushPositions = [
      [-10, 4.5], [-7, 4.5], [-4, 4.5], [-1, 4.5],
      [-9, 0],   [-6, 0],   [-3, 0],
      [-10, -4.5], [-7, -4.5], [-4, -4.5]
    ];

    bushPositions.forEach(([bx, bz], index) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, 0, bz);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.4, 6),
        new THREE.MeshLambertMaterial({ color: 0x5c4033 })
      );
      stem.position.y = 0.2;
      bGroup.add(stem);

      const foliageMat = new THREE.MeshLambertMaterial({ 
        color: index === 3 || index === 7 ? 0x48bb78 : 0x2f855a,
        flatShading: true
      });
      const bushGeo = new THREE.DodecahedronGeometry(0.9, 1);
      const foliage = new THREE.Mesh(bushGeo, foliageMat);
      foliage.position.y = 0.9;
      foliage.scale.set(1.1, 0.85, 1.1);
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      (foliage as any).bushIndex = index;
      bGroup.add(foliage);

      // Маркер готовности над кустом
      const arrowGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = Math.PI;
      arrow.position.y = 2.2;
      arrow.name = 'indicator';
      bGroup.add(arrow);

      scene.add(bGroup);

      bushesList.push({
        id: index + 1,
        mesh: bGroup,
        bushMesh: foliage,
        worldPos: new THREE.Vector3(bx, 0, bz),
        isReady: true,
        growth: 100
      });
    });
    bushesRef.current = bushesList;

    // 8. BUILD PLAYER GROUP WITH MODULAR CHARACTER VISUAL ROOT
    const playerGroup = new THREE.Group();
    playerGroup.position.set(-6, 0, 2);

    const characterVisualRoot = new THREE.Group();
    playerGroup.add(characterVisualRoot);
    playerVisualRootRef.current = characterVisualRoot;

    // Собираем дефолтный скин фермера
    buildPresetCharacter('farmer', characterVisualRoot);

    // Куст в руках у персонажа
    const carriedBush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55, 1),
      new THREE.MeshLambertMaterial({ color: 0x38a169, flatShading: true })
    );
    carriedBush.position.set(0, 1.45, 0.55);
    carriedBush.castShadow = true;
    carriedBush.visible = false;
    playerGroup.add(carriedBush);
    playerCarryingBushRef.current = carriedBush;

    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;

    // 9. Raycasting for Mouse / Touch Clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      if (!renderer.domElement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // 1. Проверка клика по пикапу Walton (любая его деталь или хитбокс)
      const truckIntersects = raycaster.intersectObjects(truckGroup.children, true);
      if (truckIntersects.length > 0) {
        handleTruckClickRef.current();
        return;
      }

      // 2. Проверка клика по кустам в поле
      const foliageMeshes = bushesRef.current.map(b => b.bushMesh);
      const bushIntersects = raycaster.intersectObjects(foliageMeshes);
      if (bushIntersects.length > 0) {
        const hitBushMesh = bushIntersects[0].object as any;
        const bIdx = hitBushMesh.bushIndex;
        if (typeof bIdx === 'number') {
          handleBushClickRef.current(bIdx);
          return;
        }
      }

      // 3. Удобство для смартфонов (9:16): если куст в руках и игрок тапает в правую часть экрана возле пикапа
      if (hasBushRef.current && mouse.x > 0.05) {
        handleTruckClickRef.current();
      }
    };

    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 10. Animation Loop
    let animId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      // Обновление миксера анимаций кастомной 3D модели (если есть анимации в GLTF)
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Анимация маркеров над готовыми кустами
      bushesRef.current.forEach(b => {
        const ind = b.mesh.getObjectByName('indicator');
        if (ind) {
          ind.visible = b.isReady && !hasBushRef.current;
          if (ind.visible) {
            ind.position.y = 2.1 + Math.sin(elapsed * 4 + b.id) * 0.15;
            ind.rotation.y += delta * 2;
          }
        }
      });

      // Анимация золотого чекпоинта над кузовом Walton при наличии куста в руках
      const trkMarker = truckGroup.getObjectByName('truckMarker');
      if (trkMarker) {
        trkMarker.visible = hasBushRef.current;
        if (trkMarker.visible) {
          trkMarker.position.y = 3.5 + Math.sin(elapsed * 5) * 0.25;
          trkMarker.rotation.y += delta * 2.5;
        }
      }

      // Перемещение персонажа к цели
      if (playerGroupRef.current && playerTargetPosRef.current) {
        const currentPos = playerGroupRef.current.position;
        const targetPos = playerTargetPosRef.current;
        const dist = currentPos.distanceTo(targetPos);

        if (dist > 0.15) {
          const dir = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
          playerGroupRef.current.position.addScaledVector(dir, delta * 6.5);
          playerGroupRef.current.rotation.y = Math.atan2(dir.x, dir.z);

          // Процедурное покачивание при беге
          playerGroupRef.current.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.18;
        } else {
          playerGroupRef.current.position.y = 0;
          playerTargetPosRef.current = null;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Адаптивное масштабирование камеры под смартфоны (9:16) и десктопы
    const updateCameraView = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth || 360;
      const h = container.clientHeight || window.innerHeight || 640;
      const aspect = w / h;
      camera.aspect = aspect;

      if (aspect < 0.68) {
        // Вертикальный экран смартфона 9:16 (например 360x640, 390x844)
        // Поднимаем камеру и расширяем угол обзора (FOV 68°), чтобы и грядки слева (-10), и пикап справа (+7.5) были полностью видны
        camera.fov = 68;
        camera.position.set(-0.5, 24, 26);
        camera.lookAt(-0.5, 0, 0);
      } else if (aspect < 1.0) {
        // Узкий экран / планшет
        camera.fov = 55;
        camera.position.set(0, 19, 22);
        camera.lookAt(0, 0, 0);
      } else {
        // Горизонтальный экран / ПК
        camera.fov = 45;
        camera.position.set(0, 14, 18);
        camera.lookAt(0, 0, 0);
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    updateCameraView();

    const resizeObserver = new ResizeObserver(() => {
      updateCameraView();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', updateCameraView);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCameraView);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [buildPresetCharacter]);

  // Загрузка кастомной 3D модели пользователя (.glb / .gltf / .obj)
  const handleCustomModelUpload = (file: File) => {
    const targetVisualRoot = playerVisualRootRef.current;
    if (!targetVisualRoot) return;

    setIsModelLoading(true);
    setModelLoadError(null);
    const fileName = file.name.toLowerCase();

    const fileUrl = URL.createObjectURL(file);

    const onModelReady = (loadedObject: THREE.Object3D, animations?: THREE.AnimationClip[]) => {
      try {
        targetVisualRoot.clear();

        // Расчет BoundingBox для авто-масштабирования к росту человека (~1.85 юнитов)
        const box = new THREE.Box3().setFromObject(loadedObject);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const targetHeight = 1.85;
        const maxDim = Math.max(size.y, 0.001);
        const scale = targetHeight / maxDim;

        loadedObject.scale.set(scale, scale, scale);

        // Центрируем модель так, чтобы ноги касались y = 0
        loadedObject.position.x = -center.x * scale;
        loadedObject.position.y = -box.min.y * scale;
        loadedObject.position.z = -center.z * scale;

        // Включаем мягкие тени на всех мешах
        let totalVertices = 0;
        loadedObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.geometry) {
              totalVertices += m.geometry.attributes.position ? m.geometry.attributes.position.count : 0;
            }
          }
        });

        targetVisualRoot.add(loadedObject);

        // Инициализация анимаций (если есть)
        if (animations && animations.length > 0) {
          const mixer = new THREE.AnimationMixer(loadedObject);
          mixerRef.current = mixer;
          const action = mixer.clipAction(animations[0]);
          action.play();
          setCustomModelInfo(`${(file.size / 1024).toFixed(1)} КБ | ${totalVertices.toLocaleString()} вершин | ${animations.length} анимаций`);
        } else {
          mixerRef.current = null;
          setCustomModelInfo(`${(file.size / 1024).toFixed(1)} КБ | ${totalVertices.toLocaleString()} вершин | Low-Poly сетка`);
        }

        setCurrentSkin('custom');
        setCustomModelFileName(file.name);
        setIsModelLoading(false);
        setActionTextDraw(`~g~ВАША МОДЕЛЬ [${file.name.slice(0, 15)}] УСПЕШНО ЗАГРУЖЕНА НА СЦЕНУ!`);
        sampAudio.playPickBush();
      } catch (err: any) {
        console.error(err);
        setModelLoadError('Ошибка настройки масштаба модели');
        setIsModelLoading(false);
      } finally {
        URL.revokeObjectURL(fileUrl);
      }
    };

    if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
      const loader = new GLTFLoader();
      loader.load(
        fileUrl,
        (gltf) => {
          onModelReady(gltf.scene, gltf.animations);
        },
        undefined,
        (err) => {
          console.error(err);
          setModelLoadError('Не удалось прочитать .GLB / .GLTF файл');
          setIsModelLoading(false);
        }
      );
    } else if (fileName.endsWith('.obj')) {
      const loader = new OBJLoader();
      loader.load(
        fileUrl,
        (obj) => {
          onModelReady(obj);
        },
        undefined,
        (err) => {
          console.error(err);
          setModelLoadError('Не удалось прочитать .OBJ файл');
          setIsModelLoading(false);
        }
      );
    } else {
      setModelLoadError('Поддерживаются форматы .glb, .gltf или .obj');
      setIsModelLoading(false);
    }
  };

  // Переключение на встроенный SA-MP пресет
  const handleSelectPreset = (skin: SkinPreset) => {
    setCurrentSkin(skin);
    if (playerVisualRootRef.current) {
      buildPresetCharacter(skin, playerVisualRootRef.current);
    }
    sampAudio.playPickBush();
    setShowSkinModal(false);
    setActionTextDraw(`~w~ВЫБРАН СКИН: ~y~${skin.toUpperCase()}`);
  };

  // Клик по кусту в 3D сцене
  const handleBushClick = useCallback((index: number) => {
    if (hasBushRef.current) {
      setActionTextDraw('~r~У ВАС УЖЕ ЕСТЬ КУСТ В РУКАХ! КЛИКНИТЕ ПО КУЗОВУ ПИКАПА WALTON');
      return;
    }

    const bush = bushesRef.current[index];
    if (!bush || !bush.isReady) {
      setActionTextDraw('~y~ЭТОТ КУСТ ЕЩЕ НЕ ВЫРОС, ВЫБЕРИТЕ ДРУГОЙ');
      return;
    }

    playerTargetPosRef.current = new THREE.Vector3(bush.worldPos.x + 0.8, 0, bush.worldPos.z + 0.6);
    sampAudio.playFootstep();
    setActionTextDraw('~w~ПЕРСОНАЖ БЕЖИТ К КУСТУ...');

    setTimeout(() => {
      sampAudio.playPickBush();
      setIsHarvesting(true);
      setHarvestProgress(0);
      setActionTextDraw('~g~СБОР КУСТА... [ПОДОЖДИТЕ]');

      let p = 0;
      const pTimer = setInterval(() => {
        p += 25;
        setHarvestProgress(p);
        if (p >= 100) {
          clearInterval(pTimer);
          setIsHarvesting(false);
          hasBushRef.current = true;
          setHasBushInHands(true);

          if (playerCarryingBushRef.current) {
            playerCarryingBushRef.current.visible = true;
          }

          bush.isReady = false;
          bush.bushMesh.scale.set(0.2, 0.2, 0.2);

          setTimeout(() => {
            bush.isReady = true;
            bush.bushMesh.scale.set(1.1, 0.85, 1.1);
          }, 10000);

          setActionTextDraw('~w~КУСТ В РУКАХ! ТЕПЕРЬ ~y~КЛИКНИТЕ НА КУЗОВ ПИКАПА WALTON СПРАВА');
        }
      }, 180);
    }, 550);
  }, [sampAudio]);

  handleBushClickRef.current = handleBushClick;

  // Клик по пикапу Walton
  const handleTruckClick = useCallback(() => {
    if (!hasBushRef.current) {
      setActionTextDraw('~r~В РУКАХ ПУСТО! СНАЧАЛА КЛИКНИТЕ НА ЗЕЛЕНЫЙ КУСТ В ПОЛЕ');
      return;
    }

    playerTargetPosRef.current = new THREE.Vector3(6.2, 0, 1.4);
    sampAudio.playFootstep();
    setActionTextDraw('~w~НЕСЕТЕ КУСТ К ПИКАПУ WALTON...');

    setTimeout(() => {
      sampAudio.playThrowInTruck();
      hasBushRef.current = false;
      setHasBushInHands(false);

      if (playerCarryingBushRef.current) {
        playerCarryingBushRef.current.visible = false;
      }

      const nextCount = truckCropsCountRef.current + 1;
      truckCropsCountRef.current = nextCount;
      setTruckCropsCount(nextCount);
      const earned = totalEarnedRef.current + 750;
      totalEarnedRef.current = earned;
      setTotalEarned(earned);

      if (truckBushesMeshesRef.current[nextCount - 1]) {
        truckBushesMeshesRef.current[nextCount - 1].visible = true;
      }

      if (nextCount >= truckMaxCapacity) {
        setActionTextDraw('~g~КУЗОВ ЗАПОЛНЕН (10/10)! НАЖМИТЕ [СДАТЬ МАШИНУ НА СКЛАД]');
      } else {
        setActionTextDraw(`~g~КУСТ ПОГРУЖЕН В КУЗОВ (+750$)!~w~ КЛИКНИТЕ НА СЛЕДУЮЩИЙ КУСТ`);
      }
    }, 650);
  }, [sampAudio]);

  handleTruckClickRef.current = handleTruckClick;

  // Срезать ближайший куст (удобно для сенсорных экранов и смартфонов)
  const harvestNearestBush = useCallback(() => {
    if (hasBushRef.current) {
      handleTruckClick();
      return;
    }
    const readyIndex = bushesRef.current.findIndex(b => b.isReady);
    if (readyIndex !== -1) {
      handleBushClick(readyIndex);
    } else {
      setActionTextDraw('~y~ВСЕ КУСТЫ ЕЩЕ РАСТУТ! ПОДОЖДИТЕ ПАРУ СЕКУНД');
    }
  }, [handleBushClick, handleTruckClick]);

  // Сдача смены
  const completeShift = () => {
    setIsShiftComplete(true);
    sampAudio.playSampMoney();

    const payout = totalEarnedRef.current > 0 ? totalEarnedRef.current : 4500;
    const exp = Math.floor(payout / 250);

    if (onHarvestFinish) {
      setTimeout(() => {
        onHarvestFinish({
          money: payout,
          exp,
          cropsCount: truckCropsCountRef.current,
          bonus: truckCropsCountRef.current >= truckMaxCapacity ? 'Полный кузов Walton (+20% бонус)' : 'Стандартная разгрузка'
        });
      }, 1000);
    }
  };

  const restart = () => {
    setTruckCropsCount(0);
    setTotalEarned(0);
    setHasBushInHands(false);
    hasBushRef.current = false;
    setIsShiftComplete(false);
    setShiftTime(90);
    setActionTextDraw('КЛИКНИТЕ НА СПЕЛЫЙ ЗЕЛЕНЫЙ КУСТ В ПОЛЕ');
    if (playerCarryingBushRef.current) playerCarryingBushRef.current.visible = false;
    truckBushesMeshesRef.current.forEach(m => m.visible = false);
  };

  return (
    <div className="relative w-full h-full min-h-[100dvh] h-screen overflow-hidden select-none font-sans text-stone-100 bg-[#0d0906]">
      
      {/* 1. THREE.JS 3D CANVAS - НА ВЕСЬ ЭКРАН (БЕЗ ПОЛЕЙ, РАМОК И ВНЕШНИХ ОТСТУПОВ) */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full cursor-pointer touch-none select-none z-0"
        title="Кликните на куст или пикап Walton"
        style={{ touchAction: 'none' }}
      />

      {/* 2. ПЛАВАЮЩИЙ HUD SA-MP ПОВЕРХ 3D СЦЕНЫ */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
        
        {/* ВЕРХНИЙ БАР: СЕРВЕР, ТАЙМЕР, СКИН, ЗВУК, ПОЛНЫЙ ЭКРАН */}
        <div className="w-full flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-amber-800/60 rounded-2xl px-3 py-1.5 shadow-xl">
            <div className="w-8 h-8 rounded-xl bg-[#422c1b] border border-amber-600 flex items-center justify-center text-amber-400 shadow">
              <Truck size={17} className="drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono">
                  [SA-MP] ФЕРМА №1
                </span>
                <span className="hidden xs:inline text-[9px] bg-emerald-950 border border-emerald-600 text-emerald-300 px-1 rounded font-mono font-bold">
                  3D
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-mono hidden sm:block">
                Flint County • Сбор урожая
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            {/* Кнопка смены скина / загрузки своей 3D модели */}
            <button
              onClick={() => setShowSkinModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/85 border border-amber-600/80 text-amber-300 hover:bg-amber-900 text-xs font-bold flex items-center gap-1.5 shadow backdrop-blur-sm transition-all active:scale-95"
              title="Выбрать скин или загрузить свою 3D модель"
            >
              <User size={14} />
              <span className="hidden sm:inline">Скин:</span>
              <span className="text-white uppercase font-bold text-[11px]">
                {currentSkin === 'custom' ? (customModelFileName?.slice(0, 8) || 'Свой 3D') : currentSkin}
              </span>
            </button>

            {/* Таймер смены */}
            <div className="px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-stone-700 text-xs text-amber-300 font-bold flex items-center gap-1.5 shadow">
              <Clock size={13} />
              <span>{Math.floor(shiftTime / 60)}:{(shiftTime % 60).toString().padStart(2, '0')}</span>
            </div>

            {/* Звук */}
            <button
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                sampAudio.muted = next;
              }}
              className="p-2 rounded-xl bg-black/80 backdrop-blur-md border border-stone-700 text-stone-300 hover:text-white transition-all active:scale-95"
              title={isMuted ? "Включить звук" : "Выключить звук"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Перезапуск */}
            <button
              onClick={restart}
              className="p-2 rounded-xl bg-black/80 backdrop-blur-md border border-stone-700 text-stone-300 hover:text-white transition-all active:scale-95"
              title="Начать сначала"
            >
              <RefreshCw size={15} />
            </button>

            {/* Полноэкранный режим */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/80 backdrop-blur-md border border-stone-700 text-stone-300 hover:text-white transition-all active:scale-95"
              title={isFullscreen ? "Выйти из полного экрана" : "На весь экран"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-black/80 backdrop-blur-md border border-stone-700 text-stone-300 hover:text-white transition-all active:scale-95"
                title="Закрыть игру"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ТЕКСТДРАВ-ПОДСКАЗКА SA-MP В ВЕРХНЕЙ ЧАСТИ ЭКРАНА */}
        <div className="pointer-events-auto self-center max-w-xl w-full mt-1 bg-black/80 backdrop-blur-md border border-amber-900/60 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-2xl flex items-center justify-between font-mono gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-amber-400 font-black text-[10px] sm:text-xs uppercase tracking-wider shrink-0 animate-pulse">
              ПОДСКАЗКА:
            </span>
            <span className="text-[11px] sm:text-xs text-stone-100 font-bold truncate">
              {actionTextDraw.replace(/~[rgwy]~/g, '')}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-stone-400 font-mono text-[10px] hidden xs:inline">В руках:</span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] sm:text-[11px] ${
              hasBushInHands 
                ? 'bg-amber-500 text-stone-950 animate-bounce shadow-[0_0_15px_rgba(245,158,11,0.8)]' 
                : 'bg-stone-800 text-stone-400'
            }`}>
              {hasBushInHands ? '🌿 ТЯЖЕЛЫЙ КУСТ' : 'ПУСТО'}
            </span>
          </div>
        </div>

        {/* ЦЕНТРАЛЬНАЯ ПЛАШКА ПРОГРЕССА СРЕЗА КУСТА */}
        {isHarvesting && (
          <div className="self-center bg-black/90 backdrop-blur-md border-2 border-amber-500 rounded-2xl px-5 py-2.5 shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-none">
            <span className="text-xs font-mono font-bold text-amber-300">
              СРЕЗ СНОПА: {harvestProgress}%
            </span>
            <div className="w-32 bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-700">
              <div 
                className="h-full bg-amber-500 transition-all duration-150"
                style={{ width: `${harvestProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ЦЕНТРАЛЬНО-НИЖНЯЯ КНОПКА ДЕЙСТВИЯ (ДЛЯ СМАРТФОНОВ И БЫСТРОГО ТАПА) */}
        <div className="pointer-events-auto self-center mb-2">
          {hasBushInHands ? (
            <div className="animate-bounce">
              <button
                onClick={handleTruckClick}
                className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider font-mono shadow-[0_0_35px_rgba(245,158,11,0.85)] flex items-center gap-2 border-2 border-white active:scale-95 transition-transform whitespace-nowrap"
              >
                <Truck size={18} />
                <span>🚚 Погрузить в Walton (+750$)</span>
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={harvestNearestBush}
                disabled={isHarvesting}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-black/85 hover:bg-black text-amber-300 font-bold text-xs uppercase tracking-wider font-mono shadow-xl border border-amber-500/70 flex items-center gap-2 active:scale-95 transition-transform backdrop-blur-md whitespace-nowrap"
              >
                <span>🌾 Срезать куст</span>
              </button>
            </div>
          )}
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ СТАТИСТИКИ И КНОПКА СДАЧИ СМЕНЫ */}
        <div className="pointer-events-auto w-full bg-black/85 backdrop-blur-md border border-amber-900/60 rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-wrap items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase">В кузове:</span>
            <span className="text-xs font-bold text-amber-300">
              {truckCropsCount} / {truckMaxCapacity} снопов
            </span>
            <div className="w-16 bg-stone-800 h-2 rounded-full overflow-hidden border border-stone-700 hidden sm:block">
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(truckCropsCount / truckMaxCapacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase">Зарплата:</span>
            <span className="text-xs font-black text-emerald-400">
              +${totalEarned.toLocaleString()}
            </span>
          </div>

          <button
            onClick={completeShift}
            disabled={truckCropsCount === 0 || isShiftComplete}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              truckCropsCount > 0 && !isShiftComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-800'
            }`}
          >
            <Truck size={14} />
            <span>Сдать на склад (${totalEarned})</span>
          </button>
        </div>

      </div>

      {/* МОДАЛЬНОЕ ОКНО: ВЫБОР СКИНА ИЛИ ЗАГРУЗКА СВОЕЙ 3D МОДЕЛИ */}
      {showSkinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-lg bg-[#1c150e] border-2 border-amber-600 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.95)] text-stone-200 font-mono max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <User className="text-amber-400" size={20} />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    [ГАРДЕРОБ SA-MP / СВОЯ 3D МОДЕЛЬ]
                  </h3>
                </div>
                <button
                  onClick={() => setShowSkinModal(false)}
                  className="p-1 rounded-lg bg-stone-900 text-stone-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 1. БЫСТРЫЕ ВСТРОЕННЫЕ ПРЕСЕТЫ СКИНОB SA-MP */}
              <div className="mb-4">
                <div className="text-[11px] text-stone-400 uppercase font-bold mb-2">
                  Встроенные скины San Andreas:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSelectPreset('farmer')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      currentSkin === 'farmer'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-xl mb-1">🌾🤠</div>
                    <div className="text-[10px] font-bold uppercase leading-tight">Фермер #158</div>
                    <div className="text-[9px] text-stone-400">Шляпа и роба</div>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('cj')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      currentSkin === 'cj'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-xl mb-1">👕🏃</div>
                    <div className="text-[10px] font-bold uppercase leading-tight">CJ #0</div>
                    <div className="text-[9px] text-stone-400">Майка и джинсы</div>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('grove')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      currentSkin === 'grove'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-xl mb-1">🟢🧢</div>
                    <div className="text-[10px] font-bold uppercase leading-tight">Grove #105</div>
                    <div className="text-[9px] text-stone-400">Зеленая худи</div>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('builder')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      currentSkin === 'builder'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-xl mb-1">🦺👷</div>
                    <div className="text-[10px] font-bold uppercase leading-tight">Рабочий #27</div>
                    <div className="text-[9px] text-stone-400">Каска и жилет</div>
                  </button>
                </div>
              </div>

              {/* 2. ЗАГРУЗКА СОБСТВЕННОЙ 3D МОДЕЛИ (.GLB / .GLTF / .OBJ) */}
              <div className="bg-black/60 border-2 border-dashed border-amber-700/60 rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-600 text-amber-400 flex items-center justify-center mx-auto mb-2 shadow">
                  <Upload size={20} />
                </div>

                <div className="text-xs font-bold text-white mb-1">
                  Загрузить свою 3D модель (.glb, .gltf или .obj)
                </div>
                <p className="text-[11px] text-stone-400 mb-3 max-w-sm mx-auto leading-relaxed">
                  Перетащите файл или выберите с устройства. Модель автоматически масштабируется под пропорции поля и сможет переносить снопы кустов!
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all">
                  <Upload size={14} />
                  <span>Выбрать 3D файл</span>
                  <input
                    type="file"
                    accept=".glb,.gltf,.obj"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCustomModelUpload(f);
                    }}
                  />
                </label>

                {isModelLoading && (
                  <div className="mt-3 text-xs text-amber-300 flex items-center justify-center gap-2">
                    <Clock size={14} className="animate-spin" />
                    <span>Импорт 3D сетки и настройка анимаций...</span>
                  </div>
                )}

                {modelLoadError && (
                  <div className="mt-3 text-xs text-rose-400 font-bold bg-rose-950/60 border border-rose-800 p-2 rounded-lg">
                    {modelLoadError}
                  </div>
                )}

                {customModelFileName && currentSkin === 'custom' && (
                  <div className="mt-3 bg-emerald-950/60 border border-emerald-700/80 rounded-xl p-2.5 text-left text-xs text-emerald-300 flex items-center justify-between">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Check size={14} /> Активна модель: {customModelFileName}
                      </div>
                      {customModelInfo && (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          {customModelInfo}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectPreset('farmer')}
                      className="px-2 py-1 bg-stone-900 text-stone-300 hover:text-white rounded text-[10px]"
                    >
                      Сброс
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
                <button
                  onClick={() => setShowSkinModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold uppercase font-mono text-white transition-all"
                >
                  Вернуться на поле
                </button>
              </div>

            </div>
          </div>
        )}

      {/* ДИАЛОГ ОКНА ОКОНЧАНИЯ СМЕНЫ В СТИЛЕ SA-MP DIALOG */}
      {isShiftComplete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-md bg-[#1f1710] border-2 border-amber-600 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center font-mono animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-950 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Trophy size={28} />
            </div>

            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">
              ФЕРМА: СМЕНА УСПЕШНО СДАНА!
            </h3>
            <p className="text-xs text-stone-300 mb-4">
              Пикап Walton с урожаем кустов доставлен на элеватор Flint County. Деньги начислены на ваш баланс.
            </p>

            <div className="bg-black/70 border border-stone-800 rounded-xl p-3 mb-4 text-xs space-y-1.5 text-left">
              <div className="flex items-center justify-between text-stone-300">
                <span>Погружено кустов в кузов:</span>
                <span className="text-white font-bold">{truckCropsCount} шт</span>
              </div>
              <div className="flex items-center justify-between text-stone-300">
                <span>Выручка комбайнёра:</span>
                <span className="text-emerald-400 font-bold text-sm">+${totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-stone-300 border-t border-stone-800 pt-1">
                <span>Опыт работы (EXP):</span>
                <span className="text-amber-400 font-bold">+{Math.floor(totalEarned / 250)} EXP</span>
              </div>
            </div>

            <button
              onClick={restart}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              Взять новую смену на ферме
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmHarvestGame;
