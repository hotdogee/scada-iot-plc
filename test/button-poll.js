// examples
// node test/button-poll.js
// node test/button-poll.js --pin 15 --wait 20

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'pin': 15,
    'wait': 20
  }
})

const rpio = require('rpio')
// Poll a button switch for events
// Configure the internal pullup resistor on P15 / GPIO22 and watch
// the pin for pushes on an attached button switch:
rpio.open(argv.pin, rpio.INPUT, rpio.PULL_UP)

function pollcb(pin)
{
  // Wait for a small period of time to avoid rapid changes which
  // can't all be caught with the 1ms polling frequency.  If the
  // pin is no longer down after the wait then ignore it.
  rpio.msleep(argv.wait)

  if (rpio.read(pin))
    return

  console.log('Button pressed on pin P%d', pin)
}

rpio.poll(argv.pin, pollcb, rpio.POLL_DOWN)

// lags and crashes pi if pressed very fast
