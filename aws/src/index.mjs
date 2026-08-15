import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const db = new DynamoDBClient({});
const s3 = new S3Client({});

const T = {
  catalogo: process.env.TABLA_CATALOGO,
  pedidos: process.env.TABLA_PEDIDOS,
  usuarios: process.env.TABLA_USUARIOS,
  analitica: process.env.TABLA_ANALITICA,
};
const BUCKET = process.env.BUCKET_OBRAS;
const CDN = process.env.CDN_OBRAS;
const REMITENTE = process.env.CORREO_REMITENTE;
const SITIO = process.env.SITIO || "https://fefoto.cl";
const TZ = "America/Santiago";

/**
 * El cliente de SES se carga a demanda y no arriba del archivo.
 *
 * Si el runtime no trajera ese paquete, un import de primer nivel tumbaría la
 * función entera —toda la API, no solo el correo— desde el primer arranque.
 * Así, en el peor caso se pierde el aviso y el pedido se guarda igual.
 */
let sesPromesa = null;
const cargarSes = () => {
  if (!sesPromesa)
    sesPromesa = import("@aws-sdk/client-sesv2").then((m) => ({
      cliente: new m.SESv2Client({}),
      SendEmailCommand: m.SendEmailCommand,
    }));
  return sesPromesa;
};

// ───────────────────── Utilidades ─────────────────────

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const ORIGENES = (process.env.ORIGENES_PERMITIDOS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Cualquier rama de Amplify del proyecto, para poder probar antes de publicar. */
const esAmplify = (o) => /^https:\/\/[a-z0-9-]+\.[a-z0-9]+\.amplifyapp\.com$/.test(o || "");

function cors(origin) {
  const permitido = ORIGENES.includes(origin) || esAmplify(origin);
  return {
    "access-control-allow-origin": permitido ? origin : ORIGENES[0] || "*",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    vary: "origin",
  };
}

/**
 * El correo verificado del token de Firebase.
 *
 * Viene del autorizador de API Gateway, que ya validó la firma: acá no se
 * vuelve a verificar nada, solo se lee. Nunca se toma el correo del cuerpo de
 * la petición, que es lo único que el cliente controla.
 */
const emailDelToken = (event) => {
  const c = event.requestContext?.authorizer?.jwt?.claims || {};
  return String(c.email || "").toLowerCase();
};

const ROLES = ["admin", "staff"];

async function rolDe(email) {
  if (!email) return null;
  const r = await db.send(
    new GetItemCommand({ TableName: T.usuarios, Key: marshall({ email }) })
  );
  if (!r.Item) return null;
  const u = unmarshall(r.Item);
  if (u.activo === false) return null;
  return ROLES.includes(u.rol) ? u.rol : "staff";
}

const recorta = (v, max) => String(v ?? "").trim().slice(0, max);
const entero = (v, min, max, porDefecto = min) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : porDefecto;
};
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());

/** La fecha de hoy en Chile, no en UTC: a las 21:00 acá ya es otro día allá. */
function hoyLocal() {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(new Date()); // YYYY-MM-DD
}

/** Todas las filas de una consulta, siguiendo la paginación de DynamoDB. */
async function queryTodo(params) {
  const items = [];
  let last;
  do {
    const r = await db.send(new QueryCommand({ ...params, ExclusiveStartKey: last }));
    items.push(...(r.Items || []).map(unmarshall));
    last = r.LastEvaluatedKey;
  } while (last);
  return items;
}

// ───────────────────── Catálogo ─────────────────────

const CLAVE_OPCION = (grupo, id) => `${grupo}#${id}`;

const leerTipo = (tipo) =>
  queryTodo({
    TableName: T.catalogo,
    KeyConditionExpression: "tipo = :t",
    ExpressionAttributeValues: marshall({ ":t": tipo }),
  });

async function leerConfig(id, porDefecto) {
  const r = await db.send(
    new GetItemCommand({ TableName: T.catalogo, Key: marshall({ tipo: "config", id }) })
  );
  return r.Item ? (unmarshall(r.Item).valor ?? porDefecto) : porDefecto;
}

const guardarConfig = (id, valor) =>
  db.send(
    new PutItemCommand({
      TableName: T.catalogo,
      Item: marshall({ tipo: "config", id, valor }, { removeUndefinedValues: true }),
    })
  );

const TIENDA_VACIA = {
  nombre: "fefoto",
  bajada: "Fotografía de autor, impresa y enmarcada para tu pared.",
  correo: REMITENTE || "",
  telefono: "",
  whatsapp: "",
  instagram: "",
  retiro: "",
  diasProduccion: 7,
  banco: { titular: "", rut: "", banco: "", tipo: "", numero: "", correo: "" },
};

/**
 * El original de cada obra nunca sale de acá.
 *
 * La fila guarda la clave en S3 del archivo de impresión; publicarla sería
 * regalar la ruta del único archivo que no puede salir. Se saca de todo lo que
 * viaja al navegador, incluido el panel: ahí tampoco se necesita.
 */
const sinOriginal = ({ original, ...resto }) => resto;

