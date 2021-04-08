function createHashDjb2 (str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i) /* hash * 33 + c */
  }
  return hash
}

export default function stringToRGB (str, opacity) {
  const hash = createHashDjb2(str)

  const red = (hash & 0xFF0000) >> 16
  const green = (hash & 0x00FF00) >> 8
  const blue = hash & 0x0000FF
  // return '#' + Number(hash & 0xFFFFFF).toString(16)
  return `rgba(${red},${green},${blue}, ${opacity || 1})`
  // return { red, green, blue }
}
