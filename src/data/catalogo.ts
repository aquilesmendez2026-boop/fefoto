// Modelo del catálogo de fefoto: la obra, las cuatro listas de opciones y el
// precio que sale de combinarlas.
//
// Vive aparte de la API a propósito. Estas reglas las usan la ficha de la obra,
// el carrito, el resumen del pedido y el panel; si estuvieran metidas dentro de
// una pantalla, la siguiente que necesitara un precio lo volvería a calcular a
// su manera y tarde o temprano darían distinto.
import type { Bloque } from "../molecules/ArticuloRender";

/** Las cuatro listas que personalizan una copia. El orden es el del flujo. */
export const GRUPOS = ["papel", "tamano", "marco", "vidrio"] as const;
export type Grupo = (typeof GRUPOS)[number];

export const NOMBRE_GRUPO: Record<Grupo, string> = {
  papel: "Papel",
  tamano: "Tamaño",
  marco: "Marco",
  vidrio: "Vidrio",
};

/**
 * Una opción de cualquiera de las cuatro listas.
 *
 * Es un solo tipo con campos opcionales y no cuatro tipos distintos porque
 * todas viven en la misma tabla y el panel las edita con el mismo formulario.
 * Los campos propios de cada grupo (`anchoCm` en tamaño, `color` en marco) solo
 * los lee quien corresponde.
 */
export interface Opcion {
  grupo: Grupo;
  id: string;
  nombre: string;
  descripcion?: string;
  /** Lo que suma al precio de la obra, en pesos. Puede ser 0. */
  extra: number;
  orden?: number;
  activa?: boolean;
  /**
   * Ids de opciones de otros grupos con las que no se puede combinar. Basta
   * declararlo en un lado: la comprobación mira en las dos direcciones, para
   * que nadie tenga que acordarse de escribirlo dos veces.
   */
  incompatibles?: string[];

  // ── Tamaño ──
  anchoCm?: number;
  altoCm?: number;

  // ── Marco ──
  /** Color de la moldura en la vista previa. */
  color?: string;
  /** Ancho de la moldura en mm; da el grosor del marco simulado. */
  grosorMm?: number;
  /** Paspartú (el borde de cartón entre la foto y la moldura), en mm. */
  paspartuMm?: number;
  /** La opción "sin marco": la copia va sola, y por eso no admite vidrio. */
  sinMarco?: boolean;

  // ── Vidrio ──
  /** Cuánto refleja, de 0 a 1. Solo alimenta el brillo de la vista previa. */
  reflejo?: number;

  // ── Papel ──
  acabado?: "brillante" | "satinado" | "mate" | "texturado";
}

/** Tirada numerada de una obra. Ausente = copias sin límite. */
export interface Edicion {
  total: number;
  vendidas: number;
}

export interface Foto {
  id: string;
  titulo: string;
  /** Una obra puede estar en varias categorías a la vez. */
  categorias: string[];
  /** Una o dos líneas, las que se leen bajo el título. */
  descripcion?: string;
  /** La historia larga, opcional, con párrafos e imágenes. */
  historia?: Bloque[];
  /** Versión web con marca de agua. El original nunca se publica. */
  imagen: string;
  /** Proporción de la versión web, para reservar el espacio antes de cargarla. */
  ancho?: number;
  alto?: number;
  precioBase: number;
  anio?: string;
  lugar?: string;
  destacada?: boolean;
  orden?: number;
  activa?: boolean;
  edicion?: Edicion;
}

/** Lo que eligió quien compra: un id por cada lista. */
export interface Configuracion {
  papel: string;
  tamano: string;
  marco: string;
  vidrio: string;
}

/** Costo de despacho a una región. El retiro es siempre sin costo. */
export interface Region {
  id: string;
  nombre: string;
  costo: number;
  activa?: boolean;
}

/** Datos del negocio, editables desde el panel. */
export interface Tienda {
  nombre: string;
  bajada: string;
  correo: string;
  telefono: string;
  whatsapp: string;
  instagram: string;
  /** Dónde se retira, y en qué horario. */
  retiro: string;
  /** Días hábiles que toma producir un pedido; se muestra al comprar. */
  diasProduccion: number;
  /** Cuenta para transferir. Se envía en el correo del pedido. */
  banco: {
    titular: string;
    rut: string;
    banco: string;
    tipo: string;
    numero: string;
    correo: string;
  };
}

// ───────── Compatibilidad entre opciones ─────────

/**
 * Si dos opciones pueden ir juntas. La incompatibilidad es simétrica aunque
 * esté escrita en un solo lado, y "sin marco" excluye cualquier vidrio sin que
 * haya que declararlo obra por obra: sin moldura no hay dónde apoyarlo.
 */
export function sonCompatibles(a: Opcion, b: Opcion): boolean {
  if (a.grupo === b.grupo) return true;
  if (a.incompatibles?.includes(b.id) || b.incompatibles?.includes(a.id)) return false;
  const marco = a.grupo === "marco" ? a : b.grupo === "marco" ? b : null;
  const vidrio = a.grupo === "vidrio" ? a : b.grupo === "vidrio" ? b : null;
  if (marco?.sinMarco && vidrio && (vidrio.extra > 0 || !esNinguno(vidrio))) return false;
  return true;
}

