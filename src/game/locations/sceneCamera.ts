/**
 * Настройки камеры 3D-сцены: опорный кадр и то, как игрок его двигает.
 *
 * Модуль общий для редактора и игры. Раньше типы камеры жили в двух
 * файлах, а игра читала из конфига только position/target/fov —
 * параллакс из редактора до игроков не доходил вообще, и настройки
 * выглядели рабочими, потому что их проигрывал предпросмотр редактора.
 *
 * Главная сложность, ради которой всё это заведено: three.js
 * считает fov по вертикали. На 16:9 и на вертикальном экране
 * телефона одно и то же значение fov даёт разный горизонтальный
 * обзор — на телефоне почти вдвое меньше. Поэтому автор задаёт не
 * угол обзора, а точку фокуса и радиус обязательной видимости, а
 * подгонку под экран делает fitCameraForAspect.
 */

export interface ParallaxProfile {
  enabled: boolean;
  /** Максимальный поворот камеры по горизонтали, градусы. */
  yawDegrees: number;
  /** Максимальный поворот по вертикали, градусы. */
  pitchDegrees: number;
  /** Сдвиг позиции камеры вместе с поворотом — даёт «объём». */
  positionShift: number;
  /** Плавность слежения за указателем, доля за кадр. */
  smoothness: number;
  /** Допустимое приближение/отдаление относительно опорной точки. */
  zoomMin: number;
  zoomMax: number;
}

export interface MotionConfig {
  desktop: ParallaxProfile;
  mobile: ParallaxProfile;
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  /** Опорный вертикальный угол обзора для экрана 16:9. */
  fov: number;
  /**
   * Радиус вокруг цели, который обязан попасть в кадр на любом
   * устройстве. Всё за ним игрок открывает движением камеры.
   */
  focusRadius: number;
  motion: MotionConfig;
}

/**
 * Эталонное соотношение сторон, для которого задан fov автора.
 * Экраны шире — видят больше по горизонтали, уже — компенсируются.
 */
export const REFERENCE_ASPECT = 16 / 9;

/**
 * Портрет телефона. Ниже этого соотношения камера считается
 * мобильной: включается усиленный профиль движения.
 */
export const MOBILE_MAX_ASPECT = 1.0;

/** Точка отсчёта для телефона: 390x780. */
export const PHONE_ASPECT = 390 / 780;

const desktopProfile = (overrides: Partial<ParallaxProfile> = {}): ParallaxProfile => ({
  enabled: true,
  yawDegrees: 8,
  pitchDegrees: 4,
  positionShift: 0.05,
  smoothness: 0.08,
  zoomMin: 0.7,
  zoomMax: 1.3,
  ...overrides,
});

/**
 * Мобильный профиль заметно шире: на телефоне нет наведения
 * курсором, всё содержимое игрок открывает движением камеры.
 */
const mobileProfile = (overrides: Partial<ParallaxProfile> = {}): ParallaxProfile => ({
  enabled: true,
  yawDegrees: 22,
  pitchDegrees: 12,
  positionShift: 0.12,
  smoothness: 0.12,
  zoomMin: 0.6,
  zoomMax: 1.5,
  ...overrides,
});

export const DEFAULT_CAMERA: CameraConfig = {
  position: [15, 10, 15],
  target: [0, 2, 0],
  fov: 48,
  focusRadius: 8,
  motion: {
    desktop: desktopProfile(),
    mobile: mobileProfile(),
  },
};

/** Значения для сцен, сохранённых до появления motion. */
export function withCameraDefaults(saved: Partial<CameraConfig> | null | undefined): CameraConfig {
  const base = DEFAULT_CAMERA;
  if (!saved) return base;

  return {
    position: saved.position ?? base.position,
    target: saved.target ?? base.target,
    fov: saved.fov ?? base.fov,
    focusRadius: saved.focusRadius ?? base.focusRadius,
    motion: {
      desktop: { ...base.motion.desktop, ...(saved.motion?.desktop ?? {}) },
      mobile: { ...base.motion.mobile, ...(saved.motion?.mobile ?? {}) },
    },
  };
}

/** Телефон ли это — по соотношению сторон экрана. */
export function isMobileAspect(aspect: number): boolean {
  return aspect <= MOBILE_MAX_ASPECT;
}

/** Профиль движения по умолчанию для текущего экрана. */
export function profileForAspect(aspect: number): ParallaxProfile {
  return isMobileAspect(aspect) ? DEFAULT_CAMERA.motion.mobile : DEFAULT_CAMERA.motion.desktop;
}

export interface FittedCamera {
  fov: number;
  /** Множитель расстояния камера→цель. */
  distanceScale: number;
}

/**
 * Подгонка камеры под соотношение сторон экрана.
 *
 * Стратегия — не растягивать угол обзора до рыбьего глаза: на
 * вертикальном экране для паритета по горизонтали потребовался бы
 * вертикальный fov около 120°. Вместо этого угол растёт до
 * предела, а остаток добирается отъездом камеры. Для интерьера
 * отъезд честнее: видно ту же комнату, просто издалека.
 */
export function fitCameraForAspect(
  config: CameraConfig,
  aspect: number,
  maxFovDegrees = 75,
  maxDistanceScale = 1.6
): FittedCamera {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : REFERENCE_ASPECT;
  const baseFov = config.fov ?? DEFAULT_CAMERA.fov;

  // Экран шире эталона: по вертикали всё и так видно целиком.
  if (safeAspect >= REFERENCE_ASPECT) {
    return { fov: baseFov, distanceScale: 1 };
  }

  // Горизонтальный угол, заданный автором на эталоне 16:9.
  const baseHalfV = (baseFov * Math.PI) / 360;
  const targetHalfH = Math.atan(Math.tan(baseHalfV) * REFERENCE_ASPECT);

  // Угол, который дал бы паритет по горизонтали на этом экране.
  const parityHalfV = Math.atan(Math.tan(targetHalfH) / safeAspect);
  const parityFov = (parityHalfV * 360) / Math.PI;

  if (parityFov <= maxFovDegrees) {
    return { fov: parityFov, distanceScale: 1 };
  }

  // Угол упёрся в предел — остаток добираем расстоянием.
  const fov = maxFovDegrees;
  const halfV = (fov * Math.PI) / 360;
  const gainedHalfH = Math.atan(Math.tan(halfV) * safeAspect);
  const scale = Math.tan(targetHalfH) / Math.tan(gainedHalfH);

  return { fov, distanceScale: Math.min(maxDistanceScale, Math.max(1, scale)) };
}

/** Сцена помещается в кадр? Проверка фокуса перед сохранением. */
export function fitsFocusOnScreen(config: CameraConfig, aspect: number): boolean {
  const distance = distanceToTarget(config);
  if (distance <= 0) return true;
  const { fov } = fitCameraForAspect(config, aspect);
  const halfV = (fov * Math.PI) / 360;
  // Видимый вертикальный полуразмер на расстоянии до цели.
  const visibleHalfHeight = Math.tan(halfV) * distance;
  return config.focusRadius <= visibleHalfHeight;
}

/** Расстояние от камеры до цели по опорному кадру. */
export function distanceToTarget(config: CameraConfig): number {
  const [px, py, pz] = config.position;
  const [tx, ty, tz] = config.target;
  return Math.hypot(px - tx, py - ty, pz - tz);
}