/** El catálogo completo, que es lo que pide el sitio de una sola vez. */
async function catalogoPublico() {
  const [fotos, opciones, regiones, tienda] = await Promise.all([
    leerTipo("foto"),
    leerTipo("opcion"),
    leerConfig("regiones", []),
    leerConfig("tienda", TIENDA_VACIA),
  ]);
  return json(200, {
    fotos: fotos.filter((f) => f.activa !== false).map(sinOriginal),
    opciones: opciones.filter((o) => o.activa !== false),
    regiones: (regiones || []).filter((r) => r.activa !== false),
    tienda,
  });
}

// ───────────────────── Precio (la misma regla que el sitio) ─────────────────────

const GRUPOS = ["papel", "tamano", "marco", "vidrio"];

const esNinguno = (o) => o.sinMarco === true || /^sin[-_ ]/i.test(o.id || "");

/**
 * Si dos opciones pueden ir juntas.
 *
 * Es la misma regla que aplica el configurador en src/data/catalogo.ts, escrita
 * dos veces a propósito: el navegador la usa para no ofrecer combinaciones
 * imposibles, y acá se vuelve a comprobar porque nada de lo que llega en una
 * petición es de fiar.
 */
function compatibles(a, b) {
  if (!a || !b || a.grupo === b.grupo) return true;
  if (a.incompatibles?.includes(b.id) || b.incompatibles?.includes(a.id)) return false;
  const marco = a.grupo === "marco" ? a : b.grupo === "marco" ? b : null;
  const vidrio = a.grupo === "vidrio" ? a : b.grupo === "vidrio" ? b : null;
  if (marco?.sinMarco && vidrio && (vidrio.extra > 0 || !esNinguno(vidrio))) return false;
  return true;
}

// ───────────────────── Pedidos ─────────────────────

/**
 * Número correlativo y legible: FF-0042.
 *
 * Es un contador atómico en la tabla, no un conteo de filas: contar pedidos
 * para saber el siguiente número entrega el mismo a dos compras simultáneas, y
 * ese número es con el que la clienta identifica la transferencia.
 */
async function siguienteNumero() {
  const r = await db.send(
    new UpdateItemCommand({
      TableName: T.catalogo,
      Key: marshall({ tipo: "config", id: "contador" }),
      UpdateExpression: "ADD #n :uno",
      ExpressionAttributeNames: { "#n": "numero" },
      ExpressionAttributeValues: marshall({ ":uno": 1 }),
      ReturnValues: "UPDATED_NEW",
    })
  );
  const n = unmarshall(r.Attributes || {}).numero ?? 1;
  return `FF-${String(n).padStart(4, "0")}`;
}

async function crearPedido(body) {
  const nombre = recorta(body?.cliente?.nombre, 80);
  const email = recorta(body?.cliente?.email, 120).toLowerCase();
  const telefono = recorta(body?.cliente?.telefono, 30);
  if (!nombre) return json(400, { ok: false, error: "falta_nombre" });
  if (!correoValido(email)) return json(400, { ok: false, error: "correo_invalido" });

  const pedidos = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];
  if (pedidos.length === 0) return json(400, { ok: false, error: "carrito_vacio" });

  const [fotos, opciones, regiones, tienda] = await Promise.all([
    leerTipo("foto"),
    leerTipo("opcion"),
    leerConfig("regiones", []),
    leerConfig("tienda", TIENDA_VACIA),
  ]);
  const porId = new Map(opciones.map((o) => [CLAVE_OPCION(o.grupo, o.id), o]));

  const items = [];
  for (const bruto of pedidos) {
    const foto = fotos.find((f) => f.id === bruto?.fotoId && f.activa !== false);
    if (!foto) return json(400, { ok: false, error: "obra_no_disponible" });

    const elegidas = GRUPOS.map((g) => porId.get(CLAVE_OPCION(g, bruto?.[g])));
    if (elegidas.some((o) => !o || o.activa === false))
      return json(400, { ok: false, error: "opcion_no_disponible" });

    for (let i = 0; i < elegidas.length; i++)
      for (let j = i + 1; j < elegidas.length; j++)
        if (!compatibles(elegidas[i], elegidas[j]))
          return json(400, { ok: false, error: "combinacion_invalida" });

    const cantidad = entero(bruto?.cantidad, 1, 20, 1);
    // El precio se calcula acá con los precios de la tabla. Lo que venga en la
    // petición se ignora: si no, bastaría con editarla para comprar un cuadro
    // de sesenta mil pesos en uno.
    const lineas = elegidas.map((o) => ({
      grupo: o.grupo,
      id: o.id,
      nombre: o.nombre,
      extra: Number(o.extra) || 0,
    }));
    const unitario = (Number(foto.precioBase) || 0) + lineas.reduce((s, l) => s + l.extra, 0);

    // Las ediciones limitadas se comprueban al comprar, pero el stock se
    // descuenta recién cuando el pago se confirma (ver cambiarEstado): un
    // pedido que nunca se paga no puede dejar una copia retenida para siempre.
    if (foto.edicion) {
      const quedan = (foto.edicion.total || 0) - (foto.edicion.vendidas || 0);
      if (quedan < cantidad) return json(409, { ok: false, error: "edicion_agotada" });
    }

    items.push({
      fotoId: foto.id,
      titulo: foto.titulo,
      imagen: foto.imagen,
      base: Number(foto.precioBase) || 0,
      lineas,
      unitario,
      cantidad,
      total: unitario * cantidad,
    });
  }

  const modo = body?.entrega?.modo === "retiro" ? "retiro" : "despacho";
  let entrega = { modo, costo: 0 };
  if (modo === "despacho") {
    const region = (regiones || []).find(
      (r) => r.id === body?.entrega?.region && r.activa !== false
    );
    if (!region) return json(400, { ok: false, error: "region_invalida" });
    const comuna = recorta(body?.entrega?.comuna, 80);
    const direccion = recorta(body?.entrega?.direccion, 160);
    if (!comuna || !direccion) return json(400, { ok: false, error: "falta_direccion" });
    entrega = {
      modo,
      // Se guarda el nombre y no el id: dentro de un año el id puede no existir
      // y el pedido tiene que seguir diciendo a dónde se despachó.
      region: region.nombre,
      regionId: region.id,
      comuna,
      direccion,
      costo: Number(region.costo) || 0,
    };
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const envio = entrega.costo;
  const creado = new Date().toISOString();
  const pedido = {
    pedidoId: crypto.randomUUID(),
    numero: await siguienteNumero(),
    mes: creado.slice(0, 7),
    creado,
    estado: "pendiente_pago",
    cliente: { nombre, email, telefono },
    entrega,
    items,
    subtotal,
    envio,
    total: subtotal + envio,
    nota: recorta(body?.nota, 500),
    // Duplicado fuera de `cliente` porque es la clave del índice porEmail:
    // DynamoDB no indexa atributos anidados.
    email,
    historial: [{ estado: "pendiente_pago", fecha: creado }],
  };

  await db.send(
    new PutItemCommand({
      TableName: T.pedidos,
      Item: marshall(pedido, { removeUndefinedValues: true }),
    })
  );

  // El correo no puede voltear el pedido: si SES falla, la compra ya está
  // guardada y la página de confirmación muestra igual los datos de pago.
  await avisarPedido(pedido, tienda).catch((e) => console.error("correo pedido", e));

  return json(200, {
    ok: true,
    pedidoId: pedido.pedidoId,
    numero: pedido.numero,
    total: pedido.total,
  });
}

