import { useMemo, useState } from "react";
import { Box, HStack, Text, chakra } from "@chakra-ui/react";
import { Section } from "../atoms/Section";
import { SectionTitle } from "../atoms/SectionTitle";
import { ObraCard } from "../molecules/ObraCard";
import { categoriasVisibles } from "../data/useCatalogo";
import type { Categoria, Foto, Opcion } from "../data/catalogo";

const TODAS = "Todas";

/**
 * La galería: todas las obras, filtrables por categoría.
 *
 * La grilla es de columnas CSS y no un grid de filas iguales. Las fotos vienen
 * en vertical, horizontal y cuadrado, y un grid las obligaría a recortarse
 * todas a la misma proporción: recortar la obra de otra persona para que calce
 * en una cuadrícula es exactamente lo que no se puede hacer acá.
 */
export const GaleriaSection = ({
  fotos,
  opciones,
  categorias,
}: {
  fotos: Foto[];
  opciones: Opcion[];
  categorias: Categoria[];
}) => {
  const [filtro, setFiltro] = useState(TODAS);
  const filtros = useMemo(() => [TODAS, ...categoriasVisibles(fotos, categorias)], [fotos, categorias]);
  const visibles = useMemo(
    () => (filtro === TODAS ? fotos : fotos.filter((f) => f.categorias?.includes(filtro))),
    [fotos, filtro]
  );

  return (
    <Section id="galeria" py={{ base: "16", md: "24" }}>
      <SectionTitle
        eyebrow="Catálogo"
        title="La galería"
        subtitle="Cada obra se imprime a pedido. Elige la copia y decide después el papel, el tamaño, el marco y el vidrio."
      />

      {filtros.length > 2 && (
        <HStack gap="1" flexWrap="wrap" mt="8" mb="10">
          {filtros.map((c) => (
            <chakra.button
              key={c}
              type="button"
              onClick={() => setFiltro(c)}
              px="4"
              py="2"
              fontSize="xs"
              letterSpacing="0.14em"
              textTransform="uppercase"
              borderRadius="full"
              border="1px solid"
              borderColor={c === filtro ? "border.brand" : "transparent"}
              color={c === filtro ? "brand.primary" : "fg.subtle"}
              transition="all 0.2s"
              _hover={{ color: "fg.default" }}
            >
              {c}
            </chakra.button>
          ))}
        </HStack>
      )}

      {visibles.length === 0 ? (
        <Text color="fg.subtle" fontSize="sm" py="10">
          Todavía no hay obras en esta categoría.
        </Text>
      ) : (
        <Box
          css={{
            columnCount: 1,
            columnGap: "2rem",
            "@media (min-width: 768px)": { columnCount: 2 },
            "@media (min-width: 1100px)": { columnCount: 3 },
          }}
        >
          {visibles.map((foto) => (
            // `break-inside: avoid` es lo que impide que una obra se parta en
            // dos columnas, que es el defecto de las columnas CSS.
            <Box key={foto.id} mb="12" css={{ breakInside: "avoid" }}>
              <ObraCard foto={foto} opciones={opciones} />
            </Box>
          ))}
        </Box>
      )}
    </Section>
  );
};
