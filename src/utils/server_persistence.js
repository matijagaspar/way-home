
import { fileConfigFactory } from './file_config_factory'

let db = null

const NonEmptyString = {
  type: 'string',
  allOf: [
    {
      minLength: 1,
    },
  ],
}

export const serverConfigSchema = {
  type: 'object',
  properties: {
    config: {
      type: 'object',
      additionalProperties: true,
      properties: {
        contoller_domain: NonEmptyString,
        controller_listen_port: { type: 'number' },
        isSSL: { type: 'boolean' },
        controller_public_url: NonEmptyString,
      },
      required: ['contoller_domain', 'controller_listen_port', 'isSSL', 'controller_public_url'],
    },
    google_api: {
      type: 'object',
      additionalProperties: true,
      properties: {
        clientID: NonEmptyString,
        clientSecret: NonEmptyString,
        callbackURL: NonEmptyString,
      },
      required: ['clientID', 'clientSecret', 'callbackURL'],
    },
    authorized_agents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['agent_name', 'key'],
        properties: {
          agent_name: NonEmptyString,
          key: NonEmptyString,
        },
      },
    },

  },
  required: ['authorized_agents', 'config', 'google_api'],
  additionalProperties: true,
}

export const configTemplate = {
  config: {
    contoller_domain: 'myproxy.example.com',
    controller_listen_port: 8080,
    isSSL: false,
    controller_public_url: 'http://myproxy.example.com/',
  },
  google_api: {
    clientID: '',
    clientSecret: '',
    callbackURL: '',
  },
  authorized_agents: [],
}

export const initServerPersistence = (dbPath) => {
  db = fileConfigFactory(dbPath, serverConfigSchema)
}

export default () => {
  if (!db) {
    throw new Error('DB not initialized')
  }
  return db
}