const publico = ({ email, ...pedido }) => pedido;

async function verPedido(pedidoId) {
  const r = await db.send(
    new GetItemCommand({ TableName: T.pedidos, Key: marshall({ pedidoId }) })
  );
  if (!r.Item) return json(404, { ok: false, error: "no_encontrado" });
  return json(200, { ok: true, pedido: publico(unmarshall(r.Item)) });
}

/** Los pedidos de quien está conectado. El correo lo pone el token. */
async function misPedidos(email) {
  if (!email) return json(401, { ok: false, error: "sin_sesion" });
  const pedidos = await queryTodo({
    TableName: T.pedidos,
    IndexName: "porEmail",
    KeyConditionExpression: "email = :e",
    ExpressionAttributeValues: marshall({ ":e": email }),
    ScanIndexForward: false,
  });
  return json(200, { ok: true, pedidos: pedidos.map(publico) });
}

// ───────────────────── Administración ─────────────────────

async function adminListarFotos() {
  const fotos = await leerTipo("foto");
  return json(200, { ok: true, fotos: fotos.map(sinOriginal) });
}

async function adminGuardarFoto(body) {
  const id = recorta(body?.id, 60);
  const titulo = recorta(body?.titulo, 120);
  if (!id || !titulo) return json(400, { ok: false, error: "falta_id_o_titulo" });

  // Se lee la fila actual para no pisar lo que el formulario no manda: el
  // original en S3 y las copias ya vendidas de una edición no viajan al panel,
  // y sin esto se perderían en cada guardado.
  const previa = await db.send(
    new GetItemCommand({ TableName: T.catalogo, Key: marshall({ tipo: "foto", id }) })
  );
  const antes = previa.Item ? unmarshall(previa.Item) : {};

  const edicionTotal = entero(body?.edicion?.total, 0, 9999, 0);
  const foto = {
    tipo: "foto",
    id,
    titulo,
    categorias: (Array.isArray(body?.categorias) ? body.categorias : [])
      .map((c) => recorta(c, 40))
      .filter(Boolean)
      .slice(0, 8),
    descripcion: recorta(body?.descripcion, 400),
    historia: Array.isArray(body?.historia) ? body.historia.slice(0, 40) : undefined,
    imagen: recorta(body?.imagen, 400),
    original: body?.original ? recorta(body.original, 400) : antes.original,
    ancho: entero(body?.ancho, 1, 20000, antes.ancho ?? 0) || undefined,
    alto: entero(body?.alto, 1, 20000, antes.alto ?? 0) || undefined,
    precioBase: entero(body?.precioBase, 0, 100000000, 0),
    anio: recorta(body?.anio, 12),
    lugar: recorta(body?.lugar, 80),
    destacada: body?.destacada === true,
    activa: body?.activa !== false,
    orden: entero(body?.orden, 0, 9999, 999),
    edicion:
      edicionTotal > 0
        ? { total: edicionTotal, vendidas: antes.edicion?.vendidas ?? 0 }
        : undefined,
  };

  await db.send(
    new PutItemCommand({
      TableName: T.catalogo,
      Item: marshall(foto, { removeUndefinedValues: true }),
    })
  );
  return json(200, { ok: true });
}

