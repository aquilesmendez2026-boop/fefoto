import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  IconButton,
  Image,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDown,
  ArrowUp,
  Columns2,
  Film,
  ImageIcon,
  Plus,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { urlEmbed, type Bloque, type Celda } from "../molecules/ArticuloRender";

const CELDA_VACIA: Celda = { tipo: "texto", texto: "" };

/** Textarea que crece con su contenido. */
function TextoAuto({
  value,
  onChange,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    ajustar();
    document.fonts?.ready.then(ajustar);
  }, [value]);
  return (
    <Textarea
      ref={ref}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      bg="bg.canvas"
      resize="none"
      overflow="hidden"
      minH="unset"
      fontSize="sm"
    />
  );
}

/** Editor de una celda: texto, imagen o video. */
function EditorCelda({ celda, onChange }: { celda: Celda; onChange: (c: Celda) => void }) {
  const tipos: { t: Celda["tipo"]; n: string; i: typeof Type }[] = [
    { t: "texto", n: "Texto", i: Type },
    { t: "imagen", n: "Imagen", i: ImageIcon },
    { t: "video", n: "Video", i: Film },
  ];

  return (
    <VStack align="stretch" gap="2.5">
      <HStack gap="1">
        {tipos.map(({ t, n, i: Icono }) => {
          const sel = celda.tipo === t;
          return (
            <Button
              key={t}
              size="2xs"
              h="7"
              px="3"
              borderRadius="full"
              fontWeight="700"
              bg={sel ? "brand.primary" : "bg.muted"}
              color={sel ? "white" : "fg.muted"}
              _hover={sel ? {} : { bg: "brandBlue.50", color: "brandBlue.700" }}
              onClick={() => onChange({ ...celda, tipo: t })}
            >
              <Icono size={12} style={{ marginRight: 4 }} />
              {n}
            </Button>
          );
        })}
      </HStack>

      {celda.tipo === "texto" && (
        <TextoAuto
          value={celda.texto || ""}
          onChange={(v) => onChange({ ...celda, texto: v })}
          placeholder="Escribe el contenido de este bloque…"
        />
      )}

      {celda.tipo === "imagen" && (
        <VStack align="stretch" gap="2">
          <Input
            size="sm"
            placeholder="URL de la imagen (https://…)"
            value={celda.url || ""}
            onChange={(e) => onChange({ ...celda, url: e.target.value })}
            bg="bg.canvas"
          />
          <Input
            size="sm"
            placeholder="Pie de foto (opcional)"
            value={celda.pie || ""}
            onChange={(e) => onChange({ ...celda, pie: e.target.value })}
            bg="bg.canvas"
          />
          {celda.url ? (
            <Image
              src={celda.url}
              alt={celda.pie || ""}
              borderRadius="lg"
              maxH="180px"
              objectFit="cover"
              w="full"
            />
          ) : (
            <Flex
              h="90px"
              align="center"
              justify="center"
              borderRadius="lg"
              border="1px dashed"
              borderColor="border.soft"
              color="fg.subtle"
            >
              <ImageIcon size={22} />
            </Flex>
          )}
        </VStack>
      )}

      {celda.tipo === "video" && (
        <VStack align="stretch" gap="2">
          <Input
            size="sm"
            placeholder="Enlace de YouTube o Vimeo"
            value={celda.url || ""}
            onChange={(e) => onChange({ ...celda, url: e.target.value })}
            bg="bg.canvas"
          />
          {celda.url ? (
            <Box borderRadius="lg" overflow="hidden" bg="black">
              <Box
                as="iframe"
                // @ts-expect-error el iframe acepta src
                src={urlEmbed(celda.url)}
                w="full"
                h="170px"
                border="0"
                allowFullScreen
              />
            </Box>
          ) : (
            <Flex
              h="90px"
              align="center"
              justify="center"
              borderRadius="lg"
              border="1px dashed"
              borderColor="border.soft"
              color="fg.subtle"
            >
              <Film size={22} />
            </Flex>
          )}
        </VStack>
      )}
    </VStack>
  );
}

interface Props {
  bloques: Bloque[];
  onChange: (b: Bloque[]) => void;
}

