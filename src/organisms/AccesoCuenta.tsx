import { useState, type FormEvent } from "react";
import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react";
import { ingresar, ingresarCorreo, recuperarClave, registrarCorreo } from "../data/cuenta";
import { mensajeAuth } from "../data/mensajeAuth";

type Modo = "entrar" | "registro" | "recuperar";

const TITULO: Record<Modo, string> = {
  entrar: "Tu cuenta",
  registro: "Crea tu cuenta",
  recuperar: "Recuperar contraseña",
};

const BAJADA: Record<Modo, string> = {
  entrar: "Entra para ver tus pedidos y en qué va cada uno.",
  registro: "Con una cuenta sigues tus pedidos sin buscar el correo de confirmación.",
  recuperar: "Te enviamos un correo con el enlace para elegir una contraseña nueva.",
};

const ACCION: Record<Modo, string> = {
  entrar: "Entrar",
  registro: "Crear cuenta",
  recuperar: "Enviar enlace",
};

const campo = {
  bg: "bg.canvas",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "md",
  h: "11",
  fontSize: "sm",
  _focus: { borderColor: "border.brand", outline: "none" },
} as const;

/**
 * Ingreso a la cuenta del cliente: correo y contraseña, o Google.
 *
 * Las dos vías conviven porque no todo el mundo tiene cuenta de Google, y quien
 * ya compró dejó un correo cualquiera. Firebase las junta solo si el correo
 * coincide, así que el texto de abajo insiste con usar el mismo.
 *
 * Tener cuenta nunca es obligatorio para comprar: el enlace del pedido que
 * llega por correo funciona igual. Esto es solo para verlos todos juntos.
 */
export const AccesoCuenta = () => {
  const [modo, setModo] = useState<Modo>("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cambiarA = (m: Modo) => {
    setModo(m);
    setError("");
    setAviso("");
    setClave("");
  };

  /** Envuelve cualquier intento: apaga el spinner y traduce el error. */
  const intentar = async (fn: () => Promise<unknown>) => {
    setCargando(true);
    setError("");
    setAviso("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(mensajeAuth((e as { code?: string }).code || ""));
      return false;
    } finally {
      setCargando(false);
    }
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (modo === "recuperar") {
      // El aviso es el mismo exista o no la cuenta: decir "ese correo no está
      // registrado" deja averiguar quién tiene cuenta acá.
      if (await intentar(() => recuperarClave(correo)))
        setAviso("Si hay una cuenta con ese correo, te llegará el enlace en unos minutos.");
      return;
    }
    // Con éxito no se toca el estado: la sesión cambia y esta pantalla
    // desaparece entera.
    await intentar(() =>
      modo === "entrar"
        ? ingresarCorreo(correo, clave)
        : registrarCorreo(nombre, correo, clave)
    );
  };

  return (
    <VStack gap="5" py="12" w="full" maxW="380px" mx="auto">
      <Heading size="2xl" fontFamily="heading" fontWeight="400" textAlign="center">
        {TITULO[modo]}
      </Heading>
      <Text color="fg.muted" textAlign="center" lineHeight="tall">
        {BAJADA[modo]}
      </Text>

      <VStack as="form" onSubmit={enviar} align="stretch" gap="3" w="full">
        {modo === "registro" && (
          <Input
            placeholder="Nombre y apellido"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            {...campo}
          />
        )}
        <Input
          type="email"
          placeholder="Correo"
          autoComplete="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          {...campo}
        />
        {modo !== "recuperar" && (
          <Input
            type="password"
            placeholder="Contraseña"
            autoComplete={modo === "registro" ? "new-password" : "current-password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            minLength={6}
            {...campo}
          />
        )}
        <Button
          type="submit"
          h="11"
          borderRadius="md"
          bg="brand.primary"
          color="fg.inverted"
          fontWeight="600"
          loading={cargando}
          _hover={{ bg: "brass.200" }}
        >
          {ACCION[modo]}
        </Button>
      </VStack>

      {modo === "entrar" && (
        <>
          <Box display="flex" alignItems="center" gap="3" w="full" color="fg.subtle">
            <Box flex="1" h="1px" bg="border.subtle" />
            <Text fontSize="xs">o</Text>
            <Box flex="1" h="1px" bg="border.subtle" />
          </Box>
          <Button
            w="full"
            h="11"
            borderRadius="md"
            variant="outline"
            borderColor="border.soft"
            color="fg.default"
            fontWeight="600"
            disabled={cargando}
            onClick={() => intentar(ingresar)}
          >
            Entrar con Google
          </Button>
        </>
      )}

      {error && (
        <Text fontSize="sm" color="estado.alerta" fontWeight="600" textAlign="center">
          {error}
        </Text>
      )}
      {aviso && (
        <Text fontSize="sm" color="brand.primary" fontWeight="600" textAlign="center">
          {aviso}
        </Text>
      )}

      <VStack gap="1.5" fontSize="sm" color="fg.muted">
        {modo === "entrar" ? (
          <>
            <Text>
              ¿No tienes cuenta?{" "}
              <Enlace onClick={() => cambiarA("registro")}>Créala aquí</Enlace>
            </Text>
            <Enlace onClick={() => cambiarA("recuperar")}>Olvidé mi contraseña</Enlace>
          </>
        ) : (
          <Enlace onClick={() => cambiarA("entrar")}>Volver a entrar</Enlace>
        )}
      </VStack>

      <Text fontSize="sm" color="fg.subtle" textAlign="center" maxW="46ch">
        Usa el mismo correo con que compraste. Si usaste otro, escríbenos y los juntamos.
      </Text>
    </VStack>
  );
};

function Enlace({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Text
      as="button"
      // @ts-expect-error Chakra dibuja un botón con `as` y no tipa type
      type="button"
      onClick={onClick}
      color="brand.primary"
      fontWeight="700"
      _hover={{ textDecoration: "underline" }}
    >
      {children}
    </Text>
  );
}
