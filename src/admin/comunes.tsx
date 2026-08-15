import { Text } from "@chakra-ui/react";

export const pad = (n: number) => String(n).padStart(2, "0");

export const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** El mes en curso como YYYY-MM: la partición con que se guardan los pedidos. */
export const mesActual = () => hoy().slice(0, 7);

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-08" → "agosto 2026". */
export const nombreMes = (mes: string) => {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? ""} ${a}`;
};

/** Los últimos `n` meses, del más reciente al más antiguo. */
export function ultimosMeses(n = 12): string[] {
  const d = new Date();
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    return `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
  });
}

/** Estilo común de los campos del panel, para no repetirlo en cada vista. */
export const campo = {
  bg: "bg.canvas",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "md",
  h: "10",
  fontSize: "sm",
  _hover: { borderColor: "border.soft" },
  _focus: { borderColor: "border.brand", outline: "none" },
} as const;

export const Etiqueta = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="fg.subtle" mb="1.5">
    {children}
  </Text>
);
