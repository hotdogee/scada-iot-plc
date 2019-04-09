// examples
// sudo node test/manual-valve-control-pigpio.js
// sudo node test/manual-valve-control-pigpio.js --wait 1000
// RELAY HAT
// CH1 - GPIO26 - PIN37
// CH2 - GPIO20 - PIN38
// CH3 - GPIO21 - PIN40

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 26,
    'button': 24,
    'button-pull': 'up',
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
  pullUpDown: argv.button-pull === 'up' ? Gpio.PUD_UP : Gpio.PUD_DOWN,
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
