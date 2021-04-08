// A theme with custom primary and secondary color.
// It's optional.
import pink from '@material-ui/core/colors/pink'
import { createGlobalStyle, ThemeProvider } from 'styled-components'
import { createMuiTheme } from '@material-ui/core/styles'

export const mui_theme = createMuiTheme({
  typography: {
    // Use the system font over Roboto.
    fontFamily: 'Roboto, sans-serif',
    fontSize: 12,
    caption: {
      fontSize: '8px',
    },
  },
  palette: {
    background: {
      paper: '#ffffff',
      default: '#fafafa',
    },
    primary: {
      light: '#8eacbb',
      main: '#607d8b',
      dark: '#34515e',
      contrastText: '#ffffff',
    },
    success: {
      light: '#8eacbb',
      main: '#607d8b',
      dark: '#34515e',
      contrastText: '#ffffff',
    },
    /* secondary: {
            light: '#62727b',
            main: '#37474f',
            dark: '#102027',
            contrastText: '#ffffff',
        }, */

    secondary: {
      light: '#48a999',
      main: '#00796b',
      dark: '#004c40',
      contrastText: '#ffffff',
    },
  },
})

export const sc_theme = {}

export const GlobalStyle = createGlobalStyle`
  body {
    min-height: 100vh;
    font-family: 'Roboto', sans-serif;
  }
`
