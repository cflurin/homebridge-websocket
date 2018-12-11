# homebridge-websocket

[![NPM version][npm-image]][npm-url]

[npm-image]: http://img.shields.io/npm/v/homebridge-websocket.svg
[npm-url]: https://npmjs.org/package/homebridge-websocket

Homebridge-websocket is a Plugin for Homebridge. The Websocket-API supports the main homebridge functions. This allows you to add and control accessories from a "Bridge" or "Gateway" with a Websocket API. [Node-RED](http://nodered.org/) is the perfect platform to use with homebridge-websocket.

Note-RED is a visual tool for wiring together hardware devices, APIs and online services.

Please note that you can only get the accessories which are added via this homebridge-websocket plugin.
The same applies to the homebridge-mqtt plugin. See comments [here](https://github.com/cflurin/homebridge-mqtt/issues/8)

### Installation

If you are new to Homebridge, please first read the [documentation](https://github.com/nfarina/homebridge) to install Homebridge.

Install homebridge-websocket:
```sh
sudo npm install -g homebridge-websocket
```

### Configuration
Add the websocket-platform in config.json in your home directory inside `.homebridge`.

```sh
{
  "platform" : "websocket",
  "name" : "websocket",
  "port": 4050
}
```

### Websocket Uri

The homebridge-websocket is listen on:

```sh
ws://127.0.0.1:4050
```

Replace `127.0.0.1` with your `ip-address`. The port `4050` can be changed in config.json.
The websocket-client (e.g. Node-RED) has to connect to homebridge-websocket.

### Websocket API

The data is sent/received in a JSON format with this structure:

```sh
{"topic": <function>, "payload": {<data>}}
```

function | input / output
-------- | ---------
add | output
remove | output
get | output
setValue | output
set | input
get | input
response | input
callback | output


```sh
input:  the websocket-client receives a message from the homebridge-websocket.
output: the websocket-client sends a message to the homebridge-websocket.
```

**Howto examples:**

**add (output)**

```sh
{"topic": "add", "payload": {"name": "flex_lamp", "service": "Switch"}}
```

or with the additional accessory informations
```sh
{"topic": "add", "payload": {"name": "flex_lamp", "service": "Switch", "manufacturer": "lamp_manu", "model": "flex_007", "serialnumber": "4711", "firmwarerevision": "1.0.0"}}
```

After the new accessory is added homebridge-websocket sends an acknowledge message:

```sh
{"topic":"response", "payload": {"ack": true, "message": "accessory 'flex_lamp' is added."}}
```

**remove (output)**

```sh
{"topic": "remove", "payload": {"name": "flex_lamp"}}
```

After the accessory is removed homebridge sends an acknowledge message:

```sh
{"topic":"response", "payload": {"ack": true, "message": "accessory 'flex_lamp' is removed."}}
```

**get (output)**

```sh
{"topic": "get", "payload": {"name": "all"}}
```

homebridge sends an accessories list:

```sh
{"topic": "accessories", "payload": {
  "node_switch":{"service":"Switch","characteristics":{"On":true}},
  "office_lamp":{"service":"Lightbulb","characteristics":{"On":"blank","Brightness":65}},
  "at_home":{"service":"OccupancySensor","characteristics":{"OccupancyDetected":1}}
  }
}
```

```sh
{"topic": "get", "payload": {"name": "temp_outdoor"}}
```

homebridge sends the accessory JSON object:

```sh
{"topic": "accessories", "payload": {
  "temp_outdoor": {"service": "TemperatureSensor", "characteristics": {"CurrentTemperature": "13.4"}}
  }
}
```

**setValue (output)**

```sh
{"topic": "setValue", "payload": {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**set (input)**

```sh
{"topic": "set", "payload": {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**get (input)**

```sh
{"topic": "get", "payload": {"name": "flex_lamp", "characteristic": "On"}}
```

When homebridge-websocket sends a `get` topic it expects a callback with the value within 1 second.

**callback (output)**

```sh
{"topic": "callback", "payload": {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

The required characteristics are added with the default properties. If you need to change the default, define the characteristic-name with the properties. e.g.:

```sh
{"topic": "add",
 "payload":
  {
    "name": "temp_living",
    "service": "TemperatureSensor",
    "CurrentTemperature": {"minValue": -20, "maxValue": 60,"minStep": 1}
  }
}
```

To add an optional charachteristic define the characteristic-name with "default" or with the properties. e.g.:

```sh
{"topic": "add", "payload": {"name": "living_lamp", "service": "Lightbulb", "Brightness": "default"}}
```

```sh
{"topic": "add",
  "payload":
    {
      "name": "bathroom_blind",
      "service": "WindowCovering",
      "CurrentPosition": {"minStep": 5},
      "TargetPosition": {"minStep": 5},
      "CurrentHorizontalTiltAngle": {"minValue": 0, "minStep": 5},
      "TargetHorizontalTiltAngle": {"minValue": 0, "minStep": 5}
    }
}
```

[HomeKitTypes.js](https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js) describes all the predifined Services and Characteristcs.

### Websocket client (node-RED)

Here's an example flow. It shows how to add an accessory (office_lamp) and how to set the value on/off.
The messages sent from the homebridge-websocket are displayed on the debug tap.

node-RED websocket settings:

```sh
Type:     Connect to
URL:      ws://127.0.0.1:4050
option:   Send/Receice intery message
```

![node-RED](https://cloud.githubusercontent.com/assets/5056710/14761441/fee01054-0961-11e6-81e0-73f59603089c.jpeg)

Take a look at [collection/homebridge-websocket](https://github.com/cflurin/collection/tree/master/homebridge-websocket)
for the `example-flow.json` which you can import into node-RED.
