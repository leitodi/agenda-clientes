export type Unit = 'kg' | 'g' | 'unidad'

export function canConvertUnits(from: Unit, to: Unit) {
  if (from === to) {
    return true
  }

  const metricUnits: Unit[] = ['kg', 'g']
  return metricUnits.includes(from) && metricUnits.includes(to)
}

export function convertQuantity(value: number, from: Unit, to: Unit) {
  if (from === to) {
    return value
  }

  if (!canConvertUnits(from, to)) {
    throw new Error('La unidad seleccionada no es compatible con el producto.')
  }

  if (from === 'kg' && to === 'g') {
    return value * 1000
  }

  if (from === 'g' && to === 'kg') {
    return value / 1000
  }

  return value
}
