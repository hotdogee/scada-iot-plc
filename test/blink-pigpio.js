// examples
// sudo node test/led-button-pigpio.js
// sudo node test/led-button-pigpio.js --led 12 --button 15

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'relay': 18,
    'loop': 20
  }
})

const Gpio = require('pigpio').Gpio
// Turn the LED connected to GPIO17 on when the momentary push button
// connected to GPIO4 is pressed. Turn the LED off when the button is
// released.

let valveState = 0
const relay = new Gpio(argv.relay, {mode: Gpio.OUTPUT})
relay.digitalWrite(valveState)

button.on('interrupt', (level) => {
  console.log(level)
  led.digitalWrite(level)
})

let i = 0
const handle = setInterval(() => {
  // On for 1 second
  valveState = +!valveState
  console.log(valveState)
  relay.digitalWrite(valveState)
  i += 1
  if (i >= argv.loop) clearInterval(handle)
}, 1000);
