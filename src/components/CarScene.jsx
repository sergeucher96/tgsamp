import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function CarModel({ url, color, rotation }) {
  const group = useRef();
  const gltf = useLoader(GLTFLoader, url);

  useEffect(() => {
    if (color && gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            const matName = (mat.name || '').toLowerCase();
            const meshName = (child.name || '').toLowerCase();

            // Красим только детали с именем Body / Paint / Kuzov
            const isBody = matName.includes('body') || matName.includes('paint') || 
                           meshName.includes('body') || matName.includes('kuzov');

            if (isBody) {
              mat.color.set(color);
            }
          });
        }
      });
    }
  }, [color, gltf]);

  useEffect(() => {
    if (group.current) {
      group.current.rotation.y = rotation;
    }
  }, [rotation]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={gltf.scene} scale={1.2} />
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />
      <hemisphereLight skyColor="#87ceeb" groundColor="#020617" intensity={0.4} />
    </>
  );
}

export default function CarScene({ model, rotation, carData }) {
  return (
    <Canvas
      className="w-full h-full"
      camera={{ position: [0, 2, 6], fov: 45, near: 0.1, far: 100 }}
      style={{ background: 'linear-gradient(to bottom, #0a0f1a, #020617)' }}
    >
      <Lights />
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.6}
        scale={10}
        blur={2}
        far={2}
        resolution={256}
        color="#000000"
      />
      <Suspense fallback={null}>
        <CarModel url={model} color={carData?.color} rotation={rotation} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping={true}
        dampingFactor={0.08}
      />
    </Canvas>
  );
}