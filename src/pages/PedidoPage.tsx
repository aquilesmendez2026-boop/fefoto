import { useEffect, useState } from "react";
import { Box, Flex, Grid, HStack, Link, Spinner, Text, VStack, chakra } from "@chakra-ui/react";
import { Check, Copy } from "lucide-react";
import { getPedido, registrarVisita } from "../data/api";
import { useCatalogo } from "../data/useCatalogo";
import { clp } from "../data/catalogo";
import { MENSAJE_ESTADO, estadoDe, type Pedido } from "../data/pedido";
import { Navbar } from "../organisms/Navbar";
import { Footer } from "../organisms/Footer";
import { Card } from "../atoms/Card";

const Dato = ({ k, v }: { k: string; v: string }) => (
  <HStack justify="space-between" gap="4" py="1.5">
    <Text fontSize="sm" color="fg.subtle">
      {k}
    </Text>
    <Text fontSize="sm" color="fg.default" textAlign="right">
      {v}
    </Text>
  </HStack>
);

/**
 * La página del pedido: confirmación al comprar y seguimiento después.
 *
 * Es la misma pantalla en los dos momentos a propósito. El enlace que le llega
 * por correo a quien compró apunta acá, así que la página tiene que servir
 * tanto para "ya está, transfiere a esta cuenta" como para "¿en qué va lo mío?"
 * un par de semanas más tarde.
 */
