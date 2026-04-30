const { faker } = require('@faker-js/faker');
const { getSession } = require('./neo4j');
const logger = require('./logger');

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function generateOperadoras() {
  return [
    {
      nombre: 'Tigo',
      pais: 'Guatemala',
      tipo: 'movil',
      activa: true,
      clientes_millones: 8.5,
      fecha_fundacion: '1999-03-01',
      departamentos_cobertura: ['Guatemala', 'Quetzaltenango', 'Escuintla'],
    },
    {
      nombre: 'Claro',
      pais: 'Guatemala',
      tipo: 'movil',
      activa: true,
      clientes_millones: 7.2,
      fecha_fundacion: '2004-06-01',
      departamentos_cobertura: ['Guatemala', 'Petén', 'Zacapa'],
    },
    {
      nombre: 'Movistar',
      pais: 'Guatemala',
      tipo: 'movil',
      activa: true,
      clientes_millones: 2.1,
      fecha_fundacion: '2005-01-15',
      departamentos_cobertura: ['Guatemala', 'Suchitepéquez'],
    },
    {
      nombre: 'Telefonica Fija',
      pais: 'Guatemala',
      tipo: 'fijo',
      activa: true,
      clientes_millones: 0.4,
      fecha_fundacion: '1992-11-01',
      departamentos_cobertura: ['Guatemala'],
    },
  ];
}

function generatePersonas(count) {
  return Array.from({ length: count }).map(() => ({
    nombre: faker.person.fullName(),
    dpi: faker.string.numeric({ length: 13 }),
    edad: faker.number.int({ min: 18, max: 75 }),
    departamento: faker.location.state(),
    es_sospechoso: false,
    fecha_registro: faker.date.past({ years: 2 }).toISOString().slice(0, 10),
    roles: ['victima'],
  }));
}

function generateNumeros(count) {
  return Array.from({ length: count }).map(() => ({
    numero: `502-${faker.string.numeric({ length: 4 })}-${faker.string.numeric({ length: 4 })}`,
    activo: true,
    tipo: faker.helpers.arrayElement(['prepago', 'pospago']),
    fecha_registro: faker.date.past({ years: 3 }).toISOString().slice(0, 10),
    total_reportes: 0,
    score_riesgo: 0,
    etiquetas: [],
  }));
}

function generateDispositivos(count) {
  return Array.from({ length: count }).map(() => ({
    imei: faker.string.numeric({ length: 15 }),
    marca: faker.helpers.arrayElement(['Samsung', 'Xiaomi', 'Motorola', 'Apple']),
    modelo: faker.helpers.arrayElement(['A14', 'Redmi 12', 'Moto G', 'iPhone 12']),
    sistema_operativo: faker.helpers.arrayElement(['Android 13', 'Android 14', 'iOS 17']),
    reportado: false,
    fecha_primer_uso: faker.date.past({ years: 2 }).toISOString().slice(0, 10),
    numeros_distintos_usados: faker.number.int({ min: 1, max: 7 }),
  }));
}

function generateLlamadas(count, numeroIds, fraudOrigins = [], fraudeRatio = 0) {
  return Array.from({ length: count }).map(() => {
    const isFraud = Math.random() < fraudeRatio && fraudOrigins.length > 0;
    const origenId = isFraud
      ? faker.helpers.arrayElement(fraudOrigins)
      : faker.helpers.arrayElement(numeroIds);
    let destinoId = faker.helpers.arrayElement(numeroIds);
    if (destinoId === origenId && numeroIds.length > 1) {
      destinoId = faker.helpers.arrayElement(numeroIds.filter((id) => id !== origenId));
    }
    const hora = isFraud
      ? `0${faker.number.int({ min: 0, max: 4 })}:${faker.number.int({ min: 0, max: 59 })
          .toString()
          .padStart(2, '0')}:00`
      : faker.date.recent().toISOString().slice(11, 19);

    return {
      id_cdr: `CDR-${faker.string.numeric({ length: 6 })}`,
      duracion_segundos: faker.number.int({ min: 10, max: 600 }),
      fecha: faker.date.recent({ days: 60 }).toISOString().slice(0, 10),
      hora,
      sospechosa: isFraud,
      score_riesgo: isFraud
        ? faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 })
        : faker.number.float({ min: 0, max: 0.3, precision: 0.01 }),
      palabras_detectadas: isFraud ? ['amenaza'] : [],
      origenId,
      destinoId,
    };
  });
}