const adminBorrarFoto = (id) =>
  db
    .send(
      new DeleteItemCommand({ TableName: T.catalogo, Key: marshall({ tipo: "foto", id }) })
    )
    .then(() => json(200, { ok: true }));

async function adminListarOpciones() {
  const opciones = await leerTipo("opcion");
  // La fila guarda el id compuesto (grupo#id) porque es la clave; el panel y el
  // sitio trabajan con el id suelto.
  return json(200, {
    ok: true,
    opciones: opciones.map((o) => ({ ...o, id: o.opcionId ?? String(o.id).split("#")[1] })),
  });
}

async function adminGuardarOpcion(body) {
  const grupo = GRUPOS.includes(body?.grupo) ? body.grupo : null;
  const opcionId = recorta(body?.id, 60);
  const nombre = recorta(body?.nombre, 80);
  if (!grupo || !opcionId || !nombre)
    return json(400, { ok: false, error: "falta_grupo_id_o_nombre" });

  const opcion = {
    tipo: "opcion",
    id: CLAVE_OPCION(grupo, opcionId),
    opcionId,
    grupo,
    nombre,
    descripcion: recorta(body?.descripcion, 300),
    extra: entero(body?.extra, 0, 100000000, 0),
    orden: entero(body?.orden, 0, 9999, 99),
    activa: body?.activa !== false,
    incompatibles: (Array.isArray(body?.incompatibles) ? body.incompatibles : [])
      .map((i) => recorta(i, 60))
      .filter(Boolean)
      .slice(0, 40),
    anchoCm: entero(body?.anchoCm, 0, 500, 0) || undefined,
    altoCm: entero(body?.altoCm, 0, 500, 0) || undefined,
    color: recorta(body?.color, 20) || undefined,
    grosorMm: entero(body?.grosorMm, 0, 200, 0) || undefined,
    paspartuMm: entero(body?.paspartuMm, 0, 300, 0) || undefined,
    sinMarco: body?.sinMarco === true ? true : undefined,
    reflejo: Number.isFinite(Number(body?.reflejo))
      ? Math.max(0, Math.min(1, Number(body.reflejo)))
      : undefined,
    acabado: recorta(body?.acabado, 20) || undefined,
  };

  await db.send(
    new PutItemCommand({
      TableName: T.catalogo,
      Item: marshall(opcion, { removeUndefinedValues: true }),
    })
  );
  return json(200, { ok: true });
}

const adminBorrarOpcion = (grupo, id) =>
  db
    .send(
      new DeleteItemCommand({
        TableName: T.catalogo,
        Key: marshall({ tipo: "opcion", id: CLAVE_OPCION(grupo, id) }),
      })
    )
    .then(() => json(200, { ok: true }));

async function adminGuardarTienda(body) {
  const tienda = {
    nombre: recorta(body?.nombre, 60) || "fefoto",
    bajada: recorta(body?.bajada, 300),
    correo: recorta(body?.correo, 120),
    telefono: recorta(body?.telefono, 40),
    whatsapp: recorta(body?.whatsapp, 20).replace(/\D/g, ""),
    instagram: recorta(body?.instagram, 60).replace(/^@/, ""),
    retiro: recorta(body?.retiro, 500),
    diasProduccion: entero(body?.diasProduccion, 0, 120, 7),
    banco: {
      titular: recorta(body?.banco?.titular, 100),
      rut: recorta(body?.banco?.rut, 20),
      banco: recorta(body?.banco?.banco, 60),
      tipo: recorta(body?.banco?.tipo, 40),
      numero: recorta(body?.banco?.numero, 40),
      correo: recorta(body?.banco?.correo, 120),
    },
  };
  await guardarConfig("tienda", tienda);
  return json(200, { ok: true });
}

async function adminGuardarRegiones(body) {
  const regiones = (Array.isArray(body?.regiones) ? body.regiones : [])
    .slice(0, 40)
    .map((r) => ({
      id: recorta(r?.id, 40),
      nombre: recorta(r?.nombre, 80),
      costo: entero(r?.costo, 0, 100000000, 0),
      activa: r?.activa !== false,
    }))
    .filter((r) => r.id && r.nombre);
  await guardarConfig("regiones", regiones);
  return json(200, { ok: true });
}

const ESTADOS = [
  "pendiente_pago",
  "pagado",
  "en_produccion",
  "listo",
  "despachado",
  "entregado",
  "anulado",
];

async function adminListarPedidos(mes) {
  if (!/^\d{4}-\d{2}$/.test(mes || "")) return json(400, { ok: false, error: "mes_invalido" });
  const pedidos = await queryTodo({
    TableName: T.pedidos,
    IndexName: "porMes",
    KeyConditionExpression: "mes = :m",
    ExpressionAttributeValues: marshall({ ":m": mes }),
    ScanIndexForward: false,
  });
  return json(200, { ok: true, pedidos });
}

