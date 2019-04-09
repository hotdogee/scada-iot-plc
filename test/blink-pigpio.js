// examples
// sudo node test/led-button-pigpio.js
// sudo node test/led-button-pigpio.js --led 12 --button 15
// node test/blink-pigpio.js --relay 29 --loop 2
// RELAY HAT
// CH1 - GPIO26 - PIN37
// CH2 - GPIO20 - PIN38
// CH3 - GPIO21 - PIN40

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 26,
    'loop': 2
  }
})

const Gpio = require('pigpio').Gpio
// Turn the LED connected to GPIO17 on when the momentary push button
// connected to GPIO4 is pressed. Turn the LED off when the button is
// released.

let valveState = 0
const relay = new Gpio(argv.relay, {mode: Gpio.OUTPUT})
relay.digitalWrite(valveState)

let i = 0
const kernal = () => {
  // On for 1 second
  valveState = +!valveState
  console.log(valveState)
  relay.digitalWrite(valveState)
  i += 1
  if (i <= argv.loop) setTimeout(kernal, 1000)
}
setTimeout(kernal, 1000)
