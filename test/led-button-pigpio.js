// examples
// node test/button-poll.js
// node test/button-poll.js --pin 15 --wait 20

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'led': 12,
    'button': 15,
    'wait': 20
  }
})

const Gpio = require('pigpio').Gpio
// Turn the LED connected to GPIO17 on when the momentary push button
// connected to GPIO4 is pressed. Turn the LED off when the button is
// released.

const led = new Gpio(argv.led, {mode: Gpio.OUTPUT})
const button = new Gpio(argv.button, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.EITHER_EDGE
})

button.on('interrupt', (level) => {
  console.log(level)
  led.digitalWrite(level)
})
