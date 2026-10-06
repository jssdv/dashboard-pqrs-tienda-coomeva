// Categorical hues for the five case types, assigned in a fixed order and never
// cycled. Validated with scripts/validate_palette.js against the card surface
// (light #ffffff, dark #141c18): lightness band, chroma floor, CVD separation
// (worst adjacent ΔE 9.1 light / 8.4 dark) and normal-vision floor all PASS.
// Light-mode contrast on aqua, yellow and magenta is 2.2–2.8:1, so these colors
// always ship next to a text label (see TipoTag), never alone.
export const TIPO_ORDER = ["SOLICITUD", "RECLAMO", "PREGUNTA", "QUEJA", "DEVOLUCION"] as const;

const LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;
const DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"] as const;
const NEUTRAL = { light: "#8b8a85", dark: "#8a948e" } as const;

export function tipoColor(tipo: string | null, theme: "light" | "dark"): string {
  const index = TIPO_ORDER.indexOf((tipo ?? "") as (typeof TIPO_ORDER)[number]);
  if (index === -1) return NEUTRAL[theme];
  return (theme === "dark" ? DARK : LIGHT)[index];
}
