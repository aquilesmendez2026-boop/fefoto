/**
 * Carga los datos iniciales de fefoto en DynamoDB: las cuatro listas de
 * opciones con sus precios, las regiones de despacho, la ficha de la tienda y
 * el primer usuario del panel.
 *
 * Los valores son los mismos que están en src/data/ejemplo.ts, que es lo que
 * muestra el sitio mientras la API no responde. Se repiten acá y no se importan
 * porque ese archivo es TypeScript y este script corre en Node pelado.
 *
 * No carga obras: esas se suben desde el panel, que es donde se genera la
 * versión web con marca de agua.
 *
 * Uso:
 *   AWS_PROFILE=tu-perfil AWS_REGION=us-east-2 ADMIN=tu@correo.cl node aws/seed.mjs
 *
 * Es idempotente: se puede correr de nuevo y deja los mismos valores. Ojo con
 * eso — si ya editaste precios desde el panel, volver a correrlo los pisa.
 */
import { DynamoDBClient, BatchWriteItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const db = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const TABLA_CATALOGO = "fefoto-catalogo";
const TABLA_USUARIOS = "fefoto-usuarios";

const OPCIONES = [
  // ── Papel ──
  { grupo: "papel", id: "cuche", nombre: "Cuché mate", descripcion: "Papel liso de gramaje medio. La opción de entrada.", extra: 0, orden: 1, acabado: "mate" },
  { grupo: "papel", id: "foto-brillante", nombre: "Fotográfico brillante", descripcion: "Negros profundos y color saturado. Refleja bajo luz directa.", extra: 6000, orden: 2, acabado: "brillante" },
  { grupo: "papel", id: "foto-mate", nombre: "Fotográfico mate", descripcion: "Sin reflejo, con más textura. El favorito para blanco y negro.", extra: 8000, orden: 3, acabado: "satinado" },
  { grupo: "papel", id: "algodon", nombre: "Algodón fine art 310 g", descripcion: "Papel de museo, libre de ácido. Dura décadas sin virar.", extra: 22000, orden: 4, acabado: "texturado" },

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

  // ── Marco ── (abre con el marco de entrada, no con "sin marco": es lo que se vende)
  { grupo: "marco", id: "sin-marco", nombre: "Sin marco", descripcion: "Solo la copia, enrollada en tubo rígido.", extra: 0, orden: 4, sinMarco: true },
  { grupo: "marco", id: "basico", nombre: "Básico", descripcion: "Moldura delgada de pino lacado en negro.", extra: 18000, orden: 1, color: "#141412", grosorMm: 15, paspartuMm: 0 },
  { grupo: "marco", id: "profesional", nombre: "Profesional", descripcion: "Aluminio anodizado con paspartú blanco de museo.", extra: 34000, orden: 2, color: "#8d8f92", grosorMm: 20, paspartuMm: 40 },
  { grupo: "marco", id: "premium", nombre: "Premium", descripcion: "Madera de nogal maciza y paspartú ancho.", extra: 62000, orden: 3, color: "#4a3323", grosorMm: 32, paspartuMm: 60 },

  // ── Vidrio ──
  { grupo: "vidrio", id: "sin-vidrio", nombre: "Sin vidrio", descripcion: "La copia queda a la vista, sin nada delante.", extra: 0, orden: 1, reflejo: 0 },
  { grupo: "vidrio", id: "comun", nombre: "Vidrio común", descripcion: "Protege del polvo. Refleja la luz de la sala.", extra: 9000, orden: 2, reflejo: 0.35 },
  { grupo: "vidrio", id: "acrilico", nombre: "Acrílico", descripcion: "Liviano e irrompible. Ideal en formatos grandes.", extra: 19000, orden: 3, reflejo: 0.22 },
  { grupo: "vidrio", id: "antirreflejo", nombre: "Antirreflejo museo", descripcion: "Casi invisible y filtra UV. Lo que se usa en galerías.", extra: 24000, orden: 4, reflejo: 0.06 },
];

const REGIONES = [
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

const TIENDA = {
  nombre: "fefoto",
  bajada: "Fotografía de autor, impresa y enmarcada para tu pared.",
  correo: "hola@fefoto.cl",
  telefono: "",
  whatsapp: "",
  instagram: "",
  retiro: "Coordinamos el retiro por WhatsApp una vez que el pedido está listo.",
  diasProduccion: 7,
  banco: { titular: "", rut: "", banco: "", tipo: "Cuenta corriente", numero: "", correo: "" },
};

/** BatchWrite acepta 25 filas por llamada. */
const enTandas = (lista, n = 25) =>
  Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));

async function main() {
  const filas = OPCIONES.map((o) => ({
    tipo: "opcion",
    id: `${o.grupo}#${o.id}`,
    opcionId: o.id,
    activa: true,
    ...o,
  }));

  for (const tanda of enTandas(filas)) {
    await db.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [TABLA_CATALOGO]: tanda.map((f) => ({
            PutRequest: { Item: marshall(f, { removeUndefinedValues: true }) },
          })),
        },
      })
    );
  }
  console.log(`✓ ${filas.length} opciones cargadas`);

  for (const [id, valor] of [
    ["regiones", REGIONES.map((r) => ({ ...r, activa: true }))],
    ["tienda", TIENDA],
  ]) {
    await db.send(
      new PutItemCommand({
        TableName: TABLA_CATALOGO,
        Item: marshall({ tipo: "config", id, valor }, { removeUndefinedValues: true }),
      })
    );
    console.log(`✓ config/${id}`);
  }

  const admin = (process.env.ADMIN || "").trim().toLowerCase();
  if (admin) {
    await db.send(
      new PutItemCommand({
        TableName: TABLA_USUARIOS,
        Item: marshall({ email: admin, rol: "admin", activo: true }),
      })
    );
    console.log(`✓ ${admin} queda como admin del panel`);
  } else {
    console.log("· Sin ADMIN=… : nadie puede entrar al panel todavía");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
