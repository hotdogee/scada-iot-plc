# scada-iot-plc
SCADA/IoT PLC System handles communication with RTUs through MODBUS, and with the Supervisor through WebSockets

# pm2
NODE_ENV=production sudo pm2 start reads-plc/amqp-csv.js --name amqp-csv
NODE_ENV=production sudo pm2 start reads-plc/amqp-feathers.js --name amqp-feathers
NODE_ENV=production sudo pm2 start reads-plc/rtu-amqp.js --name rtu-amqp -- --serial=/dev/ttyUSB0
NODE_ENV=production sudo pm2 start dcs-plc/amqp-valve-control.js --name amqp-valve-control

NODE_ENV=production sudo pm2 start grid-plc/rtu2-amqp2.js --name rtu2-amqp2 -- --serial=/dev/ttyUSB0
NODE_ENV=production sudo pm2 start grid-plc/amqp2-csv.js --name amqp2-csv
NODE_ENV=production sudo pm2 start grid-plc/amqp2-feathers.js --name amqp2-feathers

NODE_ENV=production sudo pm2 start grid-plc/amqp2-hz-amqp1.js --name amqp2-hz-amqp1 -- --threshold=55
NODE_ENV=production sudo pm2 start grid-plc/amqp2-hz-amqp1.js --name amqp2-hz-amqp1 -- --threshold=65

NODE_ENV=production sudo pm2 start grid-plc/rtu3-amqp2.js --name rtu3-amqp2 -- --serial=/dev/ttyUSB1
