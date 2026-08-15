import { createSystem, defineConfig, defaultConfig } from "@chakra-ui/react";
import { colors, fonts } from "./tokens";
import { semanticTokens } from "./semanticTokens";

const config = defineConfig({
  theme: {
    tokens: {
      colors,
      fonts,
    },
    semanticTokens,
    breakpoints: {
      sm: "320px",
      md: "768px",
      lg: "960px",
      xl: "1200px",
    },
    keyframes: {
      // Las fotos entran subiendo apenas, como cuando se cuelga una pieza.
      fadeIn: {
        "0%": { opacity: "0", transform: "translateY(14px)" },
        "100%": { opacity: "1", transform: "translateY(0)" },
      },
      // Barrido de luz sobre el vidrio de la vista previa.
      brillo: {
        "0%": { transform: "translateX(-120%)" },
        "100%": { transform: "translateX(120%)" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
