// Ejemplo de carga CSV por entidad usando AuraDB
// Ajusta el path al bucket o URL del CSV

// Numeros
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
CREATE (:Numero {
  numero: row.numero,
  activo: row.activo = 'true',
  tipo: row.tipo,
  fecha_registro: date(row.fecha_registro),
  total_reportes: toInteger(row.total_reportes),
  score_riesgo: toFloat(row.score_riesgo),
  etiquetas: split(row.etiquetas, ';')
});

// Personas
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
CREATE (:Persona {
  nombre: row.nombre,
  dpi: row.dpi,
  edad: toInteger(row.edad),
  departamento: row.departamento,
  es_sospechoso: row.es_sospechoso = 'true',
  fecha_registro: date(row.fecha_registro),
  roles: split(row.roles, ';')
});

// Operadoras
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
CREATE (:Operadora {
  nombre: row.nombre,
  pais: row.pais,
  tipo: row.tipo,
  activa: row.activa = 'true',
  clientes_millones: toFloat(row.clientes_millones),
  fecha_fundacion: date(row.fecha_fundacion),
  departamentos_cobertura: split(row.departamentos_cobertura, ';')
});

// Dispositivos
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
CREATE (:Dispositivo {
  imei: row.imei,
  marca: row.marca,
  modelo: row.modelo,
  sistema_operativo: row.sistema_operativo,
  reportado: row.reportado = 'true',
  fecha_primer_uso: date(row.fecha_primer_uso),
  numeros_distintos_usados: toInteger(row.numeros_distintos_usados)
});

// Llamadas + relaciones
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
MATCH (o:Numero {numero: row.numero_origen})
MATCH (d:Numero {numero: row.numero_destino})
CREATE (l:Llamada {
  id_cdr: row.id_cdr,
  duracion_segundos: toInteger(row.duracion_segundos),
  fecha: date(row.fecha),
  hora: row.hora,
  sospechosa: row.sospechosa = 'true',
  score_riesgo: toFloat(row.score_riesgo),
  palabras_detectadas: split(row.palabras_detectadas, ';')
})
CREATE (o)-[:ORIGINO {fecha: date(row.fecha), hora: row.hora, desde_dispositivo: row.desde_dispositivo}]->(l)
CREATE (l)-[:DIRIGIDA_A {recibida: row.recibida = 'true', contestada: row.contestada = 'true', duracion_contestada: toInteger(row.duracion_contestada)}]->(d);

// Mensajes + relaciones
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
MATCH (o:Numero {numero: row.numero_origen})
MATCH (d:Numero {numero: row.numero_destino})
CREATE (m:Mensaje {
  id_mensaje: row.id_mensaje,
  tipo: row.tipo,
  fecha: date(row.fecha),
  contiene_amenaza: row.contiene_amenaza = 'true',
  longitud_caracteres: toInteger(row.longitud_caracteres),
  score_riesgo: toFloat(row.score_riesgo),
  palabras_clave: split(row.palabras_clave, ';')
})
CREATE (o)-[:ENVIO {fecha: date(row.fecha), hora: row.hora, plataforma: row.tipo}]->(m)
CREATE (m)-[:RECIBIDO_POR {fecha_lectura: date(row.fecha_lectura), leido: row.leido = 'true', bloqueado: row.bloqueado = 'true'}]->(d);

// Reportes + relaciones
LOAD CSV WITH HEADERS FROM $csvUrl AS row
WITH row
MATCH (p:Persona {dpi: row.dpi})
MATCH (n:Numero {numero: row.numero})
CREATE (r:Reporte {
  id_reporte: row.id_reporte,
  tipo_fraude: row.tipo_fraude,
  fecha: date(row.fecha),
  estado: row.estado,
  monto_afectado: toFloat(row.monto_afectado),
  verificado: row.verificado = 'true',
  evidencias: split(row.evidencias, ';')
})
CREATE (p)-[:REALIZO_REPORTE {fecha: date(row.fecha), canal: row.canal, anonimo: row.anonimo = 'true'}]->(r)
CREATE (r)-[:INVOLUCRA_NUMERO {nivel_certeza: toFloat(row.nivel_certeza), tipo_evidencia: row.tipo_evidencia, prioridad: toInteger(row.prioridad)}]->(n);
