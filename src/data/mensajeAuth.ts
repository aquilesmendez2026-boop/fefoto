/**
 * Traduce los códigos de Firebase a algo accionable.
 *
 * Sin esto un fallo de configuración se ve igual que "no pasa nada" al apretar
 * el botón. Vive aparte porque lo usan el panel y la cuenta del cliente, y son
 * los mismos errores.
 */
export function mensajeAuth(codigo: string): string {
  switch (codigo) {
    case "auth/unauthorized-domain":
      return `Este dominio (${window.location.hostname}) no está autorizado en Firebase. Un administrador debe agregarlo en Authentication → Settings → Authorized domains.`;
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes de este sitio y vuelve a intentar.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Se cerró la ventana de Google antes de terminar. Intenta nuevamente.";
    case "auth/network-request-failed":
      return "No se pudo conectar. Revisa tu conexión e intenta nuevamente.";

    // Correo y contraseña. Firebase responde `invalid-credential` tanto si el
    // correo no existe como si la clave está mala, a propósito: decir cuál de
    // las dos falló permite averiguar qué correos tienen cuenta.
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "Ese correo no parece válido.";
    case "auth/email-already-in-use":
      return "Ya hay una cuenta con ese correo. Entra en vez de crear una nueva.";
    case "auth/weak-password":
      return "La contraseña es muy corta: usa al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos seguidos. Espera un momento y vuelve a probar.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Escríbenos y lo vemos.";
    case "auth/operation-not-allowed":
      return "El ingreso con correo y contraseña no está habilitado en Firebase. Un administrador debe activarlo en Authentication → Sign-in method.";
    default:
      return `No se pudo completar (${codigo || "error desconocido"}).`;
  }
}
