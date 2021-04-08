import { fileConfigFactory } from './file_config_factory'

let db = null

const permissionsSchema = {
  type: 'object',
  properties: {
    groups: { type: 'array', items: { type: 'string' } },
    mode: { enum: ['session', 'open', 'basic'] },
  },
}

const NonEmptyString = {
  type: 'string',
  allOf: [
    {
      minLength: 1,
    },
  ],
}
export const clientConfigSchema = {
  type: 'object',
  properties: {
    agent_name: NonEmptyString,
    controller_address: NonEmptyString, // url
    isSsl: { type: 'boolean' },
    permissions: permissionsSchema,
    apps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['app_id', 'name', 'remote_host', 'remote_port'],
        properties: {
          app_id: NonEmptyString,
          remote_port: { type: 'number' },
          name: NonEmptyString,
          remote_host: NonEmptyString, // hostname
          color: { type: 'string' }, // css color
          icon: { type: 'string' }, // url
          permissions: permissionsSchema,
        },
      },
    },

  },
  required: ['agent_name', 'controller_address', 'isSsl', 'apps'],
  additionalProperties: true,
}

export const configTemplate = {
  agent_name: '',
  controller_address: '',
  isSsl: false,
  permissions: {
    mode: 'session',
    groups: [
      'admin',
    ],
  },
  apps: [
    {
      app_id: 'app-1',
      remote_port: 3000,
      name: 'Demo 1',
      remote_host: 'localhost',
      color: 'red',
      icon: '',
    },
  ],
}

export const initClientPersistence = (dbPath) => {
  db = fileConfigFactory(dbPath, clientConfigSchema)
  return db
}

export default () => {
  if (!db) {
    throw new Error('DB not initialized')
  }
  return db
}
