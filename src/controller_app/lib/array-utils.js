export const flatPluck = (key, list) => [...new Set(list.reduce((res, obj) => [...res, obj[key]], []).flat())]
