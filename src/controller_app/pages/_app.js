import { ThemeProvider } from 'styled-components'
import CssBaseline from '@material-ui/core/CssBaseline'
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core/styles'
import { mui_theme, GlobalStyle } from '../style/theme'
import PropTypes from 'prop-types'
import React from 'react'
import Head from 'next/head'
export default function App ({ Component, pageProps }) {
  React.useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side')
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles)
    }
  }, [])

  return (
    <>
      <Head>
        <title>My page</title>
        <meta
          name='viewport'
          content={
                'user-scalable=0, initial-scale=1, ' +
                'minimum-scale=1, width=device-width, height=device-height'
          }
        />
      </Head>
      <GlobalStyle />
      <MuiThemeProvider theme={mui_theme}>
        <ThemeProvider theme={mui_theme}>
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </MuiThemeProvider>
    </>
  )
}

App.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
}
