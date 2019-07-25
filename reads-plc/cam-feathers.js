// node amqp-feathers.js --supervisor=goo.bio:3030 --ampqstr=amqp://localhost
//
// Network
// - Network disconnect/reconnect event handling
//
// Register controller id on first connect to server
// Controller status: online/offline
// View creates a new controller settings document with controller id as key
// Get controller settings from server
// - Name - String
// - Location - String
// - RTUs - List
//   - Name
//   - Type
//   - Address
//   - Devices - List (sensor and actuator)
//     - Name
//     - Type
//     - Address
//     - Min
//     - Max
// -
// -
// -
// Collect sensor data into json document every x seconds
// Write to csv file (10MB per file with total max size limit 8GB)
// Send to RabbitMQ where workers try to send to server
// (no data loss if internet fail, minimum data loss if power failure)
const config = require('config')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'supervisor': config.get('supervisor.url')
  }
})
const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
// const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
const logger = require('../lib/logger')
const util = require('util')
const localStorage = require('node-persist')
// setup localStorage
localStorage.initSync()
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync

// const ioConfig = config.get('supervisor')
const socket = io('https://scada.hanl.in', {
  path: '/api/socket.io' // default: /socket.io
})

const supervisor = feathers()
  .configure(socketio(socket, { timeout: 10000 }))
  .configure(hooks())
  .configure(auth({
    storage: localStorage
  }))

supervisor.on('reauthentication-error', err => {
  logger.error('reauthentication-error:', err)
  process.exit()
})

;(async function () {
  // console.log(localStorage.getItem('feathers-jwt'))
  // run login.js first to save jwt to localStorage
  var accessToken = await supervisor.authenticate({
    strategy: 'jwt',
    accessToken: localStorage.getItem('feathers-jwt')
  }).catch(err => {
    logger.error('supervisor.authenticate:', err)
    process.exit()
  })
  logger.info(util.format('feathers authenticated: ', accessToken))

  // logs service
  const logs = supervisor.service('images')
  const params = {
    query: {
      // $select: [ 'id', 'logTime' ] // return only the id field
    }
  }

  logs.create(message, params).then(log => {
    // results adds a field: "_id": "DO5DyBX0lz4suuzi"
    logger.info(`logs.create: ${log.logTime} ${log._id}`)
  }).catch(err => {
    logger.error('logs.create:', err)
    // exit and let pm2 restart auth
    process.exit()
  })
})()
