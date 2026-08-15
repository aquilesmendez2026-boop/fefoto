import { Flex, HStack, Link, Text } from "@chakra-ui/react";
import { Logo } from "../atoms/Logo";

const enlace = {
  fontSize: "xs",
  color: "fg.subtle",
  letterSpacing: "wide",
  _hover: { color: "fg.muted", textDecoration: "none" },
} as const;

export const Footer = () => (
  <Flex
    as="footer"
    borderTop="1px solid"
    borderColor="border.subtle"
    bg="bg.canvas"
    px={{ base: "5", md: "8" }}
    py="10"
    maxW="1280px"
    mx="auto"
    direction={{ base: "column", md: "row" }}
    align="center"
    justify="space-between"
    gap="6"
  >
    <Logo fontSize="lg" />

    <HStack gap="6" flexWrap="wrap" justify="center">
      <Link href="#galeria" {...enlace}>
        Galería
      </Link>
      <Link href="#/carrito" {...enlace}>
        Carrito
      </Link>
      <Link href="#/cuenta" {...enlace}>
        Mis pedidos
      </Link>
      <Link href="#/privacidad" {...enlace}>
        Privacidad
      </Link>
      {/* El acceso del equipo vive acá abajo, discreto, como en el sitio
          anterior: no hace falta un botón de "administración" en el navbar. */}
      <Link href="#/admin" {...enlace}>
        Administración
      </Link>
    </HStack>

    <Text fontSize="xs" color="fg.subtle">
      © {new Date().getFullYear()} fefoto
    </Text>
  </Flex>
);
