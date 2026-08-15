import { Box, Text, VStack } from "@chakra-ui/react";
import { clp, precioDesde, type Foto, type Opcion } from "../data/catalogo";

/**
 * Una obra en la galería.
 *
 * Sin tarjeta, sin borde y sin sombra: la foto se apoya directamente sobre la
 * pared y el texto va debajo, como la cartela de una sala. Cualquier caja
 * alrededor le pone un marco que la clienta no eligió.
 */
export const ObraCard = ({ foto, opciones }: { foto: Foto; opciones: Opcion[] }) => {
  const desde = precioDesde(foto, opciones);
  const agotada = foto.edicion ? foto.edicion.vendidas >= foto.edicion.total : false;

  return (
    <Box
      as="a"
      // @ts-expect-error Chakra dibuja un ancla con `as` y no tipa href
      href={`#/obra/${encodeURIComponent(foto.id)}`}
      display="block"
      role="group"
      _hover={{ textDecoration: "none" }}
    >
      <Box position="relative" overflow="hidden" bg="bg.pared">
        <Box
          as="img"
          data-obra=""
          // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
          src={foto.imagen}
          alt={foto.titulo}
          loading="lazy"
          w="full"
          display="block"
          // La proporción real de cada foto, para que la galería no las recorte
          // todas a un cuadrado. El espacio queda reservado desde el principio
          // y la grilla no salta mientras cargan.
          style={{ aspectRatio: `${foto.ancho ?? 4} / ${foto.alto ?? 5}` }}
          objectFit="cover"
          // Al pasar por encima la foto se aclara, como cuando se enciende el
          // foco de esa pieza. Es el único movimiento de la galería.
          filter="brightness(0.88)"
          transition="filter 0.5s, transform 0.7s cubic-bezier(0.2,0,0.2,1)"
          _groupHover={{ filter: "brightness(1)", transform: "scale(1.02)" }}
        />
        {agotada && (
          <Text
            position="absolute"
            top="3"
            left="3"
            fontSize="2xs"
            letterSpacing="0.2em"
            textTransform="uppercase"
            bg="bg.canvas"
            color="fg.muted"
            px="2.5"
            py="1"
          >
            Edición agotada
          </Text>
        )}
      </Box>

      <VStack align="start" gap="1" pt="3.5">
        <Text fontFamily="heading" fontSize="xl" fontWeight="400" color="fg.default" lineHeight="1.2">
          {foto.titulo}
        </Text>
        <Text fontSize="xs" color="fg.subtle" letterSpacing="wide">
          {[foto.categorias?.join(" · "), foto.anio].filter(Boolean).join("  —  ")}
        </Text>
        <Text fontSize="sm" color="fg.muted" pt="1" fontVariantNumeric="tabular-nums">
          desde {clp(desde)}
        </Text>
      </VStack>
    </Box>
  );
};
