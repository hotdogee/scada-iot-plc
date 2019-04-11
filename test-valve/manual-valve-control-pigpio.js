// examples
// sudo node test/manual-valve-control-pigpio.js
// sudo node test/manual-valve-control-pigpio.js --wait 1000
// sudo node test/manual-valve-control-pigpio.js --relay 18 --button 22 --wait 1000

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
    'wait': 500 // valve state changes can not happen more than one in 500ms
  }
})

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
  // console.log('buttonState', buttonState)
  if (buttonState === buttonNormalState || valveLocked) return
  valveState = +!valveState
  valveLocked = true
  setTimeout(() => valveLocked = false, argv.wait)
  console.log(new Date(), 'valveState', valveState)
  relay.digitalWrite(valveState)
})
