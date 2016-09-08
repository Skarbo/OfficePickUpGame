"use strict";

var config = require( "../server/lib/config" ),
    OPUGApi = require( "../server/lib/opug_api" ),
    Promise = require( "promise" );

/**
 * @type {OfficePugApi}
 */
var opugApi = new OPUGApi( {
    dbHost: config.dbHost,
    dbUser: config.dbUser,
    dbPassword: config.dbPassword,
    dbDatabase: config.dbDatabase,
    gcm: config.gcmKey
} );

opugApi.doInit()
    .then( function () {
        return new Promise( function ( fulfill ) {
            Promise.all( [
                opugApi.pugHandler.doGetPug( 12 ),
                opugApi.userHandler.doGetUser( 1 )
            ] )
                .then( function ( result ) {
                    opugApi.notificationHandler.doNotifyNewPug( result[0], [
                        result[1]
                    ] );
                } )
                .done( fulfill )
        } );
    } )
    .done( function () {
        opugApi.doEndDatabaseConnection();
    } );