export const PedidoPage = ({ pedidoId }: { pedidoId: string }) => {
  const { tienda } = useCatalogo();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState(false);
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    registrarVisita("pedido");
    getPedido(pedidoId)
      .then(setPedido)
      .catch(() => setError(true));
  }, [pedidoId]);

  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* sin permiso de portapapeles: los datos igual están a la vista */
    }
  };

  if (error)
    return (
      <Box bg="bg.canvas" color="fg.default" minH="100vh">
        <Navbar minimo />
        <Flex minH="70vh" align="center" justify="center" direction="column" gap="4" px="6">
          <Text fontFamily="heading" fontSize="3xl" color="fg.muted">
            No encontramos ese pedido
          </Text>
          <Text fontSize="sm" color="fg.subtle" textAlign="center" maxW="md">
            Revisa el enlace que te llegó por correo, o escríbenos a {tienda.correo} y lo buscamos.
          </Text>
        </Flex>
        <Footer />
      </Box>
    );

  if (!pedido)
    return (
      <Box bg="bg.canvas" minH="100vh">
        <Navbar minimo />
        <Flex minH="70vh" align="center" justify="center">
          <Spinner color="brand.primary" />
        </Flex>
      </Box>
    );

  const estado = estadoDe(pedido.estado);
  const porPagar = pedido.estado === "pendiente_pago";
  const banco = tienda.banco;

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh">
      <Navbar minimo />

      <Box maxW="880px" mx="auto" px={{ base: "5", md: "8" }} pt={{ base: "24", md: "28" }} pb="20">
        <VStack align="start" gap="3" mb="10">
          <HStack gap="3">
            <Box boxSize="2" borderRadius="full" bg={estado.color} />
            <Text fontSize="xs" letterSpacing="0.2em" textTransform="uppercase" color="fg.subtle">
              {estado.nombre}
            </Text>
          </HStack>
          <Text fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="400" lineHeight="1.1">
            Pedido {pedido.numero}
          </Text>
          <Text fontSize="sm" color="fg.muted" maxW="lg" lineHeight="tall">
            {MENSAJE_ESTADO[pedido.estado]}
            {porPagar &&
              ` Te enviamos una copia de estos datos a ${pedido.cliente.email}.`}
          </Text>
        </VStack>

        {/* Los datos para transferir, arriba y copiables: es lo único que hay
            que hacer ahora, y buscarlos en el correo es un paso de más. */}
        {porPagar && banco.numero && (
          <Card p="6" mb="8" borderColor="border.brand">
            <Text fontSize="xs" letterSpacing="0.16em" textTransform="uppercase" color="brand.primary" mb="4">
              Para transferir
            </Text>
            <Dato k="Titular" v={banco.titular} />
            <Dato k="RUT" v={banco.rut} />
            <Dato k="Banco" v={banco.banco} />
            <Dato k="Tipo de cuenta" v={banco.tipo} />
            <Dato k="Número" v={banco.numero} />
            <Dato k="Correo" v={banco.correo} />
            <Dato k="Monto" v={clp(pedido.total)} />
            <Dato k="Mensaje" v={pedido.numero} />

            <chakra.button
              display="flex"
              alignItems="center"
              onClick={() =>
                copiar(
                  [
                    banco.titular,
                    banco.rut,
                    `${banco.banco} · ${banco.tipo}`,
                    banco.numero,
                    banco.correo,
                    `${clp(pedido.total)} — ${pedido.numero}`,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  "banco"
                )
              }
              mt="5"
              gap="2"
              fontSize="sm"
              color={copiado === "banco" ? "estado.ok" : "brand.primary"}
            >
              {copiado === "banco" ? <Check size={14} /> : <Copy size={14} />}
              {copiado === "banco" ? "Copiado" : "Copiar los datos"}
            </chakra.button>
          </Card>
        )}

        {/* ── Lo comprado ── */}
        <VStack align="stretch" gap="5">
          {pedido.items.map((it, i) => (
            <HStack key={i} align="start" gap="4" borderBottom="1px solid" borderColor="border.subtle" pb="5">
              <Box
                as="img"
                // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
                src={it.imagen}
                alt={it.titulo}
                w="64px"
                h="80px"
                objectFit="cover"
                flexShrink="0"
              />
              <VStack align="start" gap="1" flex="1" minW="0">
                <Text fontFamily="heading" fontSize="xl">
                  {it.titulo}
                </Text>
                <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
                  {it.lineas.map((l) => l.nombre).join("  ·  ")}
                </Text>
                {it.cantidad > 1 && (
                  <Text fontSize="xs" color="fg.subtle">
                    {it.cantidad} copias · {clp(it.unitario)} c/u
                  </Text>
                )}
              </VStack>
              <Text fontSize="sm" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {clp(it.total)}
              </Text>
            </HStack>
          ))}
        </VStack>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="8" mt="10">
          <Box>
            <Text fontSize="xs" letterSpacing="0.16em" textTransform="uppercase" color="fg.subtle" mb="3">
              Entrega
            </Text>
            {pedido.entrega.modo === "retiro" ? (
              <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                Retiro. {tienda.retiro}
              </Text>
            ) : (
              <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                {pedido.entrega.direccion}
                <br />
                {pedido.entrega.comuna}
                {pedido.entrega.region ? `, ${pedido.entrega.region}` : ""}
              </Text>
            )}
            <Text fontSize="sm" color="fg.subtle" mt="3">
              {pedido.cliente.nombre} · {pedido.cliente.email}
            </Text>
          </Box>

          <Box>
            <Dato k="Copias" v={clp(pedido.subtotal)} />
            <Dato k={pedido.entrega.modo === "retiro" ? "Retiro" : "Despacho"} v={pedido.envio === 0 ? "sin costo" : clp(pedido.envio)} />
            <HStack justify="space-between" align="baseline" pt="3" mt="2" borderTop="1px solid" borderColor="border.subtle">
              <Text fontSize="xs" letterSpacing="0.2em" textTransform="uppercase" color="fg.subtle">
                Total
              </Text>
              <Text fontFamily="heading" fontSize="3xl" fontVariantNumeric="tabular-nums">
                {clp(pedido.total)}
              </Text>
            </HStack>
          </Box>
        </Grid>

        <Text fontSize="xs" color="fg.subtle" mt="12" lineHeight="tall">
          Guarda este enlace: acá puedes ver en qué va tu pedido en cualquier momento.{" "}
          <Link href="#/" color="brand.primary">
            Volver a la galería
          </Link>
        </Text>
      </Box>

      <Footer />
    </Box>
  );
};
