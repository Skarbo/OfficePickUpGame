"use strict";

var Promise = require( "promise" ),
    Util = require( "../util/util" ),
    ErrorCodes = require( "../lib/error_codes" ),
    PugHelper = require( "../helper/pug_helper" ),
    PugStorage = require( "../storage/pug_storage" ),
    UserRatingHandler = require( "../handler/user_rating_handler" ),
    StorageHelper = require( "../helper/storage_helper" ),
    ErrorHelper = require( "../helper/error_helper" ),
    PugResultsHelper = require( "../helper/pug_results_helper" );

/**
 * @typedef {Object} PugSettings
 * @property {String} [gameOther]
 * @property {Number} [players]
 * @property {Number} [teams]
 * @property {String} [teamMode]
 * @property {Array<Number|String>} [invites]
 * @property {boolean} [noRating]
 */

/**
 * @typedef {Object} Pug
 * @property {Number} id
 * @property {Number} userId
 * @property {String} gameId
 * @property {Number} state
 * @property {String} message
 * @property {PugSettings} settings
 * @property {Array<Number>} scores
 * @property {String} canceledMessage
 * @property {number} canceledUserId
 * @property {String} canceledDate
 * @property {String} readyDate
 * @property {Number} finishedUserId
 * @property {String} finishedDate
 * @property {String} updated
 * @property {String} created
 * @property {Array<PugPlayerShort>} players
 */

/**
 * @typedef {Object} PugGameSettings
 * @property {Number} [players]
 * @property {Number} [teams]
 */

/**
 * @typedef {Object} PugGame
 * @property {String} id
 * @property {String} title
 * @property {String} icon
 * @property {boolean} other
 * @property {String} ratingType
 * @property {PugGameSettings} settings
 */

/**
 * @typedef {Object} PugPlayer
 * @property {Number} pugId
 * @property {Number} userId
 * @property {Number|null} slot
 * @property {String|null} standing
 * @property {String|null} standingPercent
 * @property {String} registered
 */

/**
 * @typedef {Object} PugPlayerShort
 * @property {Number} userId
 * @property {String} userName
 * @property {Number|null} slot
 * @property {Number} team
 * @property {Array<PugPlayerForm>} form
 */

/**
 * @typedef {Object} PugPlayerForm
 * @property {Number} pugId
 * @property {Array} standing [1, 2]
 * @property {*} rate
 */

/**
 * @typedef {Object} PugComment
 * @property {Number} id
 * @property {Number} pugId
 * @property {Number} userId
 * @property {String} message
 * @property {String} created
 * @property {String} userName
 * @property {String} userImage
 */

/**
 * @param {Object} dbConnection
 * @param {UserHandler} userHandler
 * @param {NotificationHandler} notificationHandler
 * @constructor
 */
