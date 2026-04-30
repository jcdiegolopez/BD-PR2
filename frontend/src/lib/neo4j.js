export function normalizeNeo4jValue(value) {
  if (value && typeof value === 'object') {
    if (typeof value.low === 'number' && typeof value.high === 'number') {
      return value.low
    }
    if (Array.isArray(value)) {
      return value.map((item) => normalizeNeo4jValue(item))
    }
    if (value.properties) {
      return normalizeNeo4jValue(value.properties)
    }
    const entries = Object.entries(value)
    if (entries.length) {
      return entries.reduce((acc, [key, item]) => {
        acc[key] = normalizeNeo4jValue(item)
        return acc
      }, {})
    }
  }
  return value
}

export function normalizeNeo4jRecord(record) {
  return Object.entries(record || {}).reduce((acc, [key, value]) => {
    acc[key] = normalizeNeo4jValue(value)
    return acc
  }, {})
}
