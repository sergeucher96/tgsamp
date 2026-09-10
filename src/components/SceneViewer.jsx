import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sky, PointerLockControls } from '@react-three/drei';
import { useState, useEffect, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Loader2, Settings, X, RotateCcw, Camera } from 'lucide-react';
import * as THREE from 'three';

function CameraPositionReader({ onUpdate }) {
  const { camera } = useThree();
  useEffect(() => {
    const interval = setInterval(() => {
      const pos = camera.position.toArray();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const quat = camera.quaternion;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      const target = [
        pos[0] + forward.x * 100,
        pos[1] + forward.y * 100,
        pos[2] + forward.z * 100
      ];
      onUpdate({
        pos,
        dir: { x: dir.x, y: dir.y, z: dir.z },
        target
      });
    }, 200);
    return () => clearInterval(interval);
  }, [camera, onUpdate]);
  return null;
}

function FreeCameraController({ onFreeLook }) {
  const { camera } = useThree();
  const speed = 3;
  const keys = useRef({});
  const locked = useRef(false);

  useEffect(() => {
    const onKeyDown = (e) => { keys.current[e.code] = true; };
    const onKeyUp = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const clock = new THREE.Clock();
    const moveDir = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();

    const animate = () => {
      requestAnimationFrame(animate);
      if (!locked.current) return;
      const delta = clock.getDelta();
      frontVector.set(0, 0, -1).applyQuaternion(camera.quaternion);
      sideVector.set(1, 0, 0).applyQuaternion(camera.quaternion);

      moveDir.set(0, 0, 0);
      if (keys.current['KeyW']) moveDir.add(frontVector);
      if (keys.current['KeyS']) moveDir.sub(frontVector);
      if (keys.current['KeyA']) moveDir.sub(sideVector);
      if (keys.current['KeyD']) moveDir.add(sideVector);
      if (keys.current['Space']) moveDir.y += 1;
      if (keys.current['ShiftLeft'] || keys.current['ShiftRight']) moveDir.y -= 1;

      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(speed * delta);
        camera.position.add(moveDir);
      }
    };
    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [camera, speed]);

  useEffect(() => {
    locked.current = onFreeLook;
  }, [onFreeLook]);

  return onFreeLook ? <PointerLockControls /> : null;
}

function SceneModel({ url, scale = 1 }) {
  const [scene, setScene] = useState(null);
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        setScene(gltf.scene);
      },
      undefined,
      () => console.error('Failed to load scene:', url)
    );
  }, [url]);
  if (!scene) return null;
  return <primitive object={scene} scale={scale} />;
}

const DEFAULT_POS = [21.848, -32.297, -15.834];
const DEFAULT_TARGET = [0, 0, 0];