function generateMensajes(count, numeroIds, fraudOrigins = [], fraudeRatio = 0) {
  return Array.from({ length: count }).map(() => {
    const isFraud = Math.random() < fraudeRatio && fraudOrigins.length > 0;
    const origenId = isFraud
      ? faker.helpers.arrayElement(fraudOrigins)
      : faker.helpers.arrayElement(numeroIds);
    let destinoId = faker.helpers.arrayElement(numeroIds);
    if (destinoId === origenId && numeroIds.length > 1) {
      destinoId = faker.helpers.arrayElement(numeroIds.filter((id) => id !== origenId));
    }
    return {
      id_mensaje: `MSG-${faker.string.numeric({ length: 6 })}`,
      tipo: faker.helpers.arrayElement(['SMS', 'WhatsApp']),
      fecha: faker.date.recent({ days: 60 }).toISOString().slice(0, 10),
      contiene_amenaza: isFraud,
      longitud_caracteres: faker.number.int({ min: 20, max: 280 }),
      score_riesgo: isFraud
        ? faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 })
        : faker.number.float({ min: 0, max: 0.3, precision: 0.01 }),
      palabras_clave: isFraud ? ['dinero', 'amenaza'] : [],
      origenId,
      destinoId,
    };
  });
}

function generateReportes(count, personaIds, numeroIds) {
  return Array.from({ length: count }).map(() => ({
    id_reporte: `REP-${faker.string.numeric({ length: 6 })}`,
    tipo_fraude: faker.helpers.arrayElement(['extorsion', 'estafa', 'amenaza']),
    fecha: faker.date.recent({ days: 60 }).toISOString().slice(0, 10),
    estado: faker.helpers.arrayElement(['pendiente', 'investigando', 'cerrado']),
    monto_afectado: faker.number.float({ min: 0, max: 5000, precision: 0.01 }),
    verificado: false,
    evidencias: ['captura_pantalla'],
    personaId: faker.helpers.arrayElement(personaIds),
    numeroId: faker.helpers.arrayElement(numeroIds),
  }));
}

async function runBatched(session, query, rows, batchSize = 500) {
  const chunks = chunkArray(rows, batchSize);
  for (const chunk of chunks) {
    await session.run(query, { rows: chunk });
  }
}

