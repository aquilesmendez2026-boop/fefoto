export const semanticTokens = {
  colors: {
    bg: {
      // El lienzo es casi negro, no negro: el negro puro hace que las fotos
      // con sombras profundas parezcan recortadas contra el fondo.
      canvas: { value: "{colors.ink.900}" },
      surface: { value: "rgba(255, 255, 255, 0.03)" },
      muted: { value: "{colors.ink.800}" },
      elevated: { value: "{colors.ink.850}" },
      /** Fondo del marco simulado y de la ficha de la obra. */
      pared: { value: "{colors.ink.950}" },
    },
    fg: {
      default: { value: "{colors.ink.50}" },
      muted: { value: "{colors.ink.300}" },
      subtle: { value: "{colors.ink.400}" },
      accent: { value: "{colors.brass.300}" },
      inverted: { value: "{colors.ink.900}" },
    },
    border: {
      subtle: { value: "rgba(255, 255, 255, 0.08)" },
      soft: { value: "rgba(255, 255, 255, 0.14)" },
      brand: { value: "rgba(210, 185, 132, 0.45)" },
    },
    brand: {
      primary: { value: "{colors.brass.300}" },
      secondary: { value: "{colors.brass.500}" },
      accent: { value: "{colors.brass.200}" },
    },
  },
  shadows: {
    // En fondo oscuro una sombra negra no se ve. Lo que da relieve es el filo
    // claro de arriba; la sombra solo asienta la pieza sobre la pared.
    soft: {
      value: "0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 30px -18px rgba(0,0,0,0.9)",
    },
    lifted: {
      value: "0 1px 0 rgba(255,255,255,0.08) inset, 0 26px 50px -20px rgba(0,0,0,1)",
    },
    /** El cuadro colgado: sombra proyectada hacia abajo, como en una pared. */
    cuadro: {
      value: "0 30px 60px -25px rgba(0,0,0,0.95), 0 8px 20px -12px rgba(0,0,0,0.8)",
    },
  },
  gradients: {
    brand: {
      value: "linear-gradient(135deg, #e3d3af 0%, #a4854b 100%)",
    },
  },
};
