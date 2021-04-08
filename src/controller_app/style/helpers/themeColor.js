const themeColor = (color) => props => {
  if (!color) return null
  const colors = color.split('.')
  const mainColor = colors[0]
  const shade = colors[1] || 'main'
  if (!props.theme.palette[mainColor]) return color

  return (props.theme.palette[mainColor] || props.theme.palette.primary)[shade]
}

export default themeColor