/**
 * Mueve un pedido de estado.
 *
 * Dos efectos además del cambio: descontar el stock de las ediciones limitadas
 * la primera vez que se marca pagado, y avisarle por correo a quien compró
 * cuando el cambio le importa. Lo primero se hace una sola vez —marcando el
 * pedido— porque mover un pedido a pagado dos veces por error descontaría el
 * stock dos veces.
 */
async function cambiarEstado(pedidoId, body, quien) {
  const estado = ESTADOS.includes(body?.estado) ? body.estado : null;
  if (!estado) return json(400, { ok: false, error: "estado_invalido" });

  const r = await db.send(
    new GetItemCommand({ TableName: T.pedidos, Key: marshall({ pedidoId }) })
  );
  if (!r.Item) return json(404, { ok: false, error: "no_encontrado" });
  const antes = unmarshall(r.Item);

  const ahora = new Date().toISOString();
  const historial = [
    ...(antes.historial || []),
    { estado, fecha: ahora, quien, nota: recorta(body?.nota, 300) || undefined },
  ].slice(-40);

  const descontar = estado === "pagado" && !antes.stockDescontado;
  const pedido = {
    ...antes,
    estado,
    historial,
    stockDescontado: antes.stockDescontado || descontar,
  };

  await db.send(
    new PutItemCommand({
      TableName: T.pedidos,
      Item: marshall(pedido, { removeUndefinedValues: true }),
    })
  );

  if (descontar) {
    for (const item of pedido.items) {
      await db
        .send(
          new UpdateItemCommand({
            TableName: T.catalogo,
            Key: marshall({ tipo: "foto", id: item.fotoId }),
            UpdateExpression: "SET edicion.vendidas = edicion.vendidas + :n",
            // Solo si la obra es de edición limitada: en las demás no existe el
            // atributo y la condición hace que la actualización se salte sola.
            ConditionExpression: "attribute_exists(edicion)",
            ExpressionAttributeValues: marshall({ ":n": item.cantidad }),
          })
        )
        .catch(() => {});
    }
  }

  if (estado === "pagado" || estado === "despachado" || estado === "listo") {
    const tienda = await leerConfig("tienda", TIENDA_VACIA);
    await avisarEstado(pedido, tienda).catch((e) => console.error("correo estado", e));
  }

  return json(200, { ok: true, pedido: publico(pedido) });
}

/** Permiso temporal para subir un archivo directo a S3. */
async function urlSubida(body) {
  const tipo = body?.tipo === "original" ? "original" : "web";
  const contentType = recorta(body?.contentType, 100) || "application/octet-stream";
  if (!/^image\//.test(contentType) && tipo === "web")
    return json(400, { ok: false, error: "no_es_imagen" });

  const limpio = recorta(body?.nombre, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `${tipo}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${limpio}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 900 }
  );
  // La pública solo tiene sentido para web/: el original no se sirve nunca.
  return json(200, {
    ok: true,
    url,
    key,
    publica: tipo === "web" ? `https://${CDN}/${key}` : "",
  });
}

// ───────────────────── Analítica ─────────────────────

const RUTA_VALIDA = /^[a-z0-9/_-]{1,80}$/i;
const EVENTO_VALIDO = /^[a-z][a-z0-9_]{1,39}$/;

async function registrarVisita(body) {
  const dia = hoyLocal();
  const ruta = recorta(body?.ruta, 80);
  const evento = recorta(body?.evento, 40);
  if (ruta && !RUTA_VALIDA.test(ruta)) return json(200, { ok: true });
  if (evento && !EVENTO_VALIDO.test(evento)) return json(200, { ok: true });
  if (!ruta && !evento) return json(200, { ok: true });

  const ahora = new Date();
  const fila = {
    dia,
    sk: `${ahora.toISOString().slice(11, 19).replace(/:/g, "")}#${crypto.randomUUID().slice(0, 8)}`,
    ruta: ruta || undefined,
    evento: evento || undefined,
    obra: recorta(body?.obra, 60) || undefined,
    ref: recorta(body?.ref, 80),
    disp: body?.disp === "movil" ? "movil" : "escritorio",
    visitanteId: recorta(body?.visitanteId, 40),
    // 40 días: el resumen mira el mes en curso y sobra margen para el cierre.
    ttl: Math.floor(Date.now() / 1000) + 40 * 24 * 3600,
  };
  await db
    .send(
      new PutItemCommand({
        TableName: T.analitica,
        Item: marshall(fila, { removeUndefinedValues: true }),
      })
    )
    .catch(() => {});
  return json(200, { ok: true });
}

/** Los días del mes en curso que ya ocurrieron. */
function diasDelMes(mes) {
  const hoy = hoyLocal();
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimo; d++) {
    const dia = `${mes}-${String(d).padStart(2, "0")}`;
    if (dia <= hoy) dias.push(dia);
  }
  return dias;
}

