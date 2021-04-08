import React from 'react'
import Document, { Html, Head, Main, NextScript } from 'next/document'
import { ServerStyleSheets as MaterialUiServerStyleSheets } from '@material-ui/core/styles'
import { mui_theme } from '../style/theme'
import { ServerStyleSheet as StyledComponentSheets } from 'styled-components'

export default class MyDocument extends Document {
  render () {
    return (
      <Html lang='en'>
        <Head>
          <meta charSet='utf-8' />

          {/* PWA primary color */}
          <meta name='theme-color' content={mui_theme.palette.primary.main} />
          <link
            rel='stylesheet'
            href='https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap'
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

// `getInitialProps` belongs to `_document` (instead of `_app`),
// it's compatible with server-side generation (SSG).
MyDocument.getInitialProps = async (ctx) => {
  // Resolution order

  const styledComponentSheet = new StyledComponentSheets()
  const materialUiSheets = new MaterialUiServerStyleSheets()

  // Render app and page and get the context of the page with collected side effects.
  const originalRenderPage = ctx.renderPage

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: App => props =>
        styledComponentSheet.collectStyles(
          materialUiSheets.collect(<App {...props} />),
        ),
    })

  const initialProps = await Document.getInitialProps(ctx)

  return {
    ...initialProps,
    // Styles fragment is rendered after the app and page rendering finish.
    styles: (
      <React.Fragment key='styles'>
        {initialProps.styles}
        {materialUiSheets.getStyleElement()}
        {styledComponentSheet.getStyleElement()}
      </React.Fragment>
    ),
  }
}
