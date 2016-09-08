"use strict";

var Promise = require( "promise" ),
    OPUGApi = require( "../../../server/lib/opug_api" ),
    Util = require( "../../../server/util/util" ),
    StorageHelper = require( "../../../server/helper/storage_helper" ),
    PugHelper = require( "../../../server/helper/pug_helper" ),
    ErrorCodes = require( "../../../server/lib/error_codes" ),
    squel = require( "squel" );

function PugHandlerTest() {

    var GAME_ID = "game";

    /**
     * @type {OPUGApi}
     */
    var opugApi;

    this.setUp = function ( callback ) {
        opugApi = new OPUGApi( {
            dbDatabase: "opug_test"
        } );

        function addPugGamePromise() {
            return new Promise( function ( fulfill, reject ) {
                var addPugGameSql = squel.insert()
                    .into( StorageHelper.PUG_GAMES_TABLE )
                    .set( StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_ID, GAME_ID )
                    .set( StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_TITLE, "Game" )
                    .set( StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_RATING_TYPE, "trueskill" )
                    .toParam();

                opugApi.dbConnection.query( addPugGameSql.text, addPugGameSql.values, function ( err ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill();
                    }
                } );
            } );
        }

        Promise.denodeify( opugApi.doInit )()
            .then( addPugGamePromise )
            .done( function () {
                opugApi.pugHandler.pugGames.push( {
                    id: GAME_ID,
                    title: "Game",
                    ratingType: "trueskill",
                    settings: {}
                } );

                callback();
            }, function ( err ) {
                console.error( "Error while init OPUG", err, err.stack );
                callback();
            } );
    };

    this.tearDown = function ( callback ) {
        opugApi.doRemoveAll( function ( err ) {
            if ( err ) {
                console.error( "Could not remove all", err, err.stack );
            }

            opugApi.doEndDatabaseConnection();
            callback();
        } );
    };

    function addUserPromise( email, name, image ) {
        return opugApi.userHandler.doAddUser(
            email || "user@email.com",
            name || "User Name",
            image || "http://image.jpg"
        );
    }

    function addPugPromise( userId, gameId, pugMessage, settings ) {
        gameId = gameId === undefined ? GAME_ID : gameId;
        pugMessage = pugMessage === undefined ? pugMessage : "Message";
        settings = Util.extend( {
            players: 4,
            teams: 2,
            teamMode: PugHelper.TEAM_MODE_ASSIGNED
        }, settings );

        return opugApi.pugHandler.doAddPug( userId, gameId, pugMessage, settings );
    }

    function addUserAndPugPromise( user, pug ) {
        user = user || {};
        pug = pug || {};
        var user__;

        return new Promise( function ( fulfill, reject ) {
            addUserPromise( user.email, user.name, user.image )
                .then( function ( user_ ) {
                    user__ = user_;

                    return addPugPromise( user_.id, pug.gameId, pug.message, pug.settings );
                } ).
                done( function ( pug_ ) {
                    fulfill( {
                        user: user__,
                        pug: pug_
                    } );
                }, function ( err ) {
                    reject( err );
                } );
        } );
    }

    // PUG

    this.shouldAddPug = function ( test ) {
        var userId = null,
            gameId = GAME_ID,
            pugMessage = "Message",
            pugPlayers = 4;

        addUserPromise()
            .then( function ( user ) {
                test.ok( user );

                userId = user.id;

                return addPugPromise( userId, gameId, pugMessage, {
                    players: pugPlayers
                } );
            } )
            .done( function ( pug ) {
                test.ok( pug );

                test.equal( pug.gameId, gameId );
                test.equal( pug.userId, userId );
                test.equal( pug.message, pugMessage );
                test.equal( pug.settings.players, pugPlayers );
                test.equal( pug.settings.teams, 2 );
                test.equal( pug.settings.teamMode, PugHelper.TEAM_MODE_ASSIGNED );

                test.done();
            }, function ( err ) {
                console.error( "shouldAddPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldNotAddPugForUnknownUser = function ( test ) {
        addPugPromise( 1 )
            .done( function ( result ) {
                console.error( "shouldNotAddPugForUnknownUser", "Should not add Pug for unknown User" );
                test.equal( result, undefined );
                test.done();
            }, function ( err ) {
                test.ok( err );
                test.equal( err.code, ErrorCodes.USER_NOT_EXIST );
                test.done();
            } );
    };

    this.shouldNotAddPugForUnknownGame = function ( test ) {
        addUserPromise()
            .then( function ( user ) {
                return addPugPromise( user.id, "unknown_game" );
            } )
            .done( function ( result ) {
                console.error( "shouldNotAddPugForUnknownGame", "Should not add Pug for unknown game" );
                test.equal( result, undefined );
                test.done();
            }, function ( err ) {
                test.ok( err );
                test.equal( err.code, ErrorCodes.PUG_GAME_NOT_EXIST );
                test.done();
            } );
    };

    this.shouldAddPugWithOtherGame = function ( test ) {
        var gameOther = "Game other";

        addUserPromise()
            .then( function ( user ) {
                test.ok( user );

                return addPugPromise( user.id, null, undefined, {
                    gameOther: gameOther
                } );
            } )
            .done( function ( pug ) {
                test.ok( pug );

                test.equal( pug.gameId, null );
                test.equal( pug.settings.gameOther, gameOther );

                test.done();
            }, function ( err ) {
                console.error( "shouldAddPugWithOtherGame", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // PUG

    // PUG PLAYERS

    this.shouldAddPlayerToPug = function ( test ) {
        var user,
            pug,
            playerSlot = 1;

        addUserAndPugPromise()
            .then( function ( result ) {
                user = result.user;
                pug = result.pug;

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user.id, playerSlot );
            } )
            .done( function ( pug ) {
                test.ok( pug );

                test.equal( pug.players.length, 1 );

                if ( pug.players.length > 0 ) {
                    test.equal( pug.players[0].userId, user.id );
                    test.equal( pug.players[0].userName, user.name );
                    test.equal( pug.players[0].slot, playerSlot );
                }

                test.done();
            }, function ( err ) {
                console.error( "shouldAddPlayerToPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldRemovePlayerToPug = function ( test ) {
        var user, pug;

        addUserAndPugPromise()
            .then( function ( result ) {
                user = result.user;
                pug = result.pug;

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user.id );
            } )
            .then( function ( pug ) {
                test.ok( pug );

                test.equal( pug.players.length, 1 );

                if ( pug.players.length > 0 ) {
                    test.equal( pug.players[0].userId, user.id );
                }

                return opugApi.pugHandler.doRemovePugPlayer( pug.id, user.id );
            } )
            .done( function ( pug ) {
                test.ok( pug );

                test.equal( pug.players.length, 0 );

                test.done();
            }, function ( err ) {
                console.error( "shouldRemovePlayerToPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldAddPlayerWhenAddingPug = function ( test ) {
        var user_;

        addUserPromise()
            .then( function ( user ) {
                user_ = user;
                test.ok( user );

                return addPugPromise( user.id, undefined, undefined, {
                    readyPlayers: [{
                        userId: user.id
                    }]
                } );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 1 );

                if ( pug.players.length > 0 ) {
                    test.equal( pug.players[0].userId, user_.id );
                    test.equal( pug.players[0].slot, 1 );
                }

                test.done();
            }, function ( err ) {
                console.error( "shouldAddPlayerWhenAddingPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldAddPlayerToCorrectSlot = function ( test ) {
        var user1, user2, user3;

        Promise
            .all( [
                addUserPromise(),
                addUserPromise(),
                addUserPromise()
            ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];
                user3 = result[2];

                return addPugPromise( user1.id, undefined, undefined, {
                    readyPlayers: [{
                        userId: user1.id
                    }]
                } );
            } )
            .then( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 1 );

                if ( pug.players.length > 0 ) {
                    test.equal( pug.players[0].userId, user1.id );
                    test.equal( pug.players[0].slot, 1 );
                }

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user2.id, 4 );
            } )
            .then( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 2 );

                if ( pug.players.length > 1 ) {
                    test.equal( pug.players[1].userId, user2.id );
                    test.equal( pug.players[1].slot, 4 );
                }

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user3.id, null );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 3 );

                if ( pug.players.length > 2 ) {
                    test.equal( pug.players[2].userId, user3.id );
                    test.equal( pug.players[2].slot, 2 );
                }

                test.done();
            }, function ( err ) {
                console.error( "shouldAddPlayerToCorrectSlot", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // /PUG PLAYERS

    // PUG READY

    this.shouldSetPugAsReadyWhenEnoughPlayersHaveJoined = function ( test ) {
        var user,
            pug,
            playerSlot = 1;

        addUserAndPugPromise( null, {settings: {players: 1}} )
            .then( function ( result ) {
                user = result.user;
                pug = result.pug;

                test.equal( pug.state, PugHelper.PUG_STATE_WAITING );

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user.id, playerSlot );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 1 );

                if ( pug.players.length > 0 ) {
                    test.equal( pug.players[0].userId, user.id );
                    test.equal( pug.players[0].slot, playerSlot );
                }

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                test.done();
            }, function ( err ) {
                console.error( "shouldSetPugAsReadyWhenEnoughPlayersHaveJoined", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldSetPugAsReadyWhenEnoughReadyPlayersAreGiven = function ( test ) {
        var user,
            pug;

        addUserPromise()
            .then( function ( user_ ) {
                user = user_;

                return addPugPromise( user.id, undefined, undefined, {
                    players: 1,
                    readyPlayers: [{
                        userId: user_.id
                    }]
                } );
            } )
            .done( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );
                test.done();
            }, function ( err ) {
                console.error( "shouldSetPugAsReadyWhenEnoughReadyPlayersAreGiven", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldAssignPlayerSlotWhenTeamModeIsRandomAndPugIsReady = function ( test ) {
        Promise
            .all( [
                addUserPromise(),
                addUserPromise(),
                addUserPromise(),
                addUserPromise()
            ] )
            .then( function ( result ) {

                return addPugPromise( result[0].id, undefined, undefined, {
                    teamMode: PugHelper.TEAM_MODE_RANDOM,
                    teams: 2,
                    players: 4,
                    readyPlayers: [{
                        userId: result[0].id
                    }, {
                        userId: result[1].id
                    }, {
                        userId: result[2].id
                    }, {
                        userId: result[3].id
                    }]
                } );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.equal( pug.state, PugHelper.PUG_STATE_READY );
                test.equal( pug.players.length, 4 );

                if ( pug.players.length >= 4 ) {
                    test.notEqual( pug.players[0].slot, null );
                    test.notEqual( pug.players[1].slot, null );
                    test.notEqual( pug.players[2].slot, null );
                    test.notEqual( pug.players[3].slot, null );
                }

                test.done();
            }, function ( err ) {
                console.error( "shouldAssignPlayerSlotWhenTeamModeIsRandomAndPugIsReady", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldNotAddPlayerAfterPugIsReady = function ( test ) {
        var user1,
            user2,
            pug;

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 1,
                    readyPlayers: [{
                        userId: user1.id
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user2.id );
            } )
            .done( function ( pug ) {
                test.equal( pug, undefined );
                test.done();
            }, function ( err ) {
                test.equals( err.code, ErrorCodes.PUG_IS_NOT_WAITING );
                test.done();
            } );
    };

    this.shouldNotReadyUpMorePlayersThanNeeded = function ( test ) {
        var user1,
            user2,
            pug;

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 1,
                    readyPlayers: [{userId: user1.id}, {userId: user2.id}]
                } );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.equal( pug.players.length, 1 );
                test.done();
            }, function ( err ) {
                console.error( "shouldNotReadyUpMorePlayersThanNeeded", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // /PUG READY

    // PUG STATE

    this.shouldNotAddPlayerIfPugIsNotWaiting = function ( test ) {
        var user1,
            user2,
            pug;

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 1,
                    readyPlayers: [{
                        userId: user1.id
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doAddPugPlayer( pug.id, user2.id );
            } )
            .done( function ( result ) {
                test.equals( result, undefined );
                test.done();
            }, function ( err ) {
                test.equals( err.code, ErrorCodes.PUG_IS_NOT_WAITING );
                test.done();
            } );
    };

    // /STATE PUG

    // FINISH PUG

    this.shouldFinishPug = function ( test ) {
        var user1,
            user2,
            pug,
            pugResult = [1, 2];

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user1.id
                    }, {
                        userId: user2.id
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doFinishPug( pug.id, user1.id, pugResult );
            } )
            .done( function ( pug_ ) {
                test.equal( pug_.state, PugHelper.PUG_STATE_FINISH );
                test.equal( pug_.scores.join( "," ), pugResult.join( "," ) );
                test.done();
            }, function ( err ) {
                console.error( "shouldFinishPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldNotFinishPugWichIsNotReady = function ( test ) {
        var user,
            pug,
            pugResult = [1, 2];

        addUserPromise()
            .then( function ( user_ ) {
                user = user_;

                return addPugPromise( user.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user.id
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return opugApi.pugHandler.doFinishPug( pug.id, user.id, pugResult );
            } )
            .done( function ( pug ) {
                test.equals( pug, undefined );
                test.done();
            }, function ( err ) {
                test.equals( err.code, ErrorCodes.PUG_IS_NOT_READY );
                test.done();
            } );
    };

    // /FINISH PUG

    // CANCEL PUG

    this.shouldCancelPug = function ( test ) {
        var userId;

        addUserAndPugPromise()
            .then( function ( result ) {
                userId = result.user.id;
                return opugApi.pugHandler.doCancelPug( result.pug.id, userId );
            } )
            .done( function ( pug ) {
                test.ok( pug );
                test.notEqual( !!pug.canceledDate, false );
                test.notEqual( /0000.*/i.test( pug.canceledDate ), true );
                test.equal( pug.canceledUserId, userId );
                test.done();
            }, function ( err ) {
                console.error( "shouldCancelPug", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldNotCancelPugWhenNotCreator = function ( test ) {
        var user1, user2;

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id );
            } )
            .then( function ( pug ) {
                return opugApi.pugHandler.doCancelPug( pug.id, user2.id );
            } )
            .done( function ( pug ) {
                test.equal( pug, undefined );
                test.done();
            }, function ( err ) {
                test.equals( err.code, ErrorCodes.USER_IS_NOT_PUG_CREATOR );
                test.done();
            } );
    };

    // /CANCEL PUG

    // PUG COMMENT

    this.shouldAddPugComment = function ( test ) {
        var user,
            pug,
            commentMessage = "Comment message";

        addUserAndPugPromise()
            .then( function ( result ) {
                user = result.user;
                pug = result.pug;

                return opugApi.pugHandler.doAddPugComment( pug.id, user.id, commentMessage );
            } )
            .done( function ( pugComment ) {
                test.ok( pugComment );
                test.equals( pugComment.userId, user.id );
                test.equals( pugComment.pugId, pug.id );
                test.equals( pugComment.message, commentMessage );
                test.notEqual( pugComment.userName, undefined );
                test.notEqual( pugComment.userImage, undefined );
                test.done();
            }, function ( err ) {
                console.error( "shouldAddPugComment", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } )
    };

    // /PUG COMMENT

    // PUG USER RATINGS

    this.shouldAdjustUserRatings = function ( test ) {
        var pug,
            user1,
            user2,
            pugScores = [1, 2];

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user1.id,
                        slot: 1
                    }, {
                        userId: user2.id,
                        slot: 2
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doFinishPug( pug.id, user1.id, pugScores );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return opugApi.pugHandler.userRatingHandler.doGetUsersRatingForPug( pug.id );
            } )
            .done( function ( userRatings ) {
                test.equals( userRatings.length, 2 );
                test.equals( userRatings[0].userId, user1.id );
                test.equals( userRatings[1].userId, user2.id );
                test.equals( userRatings[0].rate.mu < userRatings[1].rate.mu, true ); // TODO Get rank for given ranking type
                test.equals( userRatings[0].rateDiff.mu < 0, true );
                test.equals( userRatings[1].rateDiff.mu > 0, true );
                test.done();
            }, function ( err ) {
                console.error( "shouldAdjustUserRatings", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldAdjustExistingUserRatings = function ( test ) {
        var pug,
            user1,
            user2,
            user3,
            pugScores = [1, 2];

        Promise.all( [
            addUserPromise(),
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];
                user3 = result[2];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user1.id,
                        slot: 1
                    }, {
                        userId: user2.id,
                        slot: 2
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doFinishPug( pug.id, user1.id, pugScores );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user2.id,
                        slot: 1
                    }, {
                        userId: user3.id,
                        slot: 2
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doFinishPug( pug.id, user1.id, pugScores );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return opugApi.pugHandler.userRatingHandler.doGetUsersRatingForPug( pug.id );
            } )
            .done( function ( userRatings ) {
                test.equals( userRatings.length, 2 );
                test.equals( userRatings[0].userId, user2.id );
                test.equals( userRatings[1].userId, user3.id );
                test.equals( userRatings[0].rate.mu < userRatings[1].rate.mu, true ); // TODO Get rank for given ranking type
                test.done();
            }, function ( err ) {
                console.error( "shouldAdjustExistingUserRatings", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldAdjustUserRatingsWhenTie = function ( test ) {
        var pug,
            user1,
            user2,
            pugScores = [2, 2];

        Promise.all( [
            addUserPromise(),
            addUserPromise()
        ] )
            .then( function ( result ) {
                user1 = result[0];
                user2 = result[1];

                return addPugPromise( user1.id, undefined, undefined, {
                    players: 2,
                    teams: 1,
                    readyPlayers: [{
                        userId: user1.id,
                        slot: 1
                    }, {
                        userId: user2.id,
                        slot: 2
                    }]
                } );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                test.equal( pug.state, PugHelper.PUG_STATE_READY );

                return opugApi.pugHandler.doFinishPug( pug.id, user1.id, pugScores );
            } )
            .then( function ( pug_ ) {
                pug = pug_;

                return opugApi.pugHandler.userRatingHandler.doGetUsersRatingForPug( pug.id );
            } )
            .done( function ( userRatings ) {
                test.equals( userRatings.length, 2 );
                test.equals( userRatings[0].userId, user1.id );
                test.equals( userRatings[1].userId, user2.id );
                test.equals( Math.round( userRatings[0].rate.mu * 1000 ) / 1000, Math.round( userRatings[1].rate.mu * 1000 ) / 1000 ); // TODO Get rank for given ranking type
                test.done();
            }, function ( err ) {
                console.error( "shouldAdjustUserRatingsWhenTie", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // /PUG USER RATINGS

}

module.exports = new PugHandlerTest();