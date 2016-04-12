# homebridge-websocket
Homebridge-websocket is a Plugin for Homebridge. The Websocket-API supports the main homebridge functions. This allows you to add and control accessories from a "Bridge" or "Hub" with a Websocket API. [Node-RED] (http://nodered.org/) is the perfect platform to use with homebridge-websocket.

Note-RED is a visual tool for wiring together hardware devices, APIs and online services.

### Installation

If you're new to Homebridge, please first read the Homebridge [documentation](https://www.npmjs.com/package/homebridge).
You should have a look at the [Wiki](https://github.com/cflurin/homebridge-punt/wiki/Running-Homebridge-on-a-Raspberry-Pi) if you're running on a Raspberry.

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

### Websocket API

The message is a JSON object with this structure:

```sh
{topic: <function>, payload: {<data>}}
```

Howto examples:

**addAccessory: Node-RED websocket output**

```sh
{topic: "add", payload: {"name": "flex_lamp", "service": "Switch"}}
```

```sh
{topic: "add", payload: {"name": "aeotec_bulb", "service": "Lightbulb", "Brightness": "default"}}

```

After homebridge has added the new accessory Node-RED get an acknowledge message:

```sh
{"topic":"responce", "payload": {"ack": true, "comment": "The new accessory 'flex_lamp' is now added."}}

```

**setValue: Node-RED websocket output**

```sh
{topic: "setValue", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**set: Node-RED websocket input**

```sh
{topic: "set", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

**get: Node-RED websocket input**

```sh
{topic: "get", payload: {"name": "flex_lamp", "characteristic": "On"}}
```

When Node-RED receives a `get` topic it should send a callback with the value.

**callback: Node-RED websocket output**

```sh
{topic: "callback", payload: {"name": "flex_lamp", "characteristic": "On", "value": true}}
```

[HomeKitTypes.js](https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js) describes all the predifined Services and Characteristcs.


