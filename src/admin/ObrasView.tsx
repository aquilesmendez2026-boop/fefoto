import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { borrarFoto, guardarFoto, listarFotos } from "./adminApi";
import { subirObra } from "./imagen";
import { clp, type Foto } from "../data/catalogo";
import type { Bloque } from "../molecules/ArticuloRender";
import { EditorArticulo } from "./EditorArticulo";
import { Card } from "../atoms/Card";
import { Etiqueta, campo } from "./comunes";

/** Id a partir del título: "Sombra n.º 4" → "sombra-n-4". */
const idDesde = (titulo: string) =>
  titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

const vacia = (): Foto => ({
  id: "",
  titulo: "",
  categorias: [],
  descripcion: "",
  imagen: "",
  precioBase: 30000,
  activa: true,
});

/**
 * Las obras del catálogo.
 *
 * Subir la foto y publicarla son dos cosas distintas: la imagen se sube apenas
 * se elige el archivo (que es lo lento) y la ficha se guarda después. Así, si
 * alguien se arrepiente del texto no tiene que volver a esperar la subida.
 */
export function ObrasView({ notificar }: { notificar: (t: string) => void }) {
  const [fotos, setFotos] = useState<Foto[] | null | undefined>(undefined);
  const [editando, setEditando] = useState<Foto | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(() => {
    setFotos(undefined);
    listarFotos()
      .then((f) => setFotos(f.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))))
      .catch(() => setFotos(null));
  }, []);

  useEffect(cargar, [cargar]);

  const elegirArchivo = async (archivo?: File | null) => {
    if (!archivo || !editando) return;
    setSubiendo(true);
    try {
      const r = await subirObra(archivo);
      setEditando({ ...editando, imagen: r.imagen, ancho: r.ancho, alto: r.alto });
      notificar("Imagen subida");
    } catch (e) {
      notificar(`No se pudo subir: ${(e as Error).message}`);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!editando) return;
    const id = editando.id || idDesde(editando.titulo);
    if (!id || !editando.titulo.trim()) {
      notificar("Falta el título");
      return;
    }
    setGuardando(true);
    try {
      await guardarFoto({ ...editando, id });
      notificar("Obra guardada");
      setEditando(null);
      cargar();
    } catch (e) {
      notificar(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (f: Foto) => {
    if (!window.confirm(`¿Borrar “${f.titulo}” del catálogo?`)) return;
    try {
      await borrarFoto(f.id);
      notificar("Obra borrada");
      cargar();
    } catch (e) {
      notificar(`No se pudo borrar: ${(e as Error).message}`);
    }
  };

  /** Publicar o esconder sin abrir el formulario: es un clic muy frecuente. */
  const alternar = async (f: Foto, cual: "activa" | "destacada") => {
    const nueva = { ...f, [cual]: !(cual === "activa" ? f.activa !== false : f.destacada) };
    setFotos((lista) => (lista ?? []).map((x) => (x.id === f.id ? nueva : x)));
    try {
      await guardarFoto(nueva);
    } catch {
      notificar("No se pudo guardar el cambio");
      cargar();
    }
  };

  // ── Formulario ──
  if (editando) {
    const set = (cambios: Partial<Foto>) => setEditando({ ...editando, ...cambios });
    return (
      <VStack align="stretch" gap="6" maxW="900px">
        <HStack justify="space-between">
          <Text fontFamily="heading" fontSize="2xl">
            {editando.id ? "Editar obra" : "Nueva obra"}
          </Text>
          <HStack gap="2">
            <Button size="sm" variant="ghost" color="fg.muted" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              px="5"
              borderRadius="md"
              bg="brand.primary"
              color="fg.inverted"
              fontWeight="600"
              loading={guardando}
              _hover={{ bg: "brass.200" }}
              onClick={guardar}
            >
              Guardar
            </Button>
          </HStack>
        </HStack>

        <Grid templateColumns={{ base: "1fr", md: "280px 1fr" }} gap="8" alignItems="start">
          {/* Imagen */}
          <VStack align="stretch" gap="3">
            <Box
              position="relative"
              bg="bg.pared"
              borderRadius="md"
              border="1px dashed"
              borderColor="border.subtle"
              minH="300px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              {editando.imagen ? (
                <Box
                  as="img"
                  // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
                  src={editando.imagen}
                  alt={editando.titulo}
                  w="full"
                  objectFit="cover"
                />
              ) : (
                <VStack gap="2" color="fg.subtle" p="6" textAlign="center">
                  <ImagePlus size={26} strokeWidth={1} />
                  <Text fontSize="xs">Sube el archivo original. Se genera sola la versión web con marca de agua.</Text>
                </VStack>
              )}
              {subiendo && (
                <Flex position="absolute" inset="0" bg="rgba(0,0,0,0.6)" align="center" justify="center">
                  <Spinner color="brand.primary" />
                </Flex>
              )}
            </Box>

            <Input
              ref={archivoRef}
              type="file"
              accept="image/*"
              display="none"
              onChange={(e) => elegirArchivo(e.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              color="fg.muted"
              borderRadius="md"
              loading={subiendo}
              _hover={{ borderColor: "border.brand", color: "brand.primary" }}
              onClick={() => archivoRef.current?.click()}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              {editando.imagen ? "Cambiar imagen" : "Subir imagen"}
            </Button>
          </VStack>

          {/* Datos */}
          <VStack align="stretch" gap="5">
            <Box>
              <Etiqueta>Título</Etiqueta>
              <Input value={editando.titulo} onChange={(e) => set({ titulo: e.target.value })} {...campo} />
            </Box>

            <Box>
              <Etiqueta>Categorías (separadas por coma)</Etiqueta>
              <Input
                value={editando.categorias.join(", ")}
                placeholder="Sombra, Abstracta"
                onChange={(e) =>
                  set({
                    categorias: e.target.value
                      .split(",")
                      .map((c) => c.trim())
                      .filter(Boolean),
                  })
                }
                {...campo}
              />
            </Box>

            <Box>
              <Etiqueta>Descripción corta</Etiqueta>
              <Textarea
                value={editando.descripcion ?? ""}
                placeholder="Una o dos líneas, las que se leen bajo el título."
                onChange={(e) => set({ descripcion: e.target.value })}
                {...campo}
                h="20"
                py="2"
              />
            </Box>

            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="3">
              <Box>
                <Etiqueta>Precio base</Etiqueta>
                <Input
                  type="number"
                  value={editando.precioBase}
                  onChange={(e) => set({ precioBase: Number(e.target.value) || 0 })}
                  {...campo}
                />
              </Box>
              <Box>
                <Etiqueta>Año</Etiqueta>
                <Input value={editando.anio ?? ""} onChange={(e) => set({ anio: e.target.value })} {...campo} />
              </Box>
              <Box>
                <Etiqueta>Lugar</Etiqueta>
                <Input value={editando.lugar ?? ""} onChange={(e) => set({ lugar: e.target.value })} {...campo} />
              </Box>
              <Box>
                <Etiqueta>Orden</Etiqueta>
                <Input
                  type="number"
                  value={editando.orden ?? ""}
                  onChange={(e) => set({ orden: Number(e.target.value) || undefined })}
                  {...campo}
                />
              </Box>
            </Grid>

            <Box>
              <Etiqueta>Edición limitada</Etiqueta>
              <HStack gap="3">
                <Input
                  type="number"
                  placeholder="Total de copias (vacío = sin límite)"
                  value={editando.edicion?.total ?? ""}
                  onChange={(e) => {
                    const total = Number(e.target.value) || 0;
                    set({ edicion: total > 0 ? { total, vendidas: editando.edicion?.vendidas ?? 0 } : undefined });
                  }}
                  {...campo}
                />
                {editando.edicion && (
                  <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">
                    {editando.edicion.vendidas} vendidas
                  </Text>
                )}
              </HStack>
            </Box>

            <Box>
              <Etiqueta>La historia (opcional)</Etiqueta>
              <EditorArticulo
                bloques={editando.historia ?? []}
                onChange={(historia: Bloque[]) => set({ historia })}
              />
            </Box>
          </VStack>
        </Grid>
      </VStack>
    );
  }

  // ── Listado ──
  return (
    <VStack align="stretch" gap="5">
      <HStack justify="space-between">
        <Text fontSize="sm" color="fg.subtle">
          {fotos?.length ?? 0} obras en el catálogo
        </Text>
        <Button
          size="sm"
          px="4"
          borderRadius="md"
          bg="brand.primary"
          color="fg.inverted"
          fontWeight="600"
          _hover={{ bg: "brass.200" }}
          onClick={() => setEditando(vacia())}
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Nueva obra
        </Button>
      </HStack>

      {fotos === undefined ? (
        <Flex py="10" justify="center">
          <Spinner color="brand.primary" />
        </Flex>
      ) : fotos === null ? (
        <Text fontSize="sm" color="fg.subtle">
          No se pudieron cargar las obras.
        </Text>
      ) : fotos.length === 0 ? (
        <Text fontSize="sm" color="fg.subtle" py="8">
          Todavía no hay obras. Sube la primera y el sitio deja de mostrar las de muestra.
        </Text>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap="4">
          {fotos.map((f) => (
            <Card key={f.id} p="4" opacity={f.activa === false ? 0.5 : 1}>
              <HStack align="start" gap="4">
                <Box
                  as="img"
                  // @ts-expect-error Chakra dibuja una <img> con `as` y no tipa src/alt
                  src={f.imagen}
                  alt={f.titulo}
                  w="64px"
                  h="80px"
                  objectFit="cover"
                  flexShrink="0"
                  bg="bg.pared"
                />
                <VStack align="start" gap="1" flex="1" minW="0">
                  <HStack gap="2">
                    {f.destacada && <Star size={12} color="#d2b984" fill="#d2b984" />}
                    <Text fontSize="sm" fontWeight="500" lineClamp={1}>
                      {f.titulo}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                    {f.categorias.join(" · ")}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
                    {clp(f.precioBase)}
                    {f.edicion ? ` · ${f.edicion.vendidas}/${f.edicion.total}` : ""}
                  </Text>
                </VStack>
              </HStack>

              <HStack gap="1" mt="4" justify="end">
                <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => alternar(f, "destacada")} title="Destacar en la portada">
                  <Star size={13} />
                </Button>
                <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => alternar(f, "activa")} title={f.activa === false ? "Publicar" : "Esconder"}>
                  {f.activa === false ? <EyeOff size={13} /> : <Eye size={13} />}
                </Button>
                <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => setEditando(f)} title="Editar">
                  <Pencil size={13} />
                </Button>
                <Button size="2xs" variant="ghost" color="fg.subtle" _hover={{ color: "estado.alerta" }} onClick={() => eliminar(f)} title="Borrar">
                  <Trash2 size={13} />
                </Button>
              </HStack>
            </Card>
          ))}
        </Grid>
      )}
    </VStack>
  );
}
