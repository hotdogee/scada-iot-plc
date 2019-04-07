const rpio = require('rpio')
// Blink an LED attached to P12 / GPIO18 a few times
/*
 * Set the initial state to low.  The state is set prior to the pin
 * being actived, so is safe for devices which require a stable setup.
 */
rpio.open(12, rpio.OUTPUT, rpio.LOW)

/*
 * The sleep functions block, but rarely in these simple programs does
 * one care about that.  Use a setInterval()/setTimeout() loop instead
 * if it matters.
 */
for (var i = 0; i < 20; i++) {
  /* On for 1 second */
  console.log(i)
  rpio.write(12, rpio.HIGH)
  rpio.sleep(1)

  /* Off for half a second (500ms) */
  rpio.write(12, rpio.LOW)
  rpio.msleep(500)
}
