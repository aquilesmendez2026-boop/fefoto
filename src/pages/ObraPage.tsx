import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, HStack, Link, Text, VStack } from "@chakra-ui/react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { registrarEvento, registrarVisita } from "../data/api";
import { useCatalogo, visibles } from "../data/useCatalogo";
import {
  ajustar,
  calcularPrecio,
  clp,
  seleccionInicial,
  type Configuracion,
  type Grupo,
} from "../data/catalogo";
import { agregar } from "../data/carrito";
import { Navbar } from "../organisms/Navbar";
import { Footer } from "../organisms/Footer";
import { Configurador } from "../molecules/Configurador";
import { VistaPrevia, escalaMaxima } from "../molecules/VistaPrevia";
import { ObraCard } from "../molecules/ObraCard";
import { ArticuloRender } from "../molecules/ArticuloRender";
import { Section } from "../atoms/Section";

export const ObraPage = ({ obraId }: { obraId: string }) => {
  const { fotos, opciones, cargando } = useCatalogo();
  const foto = fotos.find((f) => f.id === obraId);

  const [aMano, setAMano] = useState<Configuracion | null>(null);
  const [ajustados, setAjustados] = useState<Grupo[]>([]);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  /**
   * Lo que hay elegido: lo que tocó quien compra, o la primera combinación
   * válida mientras no toque nada.
   *
   * Se calcula al dibujar y no en un efecto porque las opciones llegan de la
   * API: con un efecto habría un primer render sin nada elegido, y el
   * configurador aparecería vacío un instante antes de acomodarse solo.
   */
  const seleccion = useMemo(
    () => aMano ?? (opciones.length ? seleccionInicial(opciones) : null),
    [aMano, opciones]
  );

  useEffect(() => {
    registrarVisita(`obra/${obraId}`);
    registrarEvento("obra_ver", obraId);
  }, [obraId]);

  const maxCm = useMemo(() => escalaMaxima(opciones), [opciones]);
  const elegida = (g: Grupo) => opciones.find((o) => o.id === seleccion?.[g] && o.grupo === g);

  const detalle = foto && seleccion ? calcularPrecio(foto, seleccion, opciones) : null;
  const agotada = foto?.edicion ? foto.edicion.vendidas >= foto.edicion.total : false;

  const cambiar = (grupo: Grupo, id: string) => {
    if (!seleccion) return;
    // Cambiar una opción puede dejar inválida otra ya elegida. En vez de
    // bloquear el cambio, se mueve lo que estorba y se avisa cuál se movió.
    const fijado = ajustar({ ...seleccion, [grupo]: id }, grupo, opciones);
    setAMano(fijado.seleccion);
    setAjustados(fijado.ajustados);
    setAgregado(false);
    registrarEvento("obra_configurar", obraId);
  };

  // El aviso de "ajustado" se apaga solo: es una explicación de lo que acaba de
  // pasar, no un estado permanente de la pantalla.
  useEffect(() => {
    if (!ajustados.length) return;
    const t = setTimeout(() => setAjustados([]), 3500);
    return () => clearTimeout(t);
  }, [ajustados]);

  if (!foto)
    return (
      <Box bg="bg.canvas" minH="100vh">
        <Navbar minimo />
        <Flex minH="70vh" align="center" justify="center" direction="column" gap="4" px="6">
          <Text fontFamily="heading" fontSize="3xl" color="fg.muted">
            {cargando ? "Cargando…" : "Esa obra ya no está"}
          </Text>
          {!cargando && (
            <Link href="#/" fontSize="sm" color="brand.primary">
              Volver a la galería
            </Link>
          )}
        </Flex>
        <Footer />
      </Box>
    );

  const otras = visibles(fotos)
    .filter((f) => f.id !== foto.id)
    .slice(0, 3);

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh" overflowX="hidden">
      <Navbar minimo />

      <Box maxW="1280px" mx="auto" px={{ base: "5", md: "8" }} pt={{ base: "24", md: "28" }} pb="10">
        <Link
          href="#/"
          display="inline-flex"
          alignItems="center"
          gap="2"
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="fg.subtle"
          _hover={{ color: "fg.default", textDecoration: "none" }}
        >
          <ArrowLeft size={14} />
          Galería
        </Link>

        <Grid
          templateColumns={{ base: "1fr", lg: "minmax(0, 1.15fr) minmax(0, 1fr)" }}
          gap={{ base: "12", lg: "16" }}
          mt="8"
          alignItems="start"
        >
          {/* La vista previa queda fija mientras se recorren las opciones: es
              lo que hay que estar mirando al elegir marco o tamaño. */}
          <Box position={{ base: "static", lg: "sticky" }} top="88px">
            {seleccion && (
              <VistaPrevia
                foto={foto}
                papel={elegida("papel")}
                tamano={elegida("tamano")}
                marco={elegida("marco")}
                vidrio={elegida("vidrio")}
                maxCm={maxCm}
              />
            )}
          </Box>

          <VStack align="stretch" gap="8">
            <Box>
              <Text fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="400" lineHeight="1.1">
                {foto.titulo}
              </Text>
              <Text fontSize="xs" color="fg.subtle" letterSpacing="wide" mt="2">
                {[foto.categorias?.join(" · "), foto.lugar, foto.anio].filter(Boolean).join("  —  ")}
              </Text>
              {foto.descripcion && (
                <Text fontSize="sm" color="fg.muted" mt="5" lineHeight="tall" maxW="lg">
                  {foto.descripcion}
                </Text>
              )}
              {foto.edicion && (
                <Text fontSize="xs" color="brand.primary" mt="4" letterSpacing="wide">
                  Edición limitada — {foto.edicion.total - foto.edicion.vendidas} de{" "}
                  {foto.edicion.total} copias disponibles
                </Text>
              )}
            </Box>

            {seleccion && (
              <Configurador
                opciones={opciones}
                seleccion={seleccion}
                onCambio={cambiar}
                ajustados={ajustados}
              />
            )}

            {/* Desglose: la obra y lo que suma cada opción. Es el argumento de
                por qué el total es el que es, y evita la sensación de precio
                inventado al final del flujo. */}
            {detalle && (
              <Box borderTop="1px solid" borderColor="border.subtle" pt="6">
                <VStack align="stretch" gap="2">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">
                      Copia
                    </Text>
                    <Text fontSize="sm" fontVariantNumeric="tabular-nums">
                      {clp(detalle.base)}
                    </Text>
                  </HStack>
                  {detalle.lineas
                    .filter((l) => l.extra > 0)
                    .map((l) => (
                      <HStack key={l.id} justify="space-between">
                        <Text fontSize="sm" color="fg.muted">
                          {l.nombre}
                        </Text>
                        <Text fontSize="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
                          + {clp(l.extra)}
                        </Text>
                      </HStack>
                    ))}
                </VStack>

                <HStack justify="space-between" align="baseline" mt="5">
                  <Text fontSize="xs" letterSpacing="0.2em" textTransform="uppercase" color="fg.subtle">
                    Total
                  </Text>
                  <Text
                    fontFamily="heading"
                    fontSize="3xl"
                    color="fg.default"
                    fontVariantNumeric="tabular-nums"
                  >
                    {clp(detalle.total * cantidad)}
                  </Text>
                </HStack>
              </Box>
            )}

            <HStack gap="3">
              <HStack
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="md"
                px="1"
                h="12"
                flexShrink="0"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  color="fg.muted"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  aria-label="Menos"
                  disabled={cantidad <= 1}
                >
                  <Minus size={14} />
                </Button>
                <Text w="6" textAlign="center" fontSize="sm" fontVariantNumeric="tabular-nums">
                  {cantidad}
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  color="fg.muted"
                  onClick={() => setCantidad((c) => Math.min(20, c + 1))}
                  aria-label="Más"
                >
                  <Plus size={14} />
                </Button>
              </HStack>

              <Button
                flex="1"
                h="12"
                borderRadius="md"
                bg={agregado ? "estado.ok" : "brand.primary"}
                color="fg.inverted"
                fontWeight="600"
                letterSpacing="wide"
                disabled={!seleccion || agotada}
                _hover={{ bg: agregado ? "estado.ok" : "brass.200" }}
                transition="background-color 0.3s"
                onClick={() => {
                  if (!seleccion) return;
                  agregar({ fotoId: foto.id, ...seleccion }, cantidad);
                  registrarEvento("carrito_agregar", foto.id);
                  setAgregado(true);
                }}
              >
                {agotada ? (
                  "Edición agotada"
                ) : agregado ? (
                  <>
                    <Check size={16} style={{ marginRight: 8 }} />
                    Agregada al carrito
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} style={{ marginRight: 8 }} />
                    Agregar al carrito
                  </>
                )}
              </Button>
            </HStack>

            {agregado && (
              <Link
                href="#/carrito"
                fontSize="sm"
                color="brand.primary"
                textAlign="center"
                _hover={{ textDecoration: "underline" }}
              >
                Ir al carrito y terminar la compra
              </Link>
            )}
          </VStack>
        </Grid>
      </Box>

      {foto.historia && foto.historia.length > 0 && (
        <Section id="historia" bg="bg.pared">
          <Box maxW="720px">
            <Text
              fontSize="xs"
              letterSpacing="0.28em"
              textTransform="uppercase"
              color="fg.subtle"
              mb="6"
            >
              La historia
            </Text>
            <ArticuloRender bloques={foto.historia} />
          </Box>
        </Section>
      )}

      {otras.length > 0 && (
        <Section id="otras">
          <Text fontSize="xs" letterSpacing="0.28em" textTransform="uppercase" color="fg.subtle" mb="8">
            Otras obras
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="8">
            {otras.map((f) => (
              <ObraCard key={f.id} foto={f} opciones={opciones} />
            ))}
          </Grid>
        </Section>
      )}

      <Footer />
    </Box>
  );
};