/** La opción "sin vidrio" / "sin marco": la que no agrega nada. */
const esNinguno = (o: Opcion) => o.sinMarco === true || /^sin[-_ ]/i.test(o.id);

/** Las opciones activas de un grupo, en el orden en que las puso el panel. */
export const opcionesDe = (opciones: Opcion[], grupo: Grupo): Opcion[] =>
  opciones
    .filter((o) => o.grupo === grupo && o.activa !== false)
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.extra - b.extra);

/**
 * Si una opción se puede elegir dado lo ya elegido en los otros grupos.
 *
 * Se ignora el propio grupo: elegir otro tamaño nunca puede estar bloqueado por
 * el tamaño actual. Así el configurador deshabilita en vez de esconder, y quien
 * compra ve que la opción existe aunque hoy no le sirva.
 */
export function disponible(
  opcion: Opcion,
  seleccion: Partial<Configuracion>,
  opciones: Opcion[]
): boolean {
  return GRUPOS.filter((g) => g !== opcion.grupo).every((g) => {
    const otra = opciones.find((o) => o.id === seleccion[g]);
    return !otra || sonCompatibles(opcion, otra);
  });
}

/**
 * Arregla una selección que quedó inválida al cambiar una opción.
 *
 * Pasa todo el tiempo: alguien elige marco premium con vidrio antirreflejo y
 * después se pasa a "sin marco". En vez de mostrar un error, se mueve el vidrio
 * a la primera opción que sí calce. Devuelve la selección corregida y los
 * grupos que hubo que tocar, para poder avisarlo.
 */
export function ajustar(
  seleccion: Configuracion,
  cambiado: Grupo,
  opciones: Opcion[]
): { seleccion: Configuracion; ajustados: Grupo[] } {
  const fija = { ...seleccion };
  const ajustados: Grupo[] = [];
  for (const g of GRUPOS) {
    if (g === cambiado) continue;
    const actual = opciones.find((o) => o.id === fija[g]);
    if (actual && disponible(actual, fija, opciones)) continue;
    const reemplazo = opcionesDe(opciones, g).find((o) => disponible(o, fija, opciones));
    if (reemplazo) {
      fija[g] = reemplazo.id;
      ajustados.push(g);
    }
  }
  return { seleccion: fija, ajustados };
}

/** La primera combinación válida: con la que abre el configurador. */
export function seleccionInicial(opciones: Opcion[]): Configuracion {
  const sel = {} as Configuracion;
  for (const g of GRUPOS) {
    const lista = opcionesDe(opciones, g);
    sel[g] = (lista.find((o) => disponible(o, sel, opciones)) ?? lista[0])?.id ?? "";
  }
  return sel;
}

// ───────── Precio ─────────

export interface Linea {
  grupo: Grupo;
  id: string;
  nombre: string;
  extra: number;
}

export interface Detalle {
  base: number;
  lineas: Linea[];
  total: number;
}

/**
 * Precio de una copia: la obra más lo que suma cada opción.
 *
 * Modelo aditivo, que es el que se eligió: es el único que se puede editar
 * desde el panel sin mantener una tabla de cientos de combinaciones, y el único
 * que se le puede explicar al cliente en el desglose que ve al comprar.
 */
export function calcularPrecio(
  foto: Pick<Foto, "precioBase">,
  seleccion: Partial<Configuracion>,
  opciones: Opcion[]
): Detalle {
  const lineas: Linea[] = [];
  for (const g of GRUPOS) {
    const o = opciones.find((x) => x.id === seleccion[g] && x.grupo === g);
    if (o) lineas.push({ grupo: g, id: o.id, nombre: o.nombre, extra: o.extra });
  }
  const base = foto.precioBase || 0;
  return { base, lineas, total: base + lineas.reduce((s, l) => s + l.extra, 0) };
}

/**
 * La combinación válida más barata: el "desde $…" de la galería.
 *
 * Se prueban todas las combinaciones en vez de sumar el mínimo de cada lista
 * porque el mínimo de cada una puede no ser combinable con el de las otras, y
 * ahí el "desde" quedaría por debajo de cualquier precio real. Son unos pocos
 * cientos de combinaciones: se calcula en microsegundos.
 */
export function precioDesde(foto: Pick<Foto, "precioBase">, opciones: Opcion[]): number {
  const [papeles, tamanos, marcos, vidrios] = GRUPOS.map((g) => opcionesDe(opciones, g));
  let min = Infinity;
  for (const p of papeles)
    for (const t of tamanos)
      for (const m of marcos) {
        if (!sonCompatibles(p, t) || !sonCompatibles(p, m) || !sonCompatibles(t, m)) continue;
        for (const v of vidrios) {
          if (!sonCompatibles(p, v) || !sonCompatibles(t, v) || !sonCompatibles(m, v)) continue;
          min = Math.min(min, foto.precioBase + p.extra + t.extra + m.extra + v.extra);
        }
      }
  return min === Infinity ? foto.precioBase : min;
}

// ───────── Formato ─────────

const FORMATO_CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Precio en pesos chilenos: $38.000, sin decimales. */
export const clp = (n: number) => FORMATO_CLP.format(Math.round(n || 0));

/** "30 × 40 cm" a partir de la opción de tamaño. */
export const medidas = (t?: Opcion) =>
  t?.anchoCm && t?.altoCm ? `${t.anchoCm} × ${t.altoCm} cm` : (t?.nombre ?? "");
