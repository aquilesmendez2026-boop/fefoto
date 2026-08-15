// Catálogo de arranque.
//
// Cumple dos papeles: es lo que carga `aws/seed.mjs` en la tabla la primera vez,
// y es el respaldo que muestra el sitio si la API no responde, para que nunca
// se vea una galería vacía. Todo esto se edita después desde el panel; los
// valores de acá son un punto de partida razonable, no una decisión cerrada.
//
// PENDIENTE DE LA CLIENTA: las cuatro listas, los precios y las fotos reales.
import type { Foto, Opcion, Region, Tienda } from "./catalogo";

export const CATEGORIAS = ["Abstracta", "Música", "Naturaleza", "Sombra"];

export const OPCIONES: Opcion[] = [
  // ── Papel ──
  {
    grupo: "papel",
    id: "cuche",
    nombre: "Cuché mate",
    descripcion: "Papel liso de gramaje medio. La opción de entrada.",
    extra: 0,
    orden: 1,
    acabado: "mate",
  },
  {
    grupo: "papel",
    id: "foto-brillante",
    nombre: "Fotográfico brillante",
    descripcion: "Negros profundos y color saturado. Refleja bajo luz directa.",
    extra: 6000,
    orden: 2,
    acabado: "brillante",
  },
  {
    grupo: "papel",
    id: "foto-mate",
    nombre: "Fotográfico mate",
    descripcion: "Sin reflejo, con más textura. El favorito para blanco y negro.",
    extra: 8000,
    orden: 3,
    acabado: "satinado",
  },
  {
    grupo: "papel",
    id: "algodon",
    nombre: "Algodón fine art 310 g",
    descripcion: "Papel de museo, libre de ácido. Dura décadas sin virar.",
    extra: 22000,
    orden: 4,
    acabado: "texturado",
  },

  // ── Tamaño ──
  { grupo: "tamano", id: "20x30", nombre: "20 × 30 cm", extra: 0, orden: 1, anchoCm: 20, altoCm: 30 },
  { grupo: "tamano", id: "30x40", nombre: "30 × 40 cm", extra: 12000, orden: 2, anchoCm: 30, altoCm: 40 },
  { grupo: "tamano", id: "40x60", nombre: "40 × 60 cm", extra: 28000, orden: 3, anchoCm: 40, altoCm: 60 },
  { grupo: "tamano", id: "50x70", nombre: "50 × 70 cm", extra: 45000, orden: 4, anchoCm: 50, altoCm: 70 },
  {
    grupo: "tamano",
    id: "60x90",
    nombre: "60 × 90 cm",
    descripcion: "Formato grande. Necesita marco reforzado y acrílico.",
    extra: 72000,
    orden: 5,
    anchoCm: 60,
    altoCm: 90,
    // Ejemplo de restricción real: a este tamaño la moldura básica se pandea y
    // el vidrio común pesa demasiado para colgarlo con seguridad.
    incompatibles: ["basico", "comun"],
  },

  // ── Marco ──
  //
  // El orden no es por precio sino por lo que se vende: fefoto vende cuadros,
  // así que la lista abre con el marco de entrada y no con "sin marco". Eso
  // decide además con qué se abre el configurador, que es lo primero que ve
  // quien entra a una obra. El "desde $…" de la galería sigue siendo el mínimo
  // real, porque se calcula probando las combinaciones, no leyendo esta lista.
  {
    grupo: "marco",
    id: "sin-marco",
    nombre: "Sin marco",
    descripcion: "Solo la copia, enrollada en tubo rígido.",
    extra: 0,
    orden: 4,
    sinMarco: true,
  },
  {
    grupo: "marco",
    id: "basico",
    nombre: "Básico",
    descripcion: "Moldura delgada de pino lacado en negro.",
    extra: 18000,
    orden: 1,
    color: "#141412",
    grosorMm: 15,
    paspartuMm: 0,
  },
  {
    grupo: "marco",
    id: "profesional",
    nombre: "Profesional",
    descripcion: "Aluminio anodizado con paspartú blanco de museo.",
    extra: 34000,
    orden: 2,
    color: "#8d8f92",
    grosorMm: 20,
    paspartuMm: 40,
  },
  {
    grupo: "marco",
    id: "premium",
    nombre: "Premium",
    descripcion: "Madera de nogal maciza y paspartú ancho.",
    extra: 62000,
    orden: 3,
    color: "#4a3323",
    grosorMm: 32,
    paspartuMm: 60,
  },

  // ── Vidrio ──
  {
    grupo: "vidrio",
    id: "sin-vidrio",
    nombre: "Sin vidrio",
    descripcion: "La copia queda a la vista, sin nada delante.",
    extra: 0,
    orden: 1,
    reflejo: 0,
  },
  {
    grupo: "vidrio",
    id: "comun",
    nombre: "Vidrio común",
    descripcion: "Protege del polvo. Refleja la luz de la sala.",
    extra: 9000,
    orden: 2,
    reflejo: 0.35,
  },
  {
    grupo: "vidrio",
    id: "acrilico",
    nombre: "Acrílico",
    descripcion: "Liviano e irrompible. Ideal en formatos grandes.",
    extra: 19000,
    orden: 3,
    reflejo: 0.22,
  },
  {
    grupo: "vidrio",
    id: "antirreflejo",
    nombre: "Antirreflejo museo",
    descripcion: "Casi invisible y filtra UV. Lo que se usa en galerías.",
    extra: 24000,
    orden: 4,
    reflejo: 0.06,
  },
];

