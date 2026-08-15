// Secciones del panel, en un módulo propio para que las use tanto el panel como
// el menú de sesión del sitio. Si vivieran dentro del panel, el sitio tendría
// que importarlo entero solo para dibujar un menú.
import { Image, LayoutDashboard, Package, SlidersHorizontal, Store, Users } from "lucide-react";

export interface Seccion {
  /** Valor de la pestaña, y también el sufijo de #/admin/… */
  v: string;
  n: string;
  i: typeof LayoutDashboard;
  soloAdmin?: boolean;
}

export const SECCIONES: Seccion[] = [
  { v: "resumen", n: "Resumen", i: LayoutDashboard },
  { v: "pedidos", n: "Pedidos", i: Package },
  { v: "obras", n: "Obras", i: Image },
  { v: "opciones", n: "Opciones y precios", i: SlidersHorizontal },
  { v: "tienda", n: "Tienda", i: Store },
  { v: "usuarios", n: "Usuarios", i: Users, soloAdmin: true },
];

/**
 * Las secciones que corresponden al rol. Una sola fuente para las pestañas del
 * panel y para el menú del sitio: así no se pueden desincronizar.
 */
export const seccionesDe = (esAdmin: boolean) =>
  SECCIONES.filter((s) => esAdmin || !s.soloAdmin);
