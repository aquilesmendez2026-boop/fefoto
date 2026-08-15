import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, HStack, Heading, Tabs, Text, VStack } from "@chakra-ui/react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { SECCIONES, seccionesDe } from "../data/seccionesPanel";
import { mensajeAuth } from "../data/mensajeAuth";
import { Logo } from "../atoms/Logo";
import { auth, googleProvider } from "./firebase";
import { quienSoy, type Rol } from "./adminApi";
import { ResumenView } from "./ResumenView";
import { PedidosView } from "./PedidosView";
import { ObrasView } from "./ObrasView";
import { OpcionesView } from "./OpcionesView";
import { TiendaView } from "./TiendaView";
import { UsuariosView } from "./UsuariosView";
import { SesionButton, guardarSesion, olvidarSesion } from "../molecules/SesionButton";
import { BotonInicio } from "../molecules/BotonInicio";

/**
 * Pestaña inicial según el hash (#/admin/pedidos, #/admin/obras…).
 * Se valida contra la lista de secciones y no con una cadena de ifs, que se
 * queda desactualizada en cuanto se agrega una sección.
 */
function tabInicial(): string {
  const sub = window.location.hash.replace(/^#\/admin\/?/, "").split("/")[0];
  return SECCIONES.some((s) => s.v === sub) ? sub : "resumen";
}

// ─────────── Pantalla de acceso ───────────
function Acceso({ error, sesionDe }: { error: string; sesionDe?: string }) {
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  return (
    <Flex minH="100vh" align="center" justify="center" bg="bg.canvas" px="5">
      <VStack gap="6" w="full" maxW="380px" textAlign="center">
        <Logo fontSize="3xl" />
        <Heading fontFamily="heading" fontWeight="400" size="xl">
          Panel
        </Heading>
        <Text color="fg.muted" fontSize="sm" lineHeight="tall">
          {sesionDe
            ? "Esta cuenta no tiene acceso al panel. Puedes entrar con otra."
            : "Ingresa con tu cuenta de Google autorizada."}
        </Text>
        {sesionDe && (
          <Text fontSize="sm" color="fg.subtle">
            Estás con <strong>{sesionDe}</strong>
          </Text>
        )}
        <Button
          w="full"
          h="12"
          borderRadius="md"
          bg="brand.primary"
          color="fg.inverted"
          fontWeight="600"
          loading={cargando}
          _hover={{ bg: "brass.200" }}
          onClick={async () => {
            setCargando(true);
            setErrorLogin("");
            try {
              await signInWithPopup(auth, googleProvider);
            } catch (e) {
              setErrorLogin(mensajeAuth((e as { code?: string }).code || ""));
            } finally {
              setCargando(false);
            }
          }}
        >
          {sesionDe ? "Entrar con otra cuenta" : "Entrar con Google"}
        </Button>
        {sesionDe && (
          // Salir del todo, para cuando Google insiste con la misma cuenta.
          <Button
            size="sm"
            variant="ghost"
            color="fg.muted"
            onClick={async () => {
              await signOut(auth);
              olvidarSesion();
            }}
          >
            Cerrar sesión
          </Button>
        )}
        {(error || errorLogin) && (
          <Text color="estado.alerta" fontSize="sm" lineHeight="tall">
            {error || errorLogin}
          </Text>
        )}
      </VStack>
    </Flex>
  );
}

// ─────────── Panel con pestañas ───────────
export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [errorAcceso, setErrorAcceso] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [tab, setTab] = useState<string>(tabInicial);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    // Si Firebase no responde en 4s, mostramos el acceso igualmente.
    const t = setTimeout(() => setCargandoSesion(false), 4000);
    const off = onAuthStateChanged(auth, async (u) => {
      clearTimeout(t);
      setUser(u);
      if (!u) {
        olvidarSesion();
        setRol(null);
        setCargandoSesion(false);
        return;
      }
      // Sesión ligera para el menú del sitio (el panel siempre verifica en el
      // backend). La marca de staff se escribe recién cuando el rol está
      // confirmado: ponerla antes marcaba como staff a cualquier cliente que
      // pasara por #/admin, aunque el panel lo rechazara enseguida.
      const marcar = (staff: boolean) =>
        guardarSesion({
          n: u.displayName || "",
          e: u.email || "",
          f: u.photoURL || "",
          s: staff,
        });
      try {
        const yo = await quienSoy();
        marcar(true);
        setRol(yo.rol);
        setErrorAcceso("");
      } catch (e) {
        marcar(false);
        setRol(null);
        setErrorAcceso(
          (e as Error).message === "sin_permisos"
            ? `La cuenta ${u.email} no tiene acceso. Pide a un administrador que te agregue.`
            : "No se pudo verificar el acceso."
        );
      } finally {
        setCargandoSesion(false);
      }
    });
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  /**
   * Cambiar de sección mueve también el hash, y el hash mueve la sección: así
   * el botón "atrás" del navegador recorre las secciones en vez de salir del
   * panel de una, y los enlaces directos a #/admin/pedidos funcionan estando
   * ya dentro.
   */
  const irATab = useCallback((v: string) => {
    setTab(v);
    window.location.hash = `#/admin/${v}`;
  }, []);

  useEffect(() => {
    const alCambiarHash = () => setTab(tabInicial());
    window.addEventListener("hashchange", alCambiarHash);
    return () => window.removeEventListener("hashchange", alCambiarHash);
  }, []);

  // Si la pestaña del hash no corresponde al rol (un staff que abre
  // #/admin/usuarios), se cae al resumen en vez de dejar el panel vacío.
  useEffect(() => {
    if (rol && rol !== "admin" && tab === "usuarios") setTab("resumen");
  }, [rol, tab]);

  const notificar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(""), 2500);
  };

  if (cargandoSesion)
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg.canvas">
        <VStack gap="3">
          <Logo fontSize="2xl" />
          <Text fontSize="sm" color="fg.subtle">
            Cargando…
          </Text>
        </VStack>
      </Flex>
    );

  if (!user || !rol) return <Acceso error={errorAcceso} sesionDe={user?.email || undefined} />;

  const esAdmin = rol === "admin";

  return (
    <Box minH="100vh" bg="bg.canvas">
      <Box
        bg="bg.elevated"
        borderBottom="1px solid"
        borderColor="border.subtle"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Flex
          maxW="1280px"
          mx="auto"
          px={{ base: "5", md: "8" }}
          py="3.5"
          align="center"
          justify="space-between"
        >
          <HStack gap="3">
            <Logo fontSize="lg" />
            <Text
              fontSize="2xs"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="0.14em"
              px="2"
              py="0.5"
              borderRadius="full"
              bg={esAdmin ? "rgba(210,185,132,0.12)" : "bg.muted"}
              color={esAdmin ? "brand.primary" : "fg.subtle"}
            >
              {rol}
            </Text>
          </HStack>

          <HStack gap="2">
            {aviso && (
              <Text fontSize="sm" color="brand.primary" mr="1">
                {aviso}
              </Text>
            )}
            <BotonInicio />
            <SesionButton />
          </HStack>
        </Flex>
      </Box>

      <Box maxW="1280px" mx="auto" p={{ base: "5", md: "8" }}>
        <Heading fontFamily="heading" fontWeight="400" size="3xl" mb="6">
          Administración
        </Heading>

        <Tabs.Root value={tab} onValueChange={(e) => irATab(e.value)} variant="plain">
          <Tabs.List gap="2" flexWrap="wrap" alignItems="center">
            {seccionesDe(esAdmin).map(({ v, n, i: Icono }) => (
              <Tabs.Trigger
                key={v}
                value={v}
                h="9"
                px="4"
                borderRadius="full"
                fontSize="sm"
                fontWeight="500"
                transition="all 0.15s"
                bg={tab === v ? "brand.primary" : "bg.muted"}
                color={tab === v ? "fg.inverted" : "fg.muted"}
                _hover={tab === v ? {} : { color: "fg.default" }}
              >
                <Icono size={14} style={{ marginRight: 6 }} />
                {n}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="resumen" pt="8">
            {tab === "resumen" && <ResumenView onIr={irATab} />}
          </Tabs.Content>

          <Tabs.Content value="pedidos" pt="8">
            {tab === "pedidos" && <PedidosView notificar={notificar} />}
          </Tabs.Content>

          <Tabs.Content value="obras" pt="8">
            {tab === "obras" && <ObrasView notificar={notificar} />}
          </Tabs.Content>

          <Tabs.Content value="opciones" pt="8">
            {tab === "opciones" && <OpcionesView notificar={notificar} />}
          </Tabs.Content>

          <Tabs.Content value="tienda" pt="8">
            {tab === "tienda" && <TiendaView notificar={notificar} />}
          </Tabs.Content>

          <Tabs.Content value="usuarios" pt="8">
            {esAdmin && tab === "usuarios" && (
              <UsuariosView emailActual={user?.email || ""} notificar={notificar} />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
}
