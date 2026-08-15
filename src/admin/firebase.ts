// Configuración pública de Firebase (va en el cliente, no es secreta).
//
// Proyecto propio de fefoto. El `projectId` tiene que ser exactamente el mismo
// que el parámetro FirebaseProjectId de aws/template.yaml: es el issuer y el
// audience que valida el autorizador de API Gateway. Si se cambia acá y no
// allá, el panel entero responde 401 y el error no dice por qué.
//
// Sin `measurementId`: es de Analytics, que no se usa. El sitio mide sus
// visitas con lo suyo, sin cookies ni terceros.
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

const app = initializeApp({
  apiKey: "AIzaSyA6iJx8qde0aSUAJxs1jdcBWgvszeD3Vi4",
  authDomain: "fefoto.firebaseapp.com",
  projectId: "fefoto",
  storageBucket: "fefoto.firebasestorage.app",
  messagingSenderId: "370795693669",
  appId: "1:370795693669:web:a9b469114397b687c9a88c",
});

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// Google siempre pregunta con qué cuenta entrar. Sin esto, con una sola sesión
// activa entra con esa sin preguntar: quien tiene una cuenta personal y otra
// del equipo no podía cambiarse, y en el panel quedaba en un bucle de "esta
// cuenta no tiene acceso" sin forma de salir.
googleProvider.setCustomParameters({ prompt: "select_account" });
