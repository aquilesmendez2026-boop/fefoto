import { Button } from "@chakra-ui/react";
import { Home } from "lucide-react";

/**
 * Píldora "Inicio" de las barras superiores del panel y de la cuenta.
 *
 * Es un componente y no dos botones parecidos porque estaban quedando
 * distintos: en el panel decía "Ir al sitio" con una flecha y en la cuenta
 * "Inicio" con una casa, siendo el mismo enlace al mismo lugar.
 */
export const BotonInicio = () => (
  <Button
    as="a"
    // @ts-expect-error Chakra dibuja un ancla con `as` y no tipa href
    href="#"
    size="sm"
    h="9"
    px="4"
    borderRadius="full"
    variant="outline"
    borderColor="border.soft"
    color="fg.muted"
    fontWeight="600"
    _hover={{
      color: "brand.primary",
      borderColor: "brand.primary",
      textDecoration: "none",
    }}
  >
    <Home size={14} style={{ marginRight: 6 }} />
    Inicio
  </Button>
);
