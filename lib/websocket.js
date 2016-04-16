'use strict';

var util = require('util');
var path = require('path');
var Utils = require('./utils.js').Utils;
var port, plugin_name, accessories, Characteristic, addAccessory, removeAccessory;
var latest, get_timeout, set_timeout;

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
  
  this.g_callback = {};
}

Websocket.prototype.startServer = function() {

  var server = http.createServer(app);
  server.listen(port, function() {
    this.log("Websocket url %j", server.address());
  }.bind(this));
  
  var wsServer = new WebSocketServer({server: server});
  
  wsServer.on('connection', function(ws) {
  
    this.ws = ws;
    this.log.debug("Websocket client ip %s connected", ws.upgradeReq.connection.remoteAddress);
    
    ws.on('open', function open() {  // todo no event ?
      this.log.debug("Websocket.on.open");  
    }.bind(this));
    
    ws.on('close', function close() {
      this.log("Websocket.on.close client ip %s disconnected", ws.upgradeReq.connection.remoteAddress);
    }.bind(this));
    
    ws.on('error', function error(e) {
      this.log.error("Websocket.on.error %s", e.message);  
    }.bind(this))
    
    ws.on('message', function message(data) {
      //this.log.debug("Websocket.ws.message: %s", data);
      
      var msg = JSON.parse(data);
      var topic = msg.topic;
      var accessory = msg.payload;
      
      switch (topic) {
        case "add":
          this.log.debug("Websocket.on.message add %s", JSON.stringify(accessory, null, 2));
          addAccessory(accessory);
          break;
        
        case "remove":
          removeAccessory(accessory.name);
          break;
        
        case "set":
        case "setValue":
          this.log.debug("Websocket.on.message setValue \n  %s", JSON.stringify(accessory));
          this.setValue(accessory);
          break;
        
        case "callback":
          this.log.debug("Websocket.on.message callback \n  %s", JSON.stringify(accessory));
          var callback = this.g_callback[accessory.name+accessory.characteristic];
           
          if (typeof(callback) !== "undefined" && callback != "undef") {
            callback(null, accessory.value);
            this.g_callback[accessory.name+accessory.characteristic] = "undef";
          }
          break;
        
        default:
          this.log.error("Websocket.on.message unknown %s", topic);
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
  }
  catch (err) {
    var message = "name '" + name + "' or characteristic '" + c + "' not found.";
        this.log.warn("Websocket.setValue %s", message);
    this.sendAck(false, message);
  }
    
  if( typeof(sc) !== "undefined") {
    switch (sc.props.format) {
      case "bool":
        value = (value == 0 || value == false) ? false : true;
        break;
        
      case "int":
      case "uint8":
      case "uint16":
      case "unit32":
        value = parseInt(value);
        break;
        
      case "float":
        value = parseFloat(value);
        break;
        
      default:
        // string, tlv8, 
        value = undefined;
        this.log.warn("Websocket.setValue %s %s %s %s", name, c, value, JSON.stringify(sc.props));
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

Websocket.prototype.get = function(name, c, callback) {

  this.log.debug("Websocket.get %s %s", name, c);
  
  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    this.g_callback[name+c] = callback;
    var data = {"topic": "get", "payload": {"name": name, "characteristic": c}};
    this.sendData(data);
  } else {
    //this.log.error("Websocket.get client unconnected.");
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
 
  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    if (set_timeout) {
      clearTimeout(set_timeout);
    }
    
    var delay;
    
    switch (c) {
      case "On":
        value = (value == 0 || value == false) ? false : true;
        delay = 0;
        break;
      
      case "Brightness":
      case "TargetPosition":
      case "TargetHorizontalTiltAngle":
        delay = 300;
        break;
        
      default:
        delay = 0;
    }
    
    var data = {"topic": "set", "payload": {"name": name, "characteristic": c, "value": value}};
    
    set_timeout = setTimeout(function() {
      this.log.debug("Websocket.set %s %s %s", name, c, value);
      this.sendData(data);
    }.bind(this), delay);
    
    callback(); // todo error handling
  } else {
    //this.log.error("Websocket.get client unconnected.");
    callback("unconnected");
  }
}

Websocket.prototype.sendAck = function (ack, message) {

  if (typeof(this.ws) !== "undefined" && this.ws-OPEN) {
    var data = {"topic":"response", "payload": {"ack": ack, "message": message}}; 
    this.sendData(data);
  } else {
    this.log.error("Websocket.sendAck client unconnected.");
  }
}

Websocket.prototype.sendData = function(data) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var j_data = JSON.stringify(data);
    
    this.log.debug("Websocket.sendData \n  %s", JSON.stringify(data)); // JSON.stringify(data, null, 2));
    
    this.ws.send(j_data, function ack(error) {
      if (error) this.log("Websocket %s", error);
    }.bind(this));
  }
}
