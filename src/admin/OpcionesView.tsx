import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Grid, HStack, Input, Spinner, Text, Textarea, VStack } from "@chakra-ui/react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { borrarOpcion, guardarOpcion, listarOpciones } from "./adminApi";
import { GRUPOS, NOMBRE_GRUPO, clp, opcionesDe, type Grupo, type Opcion } from "../data/catalogo";
import { Card } from "../atoms/Card";
import { Etiqueta, campo } from "./comunes";

const AYUDA: Record<Grupo, string> = {
  papel: "El acabado cambia cómo se ve la copia en la vista previa del cliente.",
  tamano: "Las medidas en cm son las que dibujan el cuadro y comparan un tamaño con otro.",
  marco: "El color, el grosor de la moldura y el paspartú se usan tal cual en la vista previa.",
  vidrio: "El reflejo (0 a 1) es cuánto brilla el vidrio simulado.",
};

const ACABADOS = ["brillante", "satinado", "mate", "texturado"] as const;

const nueva = (grupo: Grupo): Opcion => ({
  grupo,
  id: "",
  nombre: "",
  extra: 0,
  activa: true,
  orden: 99,
  ...(grupo === "tamano" ? { anchoCm: 30, altoCm: 40 } : {}),
  ...(grupo === "marco" ? { color: "#141412", grosorMm: 15, paspartuMm: 0 } : {}),
  ...(grupo === "vidrio" ? { reflejo: 0.2 } : {}),
});

const idDesde = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Las cuatro listas de opciones y lo que suma cada una.
 *
 * Es la pantalla que reemplaza a "pídele al programador que cambie un precio".
 * Todo lo que decide cuánto cuesta un cuadro —y cómo se dibuja en la vista
 * previa— se edita acá y se refleja en el sitio sin desplegar nada.
 */
