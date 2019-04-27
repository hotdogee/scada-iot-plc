const SerialPort = require('serialport')

function getSerial (argv) {
  return new Promise((resolve, reject) => {
    // list available serial ports
    SerialPort.list((err, ports) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      if (ports.length === 0) {
        reject(Error('No serial ports found.'))
      } else if (argv.serial === 'auto') {
        if (ports.length === 1) {
          resolve(ports[0].comName)
        } else {
          reject(
            Error(`Specify one of the follow serial ports with the --serial argument.
Available Serial Ports: ${ports.map(port => port.comName).join(', ')}`)
          )
        }
      } else if (ports.map(port => port.comName).indexOf(argv.serial) !== -1) {
        resolve(argv.serial)
      } else {
        reject(Error(`Serial port "${argv.serial}" not found.`))
      }
    })
  })
}

module.exports = getSerial
