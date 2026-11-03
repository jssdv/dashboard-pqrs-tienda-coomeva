// Categorical hues for the five case types, assigned in a fixed order and never
// cycled. Validated with scripts/validate_palette.js against the card surface
// (#ffffff): lightness band, chroma floor, CVD separation (worst adjacent ΔE 9.1)
// and normal-vision floor all PASS. Contrast on aqua, yellow and magenta is 2.2–2.8:1, so these colors
// always ship next to a text label (see TipoTag), never alone.
export const TIPO_ORDER = ["SOLICITUD", "RECLAMO", "PREGUNTA", "QUEJA", "DEVOLUCION"] as const;

const LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;
const NEUTRAL = "#8b8a85";

export function tipoColor(tipo: string | null): string {
  const index = TIPO_ORDER.indexOf((tipo ?? "") as (typeof TIPO_ORDER)[number]);
  return index === -1 ? NEUTRAL : LIGHT[index];
}
