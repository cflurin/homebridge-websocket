'use strict';

var util = require('util');
var path = require('path');
var Utils = require('./utils.js').Utils;
var port, plugin_name, accessories, Characteristic, addAccessory, removeAccessory, getAccessories;
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
  getAccessories = params.getAccessories;
    
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
    
    this.ws.on('open', function open() {  // no event ?
      this.log.debug("Websocket.on.open");  
    }.bind(this));
    
    this.ws.on('message', function message(data) {
      //this.log.debug("Websocket.on.message: %s", data);
      this.onMessage(data);
    }.bind(this));
    
    this.ws.on('close', function close() {
      this.log("Websocket.on.close client ip %s disconnected", ws.upgradeReq.connection.remoteAddress);
    }.bind(this));
    
    this.ws.on('error', function error(e) {
      this.log.error("Websocket.on.error %s", e.message);  
    }.bind(this))
    
    set_timeout = setTimeout(function() {
      this.log("Websocket client ip %s connected", ws.upgradeReq.connection.remoteAddress);
    }.bind(this), 500);
          
  }.bind(this));
}

Websocket.prototype.onMessage = function(data) {

  var msg = JSON.parse(data);
  var topic = msg.topic;
  var accessory = msg.payload;
  var result = {};
  
  switch (topic) {
    case "add":
    case "addAccessory":
      this.log.debug("Websocket.onMessage add %s", JSON.stringify(accessory, null, 2));
      addAccessory(accessory);
      break;
    
    case "remove":
    case "removeAccessory":
      removeAccessory(accessory.name);
      break;
    
    case "set":
    case "setValue":
      this.log.debug("Websocket.onMessage setValue \n  %s", JSON.stringify(accessory));
      result = this.validate(accessory);
      
      if (result.isValid) {
        accessories[accessory.name].save_and_setValue("websocket", accessory.characteristic, result.value);
      } else {
        this.log.warn("Websocket.setValue %s", result.message);
        this.sendAck(false, result.message);
      }
      break;
    
    case "callback":
      this.log.debug("Websocket.onMessage callback \n  %s", JSON.stringify(accessory));
      var callback = this.g_callback[accessory.name+accessory.characteristic];
       
      if (typeof(callback) !== "undefined" && callback != "undef") {
        result = this.validate(accessory);
        
        if (result.isValid) {
          callback(null, result.value);
        } else {
          this.log.warn("Websocket.onMessage %s", result.message);
          callback("undefined");
        }        
        this.g_callback[accessory.name+accessory.characteristic] = "undef";
      }
      break;
      
    case "getAccessories":
    case "getAccessory":
    case "get":
      var name;
      this.log.debug("Websocket.onMessage get %s", JSON.stringify(accessory));
      
      if (typeof(accessory.name) !== "undefined") {
        name = accessory.name;
      } else {
        name = "all";
      }
      
      if (typeof(accessories[name]) !== "undefined" || name === "all") {
        getAccessories(name);
      } else {
        var message = "name '" + name + "' undefined.";
        this.log.warn("Websocket.onMessage.get %s", message);
        this.sendAck(false, message);
      }
      break;
    
    default:
      this.log.error("Websocket.onMessage topic '%s' unknown.", topic);
  }
}

Websocket.prototype.validate = function(accessory) {

  var name = accessory.name;
  var c = accessory.characteristic;
  var value = accessory.value;
  
  var isValid = false;
  var message = "";
  
  if(typeof(accessories[name]) === "undefined") {
    message = "name '" + name + "' undefined.";
  } else if (typeof(Characteristic[c]) !== "function") {
      message = "characteristic '" + c + "' undefined.";
  } else if (typeof(accessory.value) === "undefined" || accessory.value === null) {
      message = "name '" + name + "' value undefined.";
  } else if (typeof(accessories[name].service.getCharacteristic(Characteristic[c])) === "undefined"){
    message = "name '" + name + "' characteristic do not match.";
  } else {
    isValid = true;
    var sc = accessories[name].service.getCharacteristic(Characteristic[c]);
    value = this.parseValue(value, sc.props.format);
    message = "name '" + name + "' is valid.";
  }
  
  return {isValid: isValid, message: message, value: value};
}

Websocket.prototype.parseValue = function(value, format) {

  switch (format) {
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
      this.log.warn("Websocket.parseValue %s %s %s %s", name, c, value, JSON.stringify(sc.props));
  }
  return value;
}

Websocket.prototype.get = function(name, c, callback) {

  //this.log.debug("Websocket.get %s %s", name, c);
  
  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    this.g_callback[name+c] = callback;
    var data = {"topic": "get", "payload": {"name": name, "characteristic": c}};
    this.sendData(data);
  } else {
    this.log.debug("Websocket.get client disconnected.");
    callback("disconnected");
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
    this.log.debug("Websocket.get client disconnected.");
    callback("disconnected");
  }
}

Websocket.prototype.sendAccessories = function (accessories) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var data = {"topic": "accessories", "payload": accessories};
    this.sendData(data);
  } else {
    this.log.error("Websocket.sendAck client disconnected.");
  }
}

Websocket.prototype.sendAck = function (ack, message) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var data = {"topic":"response", "payload": {"ack": ack, "message": message}}; 
    this.sendData(data);
  } else {
    this.log.error("Websocket.sendAck client disconnected.");
  }
}

Websocket.prototype.sendData = function(data) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var j_data = JSON.stringify(data);
    
    this.log.debug("Websocket.sendData \n  %s", JSON.stringify(data)); // JSON.stringify(data, null, 2));
    
    this.ws.send(j_data, function ack(error) {
      if (error) this.log("Websocket.sendData %s", error);
    }.bind(this));
  }
}
