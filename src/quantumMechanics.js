const BOHR_RADIUS = 0.529177;
const PI = Math.PI;

export const THEMES = {
  thermal: "Thermal (Red/Gold)",
  electric: "Electric (Blue/Cyan)",
  spectral: "Spectral (Rainbow)",
  neon: "Cyber Neon (Pink/Lime)",
};

// CSS Gradients for the Legend UI
export const THEME_GRADIENTS = {
  thermal: "linear-gradient(90deg, #000 0%, #330000 33%, #cc0000 66%, #ffff00 100%)",
  electric: "linear-gradient(90deg, #000 0%, #1a0033 33%, #00ccff 66%, #ffffff 100%)",
  spectral: "linear-gradient(90deg, #0000ff 0%, #00ff00 50%, #ff0000 100%)",
  neon: "linear-gradient(90deg, #000 0%, #ff00ff 50%, #ccff00 100%)",
};

let currentTheme = "thermal";

export function setTheme(themeName) {
  if (THEMES[themeName]) currentTheme = themeName;
}

export function getThemeGradient() {
  return THEME_GRADIENTS[currentTheme] || THEME_GRADIENTS["thermal"];
}

function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function laguerre(n, k, x) {
  if (n === 0) return 1;
  if (n === 1) return 1 + k - x;
  let p = 1,
    c = 1 + k - x;
  for (let i = 2; i <= n; i++) {
    const next = ((2 * i - 1 + k - x) * c - (i - 1 + k) * p) / i;
    p = c;
    c = next;
  }
  return c;
}

function sphericalHarmonic(l, m, theta, phi) {
  const cT = Math.cos(theta),
    sT = Math.sin(theta);
  if (l === 0) return 0.282095;
  if (l === 1) {
    if (m === 0) return 0.488603 * cT;
    if (m === 1) return 0.488603 * sT * Math.cos(phi);
    if (m === -1) return 0.488603 * sT * Math.sin(phi);
  }
  if (l === 2) {
    if (m === 0) return 0.315392 * (3 * cT * cT - 1);
    if (m === 1) return 1.092548 * sT * cT * Math.cos(phi);
    if (m === -1) return 1.092548 * sT * cT * Math.sin(phi);
    if (m === 2) return 0.546274 * sT * sT * Math.cos(2 * phi);
    if (m === -2) return 0.546274 * sT * sT * Math.sin(2 * phi);
  }
  return 0.282095;
}

export function radialWaveFunction(n, l, r, Z = 1) {
  const rho = (2 * Z * r) / n;
  const N = Math.sqrt((Math.pow((2 * Z) / n, 3) * factorial(n - l - 1)) / (2 * n * factorial(n + l)));
  return N * Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho);
}

export function probabilityDensity(n, l, m, r, theta, phi, Z = 1) {
  const val = radialWaveFunction(n, l, r, Z) * sphericalHarmonic(l, m, theta, phi);
  return val * val;
}

export function sampleRadius(n, l, Z_eff = 1, maxAttempts = 2000) {
  const rPeak = (n * n) / Z_eff;
  const rMax = rPeak * 7.0;
  const maxProb = radialWaveFunction(n, l, rPeak, Z_eff);
  const maxProbSq = rPeak * rPeak * maxProb * maxProb;

  for (let i = 0; i < maxAttempts; i++) {
    const r = Math.random() * rMax;
    const R = radialWaveFunction(n, l, r, Z_eff);
    const P = r * r * R * R;
    if (Math.random() < P / maxProbSq) return r;
  }
  return rPeak;
}

export function sampleAngles(l, m) {
  for (let i = 0; i < 100; i++) {
    const theta = Math.random() * PI;
    const phi = Math.random() * 2 * PI;
    const Y = sphericalHarmonic(l, m, theta, phi);
    const P = Y * Y * Math.sin(theta);

    // Slightly higher threshold to catch peaks
    if (Math.random() < P / 0.8) return { theta, phi };
  }

  const u = Math.random();
  const v = Math.random();
  return {
    theta: Math.acos(2 * u - 1),
    phi: 2 * PI * v,
  };
}

export function sampleParticlePosition(n, l, m, atomicNumber) {
  let Z_visual = 1.0;
  const r = sampleRadius(n, l, Z_visual);
  const { theta, phi } = sampleAngles(l, m);

  return {
    x: r * Math.sin(theta) * Math.cos(phi),
    y: r * Math.sin(theta) * Math.sin(phi),
    z: r * Math.cos(theta),
    density: probabilityDensity(n, l, m, r, theta, phi, Z_visual),
  };
}

export function getMassNumber(Z) {
  if (Z <= 20) return Z * 2;
  if (Z <= 50) return Math.round(Z * 2.3);
  return Math.round(Z * 2.55);
}

export function getNeutronCount(Z) {
  return getMassNumber(Z) - Z;
}

export function getHeatmapColor(prob) {
  const t = Math.min(Math.max(prob, 0), 1);
  const val = Math.pow(t, 0.45);

  let r = 0,
    g = 0,
    b = 0;

  switch (currentTheme) {
    case "electric":
      if (val < 0.5) {
        r = val * 0.8;
        g = 0;
        b = 0.5 + val;
      } else {
        r = 0.4 + (val - 0.5);
        g = (val - 0.5) * 2;
        b = 1.0;
      }
      break;

    case "spectral":
      const hue = (1.0 - val) * 240;
      if (hue < 60) {
        r = 1;
        g = hue / 60;
        b = 0;
      } else if (hue < 120) {
        r = (120 - hue) / 60;
        g = 1;
        b = 0;
      } else if (hue < 180) {
        r = 0;
        g = 1;
        b = (hue - 120) / 60;
      } else {
        r = 0;
        g = (240 - hue) / 60;
        b = 1;
      }
      if (val > 0.8) {
        r += 0.5;
        g += 0.5;
        b += 0.5;
      }
      break;

    case "neon":
      if (val < 0.3) {
        r = val * 3;
        g = 0;
        b = val * 3;
      } else if (val < 0.6) {
        r = 0.9;
        g = (val - 0.3) * 3;
        b = 0.9 - (val - 0.3) * 3;
      } else {
        r = 0.9 - (val - 0.6);
        g = 1.0;
        b = 0;
      }
      break;

    case "thermal":
    default:
      if (val < 0.2) {
        r = val * 0.5;
        g = 0;
        b = 0.5 + val * 2.0;
      } else if (val < 0.5) {
        const loc = (val - 0.2) / 0.3;
        r = loc;
        g = 0;
        b = 0.2 * (1 - loc);
      } else if (val < 0.8) {
        const loc = (val - 0.5) / 0.3;
        r = 1.0;
        g = loc;
        b = 0;
      } else {
        const loc = (val - 0.8) / 0.2;
        r = 1.0;
        g = 1.0;
        b = loc;
      }
      break;
  }
  return { r, g, b };
}
