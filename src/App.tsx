import { Suspense, lazy, useEffect, useState } from "react";
import { ChakraProvider, Flex, Spinner } from "@chakra-ui/react";
import { system } from "./theme";
import { HomePage } from "./pages/HomePage";
import { ObraPage } from "./pages/ObraPage";
import { CarritoPage } from "./pages/CarritoPage";
import { PedidoPage } from "./pages/PedidoPage";
import { CuentaPage } from "./pages/CuentaPage";
import { PrivacidadPage } from "./pages/PrivacidadPage";

// El panel de administración se carga solo cuando se visita #/admin, así quien
// entra a mirar la galería no descarga Firebase ni el código del panel.
const AdminApp = lazy(() =>
  import("./admin/AdminApp").then((m) => ({ default: m.AdminApp }))
);

/** Id que sigue a un prefijo de ruta, o null si la ruta es otra. */
const idDe = (prefijo: string) => {
  const m = window.location.hash.match(new RegExp(`^#/${prefijo}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
};

const rutaActual = () => ({
  admin: window.location.hash.startsWith("#/admin"),
  obraId: idDe("obra"),
  pedidoId: idDe("pedido"),
  carrito: /^#\/carrito\/?$/.test(window.location.hash),
  cuenta: window.location.hash === "#/cuenta",
  privacidad: window.location.hash === "#/privacidad",
});

export const App = () => {
  const [ruta, setRuta] = useState(rutaActual);

  useEffect(() => {
    const onHash = () => {
      setRuta(rutaActual());
      // Cambiar de página deja la vista arriba. Sin esto, entrar a una obra
      // desde el final de la galería abría la ficha a media altura.
      if (!window.location.hash.includes("#/admin")) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <ChakraProvider value={system}>
      {ruta.admin ? (
        <Suspense
          fallback={
            <Flex minH="100vh" align="center" justify="center" bg="bg.canvas">
              <Spinner color="brand.primary" />
            </Flex>
          }
        >
          <AdminApp />
        </Suspense>
      ) : ruta.privacidad ? (
        <PrivacidadPage />
      ) : ruta.cuenta ? (
        <CuentaPage />
      ) : ruta.pedidoId ? (
        <PedidoPage pedidoId={ruta.pedidoId} />
      ) : ruta.carrito ? (
        <CarritoPage />
      ) : ruta.obraId ? (
        <ObraPage obraId={ruta.obraId} />
      ) : (
        <HomePage />
      )}
    </ChakraProvider>
  );
};
