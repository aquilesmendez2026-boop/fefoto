import { useEffect, useState } from "react";
import { cargarCatalogo, type Catalogo } from "./api";
import { CATEGORIAS, FOTOS, OPCIONES, REGIONES, TIENDA } from "./ejemplo";
import type { Categoria, Foto } from "./catalogo";

/**
 * El catálogo para las pantallas del sitio.
 *
 * Si la API todavía no está desplegada, o se cae, se devuelven los datos de
 * ejemplo en vez de una galería vacía: una tienda sin nada que mirar se lee
 * como una tienda cerrada. Y cada lista se completa por separado, así que una
 * respuesta a medias (con fotos pero sin opciones cargadas todavía) tampoco
 * deja el configurador inservible.
 */
export function useCatalogo() {
  const [datos, setDatos] = useState<Catalogo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    cargarCatalogo()
      .catch(() => null)
      .then((d) => {
        if (!activo) return;
        setDatos(d);
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return {
    cargando,
    fotos: datos?.fotos?.length ? datos.fotos : FOTOS,
    opciones: datos?.opciones?.length ? datos.opciones : OPCIONES,
    categorias: datos?.categorias?.length ? datos.categorias : CATEGORIAS,
    regiones: datos?.regiones?.length ? datos.regiones : REGIONES,
    tienda: { ...TIENDA, ...(datos?.tienda ?? {}) },
    /** true cuando lo que se ve son las obras de muestra, no las reales. */
    demo: !datos?.fotos?.length,
  };
}

/**
 * Las categorías que se ofrecen como filtro en la galería.
 *
 * Manda el orden del panel, no el alfabeto: la clienta decide con qué se abre
 * su sala. Solo aparecen las que tienen obras publicadas —un filtro que no
 * lleva a nada es una puerta cerrada— y al final se suman los nombres sueltos
 * que hayan quedado en alguna obra sin estar en la lista, para que ninguna obra
 * quede inalcanzable mientras se ordena el catálogo.
 */
export function categoriasVisibles(fotos: Foto[], categorias: Categoria[]): string[] {
  const usadas = new Set(fotos.flatMap((f) => f.categorias || []));
  const ordenadas = [...categorias]
    .filter((c) => c.activa !== false && usadas.has(c.nombre))
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
    .map((c) => c.nombre);

  const huerfanas = [...usadas]
    .filter((n) => n && !categorias.some((c) => c.nombre === n))
    .sort((a, b) => a.localeCompare(b, "es"));

  return [...ordenadas, ...huerfanas];
}

/** Solo lo publicado, en el orden del panel. */
export const visibles = (fotos: Foto[]) =>
  fotos.filter((f) => f.activa !== false).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
