/**
 * La URL de la API, en un solo lugar.
 *
 * La usan el sitio, la zona del cliente y el panel. Antes vivía copiada en los
 * tres archivos, y bastaba con redesplegar el backend para dejar dos de ellas
 * apuntando a una API que ya no existía.
 *
 * Se puede sobrescribir con `VITE_API_URL` —en un `.env.local` para desarrollo,
 * o como variable de entorno en Amplify— sin tocar el código. El valor de abajo
 * es el de la pila `fefoto-backend` en producción, que es lo que corresponde
 * cuando no se define nada.
 */
export const API =
  import.meta.env.VITE_API_URL ?? "https://unpd6lnks1.execute-api.us-east-2.amazonaws.com";
