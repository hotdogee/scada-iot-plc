require('dotenv').config()
const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
// const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
const config = require('config')
const winston = require('winston')
const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      timestamp: function () {
        return new Date().toISOString()
      },
      formatter: function (options) {
        return (
          options.timestamp() +
          ' ' +
          options.level[0].toUpperCase() +
          ' ' +
          (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length
            ? JSON.stringify(options.meta, null, 2)
            : '')
        )
      }
    })
  ]
})
// const Storage = require('dom-storage')
// var localStorage = new Storage('./localStorage.json')
const localStorage = require('node-persist')
localStorage.initSync()
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync

const ioConfig = config.get('supervisor')
logger.info(`Connecting to feathers server: `, ioConfig)
const socket = io(ioConfig.url, ioConfig.options)

const supervisor = feathers()
  .configure(socketio(socket))
  .configure(hooks())
  .configure(
    auth({
      storage: localStorage
    })
  )

const email = process.env.USERNAME || 'user@example.com'
const password = process.env.PASSWORD || 'random!password'
logger.info(`User ${email}, Password ${password}`)

;(async function (supervisor) {
  try {
    const token = await supervisor.authenticate({
      strategy: 'local',
      email,
      password
    })
    logger.info('User is logged in:', token)
  } catch (error) {
    logger.error('Error occurred:', error)
  } finally {
    process.exit()
  }
})(supervisor)
