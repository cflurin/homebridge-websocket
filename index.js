'use strict';

var util = require('util');
var Utils = require('./lib/utils.js').Utils;
var WebsocketAccessory = require('./lib/accessory.js').Accessory;
var Websocket = require('./lib/websocket.js').Websocket;

var Accessory, Service, Characteristic, UUIDGen;
var cachedAccessories = 0;

var platform_name = "websocket";
var plugin_name = "homebridge-" + platform_name;

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);
  
  Accessory = homebridge.platformAccessory;
  
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid; // Universally Unique IDentifier
  
  homebridge.registerPlatform(plugin_name, platform_name, WebsocketPlatform, true);
}

function WebsocketPlatform(log, config, api) {

  this.log = log;
  this.accessories = {};
  this.hap_accessories = {};
  
  if (typeof(config) !== "undefined") {
    this.port = config.port || {"port": 4050};
  } else {
    this.port = 4050;
    this.log.error("platform not found in config.json.");
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
    "removeAccessory": this.removeAccessory.bind(this)
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
             
      this.log.debug("Number of chaced Accessories: %s", cachedAccessories);
      this.log("Number of Accessories: %s", Object.keys(this.accessories).length);

    }.bind(this));
    //this.log.debug("WebsocketPlatform %s", JSON.stringify(this.accessories));
  }
}

WebsocketPlatform.prototype.addAccessory = function(accessoryDef) {

  var name = accessoryDef.name;
  var message;
  
  if (!this.accessories[name]) {
    var uuid = UUIDGen.generate(name);
    
    var newAccessory = new Accessory(name, uuid);
    //this.log.debug("addAccessory UUID = %s", newAccessory.UUID);
    
    var i_accessory = new WebsocketAccessory(this.buildParams(accessoryDef));
    i_accessory.addService(newAccessory);
    i_accessory.configureAccessory(newAccessory);
    
    this.accessories[name] = i_accessory;
    this.hap_accessories[name] = newAccessory;
    this.api.registerPlatformAccessories(plugin_name, platform_name, [newAccessory]);
    
    message =  "accessory '" + name + "' is added.";
    this.Websocket.sendAck(true, message);
  } else {

    message = "name '" + name + "' is already used.";
    this.Websocket.sendAck(false, message);
  }
  this.log("addAccessory %s", message);
}

WebsocketPlatform.prototype.configureAccessory = function(accessory) {

  //this.log.debug("configureAccessory %s", JSON.stringify(accessory.services, null, 2));
   
  cachedAccessories++;
  var name = accessory.displayName;
  var uuid = accessory.UUID;
    
  var accessoryDef = {};
  accessoryDef.name = name;
  
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

  var message;
  
  if (typeof(this.accessories[name]) !== "undefined") {
    this.log.debug("removeAccessory '%s'", name);
    
    this.api.unregisterPlatformAccessories(plugin_name, platform_name, [this.hap_accessories[name]]);
    delete this.accessories[name];
    delete this.hap_accessories[name];
    
    message = "accessory '" + name + "' is removed.";
    this.Websocket.sendAck(true, message);
  } else {
    message = "accessory '" + name + "' not found.";
    this.Websocket.sendAck(false, message);
  }
  this.log("removeAccessory %s", message);
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

