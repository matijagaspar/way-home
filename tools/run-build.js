'use strict'
/* eslint no-console: 0 */

// Cross-platform launcher for the webpack-4 build/dev pipeline.
//
// webpack 4 (used directly, and via Next 12's `webpack5: false`) hashes
// modules with MD4, which OpenSSL 3 (Node >=17) no longer provides ->
// ERR_OSSL_EVP_UNSUPPORTED. The fix is to start Node with
// `--openssl-legacy-provider`, but an inline `NODE_OPTIONS=... node ...` in an
// npm script does not work on Windows cmd. So we set NODE_OPTIONS here and
// re-spawn tools/rundev.js in a child Node process, which works on every
// platform. Args are forwarded verbatim so rundev's process.argv is unchanged
// (build | client | server | ...).

const { spawn } = require('child_process')
const path = require('path')

const FLAG = '--openssl-legacy-provider'
const existing = process.env.NODE_OPTIONS || ''
const NODE_OPTIONS = existing.includes(FLAG) ? existing : `${existing} ${FLAG}`.trim()

const child = spawn(
  process.execPath,
  [path.join(__dirname, 'rundev.js'), ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS } },
)

child.on('error', err => {
  console.error(err)
  process.exit(1)
})
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code === null ? 1 : code)
})