function PugHandler( dbConnection, userHandler, notificationHandler ) {

    var TAG = "PugHandler";

    var self = this;
    /**
     * @type {NotificationHandler}
     */
    this.notificationHandler = notificationHandler;
    /**
     * @type {PugStorage}
     */
    this.pugStorage = new PugStorage( dbConnection );
    /**
     * @type {UserRatingHandler}
     */
    this.userRatingHandler = new UserRatingHandler( dbConnection );
    /**
     * @type {Array<PugGame>}
     */
    this.pugGames = [];

    /**
     * @param {Database.Pug} pugDb
     * @returns {Pug}
     */
    function createPug( pugDb ) {
        var settings = JSON.parse( pugDb.pug_settings || "{}" );
        var teams = parseInt( settings.teams );
        var players = parseInt( settings.players );

        return {
            id: pugDb.pug_id,
            userId: pugDb.pug_user,
            gameId: pugDb.pug_game,
            state: pugDb.pug_state,
            message: pugDb.pug_message,
            settings: settings,
            scores: pugDb.pug_scores ? pugDb.pug_scores.split( "," ) : null,
            canceledMessage: pugDb.pug_canceled_message,
            canceledUserId: pugDb.pug_canceled_user_id,
            canceledDate: pugDb.pug_canceled_date ? new Date( pugDb.pug_canceled_date * 1000 ) : null,
            readyDate: pugDb.pug_ready_date ? new Date( pugDb.pug_ready_date * 1000 ) : null,
            finishedUserId: pugDb.pug_finished_user_id,
            finishedDate: pugDb.pug_finished_date ? new Date( pugDb.pug_finished_date * 1000 ) : null,
            updated: pugDb.pug_updated,
            created: pugDb.pug_created,
            players: pugDb.pug_players ? pugDb.pug_players
                .split( StorageHelper.FIELD_CONCAT_SEPARATOR )
                .map( function ( playerRaw, i ) {
                    var playerArray = playerRaw.split( StorageHelper.FIELD_CONCAT_SUB_SEPARATOR );
                    var slot = parseInt( playerArray[2] );
                    var team = isNaN( slot ) || isNaN( teams ) || isNaN( players ) || teams === PugHelper.TEAM_ALL_VS_ALL ? i + 1 : Math.ceil( slot / (players / teams) );

                    var form = playerArray[3] ?
                        playerArray[3].split( StorageHelper.FIELD_CONCAT_SEPARATOR2 )
                            .filter( function ( item ) {
                                return !!item;
                            } )
                            .map( function ( playerFormRaw ) {
                                var playerFormArray = playerFormRaw.split( StorageHelper.FIELD_CONCAT_SUB_SEPARATOR2 );

                                return {
                                    pugId: parseInt( playerFormArray[0] ),
                                    standing: Util.parseNumbersInArray( ( playerFormArray[1] || "" ).split( "/" ) ),
                                    standingPercent: parseFloat( playerFormArray[2] ) || 0,
                                    rate: Util.parseNumbersInArray( JSON.parse( playerFormArray[3] || "{}" ) ),
                                    rateDiff: Util.parseNumbersInArray( JSON.parse( playerFormArray[4] || "{}" ) ),
                                    date: new Date( parseInt( playerFormArray[5] ) * 1000 )
                                };
                            } )
                            .sort( function ( left, right ) {
                                return right.date - left.date;
                            } )
                            .slice( 0, 6 ) : [];

                    return {
                        userId: parseInt( playerArray[0] ),
                        userName: playerArray[1],
                        slot: slot || null,
                        team: team,
                        form: form
                    };
                } ) : []
        };
    }

    /**
     * @param {Database.PugGame} pugGameDb
     * @returns {PugGame}
     */
    function createPugGame( pugGameDb ) {
        return {
            id: pugGameDb.game_id,
            title: pugGameDb.game_title,
            icon: pugGameDb.game_icon,
            ratingType: pugGameDb.game_rating_type,
            settings: JSON.parse( pugGameDb.game_settings || "{}" )
        };
    }

    /**
     * @param {Database.PugPlayer} pugPlayerDb
     * @returns {PugPlayer}
     */
    function createPugPlayer( pugPlayerDb ) {
        return {
            pugId: pugPlayerDb.pug_id,
            userId: pugPlayerDb.user_id,
            slot: pugPlayerDb.player_slot,
            standing: pugPlayerDb.pug_player_standing,
            registered: pugPlayerDb.pug_player_registered
        };
    }

    /**
     * @param {Object} playerFormDb
     * @returns {{userId: Number, form: PugPlayerForm}}
     */
    function createPugPlayerForm( playerFormDb ) {
        return {
            userId: parseInt( playerFormDb.user_id ),
            form: playerFormDb[StorageHelper.FIELD_ALIAS_PLAYER_FORM] ? playerFormDb[StorageHelper.FIELD_ALIAS_PLAYER_FORM]
                .split( StorageHelper.FIELD_CONCAT_SEPARATOR )
                .map( function ( playerFormRaw ) {
                    var playerFormArray = playerFormRaw.split( StorageHelper.FIELD_CONCAT_SUB_SEPARATOR );

                    return {
                        pugId: parseInt( playerFormArray[0] ),
                        standing: (playerFormArray[1] || "").split( "/" ),
                        rate: JSON.parse( playerFormArray[2] || "[]" ),
                        date: new Date( parseInt( playerFormArray[3] ) * 1000 )
                    };
                } ) : []
        };
    }

    /**
     * @param {Database.PugComment} pugCommentDb
     * @returns {PugComment}
     */
    function createPugComment( pugCommentDb ) {
        return {
            id: pugCommentDb.comment_id,
            pugId: pugCommentDb.pug_id,
            userId: pugCommentDb.user_id,
            message: pugCommentDb.comment_message,
            created: pugCommentDb.comment_created,
            userName: pugCommentDb.user_name,
            userImage: pugCommentDb.user_image
        }
    }

    /**
     * @param {Function} callback
     */
    this.doInit = function ( callback ) {
        // get pug games
        self.pugStorage.doRetrievePugGames()
            .then( function ( gameDbList ) {
                self.pugGames = gameDbList.map( createPugGame );
                callback( null, self.pugGames );
            }, function ( err ) {
                callback( err );
            } );
    };

    // PUG

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doGetPug = function ( pugId ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugStorage.doRetrievePug( pugId )
                .then( function ( pugDb ) {
                    // pug does not exist
                    if ( !pugDb ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    return createPug( pugDb );
                } )
                .done( function ( pug ) {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not get PUG", ErrorCodes.PUG_GET_ERROR, {
                        pugId: pugId
                    } ) );
                } );
        } );
    };

    // /PUG

    // PUGS

    /**
     * @param {Object} filter
     * @param {Array<Number>} [filter.states]
     * @param {Number} [filter.updatedSince]
     * @param {Array<String>} [filter.finishedFromTo]
     * @returns {Promise}
     */
    this.doGetPugs = function ( filter ) {
        filter = filter || {};

        filter.states = filter.states || [PugHelper.PUG_STATE_WAITING, PugHelper.PUG_STATE_READY];

        return new Promise( function ( fulfill, reject ) {
            self.pugStorage.doRetrievePugs( filter ).done( function ( pugDbList ) {
                var pugs = pugDbList.map( createPug );

                fulfill( pugs );
            }, function ( err ) {
                reject( ErrorHelper.createError( err, "Error while getting Pugs", ErrorCodes.PUG_GET_ERROR, {
                    options: filter
                } ) );
            } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.doRemovePugs = function () {
        return new Promise( function ( fullfill, reject ) {
            self.pugStorage.doDeletePugs()
                .then( function () {
                    fullfill();
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not delete Pugs" ) );
                } );
        } );
    };

    // /PUGS

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doGetPugPlayers = function ( pugId ) {
        return new Promise( function ( fufill, reject ) {
            self.pugStorage.doRetrievePugPlayers( pugId )
                .then( function ( pugPlayerDbList ) {
                    fufill( pugPlayerDbList.map( createPugPlayer ) );
                }, function ( err ) {
                    reject( Util.extend( {
                        message: "Error while getting Players for Pug '" + pugId + "'",
                        error: err
                    }, err ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doGetPugPlayersForm = function ( pugId ) {
        return new Promise( function ( fufill, reject ) {
            self.doGetPug( pugId )
                .then( function ( pug ) {
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    var userIds = pug.players.map( function ( player ) {
                        return player.userId;
                    } );

                    return self.pugStorage.doRetrievePlayersForm( userIds, pug.gameId, pug.finishedDate || null );
                } )
                .then( function ( playerFormDbList ) {
                    fufill( playerFormDbList.map( createPugPlayerForm ) );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Error while getting Pug Players form", ErrorCodes.PUG_GET_PLAYERS_FORM_ERROR, {
                        pugId: pugId
                    } ) );
                } );
        } );
    };

    /**
     * @typedef {Object} PugHandler.AddPugOptions
     * @extend {PugSettings}
     * @property {Array<Object>} readyPlayers
     */

    /**
     * @param {Number} userId
     * @param {String} gameId
     * @param {String} message
     * @param {PugSettings|PugHandler.AddPugOptions} options
     * @returns {Promise}
     */
    this.doAddPug = function ( userId, gameId, message, options ) {
        var pug;

        // get game
        var pugGame = self.pugGames.filter( function ( pugGame ) {
                return pugGame.id.localeCompare( gameId ) === 0;
            } )[0] || null;

        /**
         * @param {User} user
         * @returns {Promise}
         */
        var userMustExistPromise = function ( user ) {
            // user does not exist
            if ( !user ) {
                return Promise.reject( ErrorCodes.createUserDoesNotExist( userId ) );
            }

            return Promise.resolve( user );
        };

        /**
         * @param {User} user
         * @returns {Promise}
         */
        var validateAndAddPugPromise = function ( user ) {
            // game or game other must be given
            var gameOther = options.gameOther;
            if ( !gameId && !gameOther ) {
                return Promise.reject( {
                    message: "Pug Game not given",
                    code: ErrorCodes.PUG_GAME_NOT_GIVEN
                } );
            }

            // game must exist if given
            if ( gameId && gameId !== "other" && !pugGame ) {
                return Promise.reject( {
                    message: "Game does not exist",
                    code: ErrorCodes.PUG_GAME_NOT_EXIST
                } );
            }

            message = message || "";
            var maxPlayers = parseInt( options.players );
            var teams = parseInt( options.teams );
            var teamMode = options.teamMode;
            var invites = options.invites;

            // max players must be larger than zero
            if ( isNaN( maxPlayers ) || maxPlayers <= 0 ) {
                return Promise.reject( {
                    message: "Pug players must be a positive integer",
                    code: ErrorCodes.PUG_ILLEGAL_MAX_PLAYERS
                } );
            }

            // teams must be legal
            if ( PugHelper.TEAMS.indexOf( teams ) === -1 ) {
                return Promise.reject( {
                    message: "Pug teams is not legal",
                    code: ErrorCodes.PUG_ILLEGAL_TEAMS
                } );
            }

            // team mode must be legal
            if ( PugHelper.TEAM_MODES.indexOf( teamMode ) === -1 ) {
                return Promise.reject( {
                    message: "Pug team mode is not legal",
                    code: ErrorCodes.PUG_ILLEGAL_TEAM_MODE
                } );
            }

            // max players must match game players
            if ( pugGame && pugGame.settings.players ) {
                var gameMaxPlayers = [].concat( pugGame.settings.players );
                if ( gameMaxPlayers.indexOf( maxPlayers ) === -1 ) {
                    return Promise.reject( {
                        message: "Pug max players must be legal to given game",
                        code: ErrorCodes.PUG_ILLEGAL_MAX_PLAYERS
                    } );
                }
            }

            // add pug to storage
            return self.pugStorage.doStorePug( userId, gameId, message, {
                gameOther: gameOther,
                players: maxPlayers,
                teams: teams,
                teamMode: teamMode,
                invites: invites
            } );
        };

        /**
         * @param {Database.Pug} pugDb
         */
        var addReadyPlayersPromise = function ( pugDb ) {
            var readyPlayers = (options.readyPlayers || []).slice( 0, options.players );

            return new Promise( function ( fulfill, reject ) {
                var addReadyPlayerFunc = function () {
                    var readyPlayer = readyPlayers.shift();

                    if ( readyPlayer ) {
                        self.doAddPugPlayer( pugDb.pug_id, readyPlayer.userId, readyPlayer.slot, true )
                            .then( function () {
                                addReadyPlayerFunc();
                            }, reject );
                    }
                    else {
                        fulfill( pugDb );
                    }
                };

                addReadyPlayerFunc();
            } );
        };

        /**
         * @param {Array} users
         * @returns {Promise}
         */
        var filterUsersToNotifyPromise = function ( users ) {
            // invite only
            if ( pug.settings.invites && pug.settings.invites.length > 0 ) {
                var readyPlayerIds = pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ),
                    invites = Util.parseNumbersInArray( pug.settings.invites );

                var usersToNotify = [],
                    user;
                for ( var i = 0; i < users.length; i++ ) {
                    user = users[i];
                    // is ready player
                    if ( readyPlayerIds.indexOf( user.id ) > -1 ) {
                        usersToNotify.push( user );
                    }
                    // invite
                    else {
                        for ( var j = 0; j < invites.length; j++ ) {
                            // invited by user id
                            if ( typeof invites[j] === "number" && invites[j] === user.id ) {
                                usersToNotify.push( user );
                            }
                            // invited by group
                            else if ( typeof invites[j] === "string" && user.groups.indexOf( invites[j] ) > -1 ) {
                                usersToNotify.push( user );
                            }
                        }
                    }
                }

                return Promise.resolve( usersToNotify );
            }
            // all users
            else {
                return Promise.resolve( users );
            }
        };

        return new Promise( function ( fulfill, reject ) {
            userHandler.doGetUser( userId )
                .then( userMustExistPromise )
                .then( validateAndAddPugPromise )
                .then( addReadyPlayersPromise )
                .then( function ( pugDb ) {
                    return self.doGetPug( pugDb.pug_id );
                } )
                // set pug as ready if it should be ready
                .then( function ( pug ) {
                    if ( PugHelper.shouldBeReady( pug ) ) {
                        return self.doReadyPug( pug );
                    }

                    return Promise.resolve( pug );
                } )
                // get all users
                .then( function ( pug_ ) {
                    pug = pug_;

                    return userHandler.doGetUsers( null );
                } )
                // filter users to notify
                .then( function ( users ) {
                    return filterUsersToNotifyPromise( users );
                } )
                // notify new pug
                .then( function ( users ) {
                    return notificationHandler.doNotifyNewPug( pug, users );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Error while adding Pug", ErrorCodes.PUG_ADD_ERROR, {
                        userId: userId,
                        gameId: gameId,
                        message: message,
                        options: options
                    } ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Pug} pugUpdate
     * @returns {Promise}
     */
    this.doUpdatePug = function ( pugId, pugUpdate ) {
        return new Promise( function ( fulfill, reject ) {
            self.doGetPug( pugId )
                .then( function ( pug ) {
                    // pug does not exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    return self.pugStorage.doSavePug( pugId, pugUpdate );
                } )
                .done( function ( pugDb ) {
                    fulfill( createPug( pugDb ) );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not update PUG", ErrorCodes.PUG_UPDATE_ERROR, {
                        pugId: pugId,
                        pugUpdate: pugUpdate
                    } ) );
                } )
        } );
    };

    // PUG PLAYER

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Number|null} [slot]
     * @param {boolean} [dontSetAsReady]
     * @returns {Promise}
     */
    this.doAddPugPlayer = function ( pugId, userId, slot, dontSetAsReady ) {
        slot = parseInt( slot ) || null;
        var pug, pugOld;

        return new Promise( function ( fulfill, reject ) {
            self.doGetPug( pugId )
                .then( function ( pug_ ) {
                    pug = pug_;
                    pugOld = pug;

                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    // pug must not be canceled
                    if ( pug.canceledDate ) {
                        return Promise.reject( ErrorCodes.createPugIsCanceled( pugId ) );
                    }

                    // pug must be waiting
                    if ( !PugHelper.isPugWaiting( pug ) ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_IS_NOT_WAITING
                        } );
                    }

                    // assign slot
                    if ( pug.settings.teamMode == PugHelper.TEAM_MODE_ASSIGNED ) {
                        var slot_ = PugHelper.assignPugPlayerSlot( pug, slot );

                        // illegal slot
                        if ( !slot_ ) {
                            return Promise.reject( {
                                message: "Illegal player slot",
                                code: ErrorCodes.PUG_PLAYER_SLOT_IS_ILLEGAL
                            } )
                        }

                        slot = slot_;
                    }
                    else {
                        slot = null;
                    }

                    return self.pugStorage.doStorePugPlayer( pugId, userId, slot );
                } )
                // update pug
                .then( function ( pugDb ) {
                    pug = createPug( pugDb );

                    return self.doUpdatePug( pug.id, {
                        state: pug.state
                    } );
                } )
                // get pug players and pug creator
                .then( function () {
                    return userHandler.doGetUsers( pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ).concat( pug.userId ) );
                } )
                // notify join pug
                .then( function ( users ) {
                    return notificationHandler.doNotifyJoinPug( pug, userId, PugHelper.isPlayerInPug( pugOld, userId ), users );
                } )
                // set pug as ready if it should be ready
                .then( function () {
                    if ( !dontSetAsReady && PugHelper.shouldBeReady( pug ) ) {
                        return self.doReadyPug( pug );
                    }

                    return Promise.resolve( pug );
                } )
                .done( function ( pug ) {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not add Player to PUG", ErrorCodes.PUG_ADD_PLAYER_ERROR, {
                        pugId: pugId,
                        userId: userId,
                        slot: slot
                    } ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @returns {Promise}
     */
    this.doRemovePugPlayer = function ( pugId, userId ) {
        return new Promise( function ( fulfill, reject ) {
            var pug;

            self.doGetPug( pugId )
                .then( function ( pug_ ) {
                    pug = pug_;

                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    // pug must not be canceled
                    if ( pug.canceledDate ) {
                        return Promise.reject( ErrorCodes.createPugIsCanceled( pugId ) );
                    }

                    // pug must be waiting
                    if ( !PugHelper.isPugWaiting( pug ) ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_IS_NOT_WAITING
                        } )
                    }

                    return self.pugStorage.doDeletePugPlayer( pugId, userId );
                } )
                // update pug
                .then( function ( pugDb ) {
                    pug = createPug( pugDb );

                    return self.doUpdatePug( pug.id, {
                        state: pug.state
                    } );
                } )
                // get pug players and pug creator
                .then( function () {
                    return userHandler.doGetUsers( pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ).concat( pug.userId ) );
                } )
                // notify leave pug
                .then( function ( users ) {
                    return self.notificationHandler.doNotifyLeavePug( pug, userId, users );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not remove Player from PUG", ErrorCodes.PUG_ADD_PLAYER_ERROR, {
                        pugId: pugId,
                        userId: userId
                    } ) );
                } );
        } );
    };

    // /PUG PLAYER

    // PUG STATE

    /**
     * @param {Pug} pug
     * @returns {Promise}
     */
    this.doReadyPug = function ( pug ) {
        /**
         * @param {Array<PugPlayer>} pugPlayers
         * @returns {Promise}
         */
        var assignRandomTeamsPromise = function ( pugPlayers ) {
            var playersSlots = Util.shuffleArray( Util.createRangeArray( pugPlayers.length + 1 ).slice( 1 ) );

            for ( var i = 0; i < pugPlayers.length; i++ ) {
                pugPlayers[i].slot = playersSlots[i];
            }

            return self.pugStorage.doSavePugPlayers( pug.id, pugPlayers );
        };

        // pug must not be canceled
        if ( pug.canceledDate ) {
            return Promise.reject( ErrorCodes.createPugIsCanceled( pug.id ) );
        }

        return new Promise( function ( fulfill, reject ) {
            self.doGetPugPlayers( pug.id )
                .then( function ( pugPlayers ) {
                    // pug can be set to ready
                    if ( !PugHelper.shouldBeReady( pug ) ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_COULD_NOT_BE_READY
                        } );
                    }

                    // assign random teams
                    if ( PugHelper.isTeamModeRandom( pug ) ) {
                        return assignRandomTeamsPromise( pugPlayers );
                    }
                    else {
                        return Promise.resolve();
                    }
                } )
                .then( function () {
                    return self.doUpdatePug( pug.id, Util.extend( pug, {
                        state: PugHelper.PUG_STATE_READY,
                        readyDate: new Date()
                    } ) );
                } )
                // get pug players and pug creator
                .then( function ( pug_ ) {
                    pug = pug_;

                    return userHandler.doGetUsers( pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ).concat( pug.userId ) );
                } )
                // notify ready pug
                .then( function ( users ) {
                    return self.notificationHandler.doNotifyReadyPug( pug, users );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not set PUG as ready", ErrorCodes.PUG_READY_ERROR, {
                        pug: pug
                    } ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Array<Number>} scores
     * @returns {Promise}
     */
    this.doFinishPug = function ( pugId, userId, scores ) {
        return new Promise( function ( fulfill, reject ) {
            var pug, user, pugGame;

            Promise.all( [
                self.doGetPug( pugId ),
                userHandler.doGetUser( userId )
            ] )
                .then( function ( result ) {
                    pug = result[0];
                    user = result[1];

                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    // user must exist
                    if ( !user ) {
                        return Promise.reject( ErrorCodes.createUserDoesNotExist( userId ) );
                    }

                    // pug must not be canceled
                    if ( pug.canceledDate ) {
                        return Promise.reject( ErrorCodes.createPugIsCanceled( pugId ) );
                    }

                    // pug must be ready state
                    if ( pug.state !== PugHelper.PUG_STATE_READY ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_IS_NOT_READY
                        } );
                    }

                    // user must be a able to finish pug
                    if ( !PugHelper.canUserFinishPug( pug, userId ) ) {
                        return Promise.reject( {
                            code: ErrorCodes.USER_CAN_NOT_FINISH_PUG
                        } );
                    }

                    // scores must be correct
                    if ( (pug.settings.teams === PugHelper.TEAM_ALL_VS_ALL && scores.length !== pug.settings.players)
                        || (pug.settings.teams !== PugHelper.TEAM_ALL_VS_ALL && pug.settings.teams !== scores.length) ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_SCORES_NOT_CORRECT
                        } )
                    }

                    // get pug game
                    pugGame = self.pugGames.filter( function ( pugGame ) {
                            return pugGame.id.localeCompare( pug.gameId ) === 0;
                        } )[0] || null;

                    return self.doUpdatePug( pugId, {
                        state: PugHelper.PUG_STATE_FINISH,
                        scores: scores,
                        finishedUserId: userId,
                        finishedDate: new Date()
                    } );
                } )
                // adjust user ratings
                .then( function ( pug_ ) {
                    pug = pug_;

                    // adjust rating if more than one players and pug game rating type is given
                    if ( pug.players.length > 1 && pugGame && pugGame.ratingType ) {
                        return self.userRatingHandler.doAdjustUserRatings( pug, pugGame );
                    }
                    else {
                        return Promise.resolve();
                    }
                } )
                // adjust player standings
                .then( function () {
                    var pugPlayers = pug.players;
                    var scoresForPlayers = {};
                    var isNotDraw = false;

                    scores.forEach( function ( score ) {
                        isNotDraw = isNotDraw || score !== scores[0];
                    } );

                    pugPlayers.forEach( function ( player ) {
                        var score = scores[player.team - 1];

                        if ( !scoresForPlayers[score] ) {
                            scoresForPlayers[score] = {
                                score: score,
                                players: []
                            };
                        }

                        scoresForPlayers[score].players.push( player );
                    } );

                    Util.objectToArray( scoresForPlayers )
                        .sort( function ( left, right ) {
                            return right.score - left.score;
                        } )
                        .forEach( function ( scoreForPlayers, i ) {
                            scoreForPlayers.players.forEach( function ( player ) {
                                player.standing = (isNotDraw ? (i + 1) : 0 ) + "/" + scores.length;
                                player.standingPercent = 1 - (i / (scores.length - 1));
                            } );
                        } );

                    return self.pugStorage.doSavePugPlayers( pugId, pugPlayers );
                } )
                // get player users
                .then( function () {
                    return userHandler.doGetUsers( pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ) );
                } )
                // notify finished pug
                .then( function ( users ) {
                    return self.notificationHandler.doNotifyFinishPug( pug, userId, users );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not finish PUG", ErrorCodes.PUG_FINISH_ERROR, {
                        pugId: pugId,
                        userId: userId,
                        scores: scores
                    } ) );
                } )
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number|null} userId Null if system
     * @param {String} [cancelMessage]
     * @returns {Promise}
     */
    this.doCancelPug = function ( pugId, userId, cancelMessage ) {
        cancelMessage = cancelMessage || "Canceled PUG";

        return new Promise( function ( fulfill, reject ) {
            var pug;

            self.doGetPug( pugId )
                .then( function ( pug ) {
                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    // pug must not be canceled
                    if ( pug.canceledDate ) {
                        return Promise.reject( ErrorCodes.createPugIsCanceled( pugId ) );
                    }

                    // pug must not be finished
                    if ( pug.state === PugHelper.PUG_STATE_FINISH ) {
                        return Promise.reject( ErrorCodes.createPugIsFinished( pugId ) );
                    }

                    // pug creator must be user or system
                    if ( userId !== null && pug.userId !== userId ) {
                        return Promise.reject( {
                            code: ErrorCodes.USER_IS_NOT_PUG_CREATOR
                        } )
                    }

                    return self.doUpdatePug( pugId, {
                        canceledMessage: cancelMessage,
                        canceledUserId: userId || null,
                        canceledDate: new Date()
                    } );
                } )
                // get pug players and pug creator
                .then( function ( pug_ ) {
                    pug = pug_;

                    return userHandler.doGetUsers( pug.players.map( function ( pugPlayer ) {
                        return pugPlayer.userId;
                    } ).concat( pug.userId ) );
                } )
                // notify canceled pug
                .then( function ( users ) {
                    return self.notificationHandler.doNotifyCanceledPug( pug, users );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not cancel PUG", ErrorCodes.PUG_CANCEL_ERROR, {
                        pugId: pugId,
                        userId: userId
                    } ) );
                } );
        } );
    };

    // /PUG STATE

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Array<Number|String>} inviteList
     * @returns {Promise}
     */
    this.doInviteUsers = function ( pugId, userId, inviteList ) {
        return new Promise( function ( fulfill, reject ) {
            var pug, pugOld;

            self.doGetPug( pugId )
                .then( function ( pug ) {
                    pugOld = pug;

                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    // pug must not be canceled
                    if ( pug.canceledDate ) {
                        return Promise.reject( ErrorCodes.createPugIsCanceled( pugId ) );
                    }

                    // pug must be waiting
                    if ( pug.state !== PugHelper.PUG_STATE_WAITING ) {
                        return Promise.reject( {
                            code: ErrorCodes.PUG_IS_NOT_WAITING
                        } );
                    }

                    // pug creator must be user
                    if ( pug.userId !== userId ) {
                        return Promise.reject( {
                            code: ErrorCodes.USER_IS_NOT_PUG_CREATOR
                        } );
                    }

                    // invites array
                    var invites = inviteList,
                        settings = Util.extend( {}, pug.settings );
                    settings.invites = invites;

                    return self.doUpdatePug( pugId, {
                        settings: settings
                    } );
                } )
                .then( function ( pug_ ) {
                    pug = pug_;

                    return self.notificationHandler.doNotifyInvitePug( pug, pugOld );
                } )
                .done( function () {
                    fulfill( pug );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not invite users", ErrorCodes.PUG_INVITE_USERS_ERROR, {
                        pugId: pugId,
                        userId: userId,
                        inviteList: inviteList
                    } ) );
                } );
        } );
    };

    // PUG COMMENTS

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doGetCommentsForPug = function ( pugId ) {
        return new Promise( function ( fulfill, reject ) {
            self.pugStorage.doRetrievePugCommentForPug( pugId )
                .done( function ( pugCommentDbList ) {
                    fulfill( pugCommentDbList.map( createPugComment ) );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not get comment", ErrorCodes.PUG_GET_COMMENT_ERROR, {
                        pugId: pugId
                    } ) );
                } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {String} commentMessage
     * @returns {Promise}
     */
    this.doAddPugComment = function ( pugId, userId, commentMessage ) {
        return new Promise( function ( fulfill, reject ) {
            var pug, pugComment;

            self.doGetPug( pugId )
                .then( function ( pug_ ) {
                    pug = pug_;

                    // pug must exist
                    if ( !pug ) {
                        return Promise.reject( ErrorCodes.createPugDoesNotExistError( pugId ) );
                    }

                    return userHandler.doGetUser( userId );
                } )
                .then( function ( user ) {
                    // user must exist
                    if ( !user ) {
                        return Promise.reject( ErrorCodes.createUserDoesNotExist( userId ) );
                    }

                    return self.pugStorage.doStorePugComment( pugId, userId, commentMessage );
                } )
                .then( function ( pugCommentDb ) {
                    pugComment = createPugComment( pugCommentDb );

                    return self.notificationHandler.doNotifyNewPugComment( pug, pugComment );
                } )
                .done( function () {
                    fulfill( pugComment );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not add comment", ErrorCodes.PUG_ADD_COMMENT_ERROR, {
                        pugId: pugId,
                        userId: userId,
                        pugComment: commentMessage
                    } ) );
                } );
        } );
    };

    // /PUG COMMENTS

    // PUG GAMES

    /**
     * @returns {Promise}
     */
    this.doGetPugGames = function () {
        return new Promise( function ( fullfill, reject ) {
            self.pugStorage.doRetrievePugGames()
                .then( function ( pugGames ) {
                    fullfill( pugGames.map( createPugGame ) );
                },
                function ( err ) {
                    reject( Util.extend( {
                        message: "Error while getting Pug Games",
                        error: err
                    }, err ) );
                } );
        } );
    };
    /**
     * @returns {Promise}
     */
    this.doRemovePugGames = function () {
        return new Promise( function ( fullfill, reject ) {
            self.pugStorage.doDeletePugGames()
                .then( function () {
                    fullfill();
                },
                function ( err ) {
                    reject( Util.extend( {
                        message: "Could not delete Pug Games",
                        error: err
                    }, err ) );
                } );
        } );
    };

    // /PUG GAMES

    this.doGetResultsForFinishedPugs = function ( from, to ) {
        return new Promise( function ( fulfill, reject ) {
            self.doGetPugs( {
                states: [PugHelper.PUG_STATE_FINISH],
                finishedFromTo: [from, to]
            } ).then( function ( pugs ) {
                fulfill( {
                    pugs: pugs,
                    pugsTables: PugResultsHelper.createPugsTables( pugs )
                } );
            }, function ( err ) {
                reject( ErrorHelper.createError( err, "Could not get results for Pugs", ErrorCodes.GENERAL_ERROR ) );
            } );
        } );
    };

    this.doGetFinishedPugsPrWeek = function () {
        return new Promise( function ( fulfill, reject ) {
            self.pugStorage.doRetrieveFinishedPugsInWeeks()
                .then( function ( result ) {
                    fulfill( result.map( function ( row ) {
                        return {
                            date: new Date( row[StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE] * 1000 ),
                            yearWeek: row["pugs_week"],
                            pugsCount: parseInt( row["pugs_count"] )
                        }
                    } ) );
                }, function ( err ) {
                    reject( ErrorHelper.createError( err, "Could not get finished pugs pr week", ErrorCodes.GENERAL_ERROR ) );
                } );
        } );
    };

}

module.exports = PugHandler;