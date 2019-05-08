// node grid-plc/amqp2-feathers.js --supervisorUrl=https://scada.hanl.in/api/socket.io --amqpUrl=amqp://localhost
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
require('dotenv').config()
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'supervisorUrl': process.env.SUPERVISOR_URL || 'https://scada.hanl.in/api/socket.io',
    'amqpUrl': process.env.AMQP2URL || 'amqp://localhost'
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
const amqplib = require('amqplib')
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
  .configure(socketio(socket, { timeout: 2000 }))
  .configure(hooks())
  .configure(auth({
    storage: localStorage
  }))

supervisor.on('reauthentication-error', err => {
  logger.error(err, { label: 'reauthentication-error' })
  process.exit()
})

const exchangeName = 'reads'
const routingKey = 'geo9-pi3p2.grid.plc'
const queueName = 'feathers'

;(async function amqpFeathers () {
  // console.log(localStorage.getItem('feathers-jwt'))
  // run login.js first to save jwt to localStorage
  var accessToken = await supervisor.authenticate({
    strategy: 'jwt',
    accessToken: localStorage.getItem('feathers-jwt')
  }).catch(err => {
    logger.error(err, { label: 'authenticate' })
    process.exit()
  })
  logger.info(accessToken, { label: 'authenticated' })

  // logs service
  const logs = supervisor.service('logs')
  const params = {
    query: {
      // $select: [ 'id', 'logTime' ] // return only the id field
    }
  }

  // connect to ampq server, connection is a ChannelModel object
  // 'amqp://localhost'
  const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
    logger.error(err, { label: 'connect' })
    process.exit()
  })
  logger.info(`${argv.amqpUrl} connected`, { label: 'connect' })

  // channel is a Channel object
  const channel = await connection.createChannel().catch(err => {
    logger.error(err, { label: 'createChannel' })
    process.exit()
  })
  logger.info('Channel created', { label: 'createChannel' })

  // To ensure that messages do survive server restarts, the message needs to:
  // Be declared as persistent message,
  // Be published into a durable exchange,
  // Be queued into a durable queue
  // assert exchange
  try {
    const ex = await channel.assertExchange(exchangeName, 'topic', {
      durable: true
    })
    logger.info(ex, { label: 'assertExchange' }) // { exchange: 'reads' }
  } catch (error) {
    logger.error(error, { label: 'assertExchange' })
    process.exit()
  }

  // assert a durable queue
  const q = await channel.assertQueue(queueName, {
    durable: true
  })
  // { queue: 'logger', messageCount: 0, consumerCount: 0 }
  logger.info(q, { label: 'assertQueue' })

  // prefetch 1
  channel.prefetch(1)

  // Assert a routing path from an exchange to a queue
  const bq = await channel.bindQueue(queueName, exchangeName, routingKey)
  logger.info(bq, { label: 'bindQueue' }) // {}

  const cs = await channel.consume(queueName, function (msg) { // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
    if (msg !== null) {
      logger.info(`Got message: ${msg.fields.deliveryTag}`, { label: 'consume' })
      // logger.info(msg.content.toString());
      // Traversal order of properties is fixed in ES6
      // http://exploringjs.com/es6/ch_oop-besides-classes.html#_traversal-order-of-properties
      const message = JSON.parse(msg.content.toString())

      logs.create(message, params).then(log => {
        // results adds a field: "_id": "DO5DyBX0lz4suuzi"
        logger.info(`${log.logTime} ${log._id}`, { label: 'logs.create' })
        // acknowledge message sucessfully processed
        channel.ack(msg)
      }).catch(err => {
        logger.error(err, { label: 'logs.create' })
        // requeue the message
        channel.nack(msg)
        // exit and let pm2 restart auth
        process.exit()
      })
    }
  })
  logger.info(cs, { label: 'consume' }) // {}
})()
