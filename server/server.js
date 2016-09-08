"use strict";

require( "console-stamp" )( console, "HH:MM:ss.l" );

var TAG = "[SERVER]",
    clientPath = __dirname + "/../client/";

var Promise = require( "promise" ),
    extend = require( "extend" ),
    fs = require( "fs" ),
    config = require( "./lib/config" ),
    ApiCodes = require( "./lib/api_codes" ),
    OPUGApi = require( "./lib/opug_api" ),
    Util = require( "./util/util" );

var express = require( "express" ),
    http = require( "http" ),
    https = require( "https" ),
    httpsOptions = require( "@starak/node_ssl.taglab.no" ),
    socketIO = require( 'socket.io' ),
    bodyParser = require( 'body-parser' ),
    schedule = require( 'node-schedule' );

var app = express(),
    io = null,
    usersOnline = {};

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

// start server
opugApi.doInit().done( doStartServer, function ( err ) {
    console.error( TAG, "Init error", err, err.stack || err.error && err.error.stack );
} );

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( {extended: true} ) );

// use public app path
app.use( express.static( clientPath ) );

// FUNCTIONS

function doStartServer() {

    // SOCKET

    var serverHttp = http.createServer( app ).listen( config.port );
    //serverHttps = https.createServer( httpsOptions, app ).listen( config.portHttps );
    //io = new socketIO();
    //io = socketIO.listen( serverHttps );
    io = socketIO.listen( serverHttp );

    //io.attach( serverHttp );
    //io.attach( serverHttps );

    console.log( TAG, "Listening on http port '" + config.port + "' and https port '" + config.portHttps + "'" );

    // set api socket notification
    opugApi.notificationHandler.socket = io;

    io.sockets.on( "connection", function ( socket ) {

        var socketId = socket.client.conn.id;

        // DATA

        /*
         * Data
         */
        socket.on( ApiCodes.DATA, function ( callback ) {
            Promise.all( [
                opugApi.getPugs( false ),
                opugApi.getUsers(),
                opugApi.getPugGames()
            ] )
                .then( function ( result ) {
                    callback( null, Util.extend(
                        {},
                        result[0],
                        result[1],
                        result[2]
                    ) );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        // /DATA

        // USER

        /*
         * Is User logged in
         */
        socket.on( ApiCodes.USER_LOGGED_IN, function ( userId, userEmail, callback ) {
            opugApi.isUserLoggedIn( userId, userEmail )
                .done( function ( data ) {
                    callback( null, data );

                    if ( data.user ) {
                        setUserOnline( socketId, data.user.id );
                    }
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Login User
         */
        socket.on( ApiCodes.USER_LOGIN, function ( userEmail, callback ) {
            opugApi.loginUser( userEmail )
                .done( function ( data ) {
                    callback( null, data );

                    if ( data.user ) {
                        setUserOnline( socketId, data.user.id );
                    }
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Get Users
         */
        socket.on( ApiCodes.USERS_GET, function ( callback ) {
            opugApi.getUsers()
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Add/Remove User device
         */
        socket.on( ApiCodes.USER_DEVICE, function ( deviceId, isRemove, options, callback ) {
            opugApi.addOrRemoveUserDevice( getOnlineUserId( socketId ), deviceId, isRemove, options )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Update User
         */
        socket.on( ApiCodes.USER_UPDATE, function ( user, callback ) {
            opugApi.updateUser( getOnlineUserId( socketId ), user )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        // /USER

        // PUG

        /*
         * Get Pug
         */
        socket.on( ApiCodes.PUG_GET, function ( pugId, callback ) {
            opugApi.getPug( pugId )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Get Pugs
         */
        socket.on( ApiCodes.PUGS_GET, function ( filter, callback ) {
            opugApi.getPugs( filter )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * New Pug
         */
        socket.on( ApiCodes.PUG_NEW, function ( gameId, message, options, callback ) {
            var userId = getOnlineUserId( socketId );

            opugApi.addPug( userId, gameId, message, options )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Join Pug
         */
        socket.on( ApiCodes.PUG_JOIN, function ( userId, pugId, slot, callback ) {
            opugApi.joinPug( userId, pugId, slot )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Leave Pug
         */
        socket.on( ApiCodes.PUG_LEAVE, function ( userId, pugId, callback ) {
            opugApi.leavePug( userId, pugId )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Finish Pug
         */
        socket.on( ApiCodes.PUG_FINISH, function ( pugId, scores, callback ) {
            opugApi.finishPug( pugId, getOnlineUserId( socketId ), scores )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Cancel Pug
         */
        socket.on( ApiCodes.PUG_CANCEL, function ( pugId, cancelMessage, callback ) {
            opugApi.cancelPug( pugId, getOnlineUserId( socketId ), cancelMessage )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Get finished Pugs pr. week
         */
        socket.on( ApiCodes.FINISHED_PUGS_PR_WEEK, function ( callback ) {
            opugApi.getFinishedPugsPrWeek()
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        /*
         * Get results for Pugs
         */
        socket.on( ApiCodes.FINISHED_PUGS_RESULTS, function ( from, to, callback ) {
            opugApi.getResultsForFinishedPugs( from, to )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        // /PUG

        // PUG PLAYERS

        /*
         * Pug Players form
         */
        socket.on( ApiCodes.PUG_PLAYERS_FORM, function ( pugId, callback ) {
            opugApi.getPugPlayersForm( pugId )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        // /PUG PLAYERS

        // PUG COMMENT

        /*
         * New Pug Comment
         */
        socket.on( ApiCodes.PUG_COMMENT_NEW, function ( pugId, pugMessage, callback ) {
            var userId = getOnlineUserId( socketId );

            opugApi.addPugComment( pugId, userId, pugMessage )
                .done( function ( data ) {
                    callback( null, data );
                }, function ( err ) {
                    callback( err );
                } );
        } );

        // /PUG COMMENT

        // DISCONNECT

        socket.on( "disconnect", function () {
            setUserOffline( socketId );
        } );

        // /DISCONNECT

    } );

    // /SOCKET

    // SERVER

    // ... PUG

    /*
     * Get Pug
     */
    app.get( "/api/" + ApiCodes.PUG_GET + "/:pugId", function ( req, res ) {
        var pugId = req.params.pugId;

        opugApi.getPug( pugId )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * Add Pug
     */
    app.post( "/api/" + ApiCodes.PUG_NEW, function ( req, res ) {
        var userId = req.body["userId"],
            gameId = req.body["gameId"],
            message = req.body["message"],
            options = req.body["options"];

        opugApi.addPug( userId, gameId, message, options )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * Join Pug
     */
    app.post( "/api/" + ApiCodes.PUG_JOIN, function ( req, res ) {
        var userId = req.body["userId"],
            pugId = req.body["pugId"],
            slot = req.body["slot"] || null;

        opugApi.joinPug( userId, pugId, slot )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * Leave Pug
     */
    app.post( "/api/" + ApiCodes.PUG_LEAVE, function ( req, res ) {
        var userId = req.body["userId"],
            pugId = req.body["pugId"];

        opugApi.leavePug( userId, pugId )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * Finish Pug
     */
    app.post( "/api/" + ApiCodes.PUG_FINISH, function ( req, res ) {
        var userId = req.body["userId"],
            pugId = req.body["pugId"],
            scores = req.body["scores"];

        opugApi.finishPug( pugId, userId, scores )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    // ... /PUG

    /*
     * Get Pug Games
     */
    app.get( "/api/" + ApiCodes.PUG_GAMES, function ( req, res ) {
        opugApi.getPugGames()
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * User login
     */
    app.post( "/api/" + ApiCodes.USER_LOGIN, function ( req, res ) {
        var userEmail = req.body.userEmail;

        opugApi.loginUser( userEmail )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * Is User logged in
     */
    app.post( "/api/" + ApiCodes.USER_LOGGED_IN, function ( req, res ) {
        var userId = req.body.userId,
            userEmail = req.body.userEmail;

        opugApi.isUserLoggedIn( userId, userEmail )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    /*
     * User register id
     */
    app.post( "/api/" + ApiCodes.USER_DEVICE, function ( req, res ) {
        var userId = req.body.userId,
            deviceId = req.body.deviceId,
            isRemove = req.body.isRemove === "true",
            deviceName = req.body.deviceName;

        opugApi.addOrRemoveUserDevice( userId, deviceId, isRemove, {
            name: deviceName
        } )
            .done( function ( data ) {
                res.send( data );
            }, function ( err ) {
                res.status( 400 ).send( err );
            } );
    } );

    // /SERVER

    // SCHEDULE

    schedule.scheduleJob( {
        minute: [0, 15, 30, 45]
    }, onEveryQuarterJob );

    //opugApi.doCancelOldWaitingPugs();

    // /SCHEDULE

}

function getOnlineUserId( socketId ) {
    return usersOnline[socketId] || null;
}

function setUserOnline( socketId, userId ) {
    usersOnline[socketId] = userId;
    io.emit( ApiCodes.USERS_ONLINE, Util.objectToArray( usersOnline ) );
}

function setUserOffline( socketId ) {
    usersOnline[socketId] = null;
    delete usersOnline[socketId];
    io.emit( ApiCodes.USERS_ONLINE, Util.objectToArray( usersOnline ) );
}

function onEveryQuarterJob() {
    // cancel old pugs
    //opugApi.doCancelOldWaitingPugs();
}

// /FUNCTIONS