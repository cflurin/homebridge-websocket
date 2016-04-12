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
  this.hap_accessories = [];
     
  var plugin_version = Utils.readPluginVersion();
  this.log("%s v%s", plugin_name, plugin_version);
  
  var params = {
    "log": this.log,
    "plugin_name": plugin_name,
    "port": config.port,
    "accessories": this.accessories,
    "Characteristic": Characteristic,
    "addAccessory": this.addAccessory.bind(this)
  }
  this.Websocket = new Websocket(params);

/*
  Utils.read_npmVersion(plugin_name, function(npm_version) {
    if (npm_version > plugin_version) {
      this.log("A new version %s is avaiable", npm_version);
    }
  }.bind(this));
*/

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
  
  if (!this.accessories[name]) {
    var uuid = UUIDGen.generate(name);
    
    var newAccessory = new Accessory(name, uuid);
    //this.log.debug("WebsocketPlatform.addAccessory UUID = %s", newAccessory.UUID);
    
    var i_accessory = new WebsocketAccessory(this.buildParams(accessoryDef));
    i_accessory.addService(newAccessory);
    i_accessory.configureAccessory(newAccessory);
    
    this.accessories[name] = i_accessory;
    this.hap_accessories.push(newAccessory);
    this.api.registerPlatformAccessories(plugin_name, platform_name, [newAccessory]);
    this.log.debug("WebsocketPlatform.addAccessory %s", name);
    this.Websocket.sendAck(name, true);
  } else {
    this.log.error("WebsocketPlatform.addAccessory name '%s' already used.", name);
    this.Websocket.sendAck(name, false);
  }
}

WebsocketPlatform.prototype.configureAccessory = function(accessory) {

  //this.log.debug("WebsocketPlatform.configureAccessory %s", JSON.stringify(accessory.services, null, 2));
   
  cachedAccessories++;
  var name = accessory.displayName;
  var uuid = accessory.UUID;
    
  var accessoryDef = {};
  accessoryDef.name = name;
  
  if (this.accessories[name]) {
    this.log.error("WebsocketPlatform.configureAccessory %s UUID %s already used.", name, uuid);
    process.exit(1);
  }
  
  accessory.reachable = true;
    
  var i_accessory = new WebsocketAccessory(this.buildParams(accessoryDef));
  i_accessory.configureAccessory(accessory);
  
  this.accessories[name] = i_accessory;
  this.hap_accessories.push(accessory);
}

WebsocketPlatform.prototype.removeAccessory = function(name) {
  // todo
}

WebsocketPlatform.prototype.buildParams = function (accessoryDef) {

  var params = {
    "accessoryDef": accessoryDef,
    "log": this.log,
    "Service": Service,
    "Characteristic": Characteristic,
    "Websocket": this.Websocket
  }
  //this.log.debug("WebsocketPlatform.configureAccessories %s", JSON.stringify(params.accessory_config));
  return params;
}

