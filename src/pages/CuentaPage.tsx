import { useEffect, useState } from "react";
import { Box, Flex, HStack, Link, Spinner, Text, VStack } from "@chakra-ui/react";
import type { User } from "firebase/auth";
import { miRol, misPedidos, observarSesion } from "../data/cuenta";
import { registrarVisita } from "../data/api";
import { clp } from "../data/catalogo";
import { estadoDe, type Pedido } from "../data/pedido";
import { Navbar } from "../organisms/Navbar";
import { Footer } from "../organisms/Footer";
import { AccesoCuenta } from "../organisms/AccesoCuenta";
import { guardarSesion, olvidarSesion } from "../molecules/SesionButton";

const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * Mis pedidos.
 *
 * Es el mismo contenido que la página del pedido, pero en lista y detrás de una
 * sesión. Quien compró sin cuenta no pierde nada: su enlace por correo sigue
 * abriendo su pedido.
 */
export const CuentaPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    registrarVisita("cuenta");
    return observarSesion((u) => {
      setUser(u);
      setCargandoSesion(false);
      if (!u) {
        olvidarSesion();
        return;
      }
      // La marca ligera es la que lee el chip del navbar para decidir si
      // ofrece los accesos al panel.
      const marca = { n: u.displayName || "", e: u.email || "", f: u.photoURL || "" };
      // Se guarda primero como cliente y recién se corrige si el backend
      // confirma que es del equipo. Al revés se vería un parpadeo de enlaces
      // al panel en la sesión de cualquier cliente, que es el error caro.
      guardarSesion({ ...marca, s: false });
      // Ser del equipo no depende de por dónde entraste: quien es staff y
      // entra por su cuenta de cliente sigue siendo staff. La única fuente de
      // verdad es la tabla de usuarios, así que se pregunta.
      miRol()
        .then((rol) => {
          if (rol) guardarSesion({ ...marca, s: true });
        })
        .catch(() => {
          /* sin respuesta: se queda como cliente, que es lo prudente */
        });
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setPedidos(null);
      return;
    }
    misPedidos()
      .then((r) => setPedidos(r.pedidos ?? []))
      .catch(() => setPedidos([]));
  }, [user]);

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh">
      <Navbar minimo />

      <Box maxW="880px" mx="auto" px={{ base: "5", md: "8" }} pt={{ base: "24", md: "28" }} pb="20" minH="70vh">
        {cargandoSesion ? (
          <Flex minH="50vh" align="center" justify="center">
            <Spinner color="brand.primary" />
          </Flex>
        ) : !user ? (
          <AccesoCuenta />
        ) : (
          <>
            <Text fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="400" mb="2">
              Tus pedidos
            </Text>
            <Text fontSize="sm" color="fg.subtle" mb="10">
              {user.email}
            </Text>

            {pedidos === null ? (
              <Spinner color="brand.primary" />
            ) : pedidos.length === 0 ? (
              <VStack align="start" gap="4" py="10">
                <Text color="fg.muted">Todavía no tienes pedidos con este correo.</Text>
                <Link href="#/" fontSize="sm" color="brand.primary">
                  Ver la galería
                </Link>
              </VStack>
            ) : (
              <VStack align="stretch" gap="0">
                {pedidos.map((p) => {
                  const estado = estadoDe(p.estado);
                  return (
                    <Link
                      key={p.pedidoId}
                      href={`#/pedido/${encodeURIComponent(p.pedidoId)}`}
                      py="6"
                      borderTop="1px solid"
                      borderColor="border.subtle"
                      _hover={{ textDecoration: "none", bg: "bg.surface" }}
                      transition="background-color 0.2s"
                    >
                      <HStack justify="space-between" align="start" gap="6" w="full">
                        <VStack align="start" gap="1.5" minW="0">
                          <HStack gap="2.5">
                            <Box boxSize="7px" borderRadius="full" bg={estado.color} />
                            <Text fontSize="xs" letterSpacing="0.16em" textTransform="uppercase" color="fg.subtle">
                              {estado.nombre}
                            </Text>
                          </HStack>
                          <Text fontFamily="heading" fontSize="2xl" color="fg.default">
                            {p.numero}
                          </Text>
                          <Text fontSize="xs" color="fg.subtle">
                            {fechaCorta(p.creado)} ·{" "}
                            {p.items.map((i) => i.titulo).join(", ")}
                          </Text>
                        </VStack>
                        <Text fontSize="md" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                          {clp(p.total)}
                        </Text>
                      </HStack>
                    </Link>
                  );
                })}
              </VStack>
            )}
          </>
        )}
      </Box>

      <Footer />
    </Box>
  );
};
