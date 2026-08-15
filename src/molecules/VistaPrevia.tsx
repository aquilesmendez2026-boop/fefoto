import { Box, Text, VStack } from "@chakra-ui/react";
import type { Foto, Opcion } from "../data/catalogo";

/**
 * El cuadro simulado: la obra con el papel, el tamaño, el marco y el vidrio
 * que se acaban de elegir.
 *
 * Todo se dibuja con CSS a partir de las medidas reales que tiene cargada cada
 * opción (cm del tamaño, mm de la moldura y del paspartú). No hay una foto de
 * cada combinación: con cuatro papeles, cinco tamaños, cuatro marcos y cuatro
 * vidrios habría que fotografiar 320 cuadros, y cada opción nueva obligaría a
 * fotografiar 80 más.
 *
 * Dos decisiones que sostienen el realismo:
 *
 * 1. Las proporciones son de verdad. Una moldura de 32 mm sobre una copia de
 *    20 cm ocupa mucho más que sobre una de 60, y acá se ve así. Por eso la
 *    unidad es `cqmin` (1% del lado del cuadrado contenedor) en vez de píxeles:
 *    sirve igual en el mismo eje y en el otro, y se adapta sola al ancho de la
 *    pantalla sin medir nada en JavaScript.
 *
 * 2. Los tamaños se comparan entre sí. Todos se miden contra el cuadro más
 *    grande del catálogo, así que pasar de 20×30 a 60×90 hace crecer la pieza
 *    en pantalla. Escalar cada tamaño para que llenara el contenedor los hacía
 *    ver todos iguales, que es justo lo que hay que evitar cuando el tamaño es
 *    la decisión más cara. La escala va comprimida, no lineal: ver más abajo.
 */
interface VistaPreviaProps {
  foto: Pick<Foto, "imagen" | "titulo" | "ancho" | "alto">;
  papel?: Opcion;
  tamano?: Opcion;
  marco?: Opcion;
  vidrio?: Opcion;
  /** Lado más largo del catálogo, en cm. Da la escala común entre tamaños. */
  maxCm: number;
}

/**
 * El tamaño se acuesta si la obra es apaisada.
 *
 * Los tamaños se cargan en vertical (20×30), pero una copia horizontal se
 * imprime y se cuelga girada. Sin esto, una foto apaisada aparecía recortada a
 * vertical en la vista previa y no se parecía en nada a lo que llega a la casa.
 */
function orientar(foto: { ancho?: number; alto?: number }, ancho: number, alto: number) {
  const apaisada = (foto.ancho ?? 0) > (foto.alto ?? 0);
  return apaisada ? { ancho: Math.max(ancho, alto), alto: Math.min(ancho, alto) } : { ancho, alto };
}

