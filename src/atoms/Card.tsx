import { Box, type BoxProps } from "@chakra-ui/react";

interface CardProps extends BoxProps {
  interactive?: boolean;
}

/**
 * Panel neutro para datos: resumen del pedido, formularios, fichas del panel.
 *
 * Sobre fondo oscuro no se levanta con sombra —no se vería— sino con un fondo
 * apenas más claro y un borde tenue. Las obras del catálogo no usan esto: van
 * sin contenedor, directo contra la pared.
 */
export const Card = ({ interactive, children, ...props }: CardProps) => (
  <Box
    bg="bg.elevated"
    borderRadius="lg"
    border="1px solid"
    borderColor="border.subtle"
    transition="border-color 0.25s, background-color 0.25s"
    _hover={interactive ? { borderColor: "border.soft", bg: "bg.muted" } : undefined}
    {...props}
  >
    {children}
  </Box>
);
