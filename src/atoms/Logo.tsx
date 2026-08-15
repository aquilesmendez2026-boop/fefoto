import { Text, type TextProps } from "@chakra-ui/react";

/**
 * Logotipo de fefoto, tipográfico.
 *
 * PENDIENTE: cuando llegue el logotipo real, esto pasa a ser una <img> como en
 * cualquier otro sitio. Mientras tanto una firma en serif fina funciona mejor
 * que un placeholder gris, y ya deja fijado el lugar y el tamaño que ocupa.
 */
export const Logo = (props: TextProps) => (
  <Text
    as="span"
    fontFamily="heading"
    fontWeight="500"
    letterSpacing="0.24em"
    textTransform="lowercase"
    color="fg.default"
    userSelect="none"
    lineHeight="1"
    fontSize={{ base: "xl", md: "2xl" }}
    {...props}
  >
    fefoto
  </Text>
);
