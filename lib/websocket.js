'use strict';

var util = require('util');
var path = require('path');
var Utils = require('./utils.js').Utils;
var port, plugin_name, accessories, Characteristic, addAccessory, removeAccessory;
var connection, latest, get_timeout, set_timeout;

var WebSocketServer = require('ws').Server,
  http = require('http'),
  express = require('express'),
  app = express();
  
module.exports = {
  Websocket: Websocket
}

function Websocket(params) {

  this.log = params.log;
  port = params.port;
  plugin_name = params.plugin_name;
  accessories = params.accessories;
  Characteristic = params.Characteristic;
  addAccessory = params.addAccessory;
  removeAccessory = params.removeAccessory;
  
  this.ws;
  connection = false;
  
  this.g_callback = {};
}

Websocket.prototype.startServer = function() {

  var server = http.createServer(app);
  server.listen(port, function() {
    this.log("Websocket url %j", server.address());
  }.bind(this));
  
  var wss = new WebSocketServer({server: server});
  
  wss.on('connection', function(ws) {
  
    this.ws = ws;
    connection = true;
    this.log("Websocket client ip %s connected", ws.upgradeReq.connection.remoteAddress);
    
    ws.on('open', function open() {
      this.log("Websocket open");
    }.bind(this));
    
    ws.on('close', function close() {
      this.log("Websocket client ip %s disconnected", ws.upgradeReq.connection.remoteAddress);
      connection = false;
    }.bind(this));
    
    ws.on('message', function message(data) {
      //this.log.debug("Websocket.ws.message: %s", data);
      
      var msg = JSON.parse(data);
      var topic = msg.topic;
      var accessory = msg.payload;
      
      switch (topic) {
        case "add":
          this.log.debug("Websocketws.message add %s", JSON.stringify(accessory, null, 2));
          addAccessory(accessory);
          break;
        
        case "remove":
          removeAccessory(accessory.name);
          break;
        
        case "set":
        case "setValue":
          this.log.debug("Websocketws.message set %s", JSON.stringify(accessory, null, 2));
          this.setValue(accessory);
          break;
        
        case "callback":
          this.log.debug("Websocketws.message callback %s", JSON.stringify(accessory, null, 2));
          var callback = this.g_callback[accessory.name+accessory.characteristic];
           
          if (typeof(callback) !== "undefined" && callback != "undef") {
            callback(null, accessory.value);
            this.g_callback[accessory.name+accessory.characteristic] = "undef";
          }
          break;
        
        default:
          this.log.error("Websocket.ws.message unknown %s", topic);
      }
    }.bind(this));
  }.bind(this));
}

Websocket.prototype.setValue = function(accessory) {

  var name = accessory.name;
  var c = accessory.characteristic;
  var value = accessory.value;
  
  //this.log.debug("Websocket.setValue %s %s %s", name, c, value);
  
  try {
    var sc = accessories[name].service.getCharacteristic(Characteristic[c]);
    
    if( typeof(sc) !== "undefined") {
      switch (sc.props.format) {
        case "bool":
          value = (value == 0 || value == false) ? false : true;
          break;
          
        case "int":
        case "uint8":
        case "uint16":
        case "unit32":
          value = parseInt(data.value);
          break;
          
        case "float":
          value = parseFloat(data.value);
          break;
          
        default:
          // string, tlv8, 
          value = undefined;
          this.log.warn("Websocket.setValue %s %s %s %s", name, c, data.value, JSON.stringify(sc.props));
      }
    
      if (typeof(value) !== "undefined") {
        this.log.debug("Websocket.setValue %s %s %s", name, c, value);
        accessories[name].save_and_setValue("websocket", c, value);
      }
    }
    else {
      this.log.warn("Websocket.setValue %s %s undefined", name, c);
    }
  }
  catch (err) {
    this.log.warn("Websocket.setValue name '%s' or characteristic '%s' not found.", name, c);
    var message = "name '" + name + "' or characteristic '" + c + "' not found.";
    this.sendAck(false, message);
  }  
}

Websocket.prototype.get = function(name, c, callback) {

  this.log.debug("Websocket.get %s %s", name, c);
  
  if (connection && this.ws.OPEN) {
    this.g_callback[name+c] = callback;
    var data = {"topic": "get", "payload": {"name": name, "characteristic": c}};
    this.sendData(data);
  } else {
    this.log.debug("Websocket.get unconnected %s %s", name, c);
    callback("unconnected");
    return;
  }
  
  if (get_timeout) {
    clearTimeout(get_timeout);
  }
  
  get_timeout = setTimeout(function() {
    if (this.g_callback[name+c] != "undef") {
      this.log.debug("Websocket.get timeout %s %s", name, c);
      this.g_callback[name+c] = "undef";
      callback("timeout");
    }
  }.bind(this), 2000);
}

Websocket.prototype.set = function(name, c, value, callback) {
 
  if (connection && this.ws.OPEN) {
    var data = {"topic": "set", "payload": {"name": name, "characteristic": c, "value": value}};
    
    if (set_timeout) {
      clearTimeout(set_timeout);
    }
    
    var delay;
    
    switch (c) {
      case "Brightness":
      // todo more case "Characteristics" 
        delay = 300;
        break;
      default:
        delay = 0;
    }
    
    set_timeout = setTimeout(function() {
      this.log.debug("Websocket.set %s %s %s", name, c, value);
      this.sendData(data);
    }.bind(this), delay);
    
    callback(); // todo error handling
  } else {
    this.log.debug("Websocket.get unconnected %s %s", name, c);
    callback("unconnected");
  }
}

Websocket.prototype.sendAck = function (ack, message) {

  if (connection && this.ws.OPEN) {
    var data = {"topic":"response", "payload": {"ack": ack, "message": message}}; 
    this.sendData(data);
  } else {
    this.log.debug("Websocket.sendAck unconnected %s %s", name, c);
  }
}

Websocket.prototype.sendData = function(data) {

  if (connection && this.ws.OPEN) {
    var j_data = JSON.stringify(data);
    
    this.log.debug("Websocket.sendData %s", JSON.stringify(data, null, 2));
    
    this.ws.send(j_data, function ack(error) {
      if (error) this.log("Websocket %s", error);
    }.bind(this));
  }
}
