import { Box, Flex, Link, Text, VStack } from "@chakra-ui/react";
import { ArrowDown } from "lucide-react";
import type { Foto } from "../data/catalogo";

/**
 * Portada: una sola obra a pantalla completa.
 *
 * Es la decisión más de galería del sitio. En vez de una grilla de miniaturas y
 * un titular vendedor, entra una foto sola y grande, como la pieza que recibe
 * en la puerta de la sala. La obra la elige la clienta marcándola como
 * destacada en el panel; si no hay ninguna, se usa la primera del catálogo.
 */
export const Hero = ({ foto, bajada }: { foto?: Foto; bajada: string }) => (
  <Box position="relative" h={{ base: "88vh", md: "100vh" }} overflow="hidden" bg="bg.pared">
    {foto && (
      <Box
        as="img"
        data-obra=""
        // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
        src={foto.imagen}
        alt={foto.titulo}
        position="absolute"
        inset="0"
        w="full"
        h="full"
        objectFit="cover"
        // Bastante oscurecida: por encima va texto, y una foto a plena luz lo
        // vuelve ilegible en la mitad de las obras posibles.
        filter="brightness(0.45)"
        animation="fadeIn 1.4s ease both"
      />
    )}

    {/* Degradado inferior: engancha la portada con la galería que sigue. */}
    <Box
      position="absolute"
      inset="0"
      backgroundImage="linear-gradient(to bottom, rgba(15,15,14,0.55) 0%, rgba(15,15,14,0.1) 35%, rgba(15,15,14,0.95) 100%)"
    />

    <Flex position="relative" h="full" align="center" justify="center" px="6">
      <VStack gap="6" textAlign="center" maxW="2xl">
        <Text
          fontFamily="heading"
          fontSize={{ base: "5xl", md: "7xl" }}
          fontWeight="300"
          letterSpacing="0.12em"
          textTransform="lowercase"
          color="fg.default"
          lineHeight="1"
        >
          fefoto
        </Text>
        <Box w="40px" h="1px" bg="brand.primary" opacity="0.7" />
        <Text
          fontSize={{ base: "sm", md: "md" }}
          color="ink.200"
          maxW="lg"
          lineHeight="tall"
          letterSpacing="wide"
        >
          {bajada}
        </Text>
        <Link
          href="#galeria"
          mt="4"
          display="inline-flex"
          alignItems="center"
          gap="2"
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="fg.muted"
          _hover={{ color: "brand.primary", textDecoration: "none" }}
          transition="color 0.25s"
        >
          Ver la galería
          <ArrowDown size={14} />
        </Link>
      </VStack>
    </Flex>

    {foto && (
      // La cartela de la obra de portada, abajo a la izquierda, como en sala.
      <Text
        position="absolute"
        bottom="6"
        left={{ base: "5", md: "8" }}
        fontSize="xs"
        color="fg.subtle"
        letterSpacing="wide"
      >
        {foto.titulo}
        {foto.anio ? `, ${foto.anio}` : ""}
      </Text>
    )}
  </Box>
);
