#!/usr/bin/env node
const path = require('path')
process.chdir(path.resolve(__dirname, '../'))
require('pino-pretty/bin')