export const VistaPrevia = ({ foto, papel, tamano, marco, vidrio, maxCm }: VistaPreviaProps) => {
  const impresion = orientar(foto, tamano?.anchoCm ?? 30, tamano?.altoCm ?? 40);

  const sinMarco = marco?.sinMarco === true;
  const moldura = sinMarco ? 0 : (marco?.grosorMm ?? 0) / 10;
  const paspartu = sinMarco ? 0 : (marco?.paspartuMm ?? 0) / 10;

  const totalAncho = impresion.ancho + 2 * (moldura + paspartu);
  const totalAlto = impresion.alto + 2 * (moldura + paspartu);

  /**
   * De centímetros a porcentaje del contenedor.
   *
   * La relación no es lineal sino comprimida: un 20×30 al lado de un 60×90
   * ocuparía menos de un quinto del cuadro, y en pantalla se veía como una
   * estampilla, ilegible justo cuando hay que decidir. Con la raíz, el más
   * chico queda cerca del 45 % y el más grande llena el marco: se sigue viendo
   * clarísimo cuál es más grande, pero ninguno deja de leerse.
   *
   * El 92 % es el aire que queda alrededor, para que ni el cuadro ni su sombra
   * toquen el borde del contenedor.
   */
  const lado = Math.max(totalAncho, totalAlto);
  const referencia = Math.max(maxCm, lado);
  const escala = (92 * Math.pow(lado / referencia, 0.45)) / lado;
  const u = (cm: number) => `${(cm * escala).toFixed(3)}cqmin`;

  const reflejo = vidrio?.reflejo ?? 0;

  // El acabado del papel cambia cómo se ve la copia: el brillante levanta el
  // contraste y satura, el algodón texturado apaga un punto y aclara los negros.
  const filtro =
    papel?.acabado === "brillante"
      ? "contrast(1.08) saturate(1.06)"
      : papel?.acabado === "texturado"
        ? "contrast(0.94) saturate(0.9) brightness(1.03)"
        : papel?.acabado === "mate"
          ? "contrast(0.97) saturate(0.96)"
          : "none";

  return (
    <VStack gap="4" w="full">
      <Box
        w="full"
        aspectRatio={1}
        containerType="size"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="bg.pared"
        borderRadius="md"
        // La luz de sala: un foco suave arriba, como en una galería.
        backgroundImage="radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.07) 0%, transparent 60%)"
        overflow="hidden"
      >
        <Box
          position="relative"
          w={u(totalAncho)}
          h={u(totalAlto)}
          transition="width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1)"
          boxShadow="cuadro"
          bg={sinMarco ? "transparent" : (marco?.color ?? "#141412")}
          // El filo claro de la moldura por arriba y el canto oscuro por abajo:
          // es lo que hace que se lea como un objeto con volumen y no como un
          // rectángulo de color.
          backgroundImage={
            sinMarco
              ? undefined
              : "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.32) 100%)"
          }
          p={u(moldura)}
        >
          <Box
            position="relative"
            w="full"
            h="full"
            // El paspartú es cartón crudo, no blanco puro: el blanco puro sobre
            // fondo negro deslumbra y se come la foto.
            bg={paspartu > 0 ? "#efece4" : "transparent"}
            p={u(paspartu)}
            boxShadow={
              paspartu > 0 ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : undefined
            }
          >
            <Box position="relative" w="full" h="full" overflow="hidden">
              <Box
                as="img"
                data-obra=""
                // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
                src={foto.imagen}
                alt={foto.titulo}
                loading="lazy"
                w="full"
                h="full"
                objectFit="cover"
                filter={filtro}
                transition="filter 0.35s"
                display="block"
              />
              {/* Sombra del paspartú sobre la copia: el papel está hundido. */}
              {paspartu > 0 && (
                <Box
                  position="absolute"
                  inset="0"
                  pointerEvents="none"
                  boxShadow="inset 0 0 14px rgba(0,0,0,0.35)"
                />
              )}
            </Box>
          </Box>

          {/* El vidrio va sobre todo lo demás, paspartú incluido: en un cuadro
              real es una lámina única por delante de la moldura interior. */}
          {reflejo > 0 && (
            <Box
              position="absolute"
              inset="0"
              pointerEvents="none"
              opacity={reflejo}
              backgroundImage="linear-gradient(118deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.28) 18%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.16) 82%, rgba(255,255,255,0.5) 100%)"
              transition="opacity 0.35s"
            />
          )}
        </Box>
      </Box>

      <Text fontSize="xs" color="fg.subtle" letterSpacing="wide" textAlign="center">
        {impresion.ancho} × {impresion.alto} cm de copia
        {moldura + paspartu > 0 &&
          ` · ${Math.round(totalAncho)} × ${Math.round(totalAlto)} cm con marco`}
      </Text>
    </VStack>
  );
};

/**
 * El cuadro más grande que puede llegar a armarse, en cm: el tamaño mayor con
 * el marco más ancho. Es la escala común contra la que se dibujan todas las
 * vistas previas, y por eso se calcula una vez sobre el catálogo entero y no
 * dentro de cada tarjeta.
 */
export const escalaMaxima = (opciones: Opcion[]) => {
  const marcos = opciones.filter((o) => o.grupo === "marco");
  const tamanos = opciones.filter((o) => o.grupo === "tamano");
  const bordeMax = Math.max(0, ...marcos.map((m) => ((m.grosorMm ?? 0) + (m.paspartuMm ?? 0)) / 10));
  const ladoMax = Math.max(40, ...tamanos.map((t) => Math.max(t.anchoCm ?? 0, t.altoCm ?? 0)));
  return ladoMax + 2 * bordeMax;
};
