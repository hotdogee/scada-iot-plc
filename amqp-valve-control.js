// examples
// sudo node test/manual-valve-control-pigpio.js
// sudo node test/manual-valve-control-pigpio.js --wait 1000
// sudo node test/manual-valve-control-pigpio.js --relay 18 --button 22 --wait 1000

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 18,
    'button': 22,
    'wait': 500 // valve state changes can not happen more than one in 500ms
  }
})

const Gpio = require('pigpio').Gpio
// Turn the LED connected to GPIO17 on when the momentary push button
// connected to GPIO4 is pressed. Turn the LED off when the button is
// released.

// state
let valveState = 0
let buttonState = 0
let valveLocked = false

const relay = new Gpio(argv.relay, {mode: Gpio.OUTPUT})
relay.digitalWrite(valveState)
const button = new Gpio(argv.button, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.EITHER_EDGE
})

button.on('interrupt', (level) => {
  if (level === buttonState) return
  buttonState = level
  // console.log('buttonState', buttonState)
  if (buttonState === 0 || valveLocked) return
  valveState = +!valveState
  valveLocked = true
  setTimeout(() => valveLocked = false, argv.wait)
  console.log(new Date(), 'valveState', valveState)
  relay.digitalWrite(valveState)
})
