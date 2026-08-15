// Paleta de fefoto: sala de exposición.
//
// Un solo tema, oscuro. No hay modo claro y no se echa de menos: la obra manda
// y todo lo demás —fondo, texto, botones— se corre hacia atrás para no competir
// con ella. Por eso los grises son neutros y el único color de marca es un
// latón apagado, que en pantalla lee como el bronce de una cartela de museo.
export const colors = {
  // Neutros de la sala. Van del papel de algodón al negro de la pared.
  ink: {
    50: { value: "#f7f7f6" },
    100: { value: "#ececeb" },
    200: { value: "#d4d4d1" },
    300: { value: "#adadaa" },
    400: { value: "#83837f" },
    500: { value: "#5e5e5b" },
    600: { value: "#444442" },
    700: { value: "#2e2e2c" },
    800: { value: "#1d1d1c" },
    850: { value: "#161615" },
    900: { value: "#0f0f0e" },
    950: { value: "#080808" },
  },
  // Latón: el acento. Solo para lo que hay que mirar (precio, acción, foco).
  brass: {
    50: { value: "#faf7f0" },
    100: { value: "#f1e9d8" },
    200: { value: "#e3d3af" },
    300: { value: "#d2b984" },
    400: { value: "#bfa063" },
    500: { value: "#a4854b" },
    600: { value: "#836a3b" },
    700: { value: "#5f4d2c" },
  },
  // Estados de un pedido. Apagados a propósito: viven dentro del panel, no
  // pueden gritar más que las fotos del catálogo.
  estado: {
    espera: { value: "#c9a227" },
    ok: { value: "#6f9e6b" },
    curso: { value: "#6b8ea3" },
    alerta: { value: "#b5654e" },
  },
};

export const fonts = {
  // Serif de galería para los títulos y el nombre de cada obra.
  heading: { value: "'Cormorant Garamond', Georgia, serif" },
  display: { value: "'Cormorant Garamond', Georgia, serif" },
  // Sans neutra para todo lo que se lee de corrido y para los datos.
  body: { value: "'Inter', system-ui, sans-serif" },
};
