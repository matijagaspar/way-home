/**
 * Media Queries
 */
import unit from './unit'

const breakpoint = (size) => (props) => {
  const breakpoint = unit.add(1)(props.theme.breakpoints.values[size])
  return `(min-width: ${breakpoint})`
}

breakpoint.lt = (size) => (props) => {
  const breakpoint = props.theme.breakpoints.values[size]
  return `(max-width: ${breakpoint}px)`
}

breakpoint.gt = (size) => (props) => {
  const breakpoint = unit.add(1)(props.theme.breakpoints.values[size])
  return `(min-width: ${breakpoint})`
}

breakpoint.value = size => props => props.theme.breakpoints.values[size] + 'px'

export default breakpoint
