import { useEffect, useState } from "react";
import { Box, Flex, HStack, IconButton, Link, Stack, Text } from "@chakra-ui/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Logo } from "../atoms/Logo";
import { SesionButton } from "../molecules/SesionButton";
import { useTotalItems } from "../data/carrito";

const enlaces = [
  { label: "Galería", href: "#galeria" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Contacto", href: "#contacto" },
];

/** El bolso con el número de copias. Lleva al carrito desde cualquier página. */
const BotonCarrito = () => {
  const total = useTotalItems();
  return (
    <Link
      href="#/carrito"
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSize="9"
      borderRadius="full"
      color={total > 0 ? "brand.primary" : "fg.muted"}
      _hover={{ color: "brand.primary", textDecoration: "none" }}
      aria-label={total > 0 ? `Carrito, ${total} copias` : "Carrito"}
    >
      <ShoppingBag size={19} />
      {total > 0 && (
        <Text
          position="absolute"
          top="0"
          right="0"
          minW="17px"
          h="17px"
          px="1"
          borderRadius="full"
          bg="brand.primary"
          color="fg.inverted"
          fontSize="10px"
          fontWeight="700"
          lineHeight="17px"
          textAlign="center"
        >
          {total}
        </Text>
      )}
    </Link>
  );
};

/**
 * Barra superior.
 *
 * `minimo` deja solo el logo, el carrito y la sesión: los enlaces del menú son
 * anclas a secciones de la portada, así que fuera de ella no llevan a ninguna
 * parte.
 */
export const Navbar = ({ minimo = false }: { minimo?: boolean }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="100"
      transition="all 0.35s"
      bg={scrolled ? "rgba(15, 15, 14, 0.82)" : "transparent"}
      backdropFilter={scrolled ? "blur(14px)" : "none"}
      borderBottom="1px solid"
      borderColor={scrolled ? "border.subtle" : "transparent"}
    >
      <Flex
        maxW="1280px"
        mx="auto"
        px={{ base: "5", md: "8" }}
        py="4"
        align="center"
        justify="space-between"
      >
        <Link href="#/" _hover={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        <HStack gap="8" display={{ base: "none", md: "flex" }}>
          {!minimo &&
            enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                fontSize="xs"
                letterSpacing="0.16em"
                textTransform="uppercase"
                color="fg.muted"
                _hover={{ color: "fg.default", textDecoration: "none" }}
                transition="color 0.2s"
              >
                {e.label}
              </Link>
            ))}
          <HStack gap="2">
            <BotonCarrito />
            <SesionButton />
          </HStack>
        </HStack>

        <HStack gap="1" display={{ base: "flex", md: "none" }}>
          <BotonCarrito />
          {minimo ? (
            <SesionButton />
          ) : (
            <IconButton
              aria-label="Abrir menú"
              variant="ghost"
              color="fg.default"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </IconButton>
          )}
        </HStack>
      </Flex>

      {open && (
        <Stack
          display={{ base: "flex", md: "none" }}
          px="5"
          pb="6"
          gap="4"
          bg="rgba(15, 15, 14, 0.97)"
          backdropFilter="blur(14px)"
          borderBottom="1px solid"
          borderColor="border.subtle"
        >
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              fontSize="sm"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="fg.muted"
              onClick={() => setOpen(false)}
              _hover={{ color: "fg.default", textDecoration: "none" }}
            >
              {e.label}
            </Link>
          ))}
          <Link
            href="#/cuenta"
            fontSize="sm"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="fg.muted"
            onClick={() => setOpen(false)}
            _hover={{ color: "fg.default", textDecoration: "none" }}
          >
            Mi cuenta
          </Link>
        </Stack>
      )}
    </Box>
  );
};
