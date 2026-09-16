import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class CarThumbnailGenerator {
  constructor() {
    this.width = 512;
    this.height = 512;
    this.cache = new Map();
    this.modelCache = new Map();
    this.loader = new GLTFLoader();

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 10, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.scene.add(this.camera);

    this.isInitialized = true;
  }

  async loadModel(url) {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url);
    }
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.modelCache.set(url, gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  fitCameraToObject(object, viewMode = 'iso') {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    object.position.x -= center.x;
    object.position.y -= box.min.y;
    object.position.z -= center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);

    if (viewMode === 'map') {
      // Ракурс для карты: вид сверху с легким наклоном (капот направлен вверх)
      const distance = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.35;
      this.camera.position.set(0, distance, distance * 0.25);
      this.camera.lookAt(0, 0, 0);
    } else {
      // Изометрия 3/4 для гаража и меню
      const distance = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.5;
      this.camera.position.set(distance * 0.75, distance * 0.45, distance * 0.85);
      this.camera.lookAt(0, size.y * 0.35, 0);
    }

    this.camera.updateProjectionMatrix();
  }

  applyCarColor(carModel, colorHex) {
    carModel.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        const matName = (mat.name || '').toLowerCase();
        const meshName = (child.name || '').toLowerCase();

        // Красим только кузов
        const isBody = matName.includes('body') || matName.includes('paint') || 
                       meshName.includes('body') || matName.includes('kuzov');

        if (isBody) {
          if (!mat._isClonedForPaint) {
            mat = mat.clone();
            mat._isClonedForPaint = true;
            child.material = mat;
          }
          mat.color.set(colorHex);
        }
      });
    });
  }

  async generateCarPNG(modelUrl, colorHex = '#FFFFFF', angleY = 0, viewMode = 'iso') {
    this.init();

    const cacheKey = `${modelUrl}_${colorHex}_${angleY.toFixed(2)}_${viewMode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const baseScene = await this.loadModel(modelUrl);
      const carClone = baseScene.clone(true);

      this.applyCarColor(carClone, colorHex);
      carClone.rotation.y = angleY;

      const carContainer = new THREE.Group();
      carContainer.add(carClone);
      this.scene.add(carContainer);

      this.fitCameraToObject(carClone, viewMode);

      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');

      this.scene.remove(carContainer);
      this.cache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch (err) {
      console.error('[CarThumbnailGenerator] Ошибка рендера:', err);
      return '/car.png';
    }
  }
}

export const carThumbnailService = new CarThumbnailGenerator();