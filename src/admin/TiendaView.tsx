import { useEffect, useState } from "react";
import { Box, Button, Flex, Grid, HStack, Input, Spinner, Text, Textarea, VStack } from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { getTiendaAdmin, guardarRegiones, guardarTienda, listarRegiones } from "./adminApi";
import type { Region, Tienda } from "../data/catalogo";
import { TIENDA } from "../data/ejemplo";
import { Card } from "../atoms/Card";
import { Etiqueta, campo } from "./comunes";

/**
 * Datos del negocio y costos de despacho.
 *
 * La cuenta bancaria vive acá y no en el código porque es lo que se le manda a
 * cada cliente para que transfiera: si cambia el banco, cambia sola en el
 * correo, en la página del pedido y en el checkout, sin desplegar nada.
 */
export function TiendaView({ notificar }: { notificar: (t: string) => void }) {
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getTiendaAdmin()
      .then((t) => setTienda({ ...TIENDA, ...t, banco: { ...TIENDA.banco, ...(t?.banco ?? {}) } }))
      .catch(() => setTienda(TIENDA));
    listarRegiones()
      .then(setRegiones)
      .catch(() => setRegiones([]));
  }, []);

  if (!tienda)
    return (
      <Flex py="10" justify="center">
        <Spinner color="brand.primary" />
      </Flex>
    );

  const set = (c: Partial<Tienda>) => setTienda({ ...tienda, ...c });
  const setBanco = (c: Partial<Tienda["banco"]>) => setTienda({ ...tienda, banco: { ...tienda.banco, ...c } });

  const guardar = async () => {
    setGuardando(true);
    try {
      // Las dos cosas se guardan juntas porque se editan juntas: si una falla,
      // el aviso lo dice y no queda la mitad guardada en silencio.
      await Promise.all([guardarTienda(tienda), guardarRegiones(regiones)]);
      notificar("Datos guardados");
    } catch (e) {
      notificar(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  const setRegion = (i: number, c: Partial<Region>) =>
    setRegiones(regiones.map((r, j) => (j === i ? { ...r, ...c } : r)));

  return (
    <VStack align="stretch" gap="8" maxW="900px">
      <HStack justify="end">
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
          Guardar todo
        </Button>
      </HStack>

      <Card p="6">
        <Text fontFamily="heading" fontSize="2xl" mb="5">
          La tienda
        </Text>
        <VStack align="stretch" gap="4">
          <Box>
            <Etiqueta>Frase de la portada</Etiqueta>
            <Input value={tienda.bajada} onChange={(e) => set({ bajada: e.target.value })} {...campo} />
          </Box>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3">
            <Box>
              <Etiqueta>Correo de contacto</Etiqueta>
              <Input value={tienda.correo} onChange={(e) => set({ correo: e.target.value })} {...campo} />
            </Box>
            <Box>
              <Etiqueta>Teléfono</Etiqueta>
              <Input value={tienda.telefono} onChange={(e) => set({ telefono: e.target.value })} {...campo} />
            </Box>
            <Box>
              <Etiqueta>WhatsApp (solo dígitos, ej. 56912345678)</Etiqueta>
              <Input value={tienda.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} {...campo} />
            </Box>
            <Box>
              <Etiqueta>Instagram (sin @)</Etiqueta>
              <Input value={tienda.instagram} onChange={(e) => set({ instagram: e.target.value })} {...campo} />
            </Box>
          </Grid>
          <Grid templateColumns={{ base: "1fr", md: "3fr 1fr" }} gap="3">
            <Box>
              <Etiqueta>Cómo se retira</Etiqueta>
              <Textarea value={tienda.retiro} onChange={(e) => set({ retiro: e.target.value })} {...campo} h="16" py="2" />
            </Box>
            <Box>
              <Etiqueta>Días de producción</Etiqueta>
              <Input
                type="number"
                value={tienda.diasProduccion}
                onChange={(e) => set({ diasProduccion: Number(e.target.value) || 0 })}
                {...campo}
              />
            </Box>
          </Grid>
        </VStack>
      </Card>

      <Card p="6">
        <Text fontFamily="heading" fontSize="2xl" mb="1">
          Cuenta para transferencias
        </Text>
        <Text fontSize="xs" color="fg.subtle" mb="5">
          Es lo que recibe cada cliente al confirmar un pedido. Mientras esté vacía, el sitio no
          puede indicarle dónde pagar.
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3">
          <Box>
            <Etiqueta>Titular</Etiqueta>
            <Input value={tienda.banco.titular} onChange={(e) => setBanco({ titular: e.target.value })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>RUT</Etiqueta>
            <Input value={tienda.banco.rut} onChange={(e) => setBanco({ rut: e.target.value })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Banco</Etiqueta>
            <Input value={tienda.banco.banco} onChange={(e) => setBanco({ banco: e.target.value })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Tipo de cuenta</Etiqueta>
            <Input value={tienda.banco.tipo} onChange={(e) => setBanco({ tipo: e.target.value })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Número de cuenta</Etiqueta>
            <Input value={tienda.banco.numero} onChange={(e) => setBanco({ numero: e.target.value })} {...campo} />
          </Box>
          <Box>
            <Etiqueta>Correo de avisos del banco</Etiqueta>
            <Input value={tienda.banco.correo} onChange={(e) => setBanco({ correo: e.target.value })} {...campo} />
          </Box>
        </Grid>
      </Card>

      <Card p="6">
        <HStack justify="space-between" align="end" mb="5">
          <Box>
            <Text fontFamily="heading" fontSize="2xl">
              Despacho por región
            </Text>
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Las regiones desmarcadas no aparecen al comprar. El retiro siempre es sin costo.
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
            onClick={() => setRegiones([...regiones, { id: `region-${regiones.length + 1}`, nombre: "", costo: 0 }])}
          >
            <Plus size={13} style={{ marginRight: 5 }} />
            Agregar
          </Button>
        </HStack>

        <VStack align="stretch" gap="2">
          {regiones.map((r, i) => (
            <HStack key={r.id} gap="3">
              <Input value={r.nombre} placeholder="Nombre de la región" onChange={(e) => setRegion(i, { nombre: e.target.value })} {...campo} flex="1" />
              <Input
                type="number"
                value={r.costo}
                onChange={(e) => setRegion(i, { costo: Number(e.target.value) || 0 })}
                {...campo}
                w="120px"
              />
              <Button
                size="xs"
                px="3"
                borderRadius="full"
                bg={r.activa === false ? "bg.muted" : "rgba(210,185,132,0.12)"}
                color={r.activa === false ? "fg.subtle" : "brand.primary"}
                fontWeight="500"
                onClick={() => setRegion(i, { activa: r.activa === false })}
              >
                {r.activa === false ? "oculta" : "visible"}
              </Button>
              <Button
                size="2xs"
                variant="ghost"
                color="fg.subtle"
                _hover={{ color: "estado.alerta" }}
                onClick={() => setRegiones(regiones.filter((_, j) => j !== i))}
              >
                <Trash2 size={13} />
              </Button>
            </HStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}
