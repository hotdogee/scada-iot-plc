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

var print_vector3 = function(name, data) {
  var sx = data.x >= 0 ? ' ' : '';
  var sy = data.y >= 0 ? ' ' : '';
  var sz = data.z >= 0 ? ' ' : '';
  return util.format('%s: %s%s %s%s %s%s ', name, sx, data.x.toFixed(4), sy, data.y.toFixed(4), sz, data.z.toFixed(4));
}

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
  console.log(util.format('%s %s %s %s', print_vector3('Accel', data.accel), data.temperature.toFixed(4), data.pressure.toFixed(4), data.humidity.toFixed(4)))
  i += 1
  if (i < argv.loop) setTimeout(function() { IMU.getValue(callb) }, 100)
}

IMU.getValue(callb)
