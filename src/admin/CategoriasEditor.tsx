import { useState } from "react";
import { Box, Button, HStack, Input, Text, VStack } from "@chakra-ui/react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { guardarCategorias } from "./adminApi";
import type { Categoria } from "../data/catalogo";
import { campo } from "./comunes";

interface Props {
  categorias: Categoria[];
  /** Nombres en uso, para avisar antes de borrar una que tiene obras. */
  enUso: Record<string, number>;
  onGuardado: (categorias: Categoria[]) => void;
  notificar: (t: string) => void;
}

/**
 * Editor de las categorías del catálogo.
 *
 * Se guardan todas juntas, como las regiones, porque se editan como una sola
 * cosa: el orden de una depende del de las demás.
 *
 * Lo único delicado es renombrar. Las obras guardan el nombre de la categoría,
 * así que hay que avisarle al backend qué se renombró para que reescriba las
 * obras afectadas; comparando listas no se puede deducir, porque renombrar una
 * y borrar otra se ven exactamente igual desde afuera. Por eso cada fila
 * recuerda con qué nombre llegó.
 */
export function CategoriasEditor({ categorias, enUso, onGuardado, notificar }: Props) {
  const [filas, setFilas] = useState(() =>
    categorias.map((c) => ({ ...c, original: c.nombre }))
  );
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);

  const set = (i: number, c: Partial<Categoria>) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...c } : f)));

  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= filas.length) return;
    const copia = [...filas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setFilas(copia);
  };

  const agregar = () => {
    const nombre = nueva.trim();
    if (!nombre) return;
    if (filas.some((f) => f.nombre.toLowerCase() === nombre.toLowerCase())) {
      notificar("Esa categoría ya existe");
      return;
    }
    setFilas([...filas, { nombre, original: "", activa: true }]);
    setNueva("");
  };

  const borrar = (i: number) => {
    const f = filas[i];
    const obras = enUso[f.nombre] ?? 0;
    if (
      obras > 0 &&
      !window.confirm(
        `“${f.nombre}” está en ${obras} ${obras === 1 ? "obra" : "obras"}. Si la borras, esas obras dejan de aparecer bajo esa categoría. ¿Continuar?`
      )
    )
      return;
    setFilas(filas.filter((_, j) => j !== i));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      // El orden es la posición en la lista: así lo que se ve arriba es lo que
      // sale primero en la galería, sin números que cuadrar a mano.
      const limpias = filas.map((f, i) => ({
        nombre: f.nombre.trim(),
        orden: i + 1,
        activa: f.activa !== false,
      }));
      const renombres = filas
        .filter((f) => f.original && f.original !== f.nombre.trim())
        .map((f) => ({ de: f.original, a: f.nombre.trim() }));

      const r = await guardarCategorias(limpias, renombres);
      setFilas(limpias.map((c) => ({ ...c, original: c.nombre })));
      onGuardado(limpias);
      notificar(
        r.obrasTocadas
          ? `Categorías guardadas · ${r.obrasTocadas} obras actualizadas`
          : "Categorías guardadas"
      );
    } catch (e) {
      notificar(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <VStack align="stretch" gap="4">
      <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
        El orden de esta lista es el orden de los filtros en la galería. Renombrar una categoría
        actualiza sola las obras que la usan; una categoría oculta deja de ofrecerse como filtro,
        pero no esconde sus obras.
      </Text>

      <VStack align="stretch" gap="2">
        {filas.map((f, i) => {
          const obras = enUso[f.nombre] ?? 0;
          return (
            <HStack key={`${f.original}-${i}`} gap="2">
              <VStack gap="0" flexShrink="0">
                <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                  <ArrowUp size={12} />
                </Button>
                <Button size="2xs" variant="ghost" color="fg.subtle" onClick={() => mover(i, 1)} disabled={i === filas.length - 1} aria-label="Bajar">
                  <ArrowDown size={12} />
                </Button>
              </VStack>

              <Input value={f.nombre} onChange={(e) => set(i, { nombre: e.target.value })} {...campo} flex="1" />

              <Text fontSize="xs" color="fg.subtle" w="70px" textAlign="right" flexShrink="0">
                {obras} {obras === 1 ? "obra" : "obras"}
              </Text>

              <Button
                size="2xs"
                variant="ghost"
                color={f.activa === false ? "fg.subtle" : "brand.primary"}
                onClick={() => set(i, { activa: f.activa === false })}
                title={f.activa === false ? "Mostrar en la galería" : "Ocultar de los filtros"}
              >
                {f.activa === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
              <Button size="2xs" variant="ghost" color="fg.subtle" _hover={{ color: "estado.alerta" }} onClick={() => borrar(i)}>
                <Trash2 size={13} />
              </Button>
            </HStack>
          );
        })}
        {filas.length === 0 && (
          <Text fontSize="sm" color="fg.subtle">
            Todavía no hay categorías.
          </Text>
        )}
      </VStack>

      <HStack gap="2">
        <Input
          placeholder="Nueva categoría"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          {...campo}
          maxW="260px"
        />
        <Button size="sm" variant="outline" borderColor="border.subtle" color="fg.muted" borderRadius="md" _hover={{ borderColor: "border.brand", color: "brand.primary" }} onClick={agregar}>
          <Plus size={14} style={{ marginRight: 5 }} />
          Agregar
        </Button>
        <Box flex="1" />
        <Button size="sm" px="5" borderRadius="md" bg="brand.primary" color="fg.inverted" fontWeight="600" loading={guardando} _hover={{ bg: "brass.200" }} onClick={guardar}>
          Guardar categorías
        </Button>
      </HStack>
    </VStack>
  );
}
