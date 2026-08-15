import { HStack, Link, Text, VStack } from "@chakra-ui/react";
import { Instagram, Mail, MessageCircle, Package } from "lucide-react";
import { Section } from "../atoms/Section";
import { SectionTitle } from "../atoms/SectionTitle";
import type { Tienda } from "../data/catalogo";

const soloDigitos = (s: string) => (s || "").replace(/\D/g, "");

/**
 * Contacto y retiro.
 *
 * Cada dato aparece solo si está cargado en el panel: mientras no haya WhatsApp
 * ni Instagram, la sección no muestra íconos que no llevan a ninguna parte.
 */
export const ContactoSection = ({ tienda }: { tienda: Tienda }) => {
  const wa = soloDigitos(tienda.whatsapp);
  const vias = [
    tienda.correo && { icono: Mail, texto: tienda.correo, url: `mailto:${tienda.correo}` },
    wa && {
      icono: MessageCircle,
      texto: "WhatsApp",
      url: `https://wa.me/${wa}`,
    },
    tienda.instagram && {
      icono: Instagram,
      texto: tienda.instagram.replace(/^@?/, "@"),
      url: `https://instagram.com/${tienda.instagram.replace(/^@/, "")}`,
    },
  ].filter(Boolean) as { icono: typeof Mail; texto: string; url: string }[];

  return (
    <Section id="contacto" py={{ base: "16", md: "24" }}>
      <SectionTitle
        eyebrow="Contacto"
        title="¿Dudas antes de comprar?"
        subtitle="Escríbenos por el medio que prefieras. Si buscas un tamaño o un marco que no está en la lista, se puede cotizar aparte."
      />

      <VStack align="start" gap="4" mt="10">
        {vias.map((v) => (
          <Link
            key={v.url}
            href={v.url}
            target={v.url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            display="inline-flex"
            alignItems="center"
            gap="3"
            fontSize="sm"
            color="fg.muted"
            _hover={{ color: "brand.primary", textDecoration: "none" }}
            transition="color 0.2s"
          >
            <v.icono size={16} />
            {v.texto}
          </Link>
        ))}

        {tienda.retiro && (
          <HStack align="start" gap="3" pt="2" maxW="lg">
            <Text color="fg.subtle" pt="0.5">
              <Package size={16} />
            </Text>
            <Text fontSize="sm" color="fg.subtle" lineHeight="tall">
              {tienda.retiro}
            </Text>
          </HStack>
        )}
      </VStack>
    </Section>
  );
};
