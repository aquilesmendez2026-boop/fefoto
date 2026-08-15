// Preparación y subida de una obra.
//
// La versión web con marca de agua se genera acá, en el navegador del panel, y
// no en el backend. Redimensionar imágenes dentro de una Lambda obliga a meter
// una capa nativa (sharp) o un binario wasm, y a pagar cómputo y memoria por
// cada foto: para un catálogo que crece de a una obra por vez, no vale la pena.
// El navegador ya tiene un canvas y hace exactamente lo mismo, gratis.
//
// Se suben dos archivos:
//   · `original/` — el archivo tal cual, privado. Es de donde se imprime.
//   · `web/`      — reducida, comprimida y con marca de agua. Es lo único que
//                   sale publicado. Si alguien la copia, se lleva una imagen de
//                   1600 px marcada, que no sirve para imprimir nada.
import { urlSubida } from "./adminApi";

/** Lado más largo de la versión web. Suficiente para pantalla, inútil para imprimir. */
const LADO_WEB = 1600;
const CALIDAD = 0.82;

export interface ObraSubida {
  /** URL pública de la versión web: es la que va al catálogo. */
  imagen: string;
  /** Clave en S3 del archivo original, por si hay que recuperarlo. */
  original: string;
  ancho: number;
  alto: number;
}

/**
 * Dibuja la marca de agua sobre el canvas.
 *
 * Un texto repetido en diagonal y muy tenue, más la firma en una esquina. La
 * repetición es a propósito: una marca sola en el centro se recorta, y una en
 * la esquina se clona. Distribuida por toda la superficie, quitarla exige
 * retocar la imagen entera, que es justo el punto.
 */
function marcarAgua(ctx: CanvasRenderingContext2D, ancho: number, alto: number, texto: string) {
  const paso = Math.max(ancho, alto) / 4;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `500 ${Math.round(paso / 7)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.28;
  ctx.translate(ancho / 2, alto / 2);
  ctx.rotate(-Math.PI / 6);
  // Se cubre más que el lienzo porque al rotar las esquinas quedan fuera.
  const alcance = Math.hypot(ancho, alto);
  for (let y = -alcance; y < alcance; y += paso) {
    for (let x = -alcance; x < alcance; x += paso * 1.6) {
      ctx.fillText(texto, x, y);
    }
  }
  ctx.restore();

  // Firma legible abajo a la derecha: la que se ve si alguien recorta el resto.
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.globalAlpha = 0.7;
  ctx.font = `500 ${Math.round(Math.max(ancho, alto) / 60)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = Math.round(ancho / 200);
  ctx.fillText(`© ${texto}`, ancho - ancho * 0.025, alto - alto * 0.025);
  ctx.restore();
}

/** Reduce, comprime y marca. Devuelve el JPEG listo para subir. */
export async function prepararWeb(
  archivo: File,
  texto = "fefoto"
): Promise<{ blob: Blob; ancho: number; alto: number }> {
  // `from-image` respeta la orientación EXIF: sin esto, las fotos tomadas en
  // vertical con el teléfono se suben acostadas.
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_WEB / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin_canvas");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();
  marcarAgua(ctx, ancho, alto, texto);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", CALIDAD));
  if (!blob) throw new Error("no_se_pudo_generar");
  return { blob, ancho, alto };
}

/** Sube un blob a S3 con el permiso temporal ya firmado. */
async function aS3(url: string, cuerpo: Blob | File, contentType: string) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: cuerpo,
  });
  if (!res.ok) throw new Error("falló_la_subida");
}

/**
 * Sube una obra completa: primero la versión web, después el original.
 *
 * En ese orden porque el original puede pesar decenas de megas y tarda; si algo
 * falla ahí, la web ya está arriba y la obra se puede publicar igual mientras
 * se reintenta el respaldo.
 */
export async function subirObra(archivo: File, marca = "fefoto"): Promise<ObraSubida> {
  const { blob, ancho, alto } = await prepararWeb(archivo, marca);

  const web = await urlSubida(archivo.name.replace(/\.[^.]+$/, ".jpg"), "image/jpeg", "web");
  await aS3(web.url, blob, "image/jpeg");

  const tipoOriginal = archivo.type || "application/octet-stream";
  const original = await urlSubida(archivo.name, tipoOriginal, "original");
  await aS3(original.url, archivo, tipoOriginal);

  return { imagen: web.publica, original: original.key, ancho, alto };
}
