// examples
// sudo node amqp-valve-control.js
// sudo node amqp-valve-control.js --wait 1000
// sudo node amqp-valve-control.js --relay 18 --button 22 --wait 1000
// sudo node amqp-valve-control.js --amqpUrl amqp://192.168.3.174

// RPi Relay Board
// All the terminals are low active
// CH1 - GPIO26 - PIN37
// CH2 - GPIO20 - PIN38
// CH3 - GPIO21 - PIN40

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 26,
    'relayActive': 'low',
    'button': 24,
    'buttonPull': 'up',
    'wait': 500, // valve state changes can not happen more than one in 500ms
    'amqpUrl': 'amqp://localhost'
  }
})
const logger = require('./lib/logger')
const amqplib = require('amqplib')
const Gpio = require('pigpio').Gpio
// Turn the LED connected to GPIO17 on when the momentary push button
// connected to GPIO4 is pressed. Turn the LED off when the button is
// released.

const buttonNormalState = argv.buttonPull === 'up' ? 1 : 0
const relayNormalState = argv.relayActive === 'low' ? 1 : 0
const relayActiveState = +!relayNormalState
// state
let valveState = relayNormalState
let buttonState = buttonNormalState
let valveLocked = false

const relay = new Gpio(argv.relay, {mode: Gpio.OUTPUT})
relay.digitalWrite(valveState)

const button = new Gpio(argv.button, {
  mode: Gpio.INPUT,
  pullUpDown: argv.buttonPull === 'up' ? Gpio.PUD_UP : Gpio.PUD_DOWN,
  edge: Gpio.EITHER_EDGE
})

button.on('interrupt', (level) => {
  if (level === buttonState) return
  buttonState = level
  logger.debug('buttonState = %d', buttonState)
  if (buttonState === buttonNormalState || valveLocked) return
  valveState = +!valveState
  valveLocked = true
  setTimeout(() => valveLocked = false, argv.wait)
  logger.info('valveState = %d', valveState)
  relay.digitalWrite(valveState)
})

const ex_commands = 'commands'
const routingKey = '#.shutoff_valve1'

;(async function () {
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
      logger.error('amqplib.connect: %s', err)
      process.exit()
    })
    logger.info('%s connected', argv.amqpUrl)

    // channel is a Channel object
    const channel = await connection.createChannel().catch(err => {
      logger.error('connection.createChannel: %s', err)
      process.exit()
    })
    logger.info('Channel created')
    const ex = await channel.assertExchange(ex_commands, 'topic', {durable: false})
    logger.info('assertExchange: %s', ex) // { exchange: 'reads' }
    const q = await channel.assertQueue('', {exclusive: true})
    logger.info('assertQueue: %s', q) // { queue: 'logger', messageCount: 0, consumerCount: 0 }
    await channel.bindQueue(q.queue, ex_commands, routingKey) // {}
    const tag = await channel.consume(q.queue, async function (msg) {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString())
        logger.info('message: %s', message)
      }
    }, {noAck: true})
    logger.info('consume: %s', tag) // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
  } catch (error) {
    logger.error(e)
    process.exit()
  }
})()
