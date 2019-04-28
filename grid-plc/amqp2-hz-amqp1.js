// node rtu-amqp.js --serial=auto --ampqstr=amqp://localhost
//
// Serial
// - Auto detect
//   - If only one serial port is detected, use it
//   - If multiple serial ports are detected, list serial ports, print help and exit
// - USB serial disconnect/reconnect event handling
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
// Write to csv file (100MB per file with total max size limit)
// Send to RabbitMQ where workers try to send to server
// (no data loss if internet fail, minimum data loss if power failure)
//
// node rtu-amqp.js --serial=/dev/ttyUSB0
// sudo node grid-plc/amqp2-hz-amqp1.js --amqp1Url
//

require('dotenv').config()
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    threshold: 55,
    amqp1Url: process.env.AMQP1URL,
    amqp2Url: process.env.AMQP2URL || 'amqp://localhost'
  }
})

// const config = require('config')
// const util = require('util')
// const _ = require('lodash')
// const SerialPort = require('serialport')
// const modbus = require('modbus-rtu')
const logger = require('../lib/logger')
const os = require('os')
const { findIndex } = require('lodash')
const amqplib = require('amqplib')

function getUuid () {
  return new Promise((resolve, reject) => {
    require('machine-uuid')(uuid => {
      resolve(uuid)
    })
  })
}

const exchangeName1 = 'commands'
const routingKey1 = '#.shutoff_valve1'
const exchangeName2 = 'reads'
const routingKey2 = 'geo9-pi3p2.grid.plc'

async function main () {
  // get machine uuid
  const uuid = (await getUuid()).replace(/-/g, '')
  logger.info('Machine UUID:', uuid)

  const hostname = os.hostname()
  logger.info('Hostname:', hostname)

  // connect to ampq server1
  let channel1 = null
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection1 = await amqplib.connect(argv.amqp1Url).catch(err => {
      logger.error('amqplib.connect: %s', err)
      process.exit()
    })
    logger.info('%s connected 1', argv.amqp1Url)

    // channel is a Channel object
    channel1 = await connection1.createChannel().catch(err => {
      logger.error('connection.createChannel: %s', err)
      process.exit()
    })
    logger.info('Channel1 created')

    // assert exchange
    const ex1 = await channel1.assertExchange(exchangeName1, 'topic', {
      durable: false
    })
    logger.info('assertExchange1: %s', JSON.stringify(ex1)) // { exchange: 'reads' }
    // const ok = await channel.assertExchange(ex_reads, 'fanout');
    // console.log('reads exchange:', ok); // { exchange: 'reads' }
    // const q1 = await channel1.assertQueue('', {exclusive: true})
    // logger.info('assertQueue1: %s', JSON.stringify(q2)) // { queue: 'logger', messageCount: 0,
    // const ok = await channel1.bindQueue(q1.queue, exchangeName1, routingKey1) // {}
    // logger.info('bindQueue1: %s', JSON.stringify(ok)) // { queue: 'logger', messageCount: 0,
  } catch (e) {
    logger.error('Error:', e.message)
    // return;
    process.exit()
  }

  // connect to ampq server2
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection2 = await amqplib.connect(argv.amqp2Url).catch(err => {
      logger.error(err, { label: 'connect' })
      process.exit()
    })
    logger.info(`${argv.amqp2Url} connected`, { label: 'connect' })

    // channel is a Channel object
    const channel2 = await connection2.createChannel().catch(err => {
      logger.error(err, { label: 'createChannel' })
      process.exit()
    })
    logger.info('Channel2 created', { label: 'createChannel' })

    // To ensure that messages do survive server restarts, the message needs to:
    // Be declared as persistent message,
    // Be published into a durable exchange,
    // Be queued into a durable queue
    // assert exchange
    const ex2 = await channel2.assertExchange(exchangeName2, 'topic', {
      durable: true
    })
    logger.info(ex2, { label: 'assertExchange' }) // { exchange: 'reads' }
    // const ok = await channel.assertExchange(ex_reads, 'fanout');
    // console.log('reads exchange:', ok); // { exchange: 'reads' }
    // Exclusive (used by only one connection and the queue will be deleted
    // when that connection closes)
    const q2 = await channel2.assertQueue('', { exclusive: true })
    logger.info('assertQueue: %s', JSON.stringify(q2)) // { queue: 'logger', messageCount: 0,
    const ok = await channel2.bindQueue(q2.queue, exchangeName2, routingKey2) // {}
    logger.info('bindQueue: %s', JSON.stringify(ok)) // { queue: 'logger', messageCount: 0,
    const tag2 = await channel2.consume(
      q2.queue,
      async function (msg) {
        if (msg !== null) {
          const message = JSON.parse(msg.content.toString())
          const addr = 71
          const i1 = findIndex(message.reads, { addr })
          if (i1 === -1) {
            logger.error(message, { label: `freq addr: ${addr} not found` })
            return
          }
          const name = '頻率'
          const i2 = findIndex(message.reads[i1].reads, { name })
          if (i2 === -1) {
            logger.error(message, { label: `freq name: ${name} not found` })
            return
          }
          const value = message.reads[i1].reads[i2].value
          if (!value) {
            logger.error(message, { label: `invalid freq: ${value} Hz` })
            return
          }
          if (value >= argv.threshold) {
            logger.warn(
              'freq > %dHz: %s Hz',
              argv.threshold,
              JSON.stringify(value)
            )
            const msg = {
              shutoff_valve1: {
                state: 0
              }
            }
            channel1.publish(
              exchangeName1,
              routingKey1,
              Buffer.from(JSON.stringify(msg))
            )
          } else {
            logger.info(message, { label: `freq < ${argv.threshold}Hz: ${value} Hz` })
          }
        }
      },
      // noAck (boolean): if true, the broker won’t expect an acknowledgement of
      // messages delivered to this consumer; i.e., it will dequeue messages as
      // soon as they’ve been sent down the wire. Defaults to false (i.e., you
      // will be expected to acknowledge messages).
      { noAck: true }
    )
    logger.info('consume: %s', JSON.stringify(tag2)) // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
  } catch (e) {
    console.error('Error:', e.message)
    // return;
    process.exit()
  }
  // // connect to ampq server1
  // try {
  //   // connect to ampq server, connection is a ChannelModel object
  //   // 'amqp://localhost'
  //   const connection = await amqplib.connect(argv.amqp1Url).catch(err => {
  //     logger.error('amqplib.connect: %s', err)
  //     process.exit()
  //   })
  //   logger.info('%s connected', argv.amqp1Url)

  //   // channel is a Channel object
  //   const channel = await connection.createChannel().catch(err => {
  //     logger.error('connection.createChannel: %s', err)
  //     process.exit()
  //   })
  //   logger.info('Channel created')

  //   // assert exchange
  //   const ex = await channel.assertExchange(exchangeName1, 'topic', {durable: false})
  //   logger.info('assertExchange: %s', ex) // { exchange: 'reads' }
  //   // const ok = await channel.assertExchange(ex_reads, 'fanout');
  //   // console.log('reads exchange:', ok); // { exchange: 'reads' }
  // } catch (e) {
  //   console.error('Error:', e.message);
  //   // return;
  //   process.exit()
  // }
}

main()
