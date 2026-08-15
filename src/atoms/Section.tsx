import { Box, type BoxProps } from "@chakra-ui/react";

interface SectionProps extends BoxProps {
  id: string;
}

export const Section = ({ id, children, ...props }: SectionProps) => {
  return (
    <Box
      as="section"
      id={id}
      position="relative"
      w="full"
      py={{ base: "16", md: "24" }}
      px={{ base: "5", md: "8" }}
      scrollMarginTop="80px"
      {...props}
    >
      <Box maxW="1200px" w="full" mx="auto">
        {children}
      </Box>
    </Box>
  );
};