export default function SceneViewer({
  url,
  cameraPosition = DEFAULT_POS,
  target = DEFAULT_TARGET,
  scale = 1,
  showSky = true,
  enableZoom = true,
  minDistance = 5,
  maxDistance = 200,
  onClose,
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [camPos, setCamPos] = useState([...cameraPosition]);
  const [camTarget, setCamTarget] = useState([...target]);
  const [liveData, setLiveData] = useState({
    pos: [...cameraPosition],
    dir: { x: 0, y: 0, z: 0 },
    target: [...target]
  });
  const [freeLook, setFreeLook] = useState(false);
  const orbitRef = useRef(null);

  useEffect(() => {
    if (!freeLook && orbitRef.current) {
      orbitRef.current.object.position.set(camPos[0], camPos[1], camPos[2]);
      orbitRef.current.target.set(camTarget[0], camTarget[1], camTarget[2]);
      orbitRef.current.update();
    }
  }, [freeLook, camPos, camTarget]);

  const handleSave = () => {
    setCamPos([...liveData.pos]);
    setCamTarget([...liveData.target]);
    setFreeLook(false);
  };

  const handleReset = () => {
    setCamPos([...DEFAULT_POS]);
    setCamTarget([...DEFAULT_TARGET]);
    setFreeLook(false);
  };

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: '#020617' }}>

      {/* Top controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {!freeLook && (
          <button onClick={() => setFreeLook(true)}
            className="p-3 rounded-xl backdrop-blur-md border bg-amber-600/80 border-amber-400/30 text-white hover:bg-amber-500 transition-all">
            <Camera size={18} />
          </button>
        )}
      </div>

      {freeLook && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-2 rounded-xl backdrop-blur-md border bg-amber-600/20 border-amber-400/30">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">🎮 Свободная камера</p>
          </div>
        </div>
      )}

      <button onClick={() => setShowEditor(!showEditor)}
        className="absolute top-4 right-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 text-white">
        <Settings size={18} />
      </button>

      {/* Editor panel */}
      {showEditor && (
        <div className="absolute top-14 right-4 z-20 w-64 bg-[#020617]/90 backdrop-blur-md rounded-xl border border-white/10 p-4 text-white">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Редактор камеры</p>
            <button onClick={() => setShowEditor(false)}><X size={14} /></button>
          </div>

          <p className="text-[8px] uppercase text-slate-400 mb-1">Позиция</p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {['x','y','z'].map((axis, i) => (
              <input key={axis} type="number" step="0.1"
                value={camPos[i]}
                onChange={e => { const v = [...camPos]; v[i] = parseFloat(e.target.value)||0; setCamPos(v); }}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            ))}
          </div>

          <p className="text-[8px] uppercase text-slate-400 mb-1">Цель</p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {['x','y','z'].map((axis, i) => (
              <input key={axis} type="number" step="0.1"
                value={camTarget[i]}
                onChange={e => { const v = [...camTarget]; v[i] = parseFloat(e.target.value)||0; setCamTarget(v); }}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            ))}
          </div>

          <div className="flex gap-2 mb-2">
            <button onClick={handleSave}
              className="flex-1 py-2 text-[9px] font-black uppercase bg-emerald-600/80 hover:bg-emerald-500 rounded-lg border border-emerald-400/30 flex items-center justify-center gap-1">
              📸 Сохранить
            </button>
            <button onClick={handleReset}
              className="flex-1 py-2 text-[9px] font-black uppercase bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 flex items-center justify-center gap-1">
              <RotateCcw size={12} /> Сброс
            </button>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[8px] uppercase text-slate-400 mb-1">Текущая позиция</p>
            <p className="text-[9px] text-slate-300">
              X: {liveData.pos[0]?.toFixed(1)} Y: {liveData.pos[1]?.toFixed(1)} Z: {liveData.pos[2]?.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      <Canvas
        className="w-full h-full"
        camera={{ position: camPos, fov: 45, near: 0.1, far: 500 }}
        shadows
        gl={{ antialias: true }}
      >
        <CameraPositionReader onUpdate={setLiveData} />
        {freeLook && <FreeCameraController onFreeLook={freeLook} />}
        {showSky && <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={2} />}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10,10,5]} intensity={1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight position={[-10,5,-5]} intensity={0.4} />
        <SceneModel url={url} scale={scale} />
        <ContactShadows position={[0,-0.01,0]} opacity={0.5} scale={100} blur={2} far={10} resolution={512} color="#000000" />
        {!freeLook && (
          <OrbitControls
            ref={orbitRef}
            target={camTarget}
            enablePan={true}
            enableZoom={enableZoom}
            minDistance={minDistance}
            maxDistance={maxDistance}
            enableDamping={true}
            dampingFactor={0.08}
          />
        )}
      </Canvas>

      {/* FreeLook instructions */}
      {freeLook && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 bg-amber-600/20 backdrop-blur-md rounded-xl border border-amber-400/30">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 text-center">
              Клик для захвата • WASD движение • Space вверх • Shift вниз • ESC выход
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
          <p className="text-[9px] font-black uppercase text-slate-300 tracking-wider text-center">
            {freeLook ? '🎮 Свободная камера • WASD + мышь • 📸 сохранить' : 'Drag вращение • Колёсико зум • 📸 сохранить'}
          </p>
        </div>
      </div>
    </div>
  );
}