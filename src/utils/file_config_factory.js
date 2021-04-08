import Ajv from 'ajv'
import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
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

  return lowdb(
    new FileSync(configPath),
  )
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
