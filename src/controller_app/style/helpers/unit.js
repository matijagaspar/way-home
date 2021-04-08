/* @flow */

const parseUnit =
    (rawValue, defaultUnit = 'px') => {
      // eslint-disable-next-line no-unused-vars
      const [_, value, unit] = String(rawValue || '0').match(/([\d.]+)([a-z%]+)?/i)
      return [Number(value), unit || defaultUnit]
    }

const unit = Object.create(null)

unit.normalize =
    (defaultUnit) =>
      (unit) =>
        parseUnit(unit, defaultUnit).join('')

unit.add =
    (add, fixedDecimal = 3) =>
      (rawValue) => {
        const [value, unit] = parseUnit(rawValue)
        const result = (value + add).toFixed(fixedDecimal)
        return `${result}${unit}`
      }

unit.subtract =
    (sub, fixedDecimal = 3) =>
      (rawValue) => {
        const [value, unit] = parseUnit(rawValue)
        const result = (value - sub).toFixed(fixedDecimal)
        return `${result}${unit}`
      }

unit.multiply =
    (mul, fixedDecimal = 3) =>
      (rawValue) => {
        const [value, unit] = parseUnit(rawValue)
        const result = (value * mul).toFixed(fixedDecimal)
        return `${result}${unit}`
      }

unit.divide =
    (div, fixedDecimal = 3) =>
      (rawValue) => {
        const [value, unit] = parseUnit(rawValue)
        const result = (value / div).toFixed(fixedDecimal)
        return `${result}${unit}`
      }

export default unit
