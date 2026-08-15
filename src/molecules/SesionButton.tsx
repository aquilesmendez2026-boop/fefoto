import { useEffect, useState } from "react";
import { Box, Button, Image, Menu, Portal, Text } from "@chakra-ui/react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  UserRound,
} from "lucide-react";

interface Sesion {
  n: string; // nombre
  e: string; // email
  f: string; // foto
  /**
   * true si entró por el panel (staff), false si entró por su cuenta de
   * cliente. Ausente en sesiones guardadas antes de que existiera la marca: en
   * ese caso no se sabe, y se prefiere mostrar los accesos a esconderlos.
   */
  s?: boolean;
}

const CLAVE = "fefoto_sesion";

/**
 * Aviso de que la marca de sesión cambió.
 *
 * `storage` no sirve: el navegador solo lo dispara en las *otras* pestañas, y
 * acá quien escribe y quien lee están en la misma. Sin esto, el chip leía el
 * localStorage al montarse y se quedaba con esa foto: en la cuenta del cliente
 * la marca se escribe recién cuando Firebase restaura la sesión, o sea después,
 * así que quedaba mostrando el ícono de "sin sesión" a alguien ya conectado.
 */
const EVENTO = "fefoto:sesion";

/** Sesión ligera guardada por el panel (el backend siempre re-verifica). */
export function leerSesion(): Sesion | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) || "null");
    return s && s.e ? s : null;
  } catch {
    return null;
  }
}

/** Guarda la marca y avisa a los chips que estén en pantalla. */
export function guardarSesion(s: Sesion) {
  localStorage.setItem(CLAVE, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENTO));
}

export function olvidarSesion() {
  localStorage.removeItem(CLAVE);
  window.dispatchEvent(new Event(EVENTO));
}

export async function cerrarSesion() {
  try {
    // Firebase se carga solo aquí, al cerrar sesión desde el sitio.
    const [{ auth }, { signOut }] = await Promise.all([
      import("../admin/firebase"),
      import("firebase/auth"),
    ]);
    await signOut(auth);
  } catch {
    /* sin conexión igual limpiamos la sesión local */
  }
  olvidarSesion();
}

const irA = (hash: string) => {
  window.location.hash = hash;
};

/**
 * Botón de sesión del navbar.
 * - Sin sesión → ícono que lleva a la cuenta del cliente, no al panel: quien
 *   entra al sitio es un cliente, y el staff sabe llegar a #/admin.
 * - Con sesión → chip con avatar y menú. Las opciones del panel salen solo si
 *   la sesión se abrió desde ahí.
 */
/**
 * Ya se preguntó el rol en esta carga de página.
 *
 * El chip se dibuja en todas las páginas, y sin esto cada visita a la portada
 * volvería a preguntar. Vive fuera del componente porque la respuesta es la
 * misma para todos: el rol lo tiene la persona, no el botón.
 */
let rolConsultado = false;

