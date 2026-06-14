// Canvas fingerprint randomizer - OPSEC koruma
// Her render'da noise ekleyerek fingerprint'i sürekli değiştirir

let noiseEnabled = false;

export function enableCanvasNoise() {
  noiseEnabled = true;
}

export function disableCanvasNoise() {
  noiseEnabled = false;
}

export function isCanvasNoiseEnabled() {
  return noiseEnabled;
}

// Canvas rendering'a noise ekle
export function addCanvasNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (!noiseEnabled) return;

  // Subtle noise - görünmez ama fingerprint'i değiştirir
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Her piksele çok küçük random offset
    const noise = (Math.random() - 0.5) * 2;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

// WebGL renderer fake
export function getWebGLVendor(): string {
  if (!noiseEnabled) return "";

  const vendors = [
    "Intel Inc.",
    "NVIDIA Corporation",
    "AMD",
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11)",
  ];
  return vendors[Math.floor(Math.random() * vendors.length)];
}

export function getWebGLRenderer(): string {
  if (!noiseEnabled) return "";

  const renderers = [
    "ANGLE GeForce GTX 1080",
    "Intel Iris OpenGL Engine",
    "AMD Radeon Pro 580",
    "Intel UHD Graphics 630",
  ];
  return renderers[Math.floor(Math.random() * renderers.length)];
}

// Screen resolution masking
export function getScreenResolution(): { width: number; height: number } {
  if (!noiseEnabled) {
    return { width: window.screen.width, height: window.screen.height };
  }

  // Yaygın çözünürlükler
  const common = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ];
  return common[Math.floor(Math.random() * common.length)];
}

// User agent minimal modification
export function getUserAgent(): string {
  return navigator.userAgent;
}

// Audio context noise
let audioContext: AudioContext | null = null;

export function getAudioContextNoise(): Float32Array | null {
  if (!noiseEnabled) return null;

  try {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }

    // Gizli noise oluştur
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const analyser = audioContext.createAnalyser();

    oscillator.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    // Clean up
    oscillator.disconnect();

    return dataArray;
  } catch {
    return null;
  }
}

// Connection protection
export function checkConnectionStatus(): {
  online: boolean;
  type: string;
  downlink: number;
  rtt: number;
} {
  const cn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return {
    online: navigator.onLine,
    type: cn?.effectiveType || "unknown",
    downlink: cn?.downlink || 0,
    rtt: cn?.rtt || 0,
  };
}
