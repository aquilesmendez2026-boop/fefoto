// Cliente de los endpoints de administración.
// La autenticación es con Google (Firebase): se envía el ID token como Bearer.
import { auth } from "./firebase";
import { API } from "../data/apiBase";
import type { Foto, Opcion, Region, Tienda } from "../data/catalogo";
import type { Estado, Pedido } from "../data/pedido";

export type { Bloque, Celda } from "../molecules/ArticuloRender";

async function token(forzarNuevo = false): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("sin_sesion");
  return u.getIdToken(forzarNuevo);
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Llama a la API reintentando una vez ante fallos transitorios.
 *
 * El panel arma cada pantalla con varias peticiones en paralelo, y un corte
 * momentáneo de red o un token recién vencido dejaban la pantalla vacía en
 * silencio, como si no hubiera datos.
 *
 * Se reintenta solo lo que puede cambiar de resultado: fallos de red, 401
 * (token vencido), 429 y 5xx. Un 400, 403 o 404 se devuelve enseguida, porque
 * el problema está en la petición y repetirla da exactamente lo mismo.
 */
async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  let ultimo = new Error("error_desconocido");

  for (let intento = 0; intento < 2; intento++) {
    let reintentable = true;
    try {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          // En el reintento se pide un token nuevo: si el 401 vino de uno
          // vencido, repetir con el mismo vuelve a fallar igual.
          authorization: `Bearer ${await token(intento > 0)}`,
          ...(init.headers || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data as T;

      reintentable = res.status === 401 || res.status === 429 || res.status >= 500;
      ultimo = new Error(
        res.status === 401
          ? "sin_sesion"
          : res.status === 403
            ? (data as { error?: string }).error || "sin_permisos"
            : (data as { error?: string }).error || `error_${res.status}`
      );
    } catch (e) {
      ultimo = e as Error;
    }

    if (!reintentable) break;
    if (intento === 0) await espera(400);
  }

  throw ultimo;
}

// ───────── Quién soy ─────────

export type Rol = "admin" | "staff";

export interface UsuarioAdmin {
  email: string;
  nombre?: string;
  rol: Rol;
  activo?: boolean;
}

export const quienSoy = () => req<{ email: string; rol: Rol }>("/admin/yo");

// ───────── Obras ─────────

export const listarFotos = () =>
  req<{ fotos: Foto[] }>("/admin/fotos").then((r) => r.fotos ?? []);

export const guardarFoto = (f: Foto) =>
  req<{ ok: boolean }>("/admin/fotos", { method: "PUT", body: JSON.stringify(f) });

export const borrarFoto = (id: string) =>
  req<{ ok: boolean }>(`/admin/fotos/${encodeURIComponent(id)}`, { method: "DELETE" });

/**
 * Permiso temporal para subir un archivo directo a S3.
 *
 * El archivo no pasa por la Lambda: una foto de 20 MB no cabe en el cuerpo de
 * una petición de API Gateway, y aunque cupiera sería pagar cómputo por mover
 * bytes. La Lambda solo firma el permiso y el navegador sube contra S3.
 */
export const urlSubida = (nombre: string, contentType: string, tipo: "web" | "original") =>
  req<{ url: string; publica: string; key: string }>("/admin/subida", {
    method: "POST",
    body: JSON.stringify({ nombre, contentType, tipo }),
  });

// ───────── Opciones (papel, tamaño, marco, vidrio) ─────────

export const listarOpciones = () =>
  req<{ opciones: Opcion[] }>("/admin/opciones").then((r) => r.opciones ?? []);

export const guardarOpcion = (o: Opcion) =>
  req<{ ok: boolean }>("/admin/opciones", { method: "PUT", body: JSON.stringify(o) });

export const borrarOpcion = (grupo: string, id: string) =>
  req<{ ok: boolean }>(
    `/admin/opciones/${encodeURIComponent(grupo)}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

// ───────── Tienda y despacho ─────────

export const getTiendaAdmin = () => req<{ tienda: Tienda }>("/admin/tienda").then((r) => r.tienda);

export const guardarTienda = (t: Tienda) =>
  req<{ ok: boolean }>("/admin/tienda", { method: "PUT", body: JSON.stringify(t) });

export const listarRegiones = () =>
  req<{ regiones: Region[] }>("/admin/regiones").then((r) => r.regiones ?? []);

/** Se guardan todas juntas: la tabla se edita como una sola cosa. */
export const guardarRegiones = (regiones: Region[]) =>
  req<{ ok: boolean }>("/admin/regiones", { method: "PUT", body: JSON.stringify({ regiones }) });

// ───────── Pedidos ─────────

export const listarPedidos = (mes: string) =>
  req<{ pedidos: Pedido[] }>(`/admin/pedidos?mes=${encodeURIComponent(mes)}`).then(
    (r) => r.pedidos ?? []
  );

/**
 * Mueve un pedido de estado. El backend guarda quién lo movió y cuándo, y
 * avisa por correo a quien compró cuando el cambio le importa (pago recibido,
 * despachado). Ver `cambiarEstado` en aws/src/index.mjs.
 */
export const cambiarEstadoPedido = (pedidoId: string, estado: Estado, nota?: string) =>
  req<{ ok: boolean; pedido: Pedido }>(
    `/admin/pedidos/${encodeURIComponent(pedidoId)}/estado`,
    { method: "PUT", body: JSON.stringify({ estado, nota }) }
  );

// ───────── Resumen y ventas ─────────

export interface Resumen {
  /** Pedidos que esperan que alguien confirme la transferencia. */
  porRevisar: number;
  enProduccion: number;
  /** Ventas confirmadas del mes en curso, en pesos. */
  ventasMes: number;
  pedidosMes: number;
  visitasMes: number;
  obras: number;
  /** Lo más vendido del mes, para saber qué reponer o destacar. */
  masVendidas: { fotoId: string; titulo: string; copias: number }[];
  /** Ventas por día del mes, para el gráfico. */
  porDia: { dia: string; total: number }[];
}

export const getResumen = () => req<Resumen>("/admin/resumen");

// ───────── Usuarios del panel ─────────

export const listarUsuarios = () =>
  req<{ usuarios: UsuarioAdmin[] }>("/admin/usuarios").then((r) => r.usuarios ?? []);

export const guardarUsuario = (u: UsuarioAdmin) =>
  req<{ ok: boolean }>("/admin/usuarios", { method: "PUT", body: JSON.stringify(u) });

export const borrarUsuario = (email: string) =>
  req<{ ok: boolean }>(`/admin/usuarios/${encodeURIComponent(email)}`, { method: "DELETE" });
