"use strict";

require( "console-stamp" )( console, "HH:MM:ss.l" );

var Promise = require( "promise" ),
    request = require( "request" ),
    schedule = require( 'node-schedule' ),
    Lipsum = require( 'node-lipsum' ),
    fs = require( 'fs' );

var OPUGApi = require( "../../server/lib/opug_api" ),
    Util = require( "../../server/util/util" ),
    PugHelper = require( "../../server/helper/pug_helper" ),
    API_CODES = require( "../../server/lib/api_codes" );

// VARIABLES

var TAG = "[Bots]",
    ASSET_GAME_TTLES = __dirname + "/../../assets/gametitles.txt",
    URL_API = "http://local.taglab.no:8200/api/",
    URL_API_USER_LOGIN = URL_API + API_CODES.USER_LOGIN,
    URL_API_PUG_NEW = URL_API + API_CODES.PUG_NEW,
    URL_API_PUG_JOIN = URL_API + API_CODES.PUG_JOIN,
    URL_API_PUG_LEAVE = URL_API + API_CODES.PUG_LEAVE,
    URL_API_PUG_FINSH = URL_API + API_CODES.PUG_FINISH,
    TASK_TIMEOUT = 1000 * 10;

var opugApi = new OPUGApi( {
    dbDatabase: "opug_dev"
} );
var pugGames = [],
    bots = [];
var lipsum = new Lipsum();

// INITIALIZE

opugApi.doInit()
    .then( opugApi.getPugGames )
    .then( function ( data ) {
        pugGames = data.pugGames;

        pugGames.push( {
            id: "other",
            title: "Other",
            settings: {other: true}
        } );

        return null;
    } )
    .then( doLoginBots )
    .done( function () {
        console.log( TAG, "Initialized bots:", bots.map( function ( bot ) {
            return bot.name;
        } ) );

        var taskTimeout;

        function doStartTasks() {
            getRandomTask().
                then( function ( task ) {
                    return task();
                } ).
                then( function ( result ) {
                    console.log( TAG, "Performed task: " + result.name, result.data );
                    taskTimeout = setTimeout( doStartTasks, TASK_TIMEOUT );
                }, function ( err ) {
                    console.error( TAG, "Task error", err.message, err, err.stack );
                    taskTimeout = setTimeout( doStartTasks, TASK_TIMEOUT );
                } );
        }

        doStartTasks();
    }, function ( err ) {
        console.error( TAG, "Error while initializing", err, err.stack );
        opugApi.doEndDatabaseConnection();
    } );

// FUNCTIONS

/**
 * @param {Number} [amounts] Amount of paragraphs
 * @returns {Promise}
 */
function getLipsumText( amounts ) {
    amounts = amounts || 1;

    return new Promise( function ( fulfill ) {
        lipsum.getText( function ( text ) {
            fulfill( text )
        }, {
            amount: amounts
        } );
    } );
}

/**
 * @returns {Promise}
 */
function getGameTitle() {
    function getLine( filename, line_no, callback ) {
        var stream = fs.createReadStream( filename );

        var fileData = '';
        stream.on( 'data', function ( data ) {
            fileData += data;

            // The next lines should be improved
            var lines = fileData.split( "\n" );

            if ( lines.length >= +line_no ) {
                stream.destroy();
                callback( null, lines[+line_no] );
            }
        } );

        stream.on( 'error', function () {
            callback( 'Error', null );
        } );

        stream.on( 'end', function () {
            callback( 'File end reached without finding line', null );
        } );

    }

    return new Promise( function ( fulfill, reject ) {
        getLine( ASSET_GAME_TTLES, Math.round( Math.random() * 43000 ) + 1, function ( err, line ) {
            if ( err ) {
                reject( err );
            }
            else {
                fulfill( (line || "").replace( /\s\(.*\)/ig, "" ).replace( /\r/g, "" ) );
            }
        } );
    } );
}

function getPugsForBot( bot ) {
    return new Promise( function ( fulfill, reject ) {
        opugApi.getPugs()
            .then( function ( data ) {
                var pugs = data.pugs || [],
                    pugsToJoin = [],
                    pugsToLeave = [],
                    pugsToFinish = [];

                pugs.forEach( function ( pug ) {
                    var isJoined = pug.players.filter( function ( player ) {
                            return player.userId == bot.id;
                        } ).length > 0;

                    if ( pug.state === PugHelper.PUG_STATE_WAITING ) {
                        if ( isJoined ) {
                            pugsToLeave.push( pug );
                        }
                        else {
                            pugsToJoin.push( pug );
                        }
                    }
                    else if ( pug.state === PugHelper.PUG_STATE_READY && (isJoined || pug.userId == bot.id) ) {
                        pugsToFinish.push( pug );
                    }
                } );

                fulfill( {
                    join: pugsToJoin,
                    leave: pugsToLeave,
                    finish: pugsToFinish
                } );
            }, reject );
    } );
}

/**
 * @returns {Promise}
 */
function getRandomTask() {
    return new Promise( function ( fulfill, reject ) {
        var bot = Util.getRandomItem( bots );

        getPugsForBot( bot ).
            then( function ( pugTasks ) {
                var tasks = [doAddPugTask.bind( null, bot )];

                if ( pugTasks.join.length > 0 ) {
                    tasks.push( doJoinPugTask.bind( null, bot, Util.getRandomItem( pugTasks.join ) ) );
                }
                if ( pugTasks.leave.length > 0 ) {
                    tasks.push( doLeavePugTask.bind( null, bot, Util.getRandomItem( pugTasks.leave ) ) );
                }
                if ( pugTasks.finish.length > 0 ) {
                    tasks.push( doFinishPugTask.bind( null, bot, Util.getRandomItem( pugTasks.finish ) ) );
                }

                fulfill( Util.getRandomItem( tasks ) );
            }, reject );
    } );
}

