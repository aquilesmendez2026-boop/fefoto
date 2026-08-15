import { useEffect, useState } from "react";
import { Box, Flex, Grid, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { getResumen, type Resumen } from "./adminApi";
import { clp } from "../data/catalogo";
import { Card } from "../atoms/Card";
import { nombreMes, mesActual } from "./comunes";

const Dato = ({
  n,
  valor,
  nota,
  destacado,
  onClick,
}: {
  n: string;
  valor: string;
  nota?: string;
  destacado?: boolean;
  onClick?: () => void;
}) => (
  <Card
    p="5"
    interactive={!!onClick}
    cursor={onClick ? "pointer" : undefined}
    onClick={onClick}
    borderColor={destacado ? "border.brand" : "border.subtle"}
  >
    <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="fg.subtle">
      {n}
    </Text>
    <Text
      fontFamily="heading"
      fontSize="4xl"
      fontWeight="400"
      color={destacado ? "brand.primary" : "fg.default"}
      mt="2"
      fontVariantNumeric="tabular-nums"
    >
      {valor}
    </Text>
    {nota && (
      <Text fontSize="xs" color="fg.subtle" mt="1">
        {nota}
      </Text>
    )}
  </Card>
);

/**
 * Pantalla de inicio del panel.
 *
 * Responde tres preguntas en el orden en que importan: qué hay que hacer hoy
 * (pedidos por revisar), cómo va el mes, y qué se está vendiendo. Lo accionable
 * arriba y lleva a su sección de un clic; los números de contexto, debajo.
 */
export function ResumenView({ onIr }: { onIr: (v: string) => void }) {
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getResumen()
      .then(setDatos)
      .catch(() => setError(true));
  }, []);

  if (error)
    return (
      <Text color="fg.subtle" fontSize="sm">
        No se pudo cargar el resumen. Recarga la página para reintentar.
      </Text>
    );

  if (!datos)
    return (
      <Flex py="10" justify="center">
        <Spinner color="brand.primary" />
      </Flex>
    );

  const maximo = Math.max(1, ...datos.porDia.map((d) => d.total));

  return (
    <VStack align="stretch" gap="8">
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap="4">
        <Dato
          n="Por revisar"
          valor={String(datos.porRevisar)}
          nota="esperan confirmación de pago"
          destacado={datos.porRevisar > 0}
          onClick={() => onIr("pedidos")}
        />
        <Dato
          n="En producción"
          valor={String(datos.enProduccion)}
          nota="pagados, aún no despachados"
          onClick={() => onIr("pedidos")}
        />
        <Dato n="Ventas del mes" valor={clp(datos.ventasMes)} nota={`${datos.pedidosMes} pedidos`} />
        <Dato n="Visitas del mes" valor={String(datos.visitasMes)} nota={`${datos.obras} obras publicadas`} />
      </Grid>

      <Grid templateColumns={{ base: "1fr", lg: "1.6fr 1fr" }} gap="6">
        {/* Ventas por día. Barras simples y sin librería: son 31 números y una
            escala; traer un motor de gráficos para esto es desproporcionado. */}
        <Card p="6">
          <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="fg.subtle" mb="6">
            Ventas de {nombreMes(mesActual())}
          </Text>
          {datos.porDia.length === 0 ? (
            <Text fontSize="sm" color="fg.subtle">
              Todavía no hay ventas este mes.
            </Text>
          ) : (
            <Flex align="end" gap="1" h="140px">
              {datos.porDia.map((d) => (
                <Box key={d.dia} flex="1" title={`${d.dia}: ${clp(d.total)}`}>
                  <Box
                    h={`${Math.max(2, (d.total / maximo) * 140)}px`}
                    bg={d.total > 0 ? "brand.primary" : "bg.muted"}
                    opacity={d.total > 0 ? 0.85 : 1}
                    borderRadius="1px"
                    transition="height 0.3s"
                  />
                </Box>
              ))}
            </Flex>
          )}
        </Card>

        <Card p="6">
          <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="fg.subtle" mb="5">
            Lo más vendido
          </Text>
          {datos.masVendidas.length === 0 ? (
            <Text fontSize="sm" color="fg.subtle">
              Sin ventas todavía.
            </Text>
          ) : (
            <VStack align="stretch" gap="3">
              {datos.masVendidas.map((m, i) => (
                <HStack key={m.fotoId} justify="space-between" gap="4">
                  <HStack gap="3" minW="0">
                    <Text fontSize="xs" color="fg.subtle" w="4">
                      {i + 1}
                    </Text>
                    <Text fontSize="sm" color="fg.default" lineClamp={1}>
                      {m.titulo}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                    {m.copias} {m.copias === 1 ? "copia" : "copias"}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Card>
      </Grid>
    </VStack>
  );
}