export const SesionButton = () => {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  useEffect(() => {
    const alCambiar = () => setSesion(leerSesion());
    window.addEventListener(EVENTO, alCambiar);
    // Y la de otras pestañas, para no quedar mostrando una sesión ya cerrada.
    window.addEventListener("storage", alCambiar);
    return () => {
      window.removeEventListener(EVENTO, alCambiar);
      window.removeEventListener("storage", alCambiar);
    };
  }, []);

  /**
   * Confirma con el backend si esta persona es del equipo.
   *
   * Acá y no en las páginas que abren sesión, porque la marca guardada dura
   * entre visitas: quien entró alguna vez por su cuenta de cliente quedaba
   * marcado como cliente para siempre, y el menú le escondía el panel aunque
   * fuera admin. El chip está en todas las páginas, así que revisándolo acá se
   * corrige sola en la primera pantalla que abra, sin volver a entrar.
   *
   * Solo se pregunta si ya hay sesión: un visitante anónimo no descarga
   * Firebase ni gasta una petición. Y solo si la marca no está confirmada, así
   * que a quien ya sabemos del equipo no se le vuelve a preguntar.
   */
  useEffect(() => {
    if (!sesion || sesion.s === true || rolConsultado) return;
    rolConsultado = true;
    let vivo = true;
    import("../data/cuenta")
      .then((m) => m.miRol())
      .then((rol) => {
        if (vivo && rol) guardarSesion({ ...sesion, s: true });
      })
      .catch(() => {
        // Sin respuesta se deja la marca como está: en la duda, cliente.
        rolConsultado = false;
      });
    return () => {
      vivo = false;
    };
  }, [sesion]);

  if (!sesion) {
    return (
      <Button
        aria-label="Mi cuenta"
        title="Mi cuenta"
        onClick={() => irA("#/cuenta")}
        size="sm"
        variant="outline"
        borderRadius="full"
        borderColor="border.soft"
        color="fg.muted"
        px="2.5"
        _hover={{ color: "brand.primary", borderColor: "brand.primary" }}
      >
        <UserRound size={17} />
      </Button>
    );
  }

  const nombre = sesion.n?.split(" ")[0] || "Cuenta";
  const itemStyle = {
    gap: "2.5",
    px: "3",
    py: "2",
    borderRadius: "md",
    cursor: "pointer",
    color: "fg.default",
    _highlighted: { bg: "bg.muted" },
    _hover: { bg: "bg.muted" },
  } as const;

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          borderRadius="full"
          borderColor="border.brand"
          bg="bg.elevated"
          color="fg.default"
          pl="1.5"
          pr="3"
          _hover={{ boxShadow: "soft", transform: "translateY(-1px)" }}
          transition="all 0.3s"
        >
          {sesion.f ? (
            <Image
              src={sesion.f}
              alt={nombre}
              boxSize="22px"
              borderRadius="full"
              mr="2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserRound size={15} style={{ marginRight: 6 }} />
          )}
          <Text as="span" fontWeight="600">
            {nombre}
          </Text>
          <ChevronDown size={15} style={{ marginLeft: 6 }} />
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="bg.elevated"
            border="1px solid"
            borderColor="border.subtle"
            borderRadius="xl"
            boxShadow="soft"
            minW="230px"
            p="1.5"
          >
            <Box px="3" py="2">
              <Text fontSize="sm" fontWeight="700" lineClamp={1}>
                {sesion.n || "Cuenta"}
              </Text>
              <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                {sesion.e}
              </Text>
            </Box>
            <Menu.Separator borderColor="border.subtle" my="1" />

            <Menu.Item
              value="cuenta"
              onClick={() => irA("#/cuenta")}
              {...itemStyle}
            >
              <UserRound size={16} />
              Mi cuenta
            </Menu.Item>

            {/* Se ocultan solo si sabemos que es cliente. Con `!sesion.s`, una
                sesión guardada antes de la marca perdía los accesos al panel. */}
            {sesion.s !== false && (
              <>
                <Menu.Separator borderColor="border.subtle" my="1" />
                <Menu.Item
                  value="pedidos"
                  onClick={() => irA("#/admin/pedidos")}
                  {...itemStyle}
                  color="brand.primary"
                >
                  <PackageCheck size={16} />
                  Pedidos
                </Menu.Item>
                <Menu.Item
                  value="panel"
                  onClick={() => irA("#/admin/resumen")}
                  {...itemStyle}
                  color="brand.primary"
                >
                  <LayoutDashboard size={16} />
                  Panel admin
                </Menu.Item>
              </>
            )}

            <Menu.Separator borderColor="border.subtle" my="1" />

            <Menu.Item
              value="logout"
              onClick={async () => {
                await cerrarSesion();
                setSesion(null);
                // Al salir se vuelve a la portada: quedarse en la cuenta o en
                // el panel deja a la vista una pantalla que ya no corresponde.
                window.location.hash = "";
              }}
              {...itemStyle}
              color="estado.alerta"
              _highlighted={{ bg: "bg.muted" }}
              _hover={{ bg: "bg.muted" }}
            >
              <LogOut size={16} />
              Cerrar sesión
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};
