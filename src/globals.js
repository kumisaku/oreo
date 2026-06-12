import { lightTheme } from './theme.js';

export let T = lightTheme;
export let USD_IDR = 16250;
export let DISPLAY = "IDR";
export let PRIVATE = false;

export function applyGlobals(t, u, d, p) {
  T = t;
  USD_IDR = u;
  DISPLAY = d;
  PRIVATE = p;
}
