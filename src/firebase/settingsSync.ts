import { ref, set, get } from 'firebase/database';
import { database } from './config';
import type { ParticleSettings, RainSettings } from '../components/ui/ControlPanel';

type SettingsType = 'winter' | 'spring' | 'rain';
type SettingsData<T extends SettingsType> = T extends 'rain' ? RainSettings : ParticleSettings;

/**
 * Firebase에 파티클 설정 저장
 */
export async function saveSettings<T extends SettingsType>(
  type: T,
  settings: SettingsData<T>
): Promise<boolean> {
  try {
    const settingsRef = ref(database, `settings/${type}`);
    await set(settingsRef, settings);
    return true;
  } catch (error) {
    console.error(`설정 저장 실패 (${type}):`, error);
    return false;
  }
}

/**
 * Firebase에서 파티클 설정 불러오기
 */
export async function loadSettings<T extends SettingsType>(
  type: T
): Promise<SettingsData<T> | null> {
  try {
    const settingsRef = ref(database, `settings/${type}`);
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      return snapshot.val() as SettingsData<T>;
    }
    return null;
  } catch (error) {
    console.error(`설정 불러오기 실패 (${type}):`, error);
    return null;
  }
}

/**
 * 겨울/봄/비 설정 모두 불러오기
 */
export async function loadAllSettings(): Promise<{
  winter: ParticleSettings | null;
  spring: ParticleSettings | null;
  rain: RainSettings | null;
}> {
  const [winter, spring, rain] = await Promise.all([
    loadSettings('winter'),
    loadSettings('spring'),
    loadSettings('rain'),
  ]);
  return { winter, spring, rain };
}
