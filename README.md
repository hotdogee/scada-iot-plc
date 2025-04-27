# SCADA/IoT Software-defined PLC

This repository contains the source code for the Supervisory Control and Data Acquisition (SCADA) / Internet of Things (IoT) Programmable Logic Controller (PLC) system developed for a research-grade geothermal power pilot project in Taiwan.

## Table of Contents

- [SCADA/IoT Software-defined PLC](#scadaiot-software-defined-plc)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [System Architecture](#system-architecture)
    - [Hardware Components](#hardware-components)
    - [Software Backend](#software-backend)
    - [Communication Protocols](#communication-protocols)
  - [Directory Structure](#directory-structure)
  - [Prerequisites](#prerequisites)
    - [Supported Remote Terminal Units (RTUs)](#supported-remote-terminal-units-rtus)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)
  - [Data Format](#data-format)
  - [Development](#development)
    - [Adding New Device Support](#adding-new-device-support)
    - [Testing](#testing)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)
  - [Contact](#contact)

## Overview

The primary function of this system is to monitor and control the geothermal power generation process, providing real-time insights and operational capabilities for this research-grade pilot plant. The data collected enables the well dependent turbine optimization to maximize power generation.

The project addresses challenges posed by fluctuating geothermal water pressure by implementing a system that converts AC power from a self-excited synchronous generator to DC, then back to AC using grid-tied inverters. This enables stable grid connection despite fluctuating generator speed.

## Features

- **MODBUS RTU Communication**: Interface with a variety of industrial devices
- **Multiple Device Support**: Compatible with various meters and sensors (NHR5200, DW8, DW9, NHR3800, etc.)
- **Data Transformation**: Convert raw sensor data into meaningful measurements
- **Local Data Storage**: Log data to CSV files with automatic file rotation
- **AMQP Integration**: Send data to RabbitMQ for distribution to other systems
- **Fault Tolerance**: Continue operation during network outages with local buffering
- **Auto-detection**: Automatic serial port detection for easy setup
- **Harmonics Analysis**: Support for power quality measurements
- **Multi-sensor Reading**: Read pressure, temperature, flow rate, power metrics, and more

## System Architecture

The system employs a distributed architecture leveraging modern IoT principles combined with traditional SCADA protocols.

### Hardware Components

- **Central Controller:** Raspberry Pi serves as the main processing unit.
- **Remote Terminal Units (RTUs):** Industrial controllers interfacing with field devices.
- **Sensors:** Temperature (RTD PT100), Pressure (Danfoss MBS 3000), Flow (Magnetic), Electrical (Voltage, Current, Frequency, Power), etc.
- **Actuators:** Valves, Alarms, and Inverters (ABB PVI-12.5-TL-OUTD) managed by the system.

### Software Backend

- **Platform:** Developed using Node.js, a unified language the entire stack, chosen for its developer friendliness.
- **Real-time Data:** Handles acquisition, processing, and logging of data from various sources.
- **Messaging**: RabbitMQ (AMQP) for inter-process communication between different system modules.
- **Process Management**: PM2 for running and managing Node.js application processes.

### Communication Protocols

- **MODBUS-RTU:** Used for robust communication with RTUs and other industrial devices connected to the custom I/O modules or directly.
- **WebSockets:** Enables real-time, bidirectional communication between the Node.js backend, the supervisory control system, and the user interface (UI).

## Directory Structure

- **reads-plc/**: Scripts for reading from PLCs/RTUs and sending data to AMQP or Feathers Supervisor

  - `rtu-amqp.js`: Communicates with RTUs via MODBUS and publishes data to AMQP
  - `amqp-csv.js`: Consumes AMQP messages and logs data to CSV files
  - `amqp-feathers.js`: Sends data from AMQP to Feathers.js API

- **grid-plc/**: Advanced grid/energy scripts, including frequency and harmonics monitoring

  - `rtu2-amqp2.js`: Communicates with grid RTUs and publishes to AMQP2
  - `rtu3-amqp2.js`: Additional RTU communications
  - `amqp2-csv.js`: Logs grid data to CSV files
  - `amqp2-feathers.js`: Sends grid data to Feathers.js API
  - `amqp2-hz-amqp1.js`: Frequency monitoring and threshold management

- **dcs-plc/**: Distributed control system scripts (e.g., valve control)

  - `amqp-valve-control.js`: Manages valve operations based on AMQP messages

- **lib/**: Shared libraries (logger, auth, serial, API)
- **test-\***/: Test scripts for devices, reads, and integration
- **config/**: Configuration files (default.js)
- **docs/**: Device and protocol documentation

## Prerequisites

- Node.js (v12 or higher)
- RabbitMQ server for AMQP messaging
- USB-to-RS485 converter for MODBUS RTU communication

### Supported Remote Terminal Units (RTUs)

- **NHR5200**: Temperature and pressure sensors
- **DW8/DW9**: Power meters
- **NHR3800**: Frequency meters
- **NHR3500**: Advanced power quality analyzers
- **GPE**: Mass flow meters
- **SINLDG**: Magnetic Flow meters
- **Supmea LMAG**: Magnetic Flow meters

## Installation

1. Clone the repository:

```
git clone https://github.com/hotdogee/scada-iot-plc.git
cd scada-iot-plc
```

2. Install dependencies:

```
npm install
```

3. Configure environment variables:

```
cp .env.example .env
```

## Configuration

- **Environment Variables:** Set `NODE_ENV=production` for production deployments.
- **Serial Ports:** The serial ports for RTU communication are specified as command-line arguments (e.g., `--serial=/dev/ttyUSB0`). Ensure these paths match your hardware setup.
- **Thresholds:** Grid frequency thresholds are passed as arguments (e.g., `--threshold=55`).
- **Connection Strings:** Ensure the application has the correct connection details for MongoDB and RabbitMQ (these might be configured via environment variables or configuration files - check the source code).

## Usage

The following PM2 commands are used to start the various system components. Run these commands from the root directory of the project. Ensure `sudo` is used if necessary for permissions (e.g., accessing serial ports or running on privileged ports).

**Reads System (RTU1 -> AMQP -> CSV/Feathers):**

```bash
# Start RTU communication (e.g., on ttyUSB0) and publish data to AMQP
NODE_ENV=production sudo pm2 start reads-plc/rtu-amqp.js --name rtu-amqp -- --serial=/dev/ttyUSB0

# Subscribe to AMQP and log data to CSV
NODE_ENV=production sudo pm2 start reads-plc/amqp-csv.js --name amqp-csv

# Subscribe to AMQP and serve data via FeathersJS/WebSockets
NODE_ENV=production sudo pm2 start reads-plc/amqp-feathers.js --name amqp-feathers
```

**DCS System (Valve Control via AMQP):**

```bash
# Subscribe to AMQP for valve control commands
NODE_ENV=production sudo pm2 start dcs-plc/amqp-valve-control.js --name amqp-valve-control
```

**Grid System (RTU2/RTU3 -> AMQP2 -> CSV/Feathers/Grid Logic):**

```bash
# Start RTU2 communication (e.g., on ttyUSB0) and publish data to AMQP2
NODE_ENV=production sudo pm2 start grid-plc/rtu2-amqp2.js --name rtu2-amqp2 -- --serial=/dev/ttyUSB0

# Start RTU3 communication (e.g., on ttyUSB1) and publish data to AMQP2
NODE_ENV=production sudo pm2 start grid-plc/rtu3-amqp2.js --name rtu3-amqp2 -- --serial=/dev/ttyUSB1

# Subscribe to AMQP2 and log data to CSV
NODE_ENV=production sudo pm2 start grid-plc/amqp2-csv.js --name amqp2-csv

# Subscribe to AMQP2 and serve data via FeathersJS/WebSockets
NODE_ENV=production sudo pm2 start grid-plc/amqp2-feathers.js --name amqp2-feathers

# Subscribe to AMQP2 for Hz monitoring and trigger actions via AMQP1 (Example thresholds)
NODE_ENV=production sudo pm2 start grid-plc/amqp2-hz-amqp1.js --name amqp2-hz-amqp1-55 -- --threshold=55
NODE_ENV=production sudo pm2 start grid-plc/amqp2-hz-amqp1.js --name amqp2-hz-amqp1-65 -- --threshold=65
# NODE_ENV=production sudo pm2 start grid-plc/amqp2-hz-amqp1.js --name amqp2-hz-amqp1 -- --threshold=68 # Note: Original README had duplicate names, adjusted here for clarity
```

**Managing Processes:**

- List running processes: `sudo pm2 list`
- Monitor logs: `sudo pm2 logs` or `sudo pm2 logs <app-name>`
- Stop a process: `sudo pm2 stop <app-name>`
- Restart a process: `sudo pm2 restart <app-name>`
- Delete a process: `sudo pm2 delete <app-name>`

## Data Format

The system collects data in a structured JSON format:

```json
{
  "name": "LocationName",
  "logTime": "2025-04-20T10:00:00.000Z",
  "reads": [
    {
      "name": "MeterName",
      "addr": 1,
      "reads": [
        {
          "name": "Pressure",
          "unit": "bar",
          "value": 2.5,
          "time": "2025-04-20T10:00:00.000Z"
        },
        {
          "name": "Temperature",
          "unit": "°C",
          "value": 85.6,
          "time": "2025-04-20T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

This data is flattened and stored in CSV format for logging.

## Development

### Adding New Device Support

1. Create a parser function for your device's data format
2. Add a read function in the RTU object in rtu-amqp.js
3. Add device configuration in your `getPlcSettings()` function

### Testing

Use the test scripts in test-modbus to test communication with specific devices:

```
node test-modbus/22-supmea.js --serial=/dev/ttyUSB0
```

## Troubleshooting

- **Serial Port Not Found**: Ensure your USB-to-RS485 converter is properly connected and recognized by the system
- **MODBUS Communication Errors**: Check device address, baud rate, and wiring
- **AMQP Connection Errors**: Verify RabbitMQ server is running and accessible
- **CSV File Errors**: Check write permissions for the log directory

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- **Lanyang Geothermal Corp.**
  - Han Lin <hotdogee@gmail.com> (https://github.com/hotdogee)
