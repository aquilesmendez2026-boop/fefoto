import { Heading, Text, VStack } from "@chakra-ui/react";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}

/**
 * Encabezado de sección: cartela de museo.
 *
 * Sin la barrita de color de antes y sin negritas: en una sala el rótulo se lee
 * porque está bien puesto, no porque grite. El peso visual tiene que quedárselo
 * la obra que viene abajo.
 */
export const SectionTitle = ({ eyebrow, title, subtitle, align = "start" }: SectionTitleProps) => (
  <VStack
    align={align}
    gap="3"
    textAlign={align === "center" ? "center" : "start"}
    maxW={align === "center" ? "2xl" : undefined}
    mx={align === "center" ? "auto" : undefined}
  >
    {eyebrow && (
      <Text
        fontSize="xs"
        fontWeight="500"
        letterSpacing="0.28em"
        textTransform="uppercase"
        color="fg.subtle"
      >
        {eyebrow}
      </Text>
    )}
    <Heading
      as="h2"
      fontFamily="heading"
      fontWeight="400"
      size={{ base: "3xl", md: "4xl" }}
      letterSpacing="tight"
      color="fg.default"
    >
      {title}
    </Heading>
    {subtitle && (
      <Text fontSize={{ base: "sm", md: "md" }} color="fg.muted" maxW="2xl" lineHeight="tall">
        {subtitle}
      </Text>
    )}
  </VStack>
);
