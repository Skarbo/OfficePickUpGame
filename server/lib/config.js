"use strict";

var DIR_CONFIG = __dirname + "/../../config.json",
    DIR_CUSTOM_CONFIG = __dirname + "/../../config.custom.json";

var extend = require( "extend" ),
    fs = require( "fs" ),
    config = require( DIR_CONFIG ),
    customConfig = fs.existsSync( DIR_CUSTOM_CONFIG ) ? JSON.parse( fs.readFileSync( DIR_CUSTOM_CONFIG, {encoding: "UTF-8"} ) || "{}" ) : {};

module.exports = extend( true, config, customConfig );