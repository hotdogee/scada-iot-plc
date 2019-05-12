// examples
// sudo node util/widgetlords/vpe-2901a-relay-set.js
// sudo node util/widgetlords/vpe-2901a-relay-set.js --relay 5 --relayActive low --energize 1

// vpe-2901a PI-SPI-DIN-2x4MIO
// relays are high active
// K1 - GPIO5 - PIN29
// K2 - GPIO6 - PIN31

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 5,
    'relayActive': 'high',
    'energize': 1
  }
})
const logger = require('../../lib/logger')
const Gpio = require('pigpio').Gpio

const relayNormalState = argv.relayActive === 'low' ? 1 : 0
const valveState = argv.energize === 1 ? +!relayNormalState : relayNormalState

const relay = new Gpio(argv.relay, { mode: Gpio.OUTPUT })
relay.digitalWrite(valveState)
logger.info(`relay.digitalWrite(${valveState})`)
