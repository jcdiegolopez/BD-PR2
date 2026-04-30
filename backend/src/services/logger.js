function formatEntry(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  if (meta && typeof meta === 'object') {
    entry.meta = meta;
  }
  return JSON.stringify(entry);
}

function info(message, meta) {
  console.log(formatEntry('info', message, meta));
}

function warn(message, meta) {
  console.warn(formatEntry('warn', message, meta));
}

function error(message, meta) {
  console.error(formatEntry('error', message, meta));
}

module.exports = {
  info,
  warn,
  error,
};