/** Costos de despacho. El retiro no aparece acá: siempre es sin costo. */
export const REGIONES: Region[] = [
  { id: "rm", nombre: "Región Metropolitana", costo: 4990 },
  { id: "valparaiso", nombre: "Valparaíso", costo: 6990 },
  { id: "ohiggins", nombre: "O'Higgins", costo: 6990 },
  { id: "maule", nombre: "Maule", costo: 7990 },
  { id: "nuble", nombre: "Ñuble", costo: 7990 },
  { id: "biobio", nombre: "Biobío", costo: 7990 },
  { id: "araucania", nombre: "La Araucanía", costo: 8990 },
  { id: "losrios", nombre: "Los Ríos", costo: 8990 },
  { id: "loslagos", nombre: "Los Lagos", costo: 9990 },
  { id: "coquimbo", nombre: "Coquimbo", costo: 7990 },
  { id: "atacama", nombre: "Atacama", costo: 9990 },
  { id: "antofagasta", nombre: "Antofagasta", costo: 10990 },
  { id: "tarapaca", nombre: "Tarapacá", costo: 11990 },
  { id: "arica", nombre: "Arica y Parinacota", costo: 11990 },
  { id: "aysen", nombre: "Aysén", costo: 14990 },
  { id: "magallanes", nombre: "Magallanes", costo: 14990 },
];

export const TIENDA: Tienda = {
  nombre: "fefoto",
  bajada: "Fotografía de autor, impresa y enmarcada para tu pared.",
  correo: "hola@fefoto.cl",
  telefono: "",
  whatsapp: "",
  instagram: "",
  retiro: "Coordinamos el retiro por WhatsApp una vez que el pedido está listo.",
  diasProduccion: 7,
  banco: {
    titular: "",
    rut: "",
    banco: "",
    tipo: "Cuenta corriente",
    numero: "",
    correo: "",
  },
};

/**
 * Obras de muestra, con imágenes de relleno.
 *
 * Están para poder ver y probar el sitio antes de que existan las fotos reales.
 * En cuanto se suba la primera obra desde el panel, estas desaparecen: solo se
 * usan cuando la API no devuelve ninguna.
 */
export const FOTOS: Foto[] = [
  {
    id: "sombra-04",
    titulo: "Sombra n.º 4",
    categorias: ["Sombra", "Abstracta"],
    descripcion: "Una escalera al mediodía, cuando la luz dibuja más que el objeto.",
    imagen: "https://picsum.photos/seed/fefoto-sombra4/1200/1600",
    ancho: 1200,
    alto: 1600,
    precioBase: 32000,
    anio: "2024",
    lugar: "Valparaíso",
    destacada: true,
    orden: 1,
  },
  {
    id: "cuerdas",
    titulo: "Cuerdas",
    categorias: ["Música"],
    descripcion: "El contrabajo esperando su turno, entre dos movimientos.",
    imagen: "https://picsum.photos/seed/fefoto-cuerdas/1600/1200",
    ancho: 1600,
    alto: 1200,
    precioBase: 28000,
    anio: "2023",
    orden: 2,
  },
  {
    id: "niebla-alta",
    titulo: "Niebla alta",
    categorias: ["Naturaleza"],
    descripcion: "La cordillera aparece y desaparece en menos de un minuto.",
    imagen: "https://picsum.photos/seed/fefoto-niebla/1200/1600",
    ancho: 1200,
    alto: 1600,
    precioBase: 35000,
    anio: "2024",
    lugar: "Cajón del Maipo",
    destacada: true,
    orden: 3,
  },
  {
    id: "compas",
    titulo: "Compás",
    categorias: ["Música", "Abstracta"],
    descripcion: "Manos, metal y el instante justo antes del golpe.",
    imagen: "https://picsum.photos/seed/fefoto-compas/1400/1400",
    ancho: 1400,
    alto: 1400,
    precioBase: 30000,
    anio: "2023",
    orden: 4,
  },
  {
    id: "raiz",
    titulo: "Raíz",
    categorias: ["Naturaleza", "Abstracta"],
    descripcion: "Lo que sostiene al árbol, visto desde muy cerca.",
    imagen: "https://picsum.photos/seed/fefoto-raiz/1600/1200",
    ancho: 1600,
    alto: 1200,
    precioBase: 29000,
    anio: "2022",
    orden: 5,
    edicion: { total: 25, vendidas: 4 },
  },
  {
    id: "reja",
    titulo: "Reja",
    categorias: ["Sombra"],
    descripcion: "Una tarde entera proyectada sobre el muro de enfrente.",
    imagen: "https://picsum.photos/seed/fefoto-reja/1200/1500",
    ancho: 1200,
    alto: 1500,
    precioBase: 27000,
    anio: "2024",
    orden: 6,
  },
];
