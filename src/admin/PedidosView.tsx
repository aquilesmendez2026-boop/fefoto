import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Grid, HStack, Spinner, Text, VStack, chakra } from "@chakra-ui/react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { cambiarEstadoPedido, listarPedidos } from "./adminApi";
import { clp } from "../data/catalogo";
import { ESTADOS, estadoDe, type Estado, type Pedido } from "../data/pedido";
import { Card } from "../atoms/Card";
import { campo, mesActual, nombreMes, ultimosMeses } from "./comunes";

const TODOS = "todos";

const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-CL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/**
 * Los pedidos del mes.
 *
 * Se listan por mes y no todos juntos porque así se guardan en DynamoDB (la
 * partición es el mes), y traer el histórico completo para ver los de esta
 * semana sería pedir de más cada vez que se abre el panel.
 */
export function PedidosView({ notificar }: { notificar: (t: string) => void }) {
  const [mes, setMes] = useState(mesActual);
  const [filtro, setFiltro] = useState<string>(TODOS);
  const [pedidos, setPedidos] = useState<Pedido[] | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState("");

  const cargar = useCallback(() => {
    setPedidos(undefined);
    listarPedidos(mes)
      .then(setPedidos)
      .catch(() => setPedidos(null));
  }, [mes]);

  useEffect(cargar, [cargar]);

  const mover = async (p: Pedido, estado: Estado) => {
    setGuardando(p.pedidoId);
    try {
      const r = await cambiarEstadoPedido(p.pedidoId, estado);
      // Se reemplaza con lo que devolvió el backend, no con lo que se pidió:
      // el historial y la fecha los pone él, y así la pantalla queda mostrando
      // exactamente lo que quedó guardado.
      setPedidos((lista) => (lista ?? []).map((x) => (x.pedidoId === p.pedidoId ? r.pedido : x)));
      notificar(`${p.numero} → ${estadoDe(estado).nombre}`);
    } catch (e) {
      notificar(`No se pudo: ${(e as Error).message}`);
    } finally {
      setGuardando("");
    }
  };

  const visibles = (pedidos ?? []).filter((p) => filtro === TODOS || p.estado === filtro);

  return (
    <VStack align="stretch" gap="6">
      <HStack gap="3" flexWrap="wrap">
        <chakra.select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          {...campo}
          px="3"
          minW="180px"
        >
          {ultimosMeses().map((m) => (
            <option key={m} value={m}>
              {nombreMes(m)}
            </option>
          ))}
        </chakra.select>

        <HStack gap="1.5" flexWrap="wrap">
          {[{ id: TODOS, nombre: "Todos" }, ...ESTADOS].map((e) => (
            <Button
              key={e.id}
              size="xs"
              px="3"
              borderRadius="full"
              fontWeight="500"
              bg={filtro === e.id ? "brand.primary" : "bg.muted"}
              color={filtro === e.id ? "fg.inverted" : "fg.subtle"}
              _hover={filtro === e.id ? {} : { color: "fg.default" }}
              onClick={() => setFiltro(e.id)}
            >
              {e.nombre}
            </Button>
          ))}
        </HStack>
      </HStack>

      {pedidos === undefined ? (
        <Flex py="10" justify="center">
          <Spinner color="brand.primary" />
        </Flex>
      ) : pedidos === null ? (
        <Text fontSize="sm" color="fg.subtle">
          No se pudieron cargar los pedidos.
        </Text>
      ) : visibles.length === 0 ? (
        <Text fontSize="sm" color="fg.subtle" py="8">
          No hay pedidos {filtro === TODOS ? "en" : "con ese estado en"} {nombreMes(mes)}.
        </Text>
      ) : (
        <VStack align="stretch" gap="2">
          {visibles.map((p) => {
            const est = estadoDe(p.estado);
            const abiertoEste = abierto === p.pedidoId;
            return (
              <Card key={p.pedidoId} p="0" overflow="hidden">
                <chakra.button
                  onClick={() => setAbierto(abiertoEste ? null : p.pedidoId)}
                  w="full"
                  px="5"
                  py="4"
                  display="flex"
                  alignItems="center"
                  gap="4"
                  justifyContent="space-between"
                  textAlign="left"
                  _hover={{ bg: "bg.muted" }}
                >
                  <HStack gap="4" minW="0" flex="1">
                    <Box color="fg.subtle">
                      {abiertoEste ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </Box>
                    <Box boxSize="8px" borderRadius="full" bg={est.color} flexShrink="0" />
                    <VStack align="start" gap="0.5" minW="0">
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {p.numero} · {p.cliente.nombre}
                      </Text>
                      <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                        {fechaHora(p.creado)} · {est.nombre} ·{" "}
                        {p.entrega.modo === "retiro" ? "retiro" : `despacho a ${p.entrega.comuna}`}
                      </Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="sm" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                    {clp(p.total)}
                  </Text>
                </chakra.button>

                {abiertoEste && (
                  <Box px="5" pb="5" pt="1" borderTop="1px solid" borderColor="border.subtle">
                    <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap="8" pt="5">
                      <VStack align="stretch" gap="4">
                        {p.items.map((it, i) => (
                          <HStack key={i} gap="3" align="start">
                            <Box
                              as="img"
                              // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
                              src={it.imagen}
                              alt={it.titulo}
                              w="44px"
                              h="56px"
                              objectFit="cover"
                              flexShrink="0"
                            />
                            <VStack align="start" gap="0.5" flex="1" minW="0">
                              <Text fontSize="sm" color="fg.default">
                                {it.cantidad > 1 ? `${it.cantidad} × ` : ""}
                                {it.titulo}
                              </Text>
                              <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
                                {it.lineas.map((l) => l.nombre).join(" · ")}
                              </Text>
                            </VStack>
                            <Text fontSize="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
                              {clp(it.total)}
                            </Text>
                          </HStack>
                        ))}

                        {p.nota && (
                          <Text fontSize="sm" color="fg.muted" fontStyle="italic" pt="2">
                            “{p.nota}”
                          </Text>
                        )}
                      </VStack>

                      <VStack align="stretch" gap="4">
                        <Box>
                          <Text fontSize="xs" color="fg.subtle" mb="1">
                            Contacto
                          </Text>
                          <Text fontSize="sm" color="fg.default">
                            {p.cliente.email}
                          </Text>
                          {p.cliente.telefono && (
                            <Text fontSize="sm" color="fg.muted">
                              {p.cliente.telefono}
                            </Text>
                          )}
                        </Box>

                        {p.entrega.modo === "despacho" && (
                          <Box>
                            <Text fontSize="xs" color="fg.subtle" mb="1">
                              Despacho
                            </Text>
                            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                              {p.entrega.direccion}, {p.entrega.comuna}
                              <br />
                              {p.entrega.region} — {clp(p.envio)}
                            </Text>
                          </Box>
                        )}

                        <Box>
                          <Text fontSize="xs" color="fg.subtle" mb="2">
                            Mover a
                          </Text>
                          <HStack gap="1.5" flexWrap="wrap">
                            {ESTADOS.filter((e) => e.id !== p.estado).map((e) => (
                              <Button
                                key={e.id}
                                size="xs"
                                px="3"
                                borderRadius="full"
                                variant="outline"
                                borderColor="border.subtle"
                                color="fg.muted"
                                fontWeight="500"
                                loading={guardando === p.pedidoId}
                                _hover={{ borderColor: "border.brand", color: "brand.primary" }}
                                onClick={() => mover(p, e.id)}
                              >
                                {e.nombre}
                              </Button>
                            ))}
                          </HStack>
                        </Box>

                        <Button
                          as="a"
                          // @ts-expect-error Chakra dibuja un ancla con `as` y no tipa href/target
                          href={`#/pedido/${encodeURIComponent(p.pedidoId)}`}
                          target="_blank"
                          size="xs"
                          variant="ghost"
                          color="fg.subtle"
                          justifyContent="start"
                          px="0"
                          _hover={{ color: "brand.primary" }}
                        >
                          <ExternalLink size={13} style={{ marginRight: 6 }} />
                          Ver como lo ve el cliente
                        </Button>
                      </VStack>
                    </Grid>
                  </Box>
                )}
              </Card>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
