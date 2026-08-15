import { useEffect } from "react";
import { Box, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { registrarVisita } from "../data/api";
import { useCatalogo } from "../data/useCatalogo";
import { Navbar } from "../organisms/Navbar";
import { Footer } from "../organisms/Footer";

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <Heading as="h2" fontFamily="heading" fontWeight="400" size="xl" pt="8" pb="1">
    {children}
  </Heading>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="sm" color="fg.muted" lineHeight="tall">
    {children}
  </Text>
);

export const PrivacidadPage = () => {
  const { tienda } = useCatalogo();

  useEffect(() => {
    registrarVisita("privacidad");
  }, []);

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh">
      <Navbar minimo />

      <Box maxW="720px" mx="auto" px={{ base: "5", md: "8" }} pt={{ base: "24", md: "28" }} pb="20">
        <Text fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="400">
          Privacidad
        </Text>
        <Text fontSize="xs" color="fg.subtle" mt="3" letterSpacing="wide">
          Qué datos guardamos y para qué.
        </Text>

        <VStack align="stretch" gap="3" mt="4">
          <Titulo>Lo que nos das al comprar</Titulo>
          <P>
            Para procesar un pedido guardamos tu nombre, correo, teléfono si lo dejas y, cuando
            eliges despacho, la dirección de entrega. Se usan para producir tu pedido, avisarte en
            qué va y despacharlo. Nada de eso se vende ni se comparte con terceros para publicidad.
          </P>

          <Titulo>El pago</Titulo>
          <P>
            El pago es por transferencia bancaria y ocurre fuera de este sitio, en tu banco. No
            recibimos, ni vemos, ni almacenamos datos de tus tarjetas o claves.
          </P>

          <Titulo>Tu cuenta</Titulo>
          <P>
            Crear una cuenta es opcional y sirve para ver tus pedidos juntos. La sesión la maneja
            Firebase Authentication (Google), que guarda tu correo y, si entras con Google, tu
            nombre y foto de perfil. Nunca conocemos tu contraseña.
          </P>

          <Titulo>Medición de visitas</Titulo>
          <P>
            Contamos visitas por nuestra cuenta, sin Google Analytics y sin cookies de terceros.
            Guardamos la página vista, el sitio desde el que llegaste, si entraste por teléfono o
            computador y un identificador aleatorio que se genera en tu navegador. Ese
            identificador no está asociado a tu nombre ni a tu correo, y las filas se borran solas
            al mes.
          </P>

          <Titulo>Cuánto tiempo</Titulo>
          <P>
            Los pedidos se conservan mientras sean necesarios para respaldar la venta y la
            posventa. Los datos de medición, un mes.
          </P>

          <Titulo>Tus derechos</Titulo>
          <P>
            Puedes pedirnos una copia de tus datos, corregirlos o borrarlos escribiendo a{" "}
            <Link href={`mailto:${tienda.correo}`} color="brand.primary">
              {tienda.correo}
            </Link>
            . Si borramos tu cuenta, los pedidos ya emitidos se mantienen por obligación contable,
            sin quedar asociados a un perfil.
          </P>

          <Titulo>Las imágenes</Titulo>
          <P>
            Todas las fotografías de este sitio son obra de fefoto y están protegidas por derechos
            de autor. Comprar una copia no transfiere esos derechos: no se pueden reproducir,
            reeditar ni usar comercialmente sin autorización escrita.
          </P>
        </VStack>
      </Box>

      <Footer />
    </Box>
  );
};