export function OpcionesView({ notificar }: { notificar: (t: string) => void }) {
  const [opciones, setOpciones] = useState<Opcion[] | null | undefined>(undefined);
  const [editando, setEditando] = useState<Opcion | null>(null);

  const cargar = useCallback(() => {
    setOpciones(undefined);
    listarOpciones()
      .then(setOpciones)
      .catch(() => setOpciones(null));
  }, []);

  useEffect(cargar, [cargar]);

  const guardar = async () => {
    if (!editando) return;
    const id = editando.id || idDesde(editando.nombre);
    if (!id || !editando.nombre.trim()) {
      notificar("Falta el nombre");
      return;
    }
    try {
      await guardarOpcion({ ...editando, id });
      notificar("Opción guardada");
      setEditando(null);
      cargar();
    } catch (e) {
      notificar(`No se pudo guardar: ${(e as Error).message}`);
    }
  };

  const eliminar = async (o: Opcion) => {
    if (!window.confirm(`¿Borrar “${o.nombre}”? Los pedidos ya hechos no se tocan.`)) return;
    try {
      await borrarOpcion(o.grupo, o.id);
      notificar("Opción borrada");
      cargar();
    } catch (e) {
      notificar(`No se pudo borrar: ${(e as Error).message}`);
    }
  };

  if (opciones === undefined)
    return (
      <Flex py="10" justify="center">
        <Spinner color="brand.primary" />
      </Flex>
    );

  if (opciones === null)
    return (
      <Text fontSize="sm" color="fg.subtle">
        No se pudieron cargar las opciones.
      </Text>
    );

  const set = (cambios: Partial<Opcion>) => editando && setEditando({ ...editando, ...cambios });

  return (
    <VStack align="stretch" gap="10">
      {GRUPOS.map((grupo) => {
        const lista = opcionesDe(opciones, grupo);
        const otras = opciones.filter((o) => o.grupo !== grupo);
        return (
          <Box key={grupo}>
            <HStack justify="space-between" align="end" mb="4">
              <Box>
                <Text fontFamily="heading" fontSize="2xl">
                  {NOMBRE_GRUPO[grupo]}
                </Text>
                <Text fontSize="xs" color="fg.subtle" mt="1">
                  {AYUDA[grupo]}
                </Text>
              </Box>
              <Button
                size="xs"
                px="3"
                borderRadius="full"
                variant="outline"
                borderColor="border.subtle"
                color="fg.muted"
                _hover={{ borderColor: "border.brand", color: "brand.primary" }}
                onClick={() => setEditando(nueva(grupo))}
              >
                <Plus size={13} style={{ marginRight: 5 }} />
                Agregar
              </Button>
            </HStack>

            <VStack align="stretch" gap="2">
              {lista.map((o) => (
                <Card key={o.id} px="4" py="3">
                  <HStack justify="space-between" gap="4">
                    <HStack gap="3" minW="0">
                      {/* Muestra del marco: se ve el color real cargado. */}
                      {grupo === "marco" && (
                        <Box boxSize="18px" borderRadius="2px" bg={o.color ?? "#000"} border="1px solid" borderColor="border.subtle" flexShrink="0" />
                      )}
                      <VStack align="start" gap="0.5" minW="0">
                        <Text fontSize="sm" color="fg.default">
                          {o.nombre}
                        </Text>
                        <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                          {[
                            grupo === "tamano" && o.anchoCm ? `${o.anchoCm}×${o.altoCm} cm` : "",
                            grupo === "marco" && o.grosorMm ? `moldura ${o.grosorMm} mm` : "",
                            grupo === "marco" && o.paspartuMm ? `paspartú ${o.paspartuMm} mm` : "",
                            grupo === "vidrio" && o.reflejo !== undefined ? `reflejo ${o.reflejo}` : "",
                            grupo === "papel" && o.acabado ? o.acabado : "",
                            o.incompatibles?.length ? `no combina con ${o.incompatibles.join(", ")}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </VStack>
                    </HStack>

                    <HStack gap="3" flexShrink="0">
                      <Text fontSize="sm" color={o.extra === 0 ? "fg.subtle" : "fg.default"} fontVariantNumeric="tabular-nums">
                        {o.extra === 0 ? "incluido" : `+ ${clp(o.extra)}`}
                      </Text>
                      <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => setEditando(o)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="2xs" variant="ghost" color="fg.subtle" _hover={{ color: "estado.alerta" }} onClick={() => eliminar(o)}>
                        <Trash2 size={13} />
                      </Button>
                    </HStack>
                  </HStack>

                  {/* El formulario se abre en la misma fila: no hay que perder
                      de vista el resto de la lista para comparar precios. */}
                  {editando && editando.grupo === grupo && editando.id === o.id && (
                    <FormularioOpcion opcion={editando} otras={otras} set={set} onGuardar={guardar} onCancelar={() => setEditando(null)} />
                  )}
                </Card>
              ))}

              {editando && editando.grupo === grupo && !editando.id && (
                <Card px="4" py="3" borderColor="border.brand">
                  <FormularioOpcion opcion={editando} otras={otras} set={set} onGuardar={guardar} onCancelar={() => setEditando(null)} />
                </Card>
              )}
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
}

function FormularioOpcion({
  opcion,
  otras,
  set,
  onGuardar,
  onCancelar,
}: {
  opcion: Opcion;
  otras: Opcion[];
  set: (c: Partial<Opcion>) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  const alternarIncompatible = (id: string) => {
    const actuales = opcion.incompatibles ?? [];
    set({
      incompatibles: actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id],
    });
  };

  return (
    <VStack align="stretch" gap="4" pt="4" mt="3" borderTop="1px solid" borderColor="border.subtle">
      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap="3">
        <Box>
          <Etiqueta>Nombre</Etiqueta>
          <Input value={opcion.nombre} onChange={(e) => set({ nombre: e.target.value })} {...campo} />
        </Box>
        <Box>
          <Etiqueta>Suma al precio</Etiqueta>
          <Input type="number" value={opcion.extra} onChange={(e) => set({ extra: Number(e.target.value) || 0 })} {...campo} />
        </Box>
        <Box>
          <Etiqueta>Orden</Etiqueta>
          <Input type="number" value={opcion.orden ?? ""} onChange={(e) => set({ orden: Number(e.target.value) || undefined })} {...campo} />
        </Box>
      </Grid>

      <Box>
        <Etiqueta>Descripción</Etiqueta>
        <Textarea value={opcion.descripcion ?? ""} onChange={(e) => set({ descripcion: e.target.value })} {...campo} h="16" py="2" />
      </Box>

      {opcion.grupo === "tamano" && (
        <Grid templateColumns="1fr 1fr" gap="3">
          <Box>
            <Etiqueta>Ancho (cm)</Etiqueta>
            <Input type="number" value={opcion.anchoCm ?? ""} onChange={(e) => set({ anchoCm: Number(e.target.value) || 0 })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Alto (cm)</Etiqueta>
            <Input type="number" value={opcion.altoCm ?? ""} onChange={(e) => set({ altoCm: Number(e.target.value) || 0 })} {...campo} />
          </Box>
        </Grid>
      )}

      {opcion.grupo === "marco" && (
        <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="3">
          <Box>
            <Etiqueta>Color</Etiqueta>
            <Input type="color" value={opcion.color ?? "#141412"} onChange={(e) => set({ color: e.target.value })} {...campo} p="1" />
          </Box>
          <Box>
            <Etiqueta>Moldura (mm)</Etiqueta>
            <Input type="number" value={opcion.grosorMm ?? ""} onChange={(e) => set({ grosorMm: Number(e.target.value) || 0 })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Paspartú (mm)</Etiqueta>
            <Input type="number" value={opcion.paspartuMm ?? ""} onChange={(e) => set({ paspartuMm: Number(e.target.value) || 0 })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Sin marco</Etiqueta>
            <Button
              w="full"
              h="10"
              borderRadius="md"
              variant="outline"
              borderColor={opcion.sinMarco ? "border.brand" : "border.subtle"}
              color={opcion.sinMarco ? "brand.primary" : "fg.subtle"}
              fontSize="sm"
              fontWeight="500"
              onClick={() => set({ sinMarco: !opcion.sinMarco })}
            >
              {opcion.sinMarco ? "Sí, va sin marco" : "No"}
            </Button>
          </Box>
        </Grid>
      )}

      {opcion.grupo === "vidrio" && (
        <Box maxW="200px">
          <Etiqueta>Reflejo (0 a 1)</Etiqueta>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={opcion.reflejo ?? 0}
            onChange={(e) => set({ reflejo: Math.max(0, Math.min(1, Number(e.target.value) || 0)) })}
            {...campo}
          />
        </Box>
      )}

      {opcion.grupo === "papel" && (
        <Box>
          <Etiqueta>Acabado</Etiqueta>
          <HStack gap="1.5">
            {ACABADOS.map((a) => (
              <Button
                key={a}
                size="xs"
                px="3"
                borderRadius="full"
                bg={opcion.acabado === a ? "brand.primary" : "bg.muted"}
                color={opcion.acabado === a ? "fg.inverted" : "fg.subtle"}
                fontWeight="500"
                onClick={() => set({ acabado: a })}
              >
                {a}
              </Button>
            ))}
          </HStack>
        </Box>
      )}

      <Box>
        <Etiqueta>No se puede combinar con</Etiqueta>
        <HStack gap="1.5" flexWrap="wrap">
          {otras.map((o) => {
            const marcada = opcion.incompatibles?.includes(o.id);
            return (
              <Button
                key={o.id}
                size="2xs"
                px="2.5"
                borderRadius="full"
                bg={marcada ? "estado.alerta" : "bg.muted"}
                color={marcada ? "fg.inverted" : "fg.subtle"}
                fontWeight="500"
                fontSize="2xs"
                onClick={() => alternarIncompatible(o.id)}
              >
                {o.nombre}
              </Button>
            );
          })}
        </HStack>
      </Box>

      <HStack justify="end" gap="2">
        <Button size="sm" variant="ghost" color="fg.muted" onClick={onCancelar}>
          <X size={14} style={{ marginRight: 5 }} />
          Cancelar
        </Button>
        <Button size="sm" px="4" borderRadius="md" bg="brand.primary" color="fg.inverted" fontWeight="600" _hover={{ bg: "brass.200" }} onClick={onGuardar}>
          <Check size={14} style={{ marginRight: 5 }} />
          Guardar
        </Button>
      </HStack>
    </VStack>
  );
}
