# Backend — Detección de Fraude Telefónico

## Variables de entorno

```
NEO4J_URI=neo4j+s://<id>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=********
PORT=4000
```

## Scripts sugeridos

- `npm start`
- `npm run dev` (reinicio automatico con nodemon)

## Carga inicial sugerida

Endpoint: `POST /api/simulador/generar`

```json
{
  "operadoras": 4,
  "personas": 400,
  "numeros": 500,
  "dispositivos": 300,
  "llamadas": 2500,
  "mensajes": 1500,
  "reportes": 300,
  "inyectarFraude": true,
  "fraudeRatio": 0.2
}
```

## GDS (opcional)

Endpoint: `POST /api/datascience/ejecutar`

- Requiere plugin Graph Data Science habilitado en AuraDB.

## Notas

- Todas las queries usan parámetros.
- Se usa `UNWIND` para inserciones por lote.