async function adminResumen() {
  const mes = hoyLocal().slice(0, 7);
  const [pedidos, fotos] = await Promise.all([
    queryTodo({
      TableName: T.pedidos,
      IndexName: "porMes",
      KeyConditionExpression: "mes = :m",
      ExpressionAttributeValues: marshall({ ":m": mes }),
    }),
    leerTipo("foto"),
  ]);

  // Se cuenta como venta lo que ya está pagado. Un pedido pendiente todavía
  // puede no llegar nunca, y contarlo infla el mes con plata que no entró.
  const confirmados = pedidos.filter(
    (p) => p.estado !== "pendiente_pago" && p.estado !== "anulado"
  );

  const copias = new Map();
  for (const p of confirmados)
    for (const it of p.items || []) {
      const previo = copias.get(it.fotoId) || { fotoId: it.fotoId, titulo: it.titulo, copias: 0 };
      previo.copias += it.cantidad || 0;
      copias.set(it.fotoId, previo);
    }

  const porDia = diasDelMes(mes).map((dia) => ({
    dia,
    total: confirmados
      .filter((p) => (p.creado || "").slice(0, 10) === dia)
      .reduce((s, p) => s + (p.total || 0), 0),
  }));

  // Una consulta por día en vez de un scan: la tabla está particionada por día,
  // así que esto lee exactamente lo del mes y nada más.
  const visitas = await Promise.all(
    diasDelMes(mes).map((dia) =>
      db
        .send(
          new QueryCommand({
            TableName: T.analitica,
            KeyConditionExpression: "dia = :d",
            FilterExpression: "attribute_exists(ruta)",
            ExpressionAttributeValues: marshall({ ":d": dia }),
            Select: "COUNT",
          })
        )
        .then((r) => r.Count || 0)
        .catch(() => 0)
    )
  );

  return json(200, {
    ok: true,
    porRevisar: pedidos.filter((p) => p.estado === "pendiente_pago").length,
    enProduccion: pedidos.filter((p) =>
      ["pagado", "en_produccion", "listo"].includes(p.estado)
    ).length,
    ventasMes: confirmados.reduce((s, p) => s + (p.total || 0), 0),
    pedidosMes: confirmados.length,
    visitasMes: visitas.reduce((s, n) => s + n, 0),
    obras: fotos.filter((f) => f.activa !== false).length,
    masVendidas: [...copias.values()].sort((a, b) => b.copias - a.copias).slice(0, 5),
    porDia,
  });
}

// ───────────────────── Usuarios del panel ─────────────────────

async function adminListarUsuarios() {
  // Es la única tabla que se recorre entera. No tiene índice para listar y no
  // hace falta: son las pocas personas del equipo, y un scan de esa tabla
  // cuesta menos que mantener un índice para leerlo una vez al día.
  const r = await db.send(new ScanCommand({ TableName: T.usuarios }));
  return json(200, { ok: true, usuarios: (r.Items || []).map(unmarshall) });
}

async function adminGuardarUsuario(body) {
  const email = recorta(body?.email, 120).toLowerCase();
  if (!correoValido(email)) return json(400, { ok: false, error: "correo_invalido" });
  const rol = ROLES.includes(body?.rol) ? body.rol : "staff";
  await db.send(
    new PutItemCommand({
      TableName: T.usuarios,
      Item: marshall(
        { email, nombre: recorta(body?.nombre, 80), rol, activo: body?.activo !== false },
        { removeUndefinedValues: true }
      ),
    })
  );
  return json(200, { ok: true });
}

async function adminBorrarUsuario(email, quien) {
  if (email === quien) return json(400, { ok: false, error: "no_puedes_borrarte" });
  await db.send(
    new DeleteItemCommand({ TableName: T.usuarios, Key: marshall({ email }) })
  );
  return json(200, { ok: true });
}

// ───────────────────── Correo ─────────────────────

const escapar = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const clp = (n) =>
  "$" + Math.round(Number(n) || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 });

const LATON = "#a4854b";
const TIPO_LETRA = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/**
 * Envoltorio del correo.
 *
 * Fondo claro y tabla de 600 px, que es lo que sobrevive intacto en Gmail,
 * Outlook y el cliente de iPhone. El sitio es oscuro, pero un correo oscuro se
 * ve roto en la mitad de los clientes que fuerzan su propio tema.
 */
const ENVOLTORIO = ({ preheader = "", cuerpo }) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3f0;font-family:${TIPO_LETRA};color:#1d1d1c">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapar(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3f0;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e6e3dd;border-radius:6px;overflow:hidden">
<tr><td style="padding:26px 32px 18px;border-bottom:1px solid #eeebe5">
  <span style="font-size:20px;letter-spacing:5px;color:#1d1d1c">fefoto</span>
</td></tr>
<tr><td style="padding:28px 32px 32px;font-size:15px;line-height:1.65;color:#3c3c39">${cuerpo}</td></tr>
<tr><td style="padding:18px 32px;background:#faf9f7;border-top:1px solid #eeebe5;font-size:12px;color:#8a8a85">
  Este correo se envió automáticamente desde <a href="${SITIO}" style="color:${LATON}">fefoto</a>. Puedes responderlo si necesitas algo.
