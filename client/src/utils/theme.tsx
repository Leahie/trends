import type { Theme } from "../types/types";

// Maybe define types better later 
export function useColorScheme(scheme:Theme) {
  return {
    "--color-black": scheme.black,
    "--color-dark": scheme.dark,
    "--color-highlight": scheme.highlight,
    "--color-accent": scheme.accent,
    "--color-light-accent": scheme["light-accent"],
    "--color-white": scheme.white,
    "--color-light-hover": scheme["light-hover"],
  };
}


function hexToHsl(hex: string) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);

  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}


function normalizeLightness(l: number) {
  if (l > 70) return 55;  
  if (l < 30) return 45; 
  return l;               
}
export function generateScheme(base: string) {
  const { h, s, l } = hexToHsl(base);
  const baseL = normalizeLightness(l);

  const toHex = (h: number, s: number, l: number) =>
    hslToHex(h, s, l); // Define this helper too

  return {
    black: toHex(h, s, 10),
    dark: toHex(h, s, baseL - 20),
    highlight: toHex(h, s, baseL + 10),
    accent: toHex(h, s, baseL - 10),
    "light-accent": toHex(h, s, baseL + 25),
    white: toHex(h, s, 95),
    "light-hover": toHex(h, s, 85),
  };
}

export function schemeToCSSVars(scheme: ReturnType<typeof generateScheme>) {
  return {
    "--color-black": scheme.black,
    "--color-dark": scheme.dark,
    "--color-highlight": scheme.highlight,
    "--color-accent": scheme.accent,
    "--color-light-accent": scheme["light-accent"],
    "--color-white": scheme.white,
    "--color-light-hover": scheme["light-hover"],
  } as React.CSSProperties;
}