/** Editor del cuerpo del artículo: bloques de una o dos columnas. */
export function EditorArticulo({ bloques, onChange }: Props) {
  const [foco, setFoco] = useState<number | null>(null);

  const set = (i: number, b: Bloque) => onChange(bloques.map((x, j) => (j === i ? b : x)));
  const quitar = (i: number) => onChange(bloques.filter((_, j) => j !== i));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= bloques.length) return;
    const copia = [...bloques];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };
  const agregar = (columnas: 1 | 2) =>
    onChange([
      ...bloques,
      { columnas, celdas: Array.from({ length: columnas }, () => ({ ...CELDA_VACIA })) },
    ]);

  const cambiarColumnas = (i: number, columnas: 1 | 2) => {
    const b = bloques[i];
    const celdas =
      columnas === 2
        ? [b.celdas[0] ?? { ...CELDA_VACIA }, b.celdas[1] ?? { ...CELDA_VACIA }]
        : [b.celdas[0] ?? { ...CELDA_VACIA }];
    set(i, { columnas, celdas });
  };

  return (
    <VStack align="stretch" gap="3">
      {bloques.length === 0 && (
        <Flex
          py="10"
          direction="column"
          align="center"
          gap="2"
          borderRadius="xl"
          border="1px dashed"
          borderColor="border.soft"
        >
          <Text fontSize="sm" color="fg.muted">
            El artículo está vacío
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            Agrega un bloque de una o dos columnas para empezar
          </Text>
        </Flex>
      )}

      {bloques.map((b, i) => (
        <Box
          key={i}
          bg="bg.elevated"
          border="1px solid"
          borderColor={foco === i ? "border.brand" : "border.soft"}
          borderRadius="xl"
          p="4"
          transition="border-color 0.15s"
          onFocusCapture={() => setFoco(i)}
        >
          {/* Barra del bloque */}
          <HStack justify="space-between" mb="3">
            <HStack gap="1">
              <Button
                size="2xs"
                borderRadius="full"
                px="2.5"
                bg={b.columnas === 1 ? "brandBlue.50" : "bg.muted"}
                color={b.columnas === 1 ? "brandBlue.700" : "fg.subtle"}
                onClick={() => cambiarColumnas(i, 1)}
              >
                <Square size={11} style={{ marginRight: 4 }} />1 columna
              </Button>
              <Button
                size="2xs"
                borderRadius="full"
                px="2.5"
                bg={b.columnas === 2 ? "brandBlue.50" : "bg.muted"}
                color={b.columnas === 2 ? "brandBlue.700" : "fg.subtle"}
                onClick={() => cambiarColumnas(i, 2)}
              >
                <Columns2 size={11} style={{ marginRight: 4 }} />2 columnas
              </Button>
            </HStack>
            <HStack gap="0">
              <IconButton
                aria-label="Subir bloque"
                size="2xs"
                variant="ghost"
                color="fg.subtle"
                disabled={i === 0}
                onClick={() => mover(i, -1)}
              >
                <ArrowUp size={14} />
              </IconButton>
              <IconButton
                aria-label="Bajar bloque"
                size="2xs"
                variant="ghost"
                color="fg.subtle"
                disabled={i === bloques.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown size={14} />
              </IconButton>
              <IconButton
                aria-label="Quitar bloque"
                size="2xs"
                variant="ghost"
                color="fg.subtle"
                onClick={() => quitar(i)}
                _hover={{ color: "deepBlue.600" }}
              >
                <Trash2 size={14} />
              </IconButton>
            </HStack>
          </HStack>

          {/* Celdas */}
          <Grid templateColumns={b.columnas === 2 ? { base: "1fr", md: "1fr 1fr" } : "1fr"} gap="4">
            {b.celdas.map((c, ci) => (
              <EditorCelda
                key={ci}
                celda={c}
                onChange={(nc) =>
                  set(i, { ...b, celdas: b.celdas.map((x, j) => (j === ci ? nc : x)) })
                }
              />
            ))}
          </Grid>
        </Box>
      ))}

      <HStack gap="2">
        <Button size="sm" h="9" px="5" borderRadius="full" fontWeight="700" variant="outline" borderColor="border.soft" onClick={() => agregar(1)}>
          <Plus size={14} style={{ marginRight: 4 }} />
          Bloque de 1 columna
        </Button>
        <Button size="sm" h="9" px="5" borderRadius="full" fontWeight="700" variant="outline" borderColor="border.soft" onClick={() => agregar(2)}>
          <Plus size={14} style={{ marginRight: 4 }} />
          Bloque de 2 columnas
        </Button>
      </HStack>
    </VStack>
  );
}