</td></tr>
</table></td></tr></table></body></html>`;

const FILA = (k, v) =>
  `<tr><td style="padding:6px 0;color:#8a8a85;font-size:13px">${escapar(k)}</td>
   <td style="padding:6px 0;text-align:right;font-size:13px;color:#1d1d1c">${escapar(v)}</td></tr>`;

async function enviarCorreo({ para, asunto, html, responderA }) {
  if (!REMITENTE || !para) return;
  const { cliente, SendEmailCommand } = await cargarSes();
  await cliente.send(
    new SendEmailCommand({
      FromEmailAddress: REMITENTE,
      Destination: { ToAddresses: [para] },
      ReplyToAddresses: responderA ? [responderA] : undefined,
      Content: {
        Simple: {
          Subject: { Data: asunto, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
      },
    })
  );
}

const detalleItems = (pedido) =>
  pedido.items
    .map(
      (it) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eeebe5">
      <div style="font-size:15px;color:#1d1d1c">${escapar(it.titulo)}${it.cantidad > 1 ? ` × ${it.cantidad}` : ""}</div>
      <div style="font-size:12px;color:#8a8a85;margin-top:3px">${escapar(it.lineas.map((l) => l.nombre).join(" · "))}</div>
    </td><td style="padding:12px 0;border-bottom:1px solid #eeebe5;text-align:right;font-size:14px;white-space:nowrap">${clp(it.total)}</td></tr>`
    )
    .join("");

/** Confirmación con los datos para transferir. */
async function avisarPedido(pedido, tienda) {
  const b = tienda?.banco || {};
  const enlace = `${SITIO}/#/pedido/${pedido.pedidoId}`;
  const datosBanco = b.numero
    ? `<table role="presentation" width="100%" style="margin:8px 0 4px">
        ${FILA("Titular", b.titular)}${FILA("RUT", b.rut)}${FILA("Banco", b.banco)}
        ${FILA("Tipo de cuenta", b.tipo)}${FILA("Número", b.numero)}${FILA("Correo", b.correo)}
        ${FILA("Monto", clp(pedido.total))}${FILA("Mensaje", pedido.numero)}
      </table>`
    : `<p style="color:#8a8a85">Te escribiremos con los datos para transferir.</p>`;

  await enviarCorreo({
    para: pedido.cliente.email,
    asunto: `Tu pedido ${pedido.numero} en fefoto`,
    html: ENVOLTORIO({
      preheader: `Pedido ${pedido.numero} recibido. Estos son los datos para transferir.`,
      cuerpo: `
        <p style="margin:0 0 16px">Hola ${escapar(pedido.cliente.nombre.split(" ")[0])}, recibimos tu pedido <strong>${escapar(pedido.numero)}</strong>.</p>
        <p style="margin:0 0 20px">Para empezar a producirlo necesitamos la transferencia. Cuando la confirmemos te avisamos por acá.</p>
        <div style="background:#faf9f7;border:1px solid #eeebe5;border-radius:5px;padding:16px 18px;margin:0 0 22px">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${LATON};margin-bottom:6px">Para transferir</div>
          ${datosBanco}
        </div>
        <table role="presentation" width="100%">${detalleItems(pedido)}
          ${FILA(pedido.entrega.modo === "retiro" ? "Retiro" : "Despacho", pedido.envio ? clp(pedido.envio) : "sin costo")}
          <tr><td style="padding:14px 0 0;font-size:13px;color:#8a8a85">Total</td>
              <td style="padding:14px 0 0;text-align:right;font-size:22px;color:#1d1d1c">${clp(pedido.total)}</td></tr>
        </table>
        <p style="margin:26px 0 0"><a href="${enlace}" style="background:${LATON};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;display:inline-block;font-size:14px">Ver mi pedido</a></p>
        <p style="margin:18px 0 0;font-size:12px;color:#8a8a85">Guarda este enlace: ahí puedes ver en qué va tu pedido en cualquier momento.</p>`,
    }),
    responderA: tienda?.correo || undefined,
  });
}

const TEXTO_ESTADO = {
  pagado: "Confirmamos tu pago. Tu pedido entra a producción.",
  listo: "Tu pedido está listo.",
  despachado: "Tu pedido va en camino.",
};

async function avisarEstado(pedido, tienda) {
  const texto = TEXTO_ESTADO[pedido.estado];
  if (!texto) return;
  const enlace = `${SITIO}/#/pedido/${pedido.pedidoId}`;
  const cierre =
    pedido.estado === "pagado"
      ? `<p style="margin:0 0 20px">La producción toma unos ${escapar(tienda?.diasProduccion ?? 7)} días hábiles.</p>`
      : pedido.estado === "listo" && pedido.entrega.modo === "retiro"
        ? `<p style="margin:0 0 20px">${escapar(tienda?.retiro || "Te contactamos para coordinar el retiro.")}</p>`
        : "";

  await enviarCorreo({
    para: pedido.cliente.email,
    asunto: `${pedido.numero} — ${texto}`,
    html: ENVOLTORIO({
      preheader: texto,
      cuerpo: `
        <p style="margin:0 0 16px">Hola ${escapar(pedido.cliente.nombre.split(" ")[0])},</p>
        <p style="margin:0 0 16px;font-size:17px;color:#1d1d1c">${escapar(texto)}</p>
        ${cierre}
        <table role="presentation" width="100%">${detalleItems(pedido)}</table>
        <p style="margin:26px 0 0"><a href="${enlace}" style="background:${LATON};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;display:inline-block;font-size:14px">Ver mi pedido</a></p>`,
    }),
    responderA: tienda?.correo || undefined,
  });
}

