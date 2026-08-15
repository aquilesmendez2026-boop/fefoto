// El carrito, guardado en el navegador.
//
// No vive en un contexto de React sino en un módulo con suscriptores, y las
// pantallas se enganchan con `useSyncExternalStore`. Así el contador del navbar,
// el cajón lateral y la página del carrito leen exactamente el mismo estado sin
// tener que envolver la app en otro proveedor, y sobrevive a recargar la
// página: quien configuró tres cuadros y cerró sin querer, los encuentra ahí.
import { useSyncExternalStore } from "react";
import type { Configuracion, Foto, Opcion } from "./catalogo";
import { calcularPrecio } from "./catalogo";

const CLAVE = "fefoto_carrito";

export interface ItemCarrito extends Configuracion {
  fotoId: string;
  cantidad: number;
}

/**
 * Identidad de una línea: la obra más su configuración exacta.
 *
 * Agregar dos veces la misma foto con el mismo marco suma cantidad; con otro
 * tamaño abre una línea nueva, porque son dos productos distintos.
 */
export const claveItem = (i: ItemCarrito) =>
  [i.fotoId, i.papel, i.tamano, i.marco, i.vidrio].join("|");

let items: ItemCarrito[] = leerGuardado();
const suscriptores = new Set<() => void>();

function leerGuardado(): ItemCarrito[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(bruto) ? bruto.filter((i) => i?.fotoId && i?.cantidad > 0) : [];
  } catch {
    return [];
  }
}

function guardar(nuevos: ItemCarrito[]) {
  items = nuevos;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    /* modo privado o cuota llena: el carrito sigue vivo en memoria */
  }
  suscriptores.forEach((f) => f());
}

const suscribir = (f: () => void) => {
  suscriptores.add(f);
  // Otra pestaña del mismo sitio también puede tocar el carrito.
  const alCambiar = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      items = leerGuardado();
      f();
    }
  };
  window.addEventListener("storage", alCambiar);
  return () => {
    suscriptores.delete(f);
    window.removeEventListener("storage", alCambiar);
  };
};

/** Máximo por línea. Evita el dedo pegado en el "+" y pedidos absurdos. */
const MAX = 20;

export function agregar(item: Omit<ItemCarrito, "cantidad">, cantidad = 1) {
  const nuevo = { ...item, cantidad };
  const clave = claveItem(nuevo);
  const existente = items.find((i) => claveItem(i) === clave);
  guardar(
    existente
      ? items.map((i) =>
          claveItem(i) === clave ? { ...i, cantidad: Math.min(MAX, i.cantidad + cantidad) } : i
        )
      : [...items, nuevo]
  );
}

export function cambiarCantidad(clave: string, cantidad: number) {
  guardar(
    cantidad <= 0
      ? items.filter((i) => claveItem(i) !== clave)
      : items.map((i) => (claveItem(i) === clave ? { ...i, cantidad: Math.min(MAX, cantidad) } : i))
  );
}

export const quitar = (clave: string) => cambiarCantidad(clave, 0);

export const vaciar = () => guardar([]);

/** El carrito crudo. Para pintarlo hace falta cruzarlo con el catálogo. */
export const useCarrito = () =>
  useSyncExternalStore(
    suscribir,
    () => items,
    () => items
  );

/** Cuántas copias hay en total: el número del globito del navbar. */
export const useTotalItems = () =>
  useSyncExternalStore(
    suscribir,
    () => items.reduce((s, i) => s + i.cantidad, 0),
    () => 0
  );

/** Una línea del carrito ya cruzada con el catálogo y con su precio resuelto. */
export interface LineaCarrito {
  clave: string;
  item: ItemCarrito;
  foto: Foto;
  detalle: ReturnType<typeof calcularPrecio>;
  total: number;
}

/**
 * Cruza el carrito guardado con el catálogo de ahora.
 *
 * Las líneas cuya obra u opción ya no existe se descartan en silencio: un
 * carrito de hace un mes puede apuntar a una foto retirada, y es mejor que
 * desaparezca a que el checkout falle al final con un error incomprensible.
 */
export function resolver(
  items: ItemCarrito[],
  fotos: Foto[],
  opciones: Opcion[]
): LineaCarrito[] {
  return items.flatMap((item) => {
    const foto = fotos.find((f) => f.id === item.fotoId && f.activa !== false);
    if (!foto) return [];
    const detalle = calcularPrecio(foto, item, opciones);
    if (detalle.lineas.length < 4) return [];
    return [
      {
        clave: claveItem(item),
        item,
        foto,
        detalle,
        total: detalle.total * item.cantidad,
      },
    ];
  });
}
