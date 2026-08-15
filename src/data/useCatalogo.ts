import { useEffect, useState } from "react";
import { cargarCatalogo, type Catalogo } from "./api";
import { FOTOS, OPCIONES, REGIONES, TIENDA } from "./ejemplo";
import type { Foto } from "./catalogo";

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
    regiones: datos?.regiones?.length ? datos.regiones : REGIONES,
    tienda: { ...TIENDA, ...(datos?.tienda ?? {}) },
    /** true cuando lo que se ve son las obras de muestra, no las reales. */
    demo: !datos?.fotos?.length,
  };
}

/** Las categorías que existen de verdad, en el orden en que aparecen. */
export function categoriasDe(fotos: Foto[]): string[] {
  const vistas: string[] = [];
  for (const f of fotos)
    for (const c of f.categorias || []) if (c && !vistas.includes(c)) vistas.push(c);
  return vistas.sort((a, b) => a.localeCompare(b, "es"));
}

/** Solo lo publicado, en el orden del panel. */
export const visibles = (fotos: Foto[]) =>
  fotos.filter((f) => f.activa !== false).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