// ───────────────────── Router ─────────────────────

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  const path = (event.rawPath || "/").replace(/\/+$/, "") || "/";
  const q = event.queryStringParameters || {};
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const conCors = (res) => ({ ...res, headers: { ...(res.headers || {}), ...cors(origin) } });

  const leerCuerpo = () => {
    try {
      return JSON.parse(event.body || "{}");
    } catch {
      return null;
    }
  };

  try {
    if (method === "OPTIONS") return conCors({ statusCode: 204 });

    // ── Zona del cliente: cualquiera con sesión, solo lo suyo ──
    if (path.startsWith("/mi/")) {
      const yo = emailDelToken(event);
      if (method === "GET" && path === "/mi/pedidos") return conCors(await misPedidos(yo));
      return conCors(json(404, { ok: false, error: "ruta_no_encontrada", path }));
    }

    // ── Panel ──
    if (path.startsWith("/admin")) {
      const email = emailDelToken(event);
      const rol = await rolDe(email);
      if (!rol) return conCors(json(403, { ok: false, error: "sin_permisos", email }));

      // Permisos de escritura por rol:
      //   admin → todo
      //   staff → pedidos y obras (el trabajo del día a día)
      // Precios, datos de la tienda y usuarios quedan en admin: son las tres
      // cosas donde una edición distraída cuesta plata.
      if (method !== "GET" && rol !== "admin") {
        const permitido =
          path.startsWith("/admin/pedidos") ||
          path.startsWith("/admin/fotos") ||
          path.startsWith("/admin/subida");
        if (!permitido)
          return conCors(json(403, { ok: false, error: "sin_permiso_para_esta_accion" }));
      }

      if (method === "GET" && path === "/admin/yo")
        return conCors(json(200, { ok: true, email, rol }));

      let body = {};
      if (method === "PUT" || method === "POST") {
        body = leerCuerpo();
        if (body === null) return conCors(json(400, { ok: false, error: "json_invalido" }));
      }

      if (method === "GET" && path === "/admin/resumen") return conCors(await adminResumen());

      if (method === "GET" && path === "/admin/fotos") return conCors(await adminListarFotos());
      if (method === "PUT" && path === "/admin/fotos")
        return conCors(await adminGuardarFoto(body));
      const mFoto = path.match(/^\/admin\/fotos\/([^/]+)$/);
      if (method === "DELETE" && mFoto)
        return conCors(await adminBorrarFoto(decodeURIComponent(mFoto[1])));

      if (method === "GET" && path === "/admin/opciones")
        return conCors(await adminListarOpciones());
      if (method === "PUT" && path === "/admin/opciones")
        return conCors(await adminGuardarOpcion(body));
      const mOp = path.match(/^\/admin\/opciones\/([^/]+)\/([^/]+)$/);
      if (method === "DELETE" && mOp)
        return conCors(
          await adminBorrarOpcion(decodeURIComponent(mOp[1]), decodeURIComponent(mOp[2]))
        );

      if (method === "GET" && path === "/admin/tienda")
        return conCors(json(200, { ok: true, tienda: await leerConfig("tienda", TIENDA_VACIA) }));
      if (method === "PUT" && path === "/admin/tienda")
        return conCors(await adminGuardarTienda(body));

      if (method === "GET" && path === "/admin/regiones")
        return conCors(json(200, { ok: true, regiones: await leerConfig("regiones", []) }));
      if (method === "PUT" && path === "/admin/regiones")
        return conCors(await adminGuardarRegiones(body));

      if (method === "GET" && path === "/admin/pedidos")
        return conCors(await adminListarPedidos(q.mes));
      const mEstado = path.match(/^\/admin\/pedidos\/([^/]+)\/estado$/);
      if (method === "PUT" && mEstado)
        return conCors(await cambiarEstado(decodeURIComponent(mEstado[1]), body, email));

      if (method === "POST" && path === "/admin/subida") return conCors(await urlSubida(body));

      if (method === "GET" && path === "/admin/usuarios")
        return conCors(await adminListarUsuarios());
      if (method === "PUT" && path === "/admin/usuarios")
        return conCors(await adminGuardarUsuario(body));
      const mUsr = path.match(/^\/admin\/usuarios\/([^/]+)$/);
      if (method === "DELETE" && mUsr)
        return conCors(
          await adminBorrarUsuario(decodeURIComponent(mUsr[1]).toLowerCase(), email)
        );

      return conCors(json(404, { ok: false, error: "ruta_admin_no_encontrada", path }));
    }

    // ── Público ──
    if (method === "GET" && path === "/catalogo") return conCors(await catalogoPublico());

    if (method === "POST" && path === "/pedidos") {
      const body = leerCuerpo();
      if (body === null) return conCors(json(400, { ok: false, error: "json_invalido" }));
      return conCors(await crearPedido(body));
    }

    const mPedido = path.match(/^\/pedidos\/([^/]+)$/);
    if (method === "GET" && mPedido)
      return conCors(await verPedido(decodeURIComponent(mPedido[1])));

    if (method === "POST" && path === "/analitica")
      return conCors(await registrarVisita(leerCuerpo() || {}));

    return conCors(json(404, { ok: false, error: "ruta_no_encontrada", path }));
  } catch (e) {
    console.error(e);
    return conCors(json(500, { ok: false, error: "error_interno" }));
  }
};
