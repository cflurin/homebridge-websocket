# homebridge-websocket
Homebridge-websocket is a Plugin for Homebridge. The Websocket-API supports the main homebridge functions. This allows you to add and control accessories from a "Bridge" or "Gateway" with a Websocket API. [Node-RED](http://nodered.org/) is the perfect platform to use with homebridge-websocket.

Note-RED is a visual tool for wiring together hardware devices, APIs and online services.

### Installation

If you are new to Homebridge, please first read the Homebridge [documentation](https://www.npmjs.com/package/homebridge).
If you are running on a Raspberry, you will find a tutorial in the [homebridge-punt Wiki](https://github.com/cflurin/homebridge-punt/wiki/Running-Homebridge-on-a-Raspberry-Pi).

Install homebridge:
```sh
sudo npm install -g homebridge
```
Install homebridge-websocket:
```sh
sudo npm install -g homebridge-websocket
```

### Configuration
Add the websocket-platform in config.json in your home directory inside `.homebridge`.

```sh
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  
  "platforms": [
    {
      "platform" : "websocket",
      "name" : "websocket",
      "port": 4050
    }
  ],           

  "accessories": []
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

The message is a JSON object with this structure:

```sh
{topic: <function>, payload: {<data>}}
```

```sh
input:  the websocket-client receives a message from the homebridge-websocket.
```

```sh
output: the websocket-client sends a message to the homebridge-websocket.
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
callback | input

**Howto examples:**

**add (output)**

```sh
{topic: "add", payload: {"name": "flex_lamp", "service": "Switch"}}
```

After the new accessory is added homebridge-websocket sends an acknowledge message:

```sh
{"topic":"response", "payload": {"ack": true, "message": "accessory 'flex_lamp' is added."}}
```

**remove (output)**

```sh
{topic: "remove", payload: {"name": "flex_lamp"}}
```

After the accessory is removed homebridge sends an acknowledge message:

```sh
{"topic":"response", "payload": {"ack": true, "message": "accessory 'flex_lamp' is removed."}}
```

**get (output)**

```sh
{topic: "get", payload: {"name": "all"}}
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
{topic: "get", payload: {"name": "temp_outdoor"}}
```

homebridge sends the accessory JSON object:

```sh
{"topic": "accessories", payload: {
  "temp_outdoor": {"service": "TemperatureSensor", "characteristics": {"CurrentTemperature": "13.4"}}
  }
}
```

**setValue (output)**

```sh
{topic: "setValue", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**set (input)**

```sh
{topic: "set", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**get (input)**

```sh
{topic: "get", payload: {"name": "flex_lamp", "characteristic": "On"}}
```

When homebridge-websocket sends a `get` topic it expects a callback with the value within 2 seconds.

**callback (output)**

```sh
{topic: "callback", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

The required characteristics are added with the default properties. If you need to change the default, define the characteristic-name with the properties. e.g.:

```sh
{topic: "add",
 payload:
  {
    "name": "temp_living",
    "service": "TemperatureSensor",
    "CurrentTemperature": {"minValue": -20, "maxValue": 60,"minStep": 1}
  }
}
```

To add an optional charachteristic define the characteristic-name with "default" or with the properties. e.g.:

```sh
{topic: "add", payload: {"name": "living_lamp", "service": "Lightbulb", "Brightness": "default"}}
```

```sh
{topic: "add",
  payload:
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
