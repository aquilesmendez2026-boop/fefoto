// Sesión del cliente en el sitio público.
//
// Firebase se importa de forma diferida a propósito: son unos 150 KB que solo
// necesita quien entra a ver sus pedidos, y no tiene por qué descargarlos quien
// entró a mirar la galería. Se reusa la instancia del panel para no levantar dos.
import type { User } from "firebase/auth";
import type { Pedido } from "./pedido";

const API = "https://c3164i3nmh.execute-api.us-east-2.amazonaws.com";

const authDiferido = () => import("../admin/firebase").then((m) => m.auth);

/** Abre la ventana de Google. Devuelve el usuario o lanza el error de Firebase. */
export async function ingresar(): Promise<User> {
  const [{ signInWithPopup }, auth, { googleProvider }] = await Promise.all([
    import("firebase/auth"),
    authDiferido(),
    import("../admin/firebase"),
  ]);
  const r = await signInWithPopup(auth, googleProvider);
  return r.user;
}

/** Entra con correo y contraseña. Lanza el error de Firebase con su `code`. */
export async function ingresarCorreo(correo: string, clave: string): Promise<User> {
  const [{ signInWithEmailAndPassword }, auth] = await Promise.all([
    import("firebase/auth"),
    authDiferido(),
  ]);
  const r = await signInWithEmailAndPassword(auth, correo.trim(), clave);
  return r.user;
}

/**
 * Crea la cuenta y deja la sesión abierta.
 *
 * El nombre se guarda en el perfil de Firebase, no en el backend: es lo que
 * lee el saludo y el chip de la barra, y así una cuenta nueva no aparece como
 * "Cuenta" hasta la primera reserva.
 */
export async function registrarCorreo(
  nombre: string,
  correo: string,
  clave: string
): Promise<User> {
  const [{ createUserWithEmailAndPassword, updateProfile }, auth] = await Promise.all([
    import("firebase/auth"),
    authDiferido(),
  ]);
  const r = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
  if (nombre.trim()) await updateProfile(r.user, { displayName: nombre.trim() });
  return r.user;
}

/** Manda el correo para recuperar la contraseña. */
export async function recuperarClave(correo: string): Promise<void> {
  const [{ sendPasswordResetEmail }, auth] = await Promise.all([
    import("firebase/auth"),
    authDiferido(),
  ]);
  await sendPasswordResetEmail(auth, correo.trim());
}

export async function salir(): Promise<void> {
  const [{ signOut }, auth] = await Promise.all([import("firebase/auth"), authDiferido()]);
  await signOut(auth);
}

/**
 * Avisa cuando cambia la sesión. Devuelve la función para dejar de escuchar.
 * El primer aviso llega con la sesión ya restaurada, o con null si no hay.
 */
export function observarSesion(cb: (u: User | null) => void): () => void {
  let cancelado = false;
  let apagar: (() => void) | undefined;
  Promise.all([import("firebase/auth"), authDiferido()]).then(([{ onAuthStateChanged }, auth]) => {
    if (cancelado) return;
    apagar = onAuthStateChanged(auth, cb);
  });
  return () => {
    cancelado = true;
    apagar?.();
  };
}

/**
 * Espera a que Firebase termine de restaurar la sesión guardada.
 *
 * Importar el módulo no alcanza: `currentUser` queda en null unos cientos de
 * milisegundos mientras Firebase revisa el almacenamiento. Quien preguntara
 * antes recibía "sin_sesion" estando perfectamente conectado — así, el
 * formulario de reserva no encontraba las mascotas del cliente y le preguntaba
 * datos que ya tenía.
 *
 * Se resuelve una sola vez y se reusa: el primer aviso llega con la sesión ya
 * restaurada, o con null si no hay ninguna.
 */
let restaurada: Promise<void> | null = null;
function sesionRestaurada(): Promise<void> {
  if (!restaurada)
    restaurada = Promise.all([import("firebase/auth"), authDiferido()]).then(
      ([{ onAuthStateChanged }, auth]) =>
        new Promise<void>((listo) => {
          const off = onAuthStateChanged(auth, () => {
            off();
            listo();
          });
        })
    );
  return restaurada;
}

async function conToken(path: string, init: RequestInit = {}) {
  const auth = await authDiferido();
  await sesionRestaurada();
  const u = auth.currentUser;
  if (!u) throw new Error("sin_sesion");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await u.getIdToken()}`,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `error_${res.status}`);
  return data;
}

/**
 * Los pedidos de quien está conectado.
 *
 * De quién son lo decide el correo verificado del token, nunca la petición: si
 * el cliente pudiera mandar un email, cualquiera vería los pedidos de cualquiera.
 */
export const misPedidos = () => conToken("/mi/pedidos") as Promise<{ pedidos: Pedido[] }>;

/**
 * Rol en el equipo, o null si esta persona es solo cliente.
 *
 * La única fuente de verdad es la tabla de staff, así que se pregunta al
 * backend. Antes se deducía de por dónde había entrado —panel o cuenta— y eso
 * estaba mal: quien es del equipo y entra por su cuenta de cliente sigue siendo
 * del equipo. Lanza si no se pudo preguntar, para no confundir "no es staff"
 * con "no hubo respuesta".
 */
export async function miRol(): Promise<string | null> {
  try {
    const r = (await conToken("/admin/yo")) as { rol?: string };
    return r.rol || null;
  } catch (e) {
    // 403 es una respuesta, no una falla: dice que no está en la tabla.
    if ((e as Error).message === "sin_permisos") return null;
    throw e;
  }
}

