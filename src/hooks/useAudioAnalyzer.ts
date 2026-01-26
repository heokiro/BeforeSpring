import { useRef, useCallback } from 'react';

export interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  isBeat: boolean;
  energy: number;
}

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastBassRef = useRef(0);
  const beatThresholdRef = useRef(0.5);

  const initialize = useCallback((audioElement: HTMLAudioElement) => {
    // 이미 초기화되었으면 스킵
    if (audioContextRef.current && sourceRef.current) {
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  const getAudioData = useCallback((): AudioData => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return { bass: 0, mid: 0, treble: 0, isBeat: false, energy: 0 };
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
    const data = dataArrayRef.current;

    // 주파수 대역별 평균 계산
    // Bass: 20-250Hz (bins 0-10)
    // Mid: 250-4000Hz (bins 10-100)
    // Treble: 4000Hz+ (bins 100-512)
    const bass = averageRange(data, 0, 10) / 255;
    const mid = averageRange(data, 10, 100) / 255;
    const treble = averageRange(data, 100, 512) / 255;
    const energy = (bass * 0.5 + mid * 0.3 + treble * 0.2);

    // 비트 감지 (bass 피크 감지)
    const bassThreshold = lastBassRef.current * 1.2 + beatThresholdRef.current;
    const isBeat = bass > bassThreshold && bass > 0.4;

    // 적응형 임계값 업데이트
    lastBassRef.current = bass * 0.1 + lastBassRef.current * 0.9;

    return { bass, mid, treble, isBeat, energy };
  }, []);

  const resume = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  return { initialize, getAudioData, resume };
}

function averageRange(arr: Uint8Array, start: number, end: number): number {
  const len = Math.min(end, arr.length) - start;
  if (len <= 0) return 0;
  let sum = 0;
  for (let i = start; i < Math.min(end, arr.length); i++) {
    sum += arr[i];
  }
  return sum / len;
}
