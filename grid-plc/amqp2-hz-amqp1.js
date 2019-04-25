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
const config = require('config')

require('dotenv').config()
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'amqp1Url': process.env.AMQP1URL,
    'amqp2Url': process.env.AMQP2URL || 'amqp://localhost',
  }
});

const logger = require('../lib/logger')
const os = require('os');
const util = require('util')
const _ = require('lodash');
const SerialPort = require('serialport');
const modbus = require("modbus-rtu");
const amqplib = require('amqplib');

function get_uuid() {
  return new Promise((resolve, reject) => {
    require("machine-uuid")((uuid) => { resolve(uuid); });
  });
}

const exchangeName1 = 'commands'
const routingKey1 = '#.shutoff_valve1'
const exchangeName2 = 'reads'
const routingKey2 = 'geo9-pi3p2.grid.plc'

async function main() {
  // get machine uuid
  const uuid = (await get_uuid()).replace(/-/g, '');
  console.log('Machine UUID:', uuid);

  const hostname = os.hostname();
  console.log('Hostname:', hostname);

  // connect to ampq server2
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection2 = await amqplib.connect(argv.amqp2Url).catch(err => {
      logger.error('amqplib.connect: %s', err)
      process.exit()
    })
    logger.info('%s connected', argv.amqp2Url)
    
    // channel is a Channel object
    const channel2 = await connection2.createChannel().catch(err => {
      logger.error('connection.createChannel: %s', err)
      process.exit()
    })
    logger.info('Channel created')

    // assert exchange
    const ex2 = await channel2.assertExchange(exchangeName2, 'topic', {durable: false})
    logger.info('assertExchange: %s', ex2) // { exchange: 'reads' }
    // const ok = await channel.assertExchange(ex_reads, 'fanout');
    // console.log('reads exchange:', ok); // { exchange: 'reads' }
    const q2 = await channel2.assertQueue('', {exclusive: true})
    logger.info('assertQueue: %s', q2) // { queue: 'logger', messageCount: 0,
    const tag2 = await channel2.consume(q2.queue, async function (msg) {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString())
        if (message && message.reads && message.reads[0] && message.reads[0].reads && message.reads[0].reads[0] && message.reads[0].reads[0].value && message.reads[0].reads[0].value > 40) {
          logger.warning('Freq > 40Hz: %s Hz', JSON.stringify(message.reads[0].reads[0].value))
        }
        logger.info('message: %s', JSON.stringify(message))
      }
    }, {noAck: true})
    logger.info('consume: %s', tag2) // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' } 
  } catch (e) {
    console.error('Error:', e.message);
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

main();
