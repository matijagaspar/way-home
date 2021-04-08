const applyWrappers = (...wrappers) => (ComposedComponent) => {
  return wrappers.reverse().reduce((composition, wrapper) => {
    return wrapper(composition)
  }, ComposedComponent)
}
export default applyWrappers
