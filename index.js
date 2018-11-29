'use strict';

var util = require('util');
var Utils = require('./lib/utils.js').Utils;
var WebsocketAccessory = require('./lib/accessory.js').Accessory;
var Websocket = require('./lib/websocket.js').Websocket;

var Accessory, Service, Characteristic, UUIDGen;
var cachedAccessories = 0;

var platform_name = "websocket";
var plugin_name = "homebridge-" + platform_name;
var storagePath;

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);
  
  Accessory = homebridge.platformAccessory;
  
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid; // Universally Unique IDentifier
  
  storagePath = homebridge.user.storagePath();
  
  homebridge.registerPlatform(plugin_name, platform_name, WebsocketPlatform, true);
}

function WebsocketPlatform(log, config, api) {

  this.log = log;
  this.accessories = {};
  this.hap_accessories = {};
  
  this.log.debug("storagePath = %s", storagePath);
  this.log.debug("config = %s", JSON.stringify(config));
  
  if (typeof(config) !== "undefined" && config !== null) {
    this.port = config.port || {"port": 4050};
  } else {
    this.log.error("config undefined or null!");
    this.log("storagePath = %s", storagePath);
    process.exit(1);
  }
     
  var plugin_version = Utils.readPluginVersion();
  this.log("%s v%s", plugin_name, plugin_version);
  
  var params = {
    "log": this.log,
    "plugin_name": plugin_name,
    "port": this.port,
    "accessories": this.accessories,
    "Characteristic": Characteristic,
    "addAccessory": this.addAccessory.bind(this),
    "removeAccessory": this.removeAccessory.bind(this),
    "getAccessories": this.getAccessories.bind(this)
  }
  this.Websocket = new Websocket(params);

  Utils.read_npmVersion(plugin_name, function(npm_version) {
    if (npm_version > plugin_version) {
      this.log("A new version %s is avaiable", npm_version);
    }
  }.bind(this));

  if (api) {
    this.api = api;

    this.api.on('didFinishLaunching', function() {
      this.log("Plugin - DidFinishLaunching");
     
     this.Websocket.startServer();
             
      this.log.debug("Number of cached Accessories: %s", cachedAccessories);
      this.log("Number of Accessories: %s", Object.keys(this.accessories).length);

    }.bind(this));
    //this.log.debug("WebsocketPlatform %s", JSON.stringify(this.accessories));
  }
}

WebsocketPlatform.prototype.addAccessory = function(accessoryDef) {

  var name = accessoryDef.name;
  var ack, message;
  var isValid;
  
  if (!this.accessories[name]) {
    var uuid = UUIDGen.generate(name);
    
    var newAccessory = new Accessory(name, uuid);
    newAccessory.reachable = true;
    newAccessory.context.service_name = accessoryDef.service;
    
    //this.log.debug("addAccessory UUID = %s", newAccessory.UUID);
    
    var i_accessory = new WebsocketAccessory(this.buildParams(accessoryDef));
    isValid = i_accessory.addService(newAccessory);
    if (isValid) {
      i_accessory.configureAccessory(newAccessory);
      
      this.accessories[name] = i_accessory;
      this.hap_accessories[name] = newAccessory;
      this.api.registerPlatformAccessories(plugin_name, platform_name, [newAccessory]);
      
      ack = true;
      message =  "accessory '" + name + "' is added.";
    } else {
      ack = false;
      message = "service '" + accessoryDef.service + "' undefined.";
    }
  } else {
    ack = false;
    message = "name '" + name + "' is already used.";
  }
  this.log("addAccessory %s", message);
  this.Websocket.sendAck(ack, message);
}

WebsocketPlatform.prototype.configureAccessory = function(accessory) {

  //this.log.debug("configureAccessory %s", JSON.stringify(accessory.services, null, 2));
  
  cachedAccessories++;
  var name = accessory.displayName;
  var uuid = accessory.UUID;
    
  var accessoryDef = {};
  accessoryDef.name = name;
  accessoryDef.service = accessory.context.service_name;
  
  if (this.accessories[name]) {
    this.log.error("configureAccessory %s UUID %s already used.", name, uuid);
    process.exit(1);
  }
  
  accessory.reachable = true;
    
  var i_accessory = new WebsocketAccessory(this.buildParams(accessoryDef));
  i_accessory.configureAccessory(accessory);
  
  this.accessories[name] = i_accessory;
  this.hap_accessories[name] = accessory;
}

WebsocketPlatform.prototype.removeAccessory = function(name) {

  var ack, message;
  
  if (typeof(this.accessories[name]) !== "undefined") {
    this.log.debug("removeAccessory '%s'", name);
    
    this.api.unregisterPlatformAccessories(plugin_name, platform_name, [this.hap_accessories[name]]);
    delete this.accessories[name];
    delete this.hap_accessories[name];
    ack = true;
    message = "accessory '" + name + "' is removed.";
  } else {
    ack = false;
    message = "accessory '" + name + "' not found.";
  }
  this.log("removeAccessory %s", message);
  this.Websocket.sendAck(ack, message);
}

WebsocketPlatform.prototype.getAccessories = function(name) {

  var accessories = {};
  var def = {};
  var service, characteristics;
  
  switch (name) {
    case "all":
      for (var k in this.accessories) {
        //this.log("getAccessories %s", JSON.stringify(this.accessories[k], null, 2));
        service = this.accessories[k].service_name;
        characteristics =  this.accessories[k].i_value;
        def = {"service": service, "characteristics": characteristics};
        accessories[k] = def;
      }
    break;
    
    default:
      service = this.accessories[name].service_name;
      characteristics =  this.accessories[name].i_value;
      def = {"service": service, "characteristics": characteristics};
      accessories[name] = def;
  }

  //this.log("getAccessory %s", JSON.stringify(accessories, null, 2));
  this.Websocket.sendAccessories(accessories);
}

WebsocketPlatform.prototype.buildParams = function (accessoryDef) {

  var params = {
    "accessoryDef": accessoryDef,
    "log": this.log,
    "Service": Service,
    "Characteristic": Characteristic,
    "Websocket": this.Websocket
  }
  //this.log.debug("configureAccessories %s", JSON.stringify(params.accessory_config));
  return params;
}

