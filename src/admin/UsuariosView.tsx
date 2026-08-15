import { useCallback, useEffect, useState } from "react";
import { Box, Button, HStack, Heading, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { borrarUsuario, guardarUsuario, listarUsuarios, type Rol, type UsuarioAdmin } from "./adminApi";

const COLOR_ROL: Record<Rol, string> = {
  admin: "#d2b984",
  staff: "#6b8ea3",
};

const DESCRIPCION_ROL: Record<Rol, string> = {
  admin: "Gestiona todo: obras, precios, pedidos, datos de la tienda y usuarios.",
  staff: "Ve y gestiona los pedidos, y publica obras. No toca precios ni usuarios.",
};

/** Selector de rol en pills. */
function PillsRol({
  valor,
  onChange,
  disabled,
}: {
  valor: Rol;
  onChange: (r: Rol) => void;
  disabled?: boolean;
}) {
  return (
    <HStack gap="1.5" flexWrap="wrap">
      {(Object.keys(COLOR_ROL) as Rol[]).map((r) => {
        const sel = valor === r;
        const c = COLOR_ROL[r];
        return (
          <Button
            key={r}
            size="2xs"
            px="2.5"
            borderRadius="full"
            fontWeight="700"
            textTransform="uppercase"
            fontSize="2xs"
            disabled={disabled}
            bg={sel ? c : "bg.muted"}
            color={sel ? "fg.inverted" : "fg.subtle"}
            _hover={sel || disabled ? {} : { bg: `${c}26`, color: c }}
            onClick={() => !sel && onChange(r)}
          >
            {r}
          </Button>
        );
      })}
    </HStack>
  );
}

/** Traduce los errores del backend a algo que se entienda. */
const mensajeError = (e: Error) =>
  e.message === "es_el_ultimo_admin"
    ? "Es el único admin: deja a otra persona como admin antes de cambiarlo."
    : `Error: ${e.message}`;

interface Props {
  emailActual: string;
  notificar: (t: string) => void;
}

/** Gestión de accesos al panel (solo admin). */
export function UsuariosView({ emailActual, notificar }: Props) {
  // undefined = cargando · null = falló la carga (distinto de "no hay usuarios")
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null | undefined>(undefined);

  const cargar = useCallback(() => {
    setUsuarios(undefined);
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios(null));
  }, []);

  useEffect(cargar, [cargar]);

  const [nuevo, setNuevo] = useState<{ email: string; rol: Rol } | null>(null);

  const invitar = async () => {
    if (!nuevo) return;
    const email = nuevo.email.trim().toLowerCase();
    if (!email.includes("@")) return notificar("Ingresa un correo válido");
    try {
      await guardarUsuario({ email, rol: nuevo.rol });
      setNuevo(null);
      cargar();
      notificar("Usuario agregado");
    } catch (e) {
      notificar(mensajeError(e as Error));
    }
  };

  const cambiarRol = async (u: UsuarioAdmin, rol: Rol) => {
    try {
      await guardarUsuario({ ...u, rol });
      cargar();
      notificar("Rol actualizado");
    } catch (e) {
      notificar(mensajeError(e as Error));
    }
  };

  return (
    <VStack gap="5" align="stretch" maxW="640px">
      <HStack justify="space-between">
        <Heading size="md">Usuarios del panel</Heading>
        {!nuevo && (
          <Button
            size="sm"
            h="9"
            px="5"
            borderRadius="full"
            fontWeight="700"
            variant="outline"
            onClick={() => setNuevo({ email: "", rol: "staff" })}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Invitar
          </Button>
        )}
      </HStack>
      {nuevo && (
        <Box bg="bg.elevated" border="1px solid" borderColor="border.subtle" borderRadius="xl" p="4">
          <VStack align="stretch" gap="3">
            <Input
              size="sm"
              placeholder="correo@gmail.com"
              value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
              bg="bg.canvas"
            />
            <PillsRol valor={nuevo.rol} onChange={(r) => setNuevo({ ...nuevo, rol: r })} />
            <Text fontSize="xs" color="fg.subtle">
              {DESCRIPCION_ROL[nuevo.rol]}
            </Text>
            <HStack gap="2">
              <Button size="sm" h="9" px="5" borderRadius="full" fontWeight="700" bg="brand.primary" color="white" onClick={invitar}>
                Agregar usuario
              </Button>
              <Button size="sm" variant="ghost" color="fg.subtle" onClick={() => setNuevo(null)}>
                Cancelar
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      <VStack gap="2" align="stretch">
        {usuarios === undefined && (
          <HStack gap="3" py="6" justify="center">
            <Spinner size="sm" color="brand.primary" />
            <Text fontSize="sm" color="fg.muted">
              Cargando usuarios…
            </Text>
          </HStack>
        )}
        {usuarios === null && (
          <HStack
            gap="3"
            p="4"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.soft"
            bg="bg.elevated"
          >
            <Box color="#c98a5b">
              <TriangleAlert size={16} />
            </Box>
            <Box flex="1">
              <Text fontSize="sm" fontWeight="700">
                No se pudo cargar la lista
              </Text>
              <Text fontSize="xs" color="fg.subtle">
                Revisa tu conexión y vuelve a intentarlo.
              </Text>
            </Box>
            <Button size="xs" h="8" px="4" borderRadius="full" fontWeight="700" variant="outline" onClick={cargar}>
              Reintentar
            </Button>
          </HStack>
        )}
        {usuarios?.length === 0 && (
          <Text fontSize="sm" color="fg.subtle" py="2">
            Todavía no hay usuarios con acceso al panel.
          </Text>
        )}
        {(usuarios || []).map((u) => (
          <HStack
            key={u.email}
            justify="space-between"
            p="3.5"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.soft"
            bg="bg.elevated"
          >
            <VStack align="start" gap="2" flex="1" minW="0">
              <Text fontSize="sm" fontWeight="600" lineClamp={1}>
                {u.email}
              </Text>
              <PillsRol
                valor={u.rol}
                onChange={(r) => cambiarRol(u, r)}
                disabled={u.email === emailActual}
              />
            </VStack>
            {u.email !== emailActual && (
              <Button
                size="xs"
                variant="ghost"
                color="fg.subtle"
                onClick={async () => {
                  if (!confirm(`¿Quitar acceso a ${u.email}?`)) return;
                  try {
                    await borrarUsuario(u.email);
                    cargar();
                    notificar("Acceso revocado");
                  } catch (e) {
                    notificar(mensajeError(e as Error));
                  }
                }}
              >
                <Trash2 size={15} />
              </Button>
            )}
          </HStack>
        ))}
      </VStack>
      <Box>
        <VStack align="start" gap="1">
          {(Object.keys(DESCRIPCION_ROL) as Rol[]).map((r) => (
            <Text key={r} fontSize="xs" color="fg.subtle">
              <Text as="span" fontWeight="700" textTransform="uppercase">
                {r}
              </Text>
              {" · "}
              {DESCRIPCION_ROL[r]}
            </Text>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
