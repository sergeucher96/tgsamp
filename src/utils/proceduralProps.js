// src/utils/proceduralProps.js
// Набор процедурных 3D пропсов для TG SAMP (Банкомат, Сейф, Ящик, Фонарь, Барьер, Маркер)
import * as THREE from 'three';

export const PROP_PRESET_OPTIONS = [
  { id: 'atm_machine', name: 'Банкомат ATM', icon: '🏧', desc: 'Уличный или внутрибанковский терминал' },
  { id: 'safe_box', name: 'Сейф для денег', icon: '🔒', desc: 'Бронированный металлический сейф' },
  { id: 'wooden_crate', name: 'Ящик с грузом', icon: '📦', desc: 'Складской деревянный ящик' },
  { id: 'street_lamp', name: 'Фонарный столб', icon: '💡', desc: 'Осветительный столб с мягким светом' },
  { id: 'road_barrier', name: 'Дорожный барьер', icon: '🚧', desc: 'Красно-белое заграждение' },
  { id: 'terminal_stand', name: 'Инфо-терминал', icon: '💻', desc: 'Стойка регистрации или меню' },
  { id: 'neon_sign', name: 'Неоновая вывеска', icon: '✨', desc: 'Светящаяся вывеска 24/7' },
  { id: 'marker_cylinder', name: 'SAMP Чекпоинт', icon: '🎯', desc: 'Классический маркер пикапа SA-MP' },
];

export function buildProceduralProp(type = 'wooden_crate') {
  const group = new THREE.Group();
  group.name = `prop_${type}`;

  switch (type) {
    case 'atm_machine': {
      // Корпус банкомата
      const bodyGeo = new THREE.BoxGeometry(0.8, 1.6, 0.7);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.8;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Экран банкомата
      const screenGeo = new THREE.PlaneGeometry(0.5, 0.4);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 1.05, 0.355);
      group.add(screen);

      // Клавиатура / пинпад
      const padGeo = new THREE.BoxGeometry(0.4, 0.08, 0.2);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, 0.75, 0.38);
      pad.rotation.x = Math.PI / 6;
      group.add(pad);

      // Светящийся козырёк ATM
      const topGeo = new THREE.BoxGeometry(0.7, 0.18, 0.15);
      const topMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 1.45, 0.32);
      group.add(top);
      break;
    }

    case 'safe_box': {
      // Сейф
      const safeGeo = new THREE.BoxGeometry(1.0, 1.1, 0.9);
      const safeMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.9,
        roughness: 0.2,
      });
      const safe = new THREE.Mesh(safeGeo, safeMat);
      safe.position.y = 0.55;
      safe.castShadow = true;
      safe.receiveShadow = true;
      group.add(safe);

      // Круглый замок сейфа
      const dialGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24);
      const dialMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.1 });
      const dial = new THREE.Mesh(dialGeo, dialMat);
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0.15, 0.65, 0.46);
      group.add(dial);

      // Ручка сейфа
      const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(-0.2, 0.65, 0.48);
      group.add(handle);
      break;
    }

    case 'wooden_crate': {
      // Ящик
      const crateGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
      const crateMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.85,
        metalness: 0.05,
      });
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.y = 0.5;
      crate.castShadow = true;
      crate.receiveShadow = true;
      group.add(crate);

      // Планки рельефа ящика
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x78350f });
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(crateGeo), edgeMat);
      edges.position.y = 0.5;
      group.add(edges);
      break;
    }

    case 'street_lamp': {
      // Столб
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.2, 16);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.6;
      pole.castShadow = true;
      group.add(pole);

      // Плафон
      const lampGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.3, 16);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(0, 3.2, 0);
      group.add(lamp);

      // Светящаяся лампа
      const bulbGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 3.08, 0);
      group.add(bulb);
      break;
    }

    case 'road_barrier': {
      // Бетонное или пластиковое заграждение
      const barGeo = new THREE.BoxGeometry(1.8, 0.75, 0.4);
      const barMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.y = 0.375;
      bar.castShadow = true;
      bar.receiveShadow = true;
      group.add(bar);

      // Белые полосы
      const stripeGeo = new THREE.BoxGeometry(0.35, 0.76, 0.41);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
      stripe1.position.set(-0.45, 0.375, 0);
      const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
      stripe2.position.set(0.45, 0.375, 0);
      group.add(stripe1);
      group.add(stripe2);
      break;
    }

    case 'terminal_stand': {
      // Стойка
      const baseGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.05;
      group.add(base);

      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 16);
      const leg = new THREE.Mesh(legGeo, baseMat);
      leg.position.y = 0.55;
      group.add(leg);

      const headGeo = new THREE.BoxGeometry(0.6, 0.4, 0.08);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.15, 0);
      head.rotation.x = -Math.PI / 8;
      group.add(head);

      const screenGeo = new THREE.PlaneGeometry(0.52, 0.32);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 1.15, 0.045);
      screen.rotation.x = -Math.PI / 8;
      group.add(screen);
      break;
    }

    case 'neon_sign': {
      // Вывеска
      const boardGeo = new THREE.BoxGeometry(1.6, 0.7, 0.1);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.8, roughness: 0.3 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.y = 1.0;
      group.add(board);

      const neonGeo = new THREE.PlaneGeometry(1.4, 0.5);
      const neonMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.position.set(0, 1.0, 0.055);
      group.add(neon);
      break;
    }

    case 'marker_cylinder':
    default: {
      // Классический SA-MP чекпоинт
      const ringGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.65,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.05;
      group.add(ring);

      const beamGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.6, 32, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 0.85;
      group.add(beam);

      const diamondGeo = new THREE.OctahedronGeometry(0.3, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.y = 1.4;
      group.add(diamond);
      break;
    }
  }

  return group;
}
