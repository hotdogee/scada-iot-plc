// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'pin': 12,
    'loop': 20,
    'high': 1000,
    'low': 500
  }
});

const rpio = require('rpio')
// Blink an LED attached to P12 / GPIO18 a few times
/*
 * Set the initial state to low.  The state is set prior to the pin
 * being actived, so is safe for devices which require a stable setup.
 */
rpio.open(argv.pin, rpio.OUTPUT, rpio.LOW)

/*
 * The sleep functions block, but rarely in these simple programs does
 * one care about that.  Use a setInterval()/setTimeout() loop instead
 * if it matters.
 */
for (var i = 0; i < argv.loop; i++) {
  /* On for 1 second */
  console.log(i)
  rpio.write(argv.pin, rpio.HIGH)
  rpio.msleep(argv.high)

  /* Off for half a second (500ms) */
  rpio.write(argv.pin, rpio.LOW)
  rpio.msleep(argv.low)
}
