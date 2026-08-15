import { Box, HStack, Text, VStack, chakra } from "@chakra-ui/react";
import { Check } from "lucide-react";
import {
  GRUPOS,
  NOMBRE_GRUPO,
  clp,
  disponible,
  opcionesDe,
  type Configuracion,
  type Grupo,
  type Opcion,
} from "../data/catalogo";

interface ConfiguradorProps {
  opciones: Opcion[];
  seleccion: Configuracion;
  onCambio: (grupo: Grupo, id: string) => void;
  /** Grupos que el último cambio movió solos, para señalarlos un momento. */
  ajustados?: Grupo[];
}

/**
 * Las cuatro listas de personalización.
 *
 * Las combinaciones imposibles se muestran deshabilitadas y no escondidas: si
 * el marco premium desapareciera al elegir cierto tamaño, quien compra pensaría
 * que no existe. Apagado y con el motivo al lado, en cambio, se entiende que el
 * problema es la combinación y se puede volver atrás.
 */
export const Configurador = ({ opciones, seleccion, onCambio, ajustados = [] }: ConfiguradorProps) => (
  <VStack align="stretch" gap="7">
    {GRUPOS.map((grupo) => {
      const lista = opcionesDe(opciones, grupo);
      const elegida = lista.find((o) => o.id === seleccion[grupo]);
      return (
        <Box key={grupo}>
          <HStack justify="space-between" align="baseline" mb="3">
            <Text
              fontSize="xs"
              letterSpacing="0.22em"
              textTransform="uppercase"
              color={ajustados.includes(grupo) ? "brand.primary" : "fg.subtle"}
              transition="color 0.4s"
            >
              {NOMBRE_GRUPO[grupo]}
            </Text>
            {ajustados.includes(grupo) && (
              <Text fontSize="xs" color="brand.primary">
                ajustado
              </Text>
            )}
          </HStack>

          <VStack align="stretch" gap="2">
            {lista.map((o) => {
              const activa = o.id === seleccion[grupo];
              const posible = disponible(o, seleccion, opciones);
              return (
                <chakra.button
                  key={o.id}
                  type="button"
                  disabled={!posible}
                  onClick={() => posible && onCambio(grupo, o.id)}
                  textAlign="left"
                  w="full"
                  px="4"
                  py="3"
                  borderRadius="md"
                  border="1px solid"
                  borderColor={activa ? "border.brand" : "border.subtle"}
                  bg={activa ? "rgba(210,185,132,0.07)" : "transparent"}
                  opacity={posible ? 1 : 0.32}
                  cursor={posible ? "pointer" : "not-allowed"}
                  transition="all 0.2s"
                  _hover={posible && !activa ? { borderColor: "border.soft", bg: "bg.surface" } : undefined}
                >
                  <HStack justify="space-between" align="start" gap="4">
                    <Box minW="0">
                      <HStack gap="2">
                        {activa && <Check size={14} color="#d2b984" />}
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          color={activa ? "fg.default" : "fg.muted"}
                        >
                          {o.nombre}
                        </Text>
                      </HStack>
                      {(o.descripcion || !posible) && (
                        <Text fontSize="xs" color="fg.subtle" mt="1" lineHeight="tall">
                          {posible ? o.descripcion : "No se puede combinar con lo que elegiste"}
                        </Text>
                      )}
                    </Box>
                    <Text
                      fontSize="sm"
                      color={o.extra === 0 ? "fg.subtle" : "fg.default"}
                      whiteSpace="nowrap"
                      fontVariantNumeric="tabular-nums"
                    >
                      {o.extra === 0 ? "incluido" : `+ ${clp(o.extra)}`}
                    </Text>
                  </HStack>
                </chakra.button>
              );
            })}
          </VStack>

          {!elegida && (
            <Text fontSize="xs" color="estado.alerta" mt="2">
              Falta elegir {NOMBRE_GRUPO[grupo].toLowerCase()}.
            </Text>
          )}
        </Box>
      );
    })}
  </VStack>
);
