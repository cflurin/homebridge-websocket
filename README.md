# homebridge-websocket
Homebridge-websocket is a Plugin for Homebridge. The Websocket-API supports the main homebridge functions. This allows you to add and control accesoories from a "Bridge" or "Hub" with a Websocket API. [Node-RED] (http://nodered.org/) is the perfect platform to use with homebridge-websocket.

What is Node-RED?
Note-RED is a visual tool for wiring together hardware devices, APIs and online services – for wiring the Internet of Things.

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

todo ...


