// El pedido: lo que se guarda cuando alguien compra, y sus estados.
//
// Un pedido guarda copia de todo lo que compró —título, opciones y precios— en
// vez de referencias al catálogo. Si mañana sube el precio del marco premium o
// se retira una foto, el pedido de la semana pasada tiene que seguir diciendo
// lo que efectivamente se cobró.
import type { Linea } from "./catalogo";

export type Estado =
  | "pendiente_pago"
  | "pagado"
  | "en_produccion"
  | "listo"
  | "despachado"
  | "entregado"
  | "anulado";

export const ESTADOS: { id: Estado; nombre: string; color: string }[] = [
  { id: "pendiente_pago", nombre: "Pendiente de pago", color: "estado.espera" },
  { id: "pagado", nombre: "Pagado", color: "estado.ok" },
  { id: "en_produccion", nombre: "En producción", color: "estado.curso" },
  { id: "listo", nombre: "Listo para entrega", color: "estado.curso" },
  { id: "despachado", nombre: "Despachado", color: "estado.ok" },
  { id: "entregado", nombre: "Entregado", color: "estado.ok" },
  { id: "anulado", nombre: "Anulado", color: "estado.alerta" },
];

export const estadoDe = (id: string) => ESTADOS.find((e) => e.id === id) ?? ESTADOS[0];

/** Qué se le muestra a quien compró, que no necesita el vocabulario interno. */
export const MENSAJE_ESTADO: Record<Estado, string> = {
  pendiente_pago: "Esperamos tu transferencia para empezar.",
  pagado: "Recibimos tu pago. Tu pedido entra a producción.",
  en_produccion: "Estamos imprimiendo y enmarcando tu obra.",
  listo: "Tu pedido está listo.",
  despachado: "Tu pedido va en camino.",
  entregado: "Entregado. Gracias por llevarte una obra.",
  anulado: "Este pedido fue anulado.",
};

/** Una copia comprada, con el detalle congelado al momento de la compra. */
export interface ItemPedido {
  fotoId: string;
  titulo: string;
  imagen: string;
  /** Precio de la obra, sin opciones. */
  base: number;
  /** Papel, tamaño, marco y vidrio con el precio que tenían ese día. */
  lineas: Linea[];
  unitario: number;
  cantidad: number;
  total: number;
}

export interface Cliente {
  nombre: string;
  email: string;
  telefono?: string;
  rut?: string;
}

export interface Entrega {
  modo: "retiro" | "despacho";
  region?: string;
  comuna?: string;
  direccion?: string;
  costo: number;
}

export interface Pedido {
  pedidoId: string;
  /** Número legible que se usa al transferir y al escribir: FF-0042. */
  numero: string;
  creado: string;
  estado: Estado;
  cliente: Cliente;
  entrega: Entrega;
  items: ItemPedido[];
  subtotal: number;
  envio: number;
  total: number;
  nota?: string;
  historial?: { estado: Estado; fecha: string; quien?: string }[];
}
