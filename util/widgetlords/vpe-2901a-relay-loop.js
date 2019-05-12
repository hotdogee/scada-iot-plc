// examples
// sudo node util/widgetlords/vpe-2901a-relay-loop.js
// sudo node util/widgetlords/vpe-2901a-relay-loop.js --relay 5 --relayActive high --loop 5

// vpe-2901a PI-SPI-DIN-2x4MIO
// relays are high active
// K1 - GPIO5 - PIN29
// K2 - GPIO6 - PIN31

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 5,
    'relayActive': 'high',
    'loop': 2
  }
})
const logger = require('../../lib/logger')
const Gpio = require('pigpio').Gpio

const relayNormalState = argv.relayActive === 'low' ? 1 : 0
// const relayActiveState = +!relayNormalState
// state
let valveState = relayNormalState

const relay = new Gpio(argv.relay, { mode: Gpio.OUTPUT })
relay.digitalWrite(valveState)
logger.info(valveState)

let i = 0
const kernal = () => {
  // On for 1 second
  valveState = +!valveState
  logger.info(valveState)
  relay.digitalWrite(valveState)
  i += 1
  if (i < argv.loop) setTimeout(kernal, 1000)
}
setTimeout(kernal, 1000)
