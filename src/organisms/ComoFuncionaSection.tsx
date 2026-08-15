import { Box, Grid, Text, VStack } from "@chakra-ui/react";
import { Section } from "../atoms/Section";
import { SectionTitle } from "../atoms/SectionTitle";
import type { Tienda } from "../data/catalogo";

/**
 * Los cuatro pasos, contados antes de que los pregunten.
 *
 * Quien compra un cuadro por internet tiene dos dudas: cómo va a quedar y
 * cuándo le llega. La primera la responde la vista previa; la segunda, este
 * bloque, con el plazo real de producción que se edita desde el panel.
 */
export const ComoFuncionaSection = ({ tienda }: { tienda: Tienda }) => {
  const pasos = [
    {
      n: "01",
      t: "Elige la obra",
      d: "Recorre la galería y entra a la que te quedes mirando.",
    },
    {
      n: "02",
      t: "Ármala a tu gusto",
      d: "Papel, tamaño, marco y vidrio. Vas viendo el cuadro y el precio mientras eliges.",
    },
    {
      n: "03",
      t: "Paga por transferencia",
      d: "Te llegan los datos por correo. Con el pago confirmado empieza la producción.",
    },
    {
      n: "04",
      t: "Recíbela lista",
      d: `La imprimimos y enmarcamos en unos ${tienda.diasProduccion} días hábiles, y la despachamos lista para colgar.`,
    },
  ];

  return (
    <Section id="como-funciona" bg="bg.pared" py={{ base: "16", md: "24" }}>
      <SectionTitle eyebrow="El proceso" title="De la pared de la galería a la tuya" />
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap="10" mt="12">
        {pasos.map((p) => (
          <VStack key={p.n} align="start" gap="3">
            <Text
              fontFamily="heading"
              fontSize="3xl"
              fontWeight="300"
              color="brand.primary"
              lineHeight="1"
            >
              {p.n}
            </Text>
            <Box w="24px" h="1px" bg="border.soft" />
            <Text fontSize="md" fontWeight="500" color="fg.default">
              {p.t}
            </Text>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {p.d}
            </Text>
          </VStack>
        ))}
      </Grid>
    </Section>
  );
};