// ... REQUEST

function doApiPost( url, data ) {
    return new Promise( function ( fulfill, reject ) {
        request.post( url, {form: data}, function ( err, httpResponse, body ) {
            if ( err ) {
                reject( err );
            }
            else {
                if ( httpResponse.statusCode == 200 ) {
                    fulfill( JSON.parse( body ) );
                }
                else if ( httpResponse.statusCode == 400 ) {
                    reject( JSON.parse( body ).error );
                }
                else {
                    reject( {
                        message: "Status code: " + httpResponse.statusCode,
                        error: body
                    } );
                }

                fulfill( httpResponse );
            }
        } );
    } );
}

// ... /REQUEST

// ... PUG

/**
 * @param {User} bot
 * @returns {Promise}
 */
function doAddPugTask( bot ) {
    return new Promise( function ( fulfill, reject ) {
        var userId = bot.id,
            pugGame = Util.getRandomItem( pugGames ),
            message,
            options = {};

        // generate max players
        options.players = Util.getRandomItem( pugGame.settings.players ? [].concat( pugGame.settings.players ) : [2, 3, 4, 5, 6, 7, 8, 9, 10] );

        // generate random teams
        options.teams = (function () {
            if ( pugGame.settings.teams ) {
                return Util.getRandomItem( [].concat( pugGame.settings.teams ) );
            }

            return Math.round( Math.random() * Math.ceil( options.players / 2 ) ) + 1;
        })();

        // generate random team mode
        options.teamMode = options.teams !== PugHelper.TEAM_ALL_VS_ALL ? Util.getRandomItem( [PugHelper.TEAM_MODE_ASSIGNED, PugHelper.TEAM_MODE_RANDOM] ) : PugHelper.TEAM_MODE_NONE;

        // generate ready players
        options.readyPlayers = Util.shuffleArray( [].concat( bots ) )
            .slice( Math.round( Math.random() * (options.players + 1) ) )
            .map( function ( user ) {
                return {
                    userId: user.id
                };
            } );

        // generate message text
        getLipsumText()
            .then( function ( text ) {
                message = Util.getRandomItem( ["", text, text, text, text] );
            } )
            // generate game title
            .then( function () {
                if ( pugGame.settings.other ) {
                    return getGameTitle();
                }
                return null;
            } )
            .then( function ( gameTitle ) {
                // other title
                if ( pugGame.settings.other && gameTitle ) {
                    options.gameOther = gameTitle;
                }

                return doApiPost( URL_API_PUG_NEW, {
                    userId: userId,
                    gameId: pugGame.id,
                    message: message,
                    options: options
                } )
            } )
            .then( function ( data ) {
                fulfill( {
                    name: "Add Pug",
                    data: {
                        pugId: data.pug.id,
                        userId: bot.id,
                        settings: data.pug.settings,
                        readyPlayers: data.pug.players.length
                    }
                } );
            }, reject );
    } );
}

/**
 * @param {User} bot
 * @param {Pug} pug
 * @returns {Promise}
 */
function doJoinPugTask( bot, pug ) {
    return new Promise( function ( fulfill, reject ) {
        doApiPost( URL_API_PUG_JOIN, {
            userId: bot.id,
            pugId: pug.id,
            slot: null
        } ).then( function ( data ) {
            fulfill( {
                name: "doJoinPugTask",
                data: {
                    pugId: data.pug.id,
                    userId: bot.id,
                    gameId: data.pug.gameId,
                    gameOther: data.pug.settings.gameOther
                }
            } );
        }, reject );
    } );
}

/**
 * @param {User} bot
 * @param {Pug} pug
 * @returns {Promise}
 */
function doLeavePugTask( bot, pug ) {
    return new Promise( function ( fulfill, reject ) {
        doApiPost( URL_API_PUG_LEAVE, {
            userId: bot.id,
            pugId: pug.id,
            slot: null
        } ).then( function ( data ) {
            fulfill( {
                name: "doLeavePugTask",
                data: {
                    pugId: data.pug.id,
                    userId: bot.id,
                    gameId: data.pug.gameId,
                    gameOther: data.pug.settings.gameOther
                }
            } );
        }, reject );
    } );
}

/**
 * @param {User} bot
 * @param {Pug} pug
 * @returns {Promise}
 */
function doFinishPugTask( bot, pug ) {
    return new Promise( function ( fulfill, reject ) {
        var scores = Util.shuffleArray( Util.createRangeArray( pug.settings.teams === PugHelper.TEAM_ALL_VS_ALL ? pug.settings.players : pug.settings.teams ).map( function () {
            return Math.round( Math.random() * 10 ) + 1;
        } ) );

        doApiPost( URL_API_PUG_FINSH, {
            userId: bot.id,
            pugId: pug.id,
            scores: scores
        } ).then( function ( data ) {
            fulfill( {
                name: "doFinishPug",
                data: {
                    pugId: data.pug.id,
                    userId: bot.id,
                    scores: data.pug.scores,
                    gameId: data.pug.gameId,
                    gameOther: data.pug.settings.gameOther
                }
            } );
        }, reject );
    } );
}

// ... /PUG

// ... BOTS

function doLoginBots() {
    return new Promise( function ( fulfill, reject ) {
        Promise
            .all( [
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot1@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot2@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot3@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot4@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot5@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot6@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot7@email.com"} ),
                doApiPost( URL_API_USER_LOGIN, {userEmail: "bot8@email.com"} )
            ] )
            .then( function ( responses ) {
                bots = responses.map( function ( response ) {
                    return response.user;
                } );

                fulfill( bots );
            }, reject );
    } );
}

// ... /BOTS
