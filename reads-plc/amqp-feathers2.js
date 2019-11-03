// node amqp-feathers2.js --supervisor=goo.bio:3030 --amqpUrl=amqp://localhost
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
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const amqplib = require('amqplib')
const { api, socket } = require('../lib/api')
const logger = require('../lib/logger')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    apiKey: process.env.API_KEY,
    amqpUrl: 'amqp://localhost'
  }
})

// logs service
const logs = api.service('logs')
const params = {
  query: {
    // $select: [ 'id', 'logTime' ] // return only the id field
  }
}

const exchangeName = 'reads'
const queueName = 'feathers'

// wait for socket connection
socket.on('connect', async () => {
  if (!argv.apiKey) throw new Error('apiKey required')
  // authenticate socket with apiKey
  try {
    const auth = await api.authenticate({
      strategy: 'jwt',
      accessToken: argv.apiKey
    })
    logger.info(auth, { label: 'authenticated' })
  } catch (error) {
    logger.error('supervisor.authenticate:', error)
    process.exit()
  }

  // assert ampq reads exchange and bind to logger queue
  // connect to ampq server, connection is a ChannelModel object
  // 'amqp://localhost'
  const connection = await amqplib.connect(argv.amqpUrl).catch((err) => {
    logger.error(err, { label: 'connect' })
    process.exit()
  })
  logger.info(`${argv.amqpUrl} connected`, { label: 'connect' })

  // channel is a Channel object
  const channel = await connection.createChannel().catch((err) => {
    logger.error(err, { label: 'createChannel' })
    process.exit()
  })
  logger.info('Channel created', { label: 'createChannel' })

  const ex = await channel.assertExchange(exchangeName, 'fanout')
  logger.info(ex, { label: 'assertExchange' }) // { exchange: 'reads' }
  const q = await channel.assertQueue(queueName)
  logger.info(q, { label: 'assertQueue' }) // { queue: 'logger', messageCount: 0, consumerCount: 0 }
  const bq = await channel.bindQueue(queueName, exchangeName, '')
  logger.info(bq, { label: 'bindQueue' }) // {}
  const pf = await channel.prefetch(1)
  logger.info(pf, { label: 'prefetch' }) // {}
  const cs = await channel.consume(queueName, function (msg) {
    // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
    if (msg !== null) {
      logger.info(`Got message: ${msg.fields.deliveryTag}`, {
        label: 'consume'
      })
      // logger.info(msg.content.toString());
      // Traversal order of properties is fixed in ES6
      // http://exploringjs.com/es6/ch_oop-besides-classes.html#_traversal-order-of-properties
      const message = JSON.parse(msg.content.toString())

      logs
        .create(message, params)
        .then((log) => {
          // results adds a field: "_id": "DO5DyBX0lz4suuzi"
          logger.info(`${log.logTime} ${log._id}`, { label: 'logs.create' })
          // acknowledge message sucessfully processed
          channel.ack(msg)
        })
        .catch((err) => {
          logger.error(err, { label: 'logs.create' })
          // requeue the message
          channel.nack(msg)
          // exit and let pm2 restart auth
          process.exit()
        })
    }
  })
  logger.info(cs, { label: 'consume' }) // {}
})
