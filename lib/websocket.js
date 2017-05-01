'use strict';

var util = require('util');
var path = require('path');
var Utils = require('./utils.js').Utils;
var port, plugin_name, accessories, Characteristic, addAccessory, removeAccessory, getAccessories;
var latest, get_timeout, set_timeout, pre_name, pre_c;

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
}

Websocket.prototype.startServer = function() {

  var server = http.createServer(app);
  server.listen(port, function() {
    this.log("url %j", server.address());
  }.bind(this));
  
  var wsServer = new WebSocketServer({server: server});
  
  wsServer.on('connection', function(ws) {
  
    this.ws = ws;
    
    this.ws.on('open', function open() {  // no event ?
      this.log.debug("on.open");  
    }.bind(this));
    
    this.ws.on('message', function message(data) {
      this.log.debug("on.message: %s", data);
      this.onMessage(data);
    }.bind(this));
    
    this.ws.on('close', function close() {
      this.log("on.close client ip %s disconnected", ws.upgradeReq.connection.remoteAddress);
    }.bind(this));
    
    this.ws.on('error', function error(e) {
      this.log.error("on.error %s", e.message);  
    }.bind(this))
    
    set_timeout = setTimeout(function() {
      this.log("client ip %s connected", ws.upgradeReq.connection.remoteAddress);
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
      this.log.debug("onMessage add %s", JSON.stringify(accessory, null, 2));
      addAccessory(accessory);
      break;
    
    case "remove":
    case "removeAccessory":
      removeAccessory(accessory.name);
      break;
    
    case "set":
    case "setValue":
      //this.log.debug("onMessage setValue %s", JSON.stringify(accessory));
      this.log.debug("setValue %s", JSON.stringify(accessory));
      result = this.validate(accessory);
      
      if (result.isValid) {
        accessories[accessory.name].save_and_setValue("websocket", accessory.characteristic, result.value);
      } else {
        this.log.warn("setValue %s", result.message);
        this.sendAck(false, result.message);
      }
      break;
    
    case "callback":
      this.log.debug("callback %s", JSON.stringify(accessory));
      
        result = this.validate(accessory);
        
        if (result.isValid) {
          accessories[accessory.name].saveValue(accessory.characteristic, result.value);
        } else {
          this.log.error("onMessage %s", result.message);
          this.sendAck(false, result.message);
        }        
      break;
      
    case "getAccessories":
    case "getAccessory":
    case "get":
      var name;
      this.log.debug("onMessage get %s", JSON.stringify(accessory));
      
      if (typeof(accessory.name) !== "undefined") {
        name = accessory.name;
      } else {
        name = "all";
      }
      
      if (typeof(accessories[name]) !== "undefined" || name === "all") {
        getAccessories(name);
      } else {
        var message = "name '" + name + "' undefined.";
        this.log.warn("onMessage.get %s", message);
        this.sendAck(false, message);
      }
      break;
    
    default:
      var message = "topic '" + topic + "' unkown.";
      this.log.warn("onMessage topic %s", message);
      this.sendAck(false, message);
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
    var result = {};
    result = accessories[name].parseValue(c, value);
    isValid = result.isValid;
    value = result.value;
    if (!isValid) {
      message = "value '" + value + "' outside range";
    } else {
      message = "name '" + name + "' is valid.";
    }
  }
  
  return {isValid: isValid, message: message, value: value};
}

Websocket.prototype.get = function(name, c, callback) {
  // callback not used
  
  // this.log.debug("get %s %s", name, c);
  
  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var data = {"topic": "get", "payload": {"name": name, "characteristic": c}};
    this.sendData(data);
  } else {
    this.log.debug("get client disconnected.");
  }
}

Websocket.prototype.set = function(name, c, value, callback) {
 
  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {       

    if (c === "On") {
      value = (value == 0 || value == false) ? false : true;
    }
    
    var data = {"topic": "set", "payload": {"name": name, "characteristic": c, "value": value}};
    
    switch (c) {
      case "Brightness":
      case "TargetPosition":
      case "TargetHorizontalTiltAngle":
      case "TargetVerticalTiltAngle":
      case "TargetRelativeHumidity":
      case "TargetTemperature":
        if (set_timeout && name === pre_name && c === pre_c) {
          clearTimeout(set_timeout);
        }
        set_timeout = setTimeout(function() {
          this.log.debug("set %s %s %s", name, c, value);
          this.sendData(data);
        }.bind(this), 300);
        pre_name = name;
        pre_c = c;
        break;
        
      default:
        this.log.debug("set %s %s %s", name, c, value);
        this.sendData(data);
    }
    callback(); // todo error handling
  } else {
    this.log.debug("get client disconnected.");
    callback("disconnected");
  }
}

Websocket.prototype.sendAccessories = function (accessories) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var data = {"topic": "accessories", "payload": accessories};
    this.sendData(data);
  } else {
    this.log.error("sendAck client disconnected.");
  }
}

Websocket.prototype.sendAck = function (ack, message) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var data = {"topic":"response", "payload": {"ack": ack, "message": message}}; 
    this.sendData(data);
  } else {
    this.log.error("sendAck client disconnected.");
  }
}

Websocket.prototype.sendData = function(data) {

  if (typeof(this.ws) !== "undefined" && this.ws.OPEN) {
    var j_data = JSON.stringify(data);
    
    this.log.debug("sendData %s", JSON.stringify(data)); // JSON.stringify(data, null, 2));
    
    this.ws.send(j_data, function ack(error) {
      if (error) this.log("sendData %s", error);
    }.bind(this));
  }
}
