const fs = require('fs');
const file = './backend/src/routes/relaciones.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/Number\(origenId\)/g, 'String(origenId)');
content = content.replace(/Number\(destinoId\)/g, 'String(destinoId)');
content = content.replace(/Number\(req\.params\.id\)/g, 'String(req.params.id)');

content = content.replace(/WHERE id\(r\) = row\.id/g, 'WHERE elementId(r) = toString(row.id) OR toString(id(r)) = toString(row.id)');
content = content.replace(/WHERE id\(r\) = id/g, 'WHERE elementId(r) = toString(id) OR toString(id(r)) = toString(id)');
content = content.replace(/WHERE id\(r\) = \$id/g, 'WHERE elementId(r) = toString($id) OR toString(id(r)) = toString($id)');

content = content.replace(/WHERE id\(origen\) = \$origenId/g, 'WHERE elementId(origen) = toString($origenId) OR toString(id(origen)) = toString($origenId)');
content = content.replace(/WHERE id\(destino\) = \$destinoId/g, 'WHERE elementId(destino) = toString($destinoId) OR toString(id(destino)) = toString($destinoId)');
content = content.replace(/WHERE id\(a\) = \$origenId/g, 'WHERE elementId(a) = toString($origenId) OR toString(id(a)) = toString($origenId)');
content = content.replace(/WHERE id\(b\) = \$destinoId/g, 'WHERE elementId(b) = toString($destinoId) OR toString(id(b)) = toString($destinoId)');

content = content.replace(/props: propiedades \|\| \{\},/g, "props: { ...(propiedades || {}), createdAt: Date.now() },");

fs.writeFileSync(file, content);
console.log('relaciones.js updated');