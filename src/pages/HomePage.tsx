import { useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";
import { registrarVisita } from "../data/api";
import { useCatalogo, visibles } from "../data/useCatalogo";
import { Navbar } from "../organisms/Navbar";
import { Hero } from "../organisms/Hero";
import { GaleriaSection } from "../organisms/GaleriaSection";
import { ComoFuncionaSection } from "../organisms/ComoFuncionaSection";
import { ContactoSection } from "../organisms/ContactoSection";
import { Footer } from "../organisms/Footer";

export const HomePage = () => {
  const { fotos, opciones, categorias, tienda, demo } = useCatalogo();

  useEffect(() => {
    registrarVisita("home");
  }, []);

  const publicadas = visibles(fotos);
  const portada = publicadas.find((f) => f.destacada) ?? publicadas[0];

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh" overflowX="hidden">
      <Navbar />
      <Hero foto={portada} bajada={tienda.bajada} />

      {/* Aviso mientras el catálogo real no exista. Desaparece solo en cuanto
          se publica la primera obra desde el panel. */}
      {demo && (
        <Text
          textAlign="center"
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="brand.primary"
          bg="rgba(210,185,132,0.06)"
          borderY="1px solid"
          borderColor="border.subtle"
          py="3"
          px="5"
        >
          Obras de muestra — el catálogo real se carga desde el panel
        </Text>
      )}

      <GaleriaSection fotos={publicadas} opciones={opciones} categorias={categorias} />
      <ComoFuncionaSection tienda={tienda} />
      <ContactoSection tienda={tienda} />
      <Footer />
    </Box>
  );
};
