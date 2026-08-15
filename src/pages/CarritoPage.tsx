import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, HStack, Input, Link, Text, Textarea, VStack, chakra } from "@chakra-ui/react";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { crearPedido, registrarEvento, registrarVisita } from "../data/api";
import { useCatalogo } from "../data/useCatalogo";
import { cambiarCantidad, quitar, resolver, useCarrito, vaciar } from "../data/carrito";
import { clp, medidas, type Opcion } from "../data/catalogo";
import { Navbar } from "../organisms/Navbar";
import { Footer } from "../organisms/Footer";
import { VistaPrevia, escalaMaxima } from "../molecules/VistaPrevia";
import { Card } from "../atoms/Card";

const campo = {
  bg: "bg.canvas",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "md",
  h: "11",
  fontSize: "sm",
  _hover: { borderColor: "border.soft" },
  _focus: { borderColor: "border.brand", outline: "none" },
} as const;

const Etiqueta = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="fg.subtle" mb="2">
    {children}
  </Text>
);

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const CarritoPage = () => {
  const { fotos, opciones, regiones, tienda } = useCatalogo();
  const items = useCarrito();
  const lineas = useMemo(() => resolver(items, fotos, opciones), [items, fotos, opciones]);
  const maxCm = useMemo(() => escalaMaxima(opciones), [opciones]);

  const [modo, setModo] = useState<"retiro" | "despacho">("despacho");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    registrarVisita("carrito");
    registrarEvento("checkout_abrir");
  }, []);

  const subtotal = lineas.reduce((s, l) => s + l.total, 0);
  const envio = modo === "despacho" ? (regiones.find((r) => r.id === region)?.costo ?? 0) : 0;
  const total = subtotal + envio;

  const faltan =
    !nombre.trim() ||
    !correoValido(email) ||
    (modo === "despacho" && (!region || !comuna.trim() || !direccion.trim()));

  const confirmar = async () => {
    setEnviando(true);
    setError("");
    const r = await crearPedido({
      cliente: { nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() },
      entrega:
        modo === "retiro"
          ? { modo, costo: 0 }
          : { modo, region, comuna: comuna.trim(), direccion: direccion.trim(), costo: envio },
      items: lineas.map((l) => ({
        fotoId: l.item.fotoId,
        papel: l.item.papel,
        tamano: l.item.tamano,
        marco: l.item.marco,
        vidrio: l.item.vidrio,
        cantidad: l.item.cantidad,
      })),
      nota: nota.trim() || undefined,
    });
    setEnviando(false);
    if (!r.ok || !r.pedidoId) {
      setError(
        r.error === "sin_conexion"
          ? "No se pudo conectar. Revisa tu conexión y vuelve a intentar."
          : "No se pudo registrar el pedido. Intenta de nuevo en un momento."
      );
      return;
    }
    // El carrito se vacía recién con el pedido ya guardado: si se limpiara
    // antes y la petición fallara, se perdería todo lo configurado.
    vaciar();
    registrarEvento("pedido_ok");
    window.location.hash = `#/pedido/${r.pedidoId}`;
  };

  const nombreOpcion = (id: string, lista: Opcion[]) => lista.find((o) => o.id === id);

  if (lineas.length === 0)
    return (
      <Box bg="bg.canvas" color="fg.default" minH="100vh">
        <Navbar minimo />
        <Flex minH="70vh" align="center" justify="center" direction="column" gap="5" px="6">
          <Box color="fg.subtle">
            <ShoppingBag size={34} strokeWidth={1} />
          </Box>
          <Text fontFamily="heading" fontSize="3xl" color="fg.muted">
            Tu carrito está vacío
          </Text>
          <Link href="#/" fontSize="sm" color="brand.primary">
            Ver la galería
          </Link>
        </Flex>
        <Footer />
      </Box>
    );

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh" overflowX="hidden">
      <Navbar minimo />

      <Box maxW="1280px" mx="auto" px={{ base: "5", md: "8" }} pt={{ base: "24", md: "28" }} pb="20">
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
          Seguir mirando
        </Link>

        <Text fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="400" mt="6" mb="10">
          Tu pedido
        </Text>

        <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" }} gap={{ base: "12", lg: "16" }} alignItems="start">
          <VStack align="stretch" gap="8">
            {/* ── Las copias ── */}
            {lineas.map((l) => {
              const tam = nombreOpcion(l.item.tamano, opciones);
              return (
                <HStack key={l.clave} align="start" gap="5" borderBottom="1px solid" borderColor="border.subtle" pb="8">
                  <Box w={{ base: "84px", md: "110px" }} flexShrink="0">
                    <VistaPrevia
                      foto={l.foto}
                      papel={nombreOpcion(l.item.papel, opciones)}
                      tamano={tam}
                      marco={nombreOpcion(l.item.marco, opciones)}
                      vidrio={nombreOpcion(l.item.vidrio, opciones)}
                      maxCm={maxCm}
                    />
                  </Box>

                  <VStack align="stretch" gap="2" flex="1" minW="0">
                    <HStack justify="space-between" align="start" gap="4">
                      <Link
                        href={`#/obra/${encodeURIComponent(l.foto.id)}`}
                        fontFamily="heading"
                        fontSize="2xl"
                        color="fg.default"
                        _hover={{ color: "brand.primary", textDecoration: "none" }}
                      >
                        {l.foto.titulo}
                      </Link>
                      <Text fontSize="md" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                        {clp(l.total)}
                      </Text>
                    </HStack>

                    <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
                      {[
                        medidas(tam),
                        nombreOpcion(l.item.papel, opciones)?.nombre,
                        nombreOpcion(l.item.marco, opciones)?.nombre,
                        nombreOpcion(l.item.vidrio, opciones)?.nombre,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>

                    <HStack justify="space-between" pt="2">
                      <HStack border="1px solid" borderColor="border.subtle" borderRadius="md" px="1">
                        <Button
                          variant="ghost"
                          size="xs"
                          color="fg.muted"
                          aria-label="Menos"
                          onClick={() => cambiarCantidad(l.clave, l.item.cantidad - 1)}
                        >
                          <Minus size={13} />
                        </Button>
                        <Text w="5" textAlign="center" fontSize="sm" fontVariantNumeric="tabular-nums">
                          {l.item.cantidad}
                        </Text>
                        <Button
                          variant="ghost"
                          size="xs"
                          color="fg.muted"
                          aria-label="Más"
                          onClick={() => cambiarCantidad(l.clave, l.item.cantidad + 1)}
                        >
                          <Plus size={13} />
                        </Button>
                      </HStack>

                      <Button
                        variant="ghost"
                        size="xs"
                        color="fg.subtle"
                        _hover={{ color: "estado.alerta" }}
                        onClick={() => quitar(l.clave)}
                      >
                        <Trash2 size={13} style={{ marginRight: 6 }} />
                        Quitar
                      </Button>
                    </HStack>
                  </VStack>
                </HStack>
              );
            })}

            {/* ── Entrega ── */}
            <Box>
              <Etiqueta>Entrega</Etiqueta>
              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
                {(
                  [
                    { id: "despacho", t: "Despacho a domicilio", d: "Costo según región" },
                    { id: "retiro", t: "Retiro", d: "Sin costo" },
                  ] as const
                ).map((op) => (
                  <chakra.button
                    key={op.id}
                    type="button"
                    onClick={() => setModo(op.id)}
                    textAlign="left"
                    px="4"
                    py="3"
                    borderRadius="md"
                    border="1px solid"
                    borderColor={modo === op.id ? "border.brand" : "border.subtle"}
                    bg={modo === op.id ? "rgba(210,185,132,0.07)" : "transparent"}
                    transition="all 0.2s"
                  >
                    <Text fontSize="sm" fontWeight="500" color={modo === op.id ? "fg.default" : "fg.muted"}>
                      {op.t}
                    </Text>
                    <Text fontSize="xs" color="fg.subtle" mt="1">
                      {op.d}
                    </Text>
                  </chakra.button>
                ))}
              </Grid>

              {modo === "despacho" ? (
                <VStack align="stretch" gap="3" mt="4">
                  <chakra.select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    {...campo}
                    px="3"
                    w="full"
                    color={region ? "fg.default" : "fg.subtle"}
                  >
                    <option value="">Elige tu región…</option>
                    {regiones
                      .filter((r) => r.activa !== false)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} — {clp(r.costo)}
                        </option>
                      ))}
                  </chakra.select>
                  <Input placeholder="Comuna" value={comuna} onChange={(e) => setComuna(e.target.value)} {...campo} />
                  <Input
                    placeholder="Dirección, número y depto."
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    {...campo}
                  />
                </VStack>
              ) : (
                tienda.retiro && (
                  <Text fontSize="sm" color="fg.subtle" mt="4" lineHeight="tall">
                    {tienda.retiro}
                  </Text>
                )
              )}
            </Box>

            {/* ── Datos de contacto ── */}
            <Box>
              <Etiqueta>Tus datos</Etiqueta>
              <VStack align="stretch" gap="3">
                <Input placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} {...campo} />
                <Input
                  type="email"
                  placeholder="Correo (ahí te llegan los datos para transferir)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  {...campo}
                />
                <Input placeholder="Teléfono (opcional)" value={telefono} onChange={(e) => setTelefono(e.target.value)} {...campo} />
                <Textarea
                  placeholder="¿Algo que debamos saber? (opcional)"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  {...campo}
                  h="20"
                  py="3"
                />
              </VStack>
            </Box>
          </VStack>

          {/* ── Resumen ── */}
          <Card p="6" position={{ base: "static", lg: "sticky" }} top="88px">
            <Etiqueta>Resumen</Etiqueta>
            <VStack align="stretch" gap="3" mt="4">
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Copias ({lineas.reduce((s, l) => s + l.item.cantidad, 0)})
                </Text>
                <Text fontSize="sm" fontVariantNumeric="tabular-nums">
                  {clp(subtotal)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  {modo === "retiro" ? "Retiro" : "Despacho"}
                </Text>
                <Text fontSize="sm" color={envio === 0 ? "fg.subtle" : "fg.default"} fontVariantNumeric="tabular-nums">
                  {modo === "despacho" && !region ? "según región" : envio === 0 ? "sin costo" : clp(envio)}
                </Text>
              </HStack>

              <HStack justify="space-between" align="baseline" pt="4" borderTop="1px solid" borderColor="border.subtle">
                <Text fontSize="xs" letterSpacing="0.2em" textTransform="uppercase" color="fg.subtle">
                  Total
                </Text>
                <Text fontFamily="heading" fontSize="3xl" fontVariantNumeric="tabular-nums">
                  {clp(total)}
                </Text>
              </HStack>

              <Button
                mt="4"
                h="12"
                borderRadius="md"
                bg="brand.primary"
                color="fg.inverted"
                fontWeight="600"
                letterSpacing="wide"
                loading={enviando}
                disabled={faltan}
                _hover={{ bg: "brass.200" }}
                onClick={confirmar}
              >
                Confirmar pedido
              </Button>

              {faltan && (
                <Text fontSize="xs" color="fg.subtle" textAlign="center">
                  Completa tus datos y la entrega para continuar.
                </Text>
              )}
              {error && (
                <Text fontSize="sm" color="estado.alerta" textAlign="center">
                  {error}
                </Text>
              )}

              <Text fontSize="xs" color="fg.subtle" lineHeight="tall" pt="2">
                El pago es por transferencia. Al confirmar te enviamos los datos de la cuenta por
                correo y el pedido queda reservado. La producción toma unos {tienda.diasProduccion}{" "}
                días hábiles desde que se confirma el pago.
              </Text>
            </VStack>
          </Card>
        </Grid>
      </Box>

      <Footer />
    </Box>
  );
};
