// Cliente de la API pública de fefoto (AWS: API Gateway + Lambda + DynamoDB).
import { API } from "./apiBase";
import type { Foto, Opcion, Region, Tienda } from "./catalogo";
import type { Cliente, Entrega, Pedido } from "./pedido";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

// ───────── Catálogo ─────────

export interface Catalogo {
  fotos: Foto[];
  opciones: Opcion[];
  regiones: Region[];
  tienda: Tienda;
}

/**
 * Todo el catálogo en una sola llamada.
 *
 * Son unos pocos kilobytes y prácticamente cada pantalla los necesita: la
 * galería filtra por categoría, la ficha arma el configurador y el carrito
 * recalcula precios. Pedirlo por partes serían cuatro viajes para mostrar la
 * portada, y encima habría que coordinar cuál llegó primero.
 */
export const getCatalogo = () => get<Catalogo>("/catalogo");

/** Una sola descarga compartida por toda la app. */
let catalogoPromise: Promise<Catalogo> | null = null;

export const cargarCatalogo = () => {
  if (!catalogoPromise) catalogoPromise = getCatalogo();
  return catalogoPromise;
};

/** Fuerza una recarga (lo usa el panel después de guardar). */
export const olvidarCatalogo = () => {
  catalogoPromise = null;
};

// ───────── Pedidos ─────────

/** Lo que manda el carrito: ids, no precios. Los precios los pone el backend. */
export interface ItemNuevo {
  fotoId: string;
  papel: string;
  tamano: string;
  marco: string;
  vidrio: string;
  cantidad: number;
}

export interface PedidoNuevo {
  cliente: Cliente;
  entrega: Entrega;
  items: ItemNuevo[];
  nota?: string;
}

export interface RespuestaPedido {
  ok: boolean;
  error?: string;
  pedidoId?: string;
  numero?: string;
  total?: number;
}

/**
 * Crea el pedido. El navegador manda qué se eligió, nunca cuánto cuesta: el
 * backend vuelve a calcular el total con sus propios precios. Si no, bastaría
 * con editar la petición para comprar un cuadro de $60.000 en $1.
 */
export async function crearPedido(datos: PedidoNuevo): Promise<RespuestaPedido> {
  try {
    const res = await fetch(`${API}/pedidos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(datos),
    });
    return (await res.json()) as RespuestaPedido;
  } catch {
    return { ok: false, error: "sin_conexion" };
  }
}

/**
 * Un pedido por su id, para la página de seguimiento.
 *
 * El id es un uuid que solo conoce quien compró (le llega por correo y queda en
 * la url de confirmación), así que hace de llave sin obligar a crear cuenta.
 */
export const getPedido = (pedidoId: string) =>
  get<{ pedido: Pedido }>(`/pedidos/${encodeURIComponent(pedidoId)}`).then((r) => r.pedido);

// ───────── Analítica propia (sin cookies, sin terceros) ─────────

const ID_VISITANTE_KEY = "fefoto_vid";

/**
 * Id anónimo y estable en este navegador, para contar visitantes únicos sin
 * cookies. No está asociado a ningún dato personal.
 */
export function idVisitante(): string {
  try {
    let id = localStorage.getItem(ID_VISITANTE_KEY);
    if (!id) {
      id = crypto.randomUUID().slice(0, 12);
      localStorage.setItem(ID_VISITANTE_KEY, id);
    }
    return id;
  } catch {
    return ""; // navegación privada u otro bloqueo: se registra igual, sin id
  }
}

/** De dónde llegó el visitante. La navegación dentro del sitio es directo. */
function origen(): string {
  if (!document.referrer) return "directo";
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? "directo" : host;
  } catch {
    return "directo";
  }
}

/** Envío común de analítica: nunca bloquea ni afecta la navegación. */
function enviarAnalitica(datos: { ruta: string } | { evento: string; obra?: string }) {
  const disp = window.matchMedia("(max-width: 768px)").matches ? "movil" : "escritorio";
  fetch(`${API}/analitica`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...datos, ref: origen(), disp, visitanteId: idVisitante() }),
  }).catch(() => {});
}

export const registrarVisita = (ruta: string) => enviarAnalitica({ ruta });

/**
 * El embudo de la tienda: mirar una obra, configurarla, agregarla, comprar.
 * Es lo que después responde "de cada cien que miran, cuántas compran".
 */
export type Evento =
  | "obra_ver"
  | "obra_configurar"
  | "carrito_agregar"
  | "checkout_abrir"
  | "pedido_ok";

export const registrarEvento = (evento: Evento, obra?: string) =>
  enviarAnalitica({ evento, obra });