async function generarDataset({
  personas = 400,
  numeros = 500,
  operadoras = 4,
  dispositivos = 300,
  llamadas = 2500,
  mensajes = 1500,
  reportes = 300,
  inyectarFraude = false,
  fraudeRatio = 0.2,
  ensureConexo = true,
} = {}) {
  const session = getSession();
  try {
    logger.info('Simulador inicio', {
      personas,
      numeros,
      operadoras,
      dispositivos,
      llamadas,
      mensajes,
      reportes,
      inyectarFraude,
      fraudeRatio,
    });
    const operadorasData = generateOperadoras().slice(0, operadoras);
    await runBatched(
      session,
      `UNWIND $rows AS row
       MERGE (o:Operadora {nombre: row.nombre})
       SET o += row`,
      operadorasData,
      100
    );

    const personasData = generatePersonas(personas);
    await runBatched(
      session,
      `UNWIND $rows AS row
       CREATE (p:Persona)
       SET p = row`,
      personasData
    );

    const numerosData = generateNumeros(numeros);
    await runBatched(
      session,
      `UNWIND $rows AS row
       CREATE (n:Numero)
       SET n = row`,
      numerosData
    );

    const dispositivosData = generateDispositivos(dispositivos);
    await runBatched(
      session,
      `UNWIND $rows AS row
       CREATE (d:Dispositivo)
       SET d = row`,
      dispositivosData
    );

    const numeroIds = (await session.run(`MATCH (n:Numero) RETURN id(n) AS id`)).records.map(
      (r) => r.get('id')
    );
    const personaIds = (await session.run(`MATCH (p:Persona) RETURN id(p) AS id`)).records.map(
      (r) => r.get('id')
    );
    const operadoraIds = (await session.run(`MATCH (o:Operadora) RETURN id(o) AS id`)).records.map(
      (r) => r.get('id')
    );
    const dispositivoIds = (
      await session.run(`MATCH (d:Dispositivo) RETURN id(d) AS id`)
    ).records.map((r) => r.get('id'));

    if (numeroIds.length && personaIds.length) {
      const titularRows = numeroIds.map((numeroId) => ({
        numeroId,
        personaId: faker.helpers.arrayElement(personaIds),
      }));
      await runBatched(
        session,
        `UNWIND $rows AS row
         MATCH (p:Persona) WHERE id(p) = row.personaId
         MATCH (n:Numero) WHERE id(n) = row.numeroId
         MERGE (p)-[:ES_TITULAR_DE {fecha_desde: date('2023-01-01'), verificado: true, tipo_contrato: 'prepago'}]->(n)`,
        titularRows
      );
    }

    if (numeroIds.length && operadoraIds.length) {
      const pertenenciaRows = numeroIds.map((numeroId) => ({
        numeroId,
        operadoraId: faker.helpers.arrayElement(operadoraIds),
      }));
      await runBatched(
        session,
        `UNWIND $rows AS row
         MATCH (n:Numero) WHERE id(n) = row.numeroId
         MATCH (o:Operadora) WHERE id(o) = row.operadoraId
         MERGE (n)-[:PERTENECE_A {fecha_activacion: date('2023-01-01'), plan: 'basico', activo: true}]->(o)`,
        pertenenciaRows
      );
    }

    if (dispositivoIds.length && numeroIds.length) {
      const usoRows = dispositivoIds.map((dispositivoId) => ({
        dispositivoId,
        numeroId: faker.helpers.arrayElement(numeroIds),
      }));
      await runBatched(
        session,
        `UNWIND $rows AS row
         MATCH (d:Dispositivo) WHERE id(d) = row.dispositivoId
         MATCH (n:Numero) WHERE id(n) = row.numeroId
         MERGE (d)-[:USO_NUMERO {fecha_desde: date('2023-02-01'), fecha_hasta: date('2024-02-01'), uso_simultaneo: false, dias_activo: 120}]->(n)`,
        usoRows
      );
    }

    const fraudOrigins = inyectarFraude
      ? faker.helpers.arrayElements(numeroIds, Math.min(3, numeroIds.length))
      : [];
    const ratio = inyectarFraude ? fraudeRatio : 0;
    const llamadasData = generateLlamadas(llamadas, numeroIds, fraudOrigins, ratio);
    if (!numeroIds.length && llamadasData.length) {
      logger.warn('Simulador sin Numero', { llamadas: llamadasData.length });
      return {
        error: 'No existen Numero para generar llamadas/mensajes',
      };
    }
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (o:Numero) WHERE id(o) = row.origenId
       MATCH (d:Numero) WHERE id(d) = row.destinoId
       CREATE (l:Llamada)
       SET l = row
       WITH o, d, l
       CREATE (o)-[:ORIGINO {fecha: l.fecha, hora: l.hora, desde_dispositivo: 'desconocido'}]->(l)
       CREATE (l)-[:DIRIGIDA_A {recibida: true, contestada: true, duracion_contestada: l.duracion_segundos}]->(d)`,
      llamadasData
    );

    const mensajesData = generateMensajes(mensajes, numeroIds, fraudOrigins, ratio);
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (o:Numero) WHERE id(o) = row.origenId
       MATCH (d:Numero) WHERE id(d) = row.destinoId
       CREATE (m:Mensaje)
       SET m = row
       WITH o, d, m
       CREATE (o)-[:ENVIO {fecha: m.fecha, hora: '12:00:00', plataforma: m.tipo}]->(m)
       CREATE (m)-[:RECIBIDO_POR {fecha_lectura: m.fecha, leido: true, bloqueado: false}]->(d)`,
      mensajesData
    );

    const reportesData = generateReportes(reportes, personaIds, numeroIds);
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (p:Persona) WHERE id(p) = row.personaId
       MATCH (n:Numero) WHERE id(n) = row.numeroId
       CREATE (r:Reporte)
       SET r = row
       WITH p, n, r
       CREATE (p)-[:REALIZO_REPORTE {fecha: r.fecha, canal: 'web', anonimo: false}]->(r)
       CREATE (r)-[:INVOLUCRA_NUMERO {nivel_certeza: 0.5, tipo_evidencia: 'captura_pantalla', prioridad: 2}]->(n)`,
      reportesData
    );

    if (ensureConexo && numeroIds.length > 1) {
      const hubId = numeroIds[0];
      const conectRows = numeroIds
        .slice(1)
        .map((numeroId) => ({ numeroId, hubId }));
      await runBatched(
        session,
        `UNWIND $rows AS row
         MATCH (n:Numero) WHERE id(n) = row.numeroId
         MATCH (h:Numero) WHERE id(h) = row.hubId
         MERGE (n)-[:CONTACTO_FRECUENTE {veces_contacto: 1, ultima_vez: date(), patron_detectado: 'conector', horarios: ['12:00']}]->(h)`,
        conectRows
      );
    }

    if (inyectarFraude) {
      logger.info('Simulador inyectar fraude');
      await session.run(
        `MATCH (n:Numero)
         WITH n LIMIT 1
         MATCH (v:Numero)
         WITH n, collect(v)[0..60] AS victimas
         UNWIND victimas AS v
         CREATE (n)-[:CONTACTO_FRECUENTE {veces_contacto: 12, ultima_vez: date(), patron_detectado: 'estrella', horarios: ['01:00','02:00']}]->(v)`
      );

      await session.run(
        `MATCH (d:Dispositivo)
         WITH d LIMIT 1
         MATCH (n:Numero)
         WITH d, collect(n)[0..5] AS numeros
         UNWIND numeros AS n
         MERGE (d)-[:USO_NUMERO {fecha_desde: date('2024-01-01'), fecha_hasta: date('2024-04-01'), uso_simultaneo: true, dias_activo: 90}]->(n)`
      );

      await session.run(
        `MATCH (s:Numero)
         WITH s LIMIT 1
         MATCH (v:Numero)
         WITH s, collect(v)[0..15] AS victimas
         UNWIND victimas AS v
         CREATE (l:Llamada {
           id_cdr: 'CDR-NOC-' + toString(id(v)) + '-' + toString(id(s)),
           duracion_segundos: 35,
           fecha: date(),
           hora: '02:30:00',
           sospechosa: true,
           score_riesgo: 0.9,
           palabras_detectadas: ['amenaza']
         })
         CREATE (s)-[:ORIGINO {fecha: date(), hora: '02:30:00', desde_dispositivo: 'desconocido'}]->(l)
         CREATE (l)-[:DIRIGIDA_A {recibida: false, contestada: false, duracion_contestada: 0}]->(v)`
      );

      await session.run(
        `MATCH (s:Numero)
         WITH s LIMIT 1
         MATCH (v:Numero)
         WITH s, collect(v)[0..10] AS victimas
         UNWIND victimas AS v
         CREATE (m:Mensaje {
           id_mensaje: 'MSG-AME-' + toString(id(v)) + '-' + toString(id(s)),
           tipo: 'SMS',
           fecha: date(),
           contiene_amenaza: true,
           longitud_caracteres: 120,
           score_riesgo: 0.95,
           palabras_clave: ['dinero', 'amenaza']
         })
         CREATE (s)-[:ENVIO {fecha: date(), hora: '00:45:00', plataforma: 'SMS'}]->(m)
         CREATE (m)-[:RECIBIDO_POR {fecha_lectura: date(), leido: true, bloqueado: false}]->(v)`
      );

      await session.run(
        `MATCH (n:Numero)
         WITH n LIMIT 5
         WITH collect(n) AS ns
         UNWIND ns AS a
         UNWIND ns AS b
         WITH a, b WHERE id(a) <> id(b)
         MERGE (a)-[:CONTACTO_FRECUENTE {veces_contacto: 7, ultima_vez: date(), patron_detectado: 'coordinado', horarios: ['00:30','03:20']}]->(b)`
      );

      await session.run(
        `MATCH (n:Numero)
         WITH n LIMIT 10
         SET n.score_riesgo = 0.8, n.total_reportes = 4
         SET n:Sospechoso`
      );
    }

    return {
      operadoras: operadorasData.length,
      personas: personasData.length,
      numeros: numerosData.length,
      dispositivos: dispositivosData.length,
      llamadas: llamadasData.length,
      mensajes: mensajesData.length,
      reportes: reportesData.length,
      inyectarFraude,
    };
  } finally {
    logger.info('Simulador fin');
    await session.close();
  }
}

module.exports = {
  generarDataset,
};
