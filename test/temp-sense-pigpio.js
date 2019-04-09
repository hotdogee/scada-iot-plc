// examples
// sudo node test/led-button-pigpio.js
// sudo node test/led-button-pigpio.js --led 12 --button 15

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'led': 25,
    'button': 24
  }
})

const imu = require("../../nodeimu");

const IMU = new imu.IMU();

IMU.getValue((err, data) => {
  if (err !== null) {
    console.error("Could not read sensor data: ", err);
    return;
  }

  console.log("Accelleration is: ", JSON.stringify(data.accel, null, "  "));
  console.log("Gyroscope is: ", JSON.stringify(data.gyro, null, "  "));
  console.log("Compass is: ", JSON.stringify(data.compass, null, "  "));
  console.log("Fusion data is: ", JSON.stringify(data.fusionPose, null, "  "));

  console.log("Temp is: ", data.temperature);
  console.log("Pressure is: ", data.pressure);
  console.log("Humidity is: ", data.humidity);
});
