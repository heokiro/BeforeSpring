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
  // 여러 오디오 요소의 소스를 저장하는 Map
  const sourcesRef = useRef<Map<HTMLAudioElement, MediaElementAudioSourceNode>>(new Map());
  const currentSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastBassRef = useRef(0);
  const beatThresholdRef = useRef(0.02);

  const initialize = useCallback((audioElement: HTMLAudioElement) => {
    // AudioContext와 Analyser가 없으면 생성
    if (!audioContextRef.current) {
      console.log('AudioAnalyzer: AudioContext 생성');
      audioContextRef.current = new AudioContext();
    }

    if (!analyserRef.current) {
      console.log('AudioAnalyzer: Analyser 생성');
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(audioContextRef.current.destination);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    // 이 오디오 요소에 대한 소스가 이미 있는지 확인
    let source = sourcesRef.current.get(audioElement);

    if (!source) {
      // 새 오디오 요소에 대한 소스 생성
      console.log('AudioAnalyzer: 새 오디오 소스 생성');
      source = audioContextRef.current.createMediaElementSource(audioElement);
      sourcesRef.current.set(audioElement, source);
    }

    // 현재 소스가 다르면 연결 전환
    if (currentSourceRef.current !== source) {
      // 이전 소스 연결 해제
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.disconnect(analyserRef.current);
          console.log('AudioAnalyzer: 이전 소스 연결 해제');
        } catch (e) {
          // 이미 연결 해제되어 있을 수 있음
        }
      }

      // 새 소스를 analyser에 연결
      source.connect(analyserRef.current);
      currentSourceRef.current = source;
      console.log('AudioAnalyzer: 새 소스 연결 완료');
    }
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

    // 비트 감지 (bass 급상승 감지)
    const bassDiff = bass - lastBassRef.current;
    const isBeat = bassDiff > beatThresholdRef.current && bass > 0.3;

    // 적응형 임계값 업데이트 (느리게 따라가서 diff가 커지도록)
    lastBassRef.current = bass * 0.1 + lastBassRef.current * 0.9;

    return { bass, mid, treble, isBeat, energy };
  }, []);

  const resume = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('AudioAnalyzer: resume 완료');
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
