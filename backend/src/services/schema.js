const LABELS = [
  'Numero',
  'Persona',
  'Operadora',
  'Dispositivo',
  'Llamada',
  'Mensaje',
  'Reporte',
  'Sospechoso',
  'Bloqueado',
  'Verificado',
];

const RELATIONSHIPS = [
  'ORIGINO',
  'DIRIGIDA_A',
  'ENVIO',
  'RECIBIDO_POR',
  'ES_TITULAR_DE',
  'PERTENECE_A',
  'USO_NUMERO',
  'REALIZO_REPORTE',
  'INVOLUCRA_NUMERO',
  'GENERO',
  'CONTACTO_FRECUENTE',
  'VICTIMA_DE',
];

const RELATIONSHIP_LABELS = {
  ORIGINO: { origen: 'Numero', destino: 'Llamada' },
  DIRIGIDA_A: { origen: 'Llamada', destino: 'Numero' },
  ENVIO: { origen: 'Numero', destino: 'Mensaje' },
  RECIBIDO_POR: { origen: 'Mensaje', destino: 'Numero' },
  ES_TITULAR_DE: { origen: 'Persona', destino: 'Numero' },
  PERTENECE_A: { origen: 'Numero', destino: 'Operadora' },
  USO_NUMERO: { origen: 'Dispositivo', destino: 'Numero' },
  REALIZO_REPORTE: { origen: 'Persona', destino: 'Reporte' },
  INVOLUCRA_NUMERO: { origen: 'Reporte', destino: 'Numero' },
  GENERO: { origen: 'Llamada', destino: 'Reporte' },
  CONTACTO_FRECUENTE: { origen: 'Numero', destino: 'Numero' },
  VICTIMA_DE: { origen: 'Persona', destino: 'Numero' },
};

module.exports = {
  LABELS,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
};
