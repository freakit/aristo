// 캘리브레이션 데이터 로드
export interface CalibrationDataLocal {
  W: number[][];
  screenBounds: { left: number; top: number; width: number; height: number };
  flipX: boolean;
  flipY: boolean;
}

export const loadCalibrationData = (
  studentId: string
): CalibrationDataLocal | null => {
  try {
    const calibKey = `gaze_calib_${studentId}`;
    const stored = localStorage.getItem(calibKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    if (
      parsed.screenWidth !== window.innerWidth ||
      parsed.screenHeight !== window.innerHeight
    ) {
      localStorage.removeItem(calibKey);
      return null;
    }

    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > SIX_HOURS) {
      localStorage.removeItem(calibKey);
      return null;
    }

    return {
      W: parsed.W,
      screenBounds: parsed.screenBounds,
      flipX: parsed.flipX,
      flipY: parsed.flipY,
    };
  } catch (err) {
    console.error("Failed to load calibration:", err);
    return null;
  }
};
