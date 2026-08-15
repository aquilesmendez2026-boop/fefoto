import { Box, Grid, Image, Text, VStack } from "@chakra-ui/react";

/** Celda de un bloque del artículo. */
export interface Celda {
  tipo: "texto" | "imagen" | "video";
  texto?: string;
  url?: string;
  pie?: string;
}

/** Bloque del artículo: una o dos columnas. */
export interface Bloque {
  columnas: 1 | 2;
  celdas: Celda[];
}

/** Convierte una URL de YouTube o Vimeo en su URL para incrustar. */
export function urlEmbed(url: string): string {
  const u = (url || "").trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return u;
}

/** Renderiza el cuerpo del artículo (panel y sitio público). */
export function ArticuloRender({ bloques }: { bloques: Bloque[] }) {
  return (
    <VStack align="stretch" gap="7">
      {bloques.map((b, i) => (
        <Grid
          key={i}
          templateColumns={b.columnas === 2 ? { base: "1fr", md: "1fr 1fr" } : "1fr"}
          gap={{ base: "5", md: "8" }}
          alignItems="start"
        >
          {b.celdas.map((c, ci) => (
            <Box key={ci} minW="0">
              {c.tipo === "texto" &&
                (c.texto || "")
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((par, pi) => (
                    <Text
                      key={pi}
                      fontSize={{ base: "md", md: "lg" }}
                      color="fg.muted"
                      lineHeight="tall"
                      mb="4"
                      whiteSpace="pre-wrap"
                    >
                      {par}
                    </Text>
                  ))}

              {c.tipo === "imagen" && c.url && (
                <Box>
                  <Image src={c.url} alt={c.pie || ""} borderRadius="2xl" w="full" />
                  {c.pie && (
                    <Text fontSize="xs" color="fg.subtle" mt="2" textAlign="center">
                      {c.pie}
                    </Text>
                  )}
                </Box>
              )}

              {c.tipo === "video" && c.url && (
                <Box borderRadius="2xl" overflow="hidden" bg="black" aspectRatio={16 / 9}>
                  <Box
                    as="iframe"
                    // @ts-expect-error el iframe acepta src
                    src={urlEmbed(c.url)}
                    w="full"
                    h="full"
                    border="0"
                    allowFullScreen
                  />
                </Box>
              )}
            </Box>
          ))}
        </Grid>
      ))}
    </VStack>
  );
}
