import Ajv from 'ajv'
// import lowdb from 'lowdb'
import { LowSync, JSONFileSync } from 'lowdb'
import path from 'path'
import fs from 'fs'
const ajv = new Ajv({
  allErrors: true,
})

export class ValidationError extends Error {
  constructor (message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class CreateConfigError extends Error {
  constructor (message) {
    super(message)
    this.name = 'CreateConfigError'
  }
}


export const fileConfigFactory = (configPath, schema) => {
  if (!configPath) {
    throw new ValidationError('No config file')
  }
  fs.accessSync(path.resolve(configPath), fs.constants.R_OK | fs.constants.W_OK)

  const validate = ajv.compile(schema)
  const valid = validate(JSON.parse(fs.readFileSync(configPath)))
  if (!valid) {
    throw new ValidationError(`${validate.errors.map(({ message, instancePath }) => `${instancePath.substr(1)}: ${message}`).join('\n')}`)
  }

  const db = new LowSync(new JSONFileSync(configPath))
  db.read()
  return lodash.chain(db).get('data')
  // return db
}

export const generateInitialFile = (configPath, intialConfig) => {
  let exists = false
  try {
    fs.accessSync(configPath, fs.constants.R_OK)
    exists = true
  } catch (e) {
    exists = false
  }
  if (exists) {
    throw new CreateConfigError(`File ${path.resolve(configPath)} already exists`)
  } else {
    fs.writeFileSync(configPath, JSON.stringify(intialConfig, null, 4))
  }
}
