"use strict";

var mysql = require( 'mysql' ),
    Promise = require( "promise" ),
    fs = require( "fs" );

var CandidateHandler = require( "../handler/candidate_handler" ),
    UserHandler = require( "../handler/user_handler" ),
    PugHandler = require( "../handler/pug_handler" ),
    NotificationHandler = require( "../handler/notification_handler" ),
    ResponseUtil = require( "../util/response_util" );

/**
 * @param {Object} options
 * @param {String} [options.dbHost]
 * @param {String} [options.dbUser]
 * @param {String} [options.dbPassword]
 * @param {String} options.dbDatabase
 * @param {Object} [options.notificationSocket]
 * @param {String} [options.gcm] API Key
 * @constructor
 */
function OfficePugApi( options ) {

    var TAG = "[OPUGApi]";
    var TIME_OLD_PUGS = 15 * 60 * 1000; // 15 mins

    var self = this;
    /**
     * @type {Object}
     */
    self.dbConnection = null;
    /**
     * @type {UserHandler}
     */
    self.userHandler;
    /**
     * @type {CandidateHandler}
     */
    self.candidateHandler;
    /**
     * @type {PugHandler}
     */
    self.pugHandler;
    /**
     * @type {NotificationHandler}
     */
    self.notificationHandler;

    /**
     * @returns {Promise}
     */
    this.doInit = function () {
        self.dbConnection = mysql.createConnection( {
            host: options.dbHost || "localhost",
            user: options.dbUser || "root",
            password: options.dbPassword || "",
            database: options.dbDatabase
        } );

        var connectToDatabasePromise = function () {
            return new Promise( function ( fulfill, reject ) {
                self.dbConnection.connect( function ( err ) {
                    if ( err ) {
                        reject( {
                            message: "Could not connect to database",
                            error: err
                        } );
                        return;
                    }

                    fulfill();
                } );
            } )
        };

        var useDatabasePromise = function () {
            return new Promise( function ( fulfill, reject ) {
                self.dbConnection.query( "USE " + options.dbDatabase, function ( err, result ) {
                    if ( err ) {
                        reject( {
                            message: "Could not use database '" + options.dbDatabase + "'",
                            error: err
                        } );
                        return;
                    }

                    fulfill( null, result );
                } );
            } );
        };

        var setGroupConcatMaxLengthPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                self.dbConnection.query( "SET SESSION group_concat_max_len = 10000", function ( err, result ) {
                    if ( err ) {
                        reject( {
                            message: "Could not set group concat max length",
                            error: err
                        } );
                        return;
                    }

                    fulfill( null, result );
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            connectToDatabasePromise()
                .then( useDatabasePromise )
                .then( setGroupConcatMaxLengthPromise )
                .then( function () {
                    self.candidateHandler = new CandidateHandler();
                    self.notificationHandler = new NotificationHandler( {
                        socket: options.notificationSocket,
                        gcm: options.gcm
                    } );
                    self.userHandler = new UserHandler( self.dbConnection, self.notificationHandler );
                    self.pugHandler = new PugHandler( self.dbConnection, self.userHandler, self.notificationHandler );

                    return Promise.resolve();
                } )
                .then( function () {
                    return Promise.denodeify( self.pugHandler.doInit )();
                } )
                .done( function () {
                    fulfill( null );
                }, function ( err ) {
                    self.doEndDatabaseConnection();
                    reject( err );
                } );
        } );
    };

    // USER

    /**
     * @param {Number} userId
     * @param {String} userEmail
     * @returns {Promise}
     */
    this.isUserLoggedIn = function ( userId, userEmail ) {
        return new Promise( function ( fulfill, reject ) {
            self.userHandler.doesUserExist( userId, userEmail )
                .done( function ( user ) {
                    fulfill( ResponseUtil.createUserResponse( user ) );
                }, function ( err ) {
                    console.error( TAG, "Is User Logged In - Error while checking if user is logged in", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {String} userEmail
     * @returns {Promise}
     */
    this.loginUser = function ( userEmail ) {
        return new Promise( function ( fulfill, reject ) {
            self.userHandler.loginUser( userEmail )
                .done( function ( user ) {
                    fulfill( ResponseUtil.createUserResponse( user ) );
                }, function ( err ) {
                    console.error( TAG, "Login User - Error while logging in User", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.getUsers = function () {
        return new Promise( function ( fulfill, reject ) {
            self.userHandler.doGetUsers()
                .done( function ( users ) {
                    fulfill( ResponseUtil.createUsersResponse( users ) );
                }, function ( err ) {
                    console.error( TAG, "Get Users - Error while getting Users", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {String} deviceId
     * @param {boolean} isRemove
     * @param {Object} options
     * @returns {Promise}
     */
    this.addOrRemoveUserDevice = function ( userId, deviceId, isRemove, options ) {
        return new Promise( function ( fulfill, reject ) {
            self.userHandler.doAddOrRemoveUserDevice( userId, deviceId, isRemove, options )
                .done( function ( user ) {
                    fulfill( ResponseUtil.createUserResponse( user ) );
                }, function ( err ) {
                    console.error( TAG, "Add/Remove User device - Error while adding/removing User device", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {User} user
     * @returns {Promise}
     */
    this.updateUser = function ( userId, user ) {
        return new Promise( function ( fulfill, reject ) {
            self.userHandler.doUpdateUser( userId, user )
                .done( function ( user ) {
                    fulfill( ResponseUtil.createUserResponse( user ) );
                }, function ( err ) {
                    console.error( TAG, "Update User - Error while updating User", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    // /USER

    // PUG

    /**
     * @param {Number} userId
     * @param {Number} gameId
     * @param {String} message
     * @param {PugHandler.AddPugOptions} options
     * @returns {Promise}
     */
    this.addPug = function ( userId, gameId, message, options ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doAddPug( userId, gameId, message, options )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Add Pug - Error while adding Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {Number} pugId
     * @param {Number} slot
     * @returns {Promise}
     */
    this.joinPug = function ( userId, pugId, slot ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doAddPugPlayer( pugId, userId, slot )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Join Pug - Error while joining Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.leavePug = function ( userId, pugId ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doRemovePugPlayer( pugId, userId )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Leave Pug - Error while leaving Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Object} [filter]
     * @returns {Promise}
     */
    this.getPugs = function ( filter ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doGetPugs( filter )
                .done( function ( pugs ) {
                    fulfill( ResponseUtil.createPugsResponse( pugs ) );
                }, function ( err ) {
                    console.error( TAG, "Get Pugs - Error while getting Pugs", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.getPug = function ( pugId ) {
        return new Promise( function ( fulfill, reject ) {
            Promise
                .all( [
                    self.pugHandler.doGetPug( pugId ),
                    self.pugHandler.doGetCommentsForPug( pugId ),
                    self.pugHandler.doGetPugPlayersForm( pugId )
                ] )
                .done( function ( result ) {
                    fulfill( ResponseUtil.createPugResponse( result[0], result[1], result[2] ) );
                }, function ( err ) {
                    console.error( TAG, "Get Pug - Error while getting Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Array<Number>} scores
     * @returns {Promise}
     */
    this.finishPug = function ( pugId, userId, scores ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doFinishPug( pugId, userId, scores )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Finish Pug - Error while finishing Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {String} cancelMessage
     * @returns {Promise}
     */
    this.cancelPug = function ( pugId, userId, cancelMessage ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doCancelPug( pugId, userId, cancelMessage )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Cancel Pug - Error while canceling Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Array<Number|String>} inviteList
     * @returns {Promise}
     */
    this.doInviteUsers = function ( pugId, userId, inviteList ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doInviteUsers( pugId, userId, inviteList )
                .done( function ( pug ) {
                    fulfill( ResponseUtil.createPugResponse( pug ) );
                }, function ( err ) {
                    console.error( TAG, "Cancel Pug - Error while canceling Pug", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    this.doCancelOldWaitingPugs = function () {
        self.pugHandler.doGetPugs( {
            waitingPugs: true,
            updatedSince: new Date( Date.now() + TIME_OLD_PUGS )
        } )
            .then( function ( pugs ) {
                if ( pugs.length === 0 ) {
                    return Promise.resolve( [] );
                }

                return new Promise( function ( fulfill, reject ) {
                    Promise.all( pugs.map( function ( pug ) {
                        return self.pugHandler.doCancelPug( pug.id, null, "Pug did not ready up in time" );
                    } ) ).then( fulfill, reject );
                } );
            } )
            .done( function ( result ) {
                if ( result.length > 0 ) {
                    console.log( TAG, "Canceled Old Waiting Pugs - Canceled '" + result.length + "' pugs" );
                }
            }, function ( err ) {
                console.error( TAG, "Cancel Old Waiting Pugs - Error while canceling Pugs", err, err.stack || err.error && err.error.stack );
            } );
    };

    // /PUG

    // PUG PLAYERS

    this.getPugPlayersForm = function ( pugId ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doGetPugPlayersForm( pugId )
                .done( function ( pugComment ) {
                    fulfill( ResponseUtil.createPugPlayersFormResponse( pugComment ) );
                }, function ( err ) {
                    console.error( TAG, "Get Pug Players Form - Error while getting Pug Players form", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    // /PUG PLAYERS

    // PUG COMMENT

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {String} pugMessage
     * @returns {Promise}
     */
    this.addPugComment = function ( pugId, userId, pugMessage ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doAddPugComment( pugId, userId, pugMessage )
                .done( function ( pugComment ) {
                    fulfill( ResponseUtil.createPugCommentResponse( pugComment ) );
                }, function ( err ) {
                    console.error( TAG, "Add Pug Comment - Error while adding Pug Comment", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    // /PUG COMMENT

    // PUG GAMES

    /**
     * @returns {Promise}
     */
    this.getPugGames = function () {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doGetPugGames()
                .done( function ( pugGames ) {
                    fulfill( ResponseUtil.createPugGamesResponse( pugGames ) );
                }, function ( err ) {
                    console.error( TAG, "Get Pug Games - Error while getting Pug Games", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    // /PUG GAMES

    this.getFinishedPugsPrWeek = function () {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doGetFinishedPugsPrWeek()
                .done( function ( result ) {
                    fulfill( ResponseUtil.createFinishedPugsPrWeek( result ) );
                }, function ( err ) {
                    console.error( TAG, "Get finished Pug pr. week - Error while getting finished Pugs pr. week", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    this.getResultsForFinishedPugs = function ( from, to ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugHandler.doGetResultsForFinishedPugs( from, to )
                .done( function ( result ) {
                    fulfill( ResponseUtil.createPugResults( result.pugs, result.pugsTables ) );
                }, function ( err ) {
                    console.error( TAG, "Get finished Pug pr. week - Error while getting finished Pugs pr. week", err, err.stack || err.error && err.error.stack );

                    reject( ResponseUtil.createErrorResponse( err ) );
                } );
        } );
    };

    /**
     * @param {Function} callback
     */
    this.doRemoveAll = function ( callback ) {
        Promise.all( [
            Promise.denodeify( self.userHandler.doRemoveUsers )(),
            Promise.denodeify( self.pugHandler.doRemovePugs )(),
            Promise.denodeify( self.pugHandler.doRemovePugGames )()
        ] ).done( function ( result ) {
            callback( null, result );
        }, function ( err ) {
            callback( err );
        } )
    };

    /**
     * End database connection
     */
    this.doEndDatabaseConnection = function () {
        if ( self.dbConnection ) {
            self.dbConnection.end();
        }
    }

}

module.exports = OfficePugApi;