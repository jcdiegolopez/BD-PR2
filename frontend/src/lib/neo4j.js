export function normalizeNeo4jValue(value) {
  if (value && typeof value === 'object') {
    if (typeof value.low === 'number' && typeof value.high === 'number') {
      return value.low
    }
    if (Array.isArray(value)) {
      return value.map((item) => normalizeNeo4jValue(item))
    }
    if (value.properties) {
      const props = normalizeNeo4jValue(value.properties)
      if (value.identity) props._id = normalizeNeo4jValue(value.identity)
      if (value.labels) props._labels = value.labels
      if (value.start || value.startNode) props._start = normalizeNeo4jValue(value.start || value.startNode)
      if (value.end || value.endNode) props._end = normalizeNeo4jValue(value.end || value.endNode)
      if (value.type) props._type = value.type
      return props
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
