// examples
// sudo node test/led-button-pigpio.js
// sudo node test/led-button-pigpio.js --led 12 --button 15

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'led': 25,
    'button': 24,
    'loop': 200
  }
})

const util = require('util')
const imu = require("../../nodeimu")

const IMU = new imu.IMU()

let i = 0
const callb = (err, data) => {
  if (err !== null) {
    console.error("Could not read sensor data: ", err)
    return;
  }
  // console.log("Accelleration is: ", JSON.stringify(data.accel, null, "  "));
  // console.log("Gyroscope is: ", JSON.stringify(data.gyro, null, "  "));
  // console.log("Compass is: ", JSON.stringify(data.compass, null, "  "));
  // console.log("Fusion data is: ", JSON.stringify(data.fusionPose, null, "  "));

  // console.log("Temp is: ", data.temperature);
  // console.log("Pressure is: ", data.pressure);
  // console.log("Humidity is: ", data.humidity);
  console.log(util.format('%s %s %s', data.temperature.toFixed(4), data.pressure.toFixed(4), data.humidity.toFixed(4)))
  i += 1
  if (i < argv.loop) setTimeout(function() { IMU.getValue(callb) }, 100)
}

IMU.getValue(callb)
