"use strict";

var StorageHelper = require( "./../helper/storage_helper" ),
    Promise = require( "promise" ),
    squel = require( "squel" ).useFlavour( 'mysql' );

squel.registerValueHandler( Date, function ( date ) {
    return Math.round( date.getTime() / 1000 );
} );

/**
 * @typedef {Object} Database.Pug
 * @property {Number} pug_id
 * @property {String} pug_user
 * @property {String} pug_game
 * @property {Number} pug_state
 * @property {String} pug_settings
 * @property {String} pug_scores
 * @property {String} pug_message
 * @property {Number} pug_invite
 * @property {String} pug_canceled_message
 * @property {Number} pug_canceled_user_id
 * @property {String} pug_canceled_date
 * @property {String} pug_ready_date
 * @property {Number} pug_finished_user_id
 * @property {String} pug_finished_date
 * @property {String} pug_updated
 * @property {String} pug_created
 * @property {String} pug_players
 */

/**
 * @typedef {Object} Database.PugGame
 * @property {Number} game_id
 * @property {String} game_title
 * @property {String} game_icon
 * @property {String} game_rating_type
 * @property {String} game_settings
 */

/**
 * @typedef {Object} Database.PugPlayer
 * @property {Number} pug_id
 * @property {Number} user_id
 * @property {Number} player_slot
 * @property {String} pug_player_standing
 * @property {String} pug_player_registered
 */

/**
 * @typedef {Object} Database.PugComment
 * @property {Number} comment_id
 * @property {Number} pug_id
 * @property {Number} user_id
 * @property {String} comment_message
 * @property {String} comment_created
 * @property {String} user_name
 * @property {String} user_image
 */

/**
 * @param {Object} dbConnection
 * @constructor
 */
function PugStorage( dbConnection ) {

    var TAG = "PugStorage";

    var self = this;

    var pugPlayerFormSubQuery = squel.select()
        .field( "GROUP_CONCAT(DISTINCT CONCAT_WS('" + StorageHelper.FIELD_CONCAT_SUB_SEPARATOR2 + "', " + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + ", IFNULL(" + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_PLAYER_STANDING + ",'0/0'), IFNULL(" + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_PLAYER_STANDING_PERCENT + ",0), IFNULL(" + StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.USER_RATE + ",'{}'), IFNULL(" + StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.USER_RATE_DIFF + ",'{}'), " + StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + ") SEPARATOR '" + StorageHelper.FIELD_CONCAT_SEPARATOR2 + "')" )
        .from( StorageHelper.PUG_PLAYERS_TABLE, StorageHelper.PUG_PLAYERS_TABLE + "2" )
        .join( StorageHelper.PUG_TABLE, StorageHelper.PUG_TABLE + "2", StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_ID + " = " + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID )
        .left_join( StorageHelper.USER_RATING_TABLE, null, StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.USER_ID + "=" + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " AND " + StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + "=" + StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID )
        .where( StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_GAME + " = " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_GAME )
        .where( StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " = " + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID )
        //.where( StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " <= " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE )
        .where( squel.expr().or( StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " <= " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE ).or( StorageHelper.PUG_TABLE + "2." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " IS NOT NULL AND " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " IS NULL" ) )
        .group( StorageHelper.PUG_PLAYERS_TABLE + "2." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID )
        .limit( 6 );

    var pugSubQuery = squel.select()
        .field( "GROUP_CONCAT(DISTINCT CONCAT_WS('" + StorageHelper.FIELD_CONCAT_SUB_SEPARATOR + "', " + StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + ", " + StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_NAME + ", " + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PLAYER_SLOT + ", (" + pugPlayerFormSubQuery.toString() + ")) SEPARATOR '" + StorageHelper.FIELD_CONCAT_SEPARATOR + "')" )
        .from( StorageHelper.PUG_PLAYERS_TABLE )
        .join( StorageHelper.USER_TABLE, null, StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " = " + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID )
        .where( StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + " = " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID )
        .group( StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID );

    var playersFormQuery = squel.select()
        .field( "GROUP_CONCAT(DISTINCT CONCAT_WS('" + StorageHelper.FIELD_CONCAT_SUB_SEPARATOR + "', " + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + ", " + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_PLAYER_STANDING + ", " + StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.USER_RATE + ", " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + ") SEPARATOR '" + StorageHelper.FIELD_CONCAT_SEPARATOR + "')" )
        .from( StorageHelper.PUG_PLAYERS_TABLE )
        .join( StorageHelper.PUG_TABLE, null, StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + "=" + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID )
        .left_join( StorageHelper.USER_RATING_TABLE, null, StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.USER_ID + "=" + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " AND " + StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + "=" + StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID )
        .group( StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID )
        .order( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE, true );

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doRetrievePug = function ( pugId ) {
        var getUserSql = squel.select()
            .field( StorageHelper.PUG_TABLE + ".*" )
            .field( pugSubQuery, StorageHelper.FIELD_ALIAS_PLAYERS )
            .from( StorageHelper.PUG_TABLE )
            .where( StorageHelper.PUG_FIELDS.PUG_ID + " = ?", pugId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getUserSql.text, getUserSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result[0] || null );
            } );
        } );
    };

    /**
     * @param {Object} filter
     * @param {Array} filter.states
     * @param {Number} [filter.updatedSince]
     * @param {Array<String>} [filter.finishedFromTo]
     * @returns {Promise}
     */
    this.doRetrievePugs = function ( filter ) {
        var getUsersSql = squel.select()
            .field( StorageHelper.PUG_TABLE + ".*" )
            .field( pugSubQuery, StorageHelper.FIELD_ALIAS_PLAYERS )
            .from( StorageHelper.PUG_TABLE )
            .where( StorageHelper.PUG_FIELDS.PUG_STATE + " IN ?", filter.states )
            .where( StorageHelper.PUG_FIELDS.PUG_CANCELED_DATE + " IS NULL" )
            .order( StorageHelper.PUG_FIELDS.PUG_UPDATED, false )
            .order( StorageHelper.PUG_FIELDS.PUG_CREATED, false );

        if ( filter.updatedSince ) {
            getUsersSql = getUsersSql.where( "UNIX_TIMESTAMP(IFNULL(" + StorageHelper.PUG_FIELDS.PUG_UPDATED + ", " + StorageHelper.PUG_FIELDS.PUG_CREATED + ")) < ?", filter.updatedSince );
        }

        if ( filter.finishedFromTo ) {
            getUsersSql = getUsersSql.where( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " BETWEEN ? AND ?", new Date( filter.finishedFromTo[0] ), new Date( filter.finishedFromTo[1] ) );
        }

        getUsersSql = getUsersSql.toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getUsersSql.text, getUsersSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doRetrievePugPlayers = function ( pugId ) {
        var getPugPlayersSql = squel.select()
            .from( StorageHelper.PUG_PLAYERS_TABLE )
            .where( StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + " = ?", pugId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getPugPlayersSql.text, getPugPlayersSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @param {Array<Number>} userIds
     * @param {String} gameId
     * @param {Date} [finishedSinceDate]
     */
    this.doRetrievePlayersForm = function ( userIds, gameId, finishedSinceDate ) {
        /*
         SELECT
         GROUP_CONCAT(DISTINCT CONCAT_WS('$', pug_players.pug_id, pug_players.pug_player_standing, user_ratings.user_rate) SEPARATOR '|') AS test
         FROM pug_players
         JOIN pugs ON pug_players.pug_id = pugs.pug_id
         LEFT JOIN user_ratings ON user_ratings.user_id = pug_players.user_id AND user_ratings.pug_id = pug_players.pug_id
         WHERE pugs.pug_game = 'table_football'
         GROUP BY pug_players.user_id
         ORDER BY pugs.pug_finished_date DESC
         LIMIT 6
         */

        var playersFormQueryForGame = playersFormQuery.clone()
            .where( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_GAME + " = '" + gameId + "'" )
            .where( StorageHelper.PUG_PLAYERS_TABLE + "." + StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " = " + StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID )
            .limit( 6 );

        if ( finishedSinceDate ) {
            playersFormQueryForGame = playersFormQueryForGame.where( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " <= " + Math.round( finishedSinceDate.getTime() / 1000 ) );
        }

        var getPlayersFormSql = squel.select()
            .field( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID )
            .field( playersFormQueryForGame, StorageHelper.FIELD_ALIAS_PLAYER_FORM )
            .from( StorageHelper.USER_TABLE )
            .where( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " IN ?", userIds );

        getPlayersFormSql = getPlayersFormSql.toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getPlayersFormSql.text, getPlayersFormSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.doRetrievePugGames = function () {
        var getUsersSql = squel.select()
            .from( StorageHelper.PUG_GAMES_TABLE )
            .order( StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_TITLE )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getUsersSql.text, getUsersSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {String|null} gameId
     * @param {String} message
     * @param {PugSettings} settings
     * @returns {Promise}
     */
    this.doStorePug = function ( userId, gameId, message, settings ) {
        var insertPugSql = squel.insert()
            .into( StorageHelper.PUG_TABLE )
            .set( StorageHelper.PUG_FIELDS.PUG_USER, userId )
            .set( StorageHelper.PUG_FIELDS.PUG_GAME, gameId )
            .set( StorageHelper.PUG_FIELDS.PUG_STATE, 0 )
            .set( StorageHelper.PUG_FIELDS.PUG_MESSAGE, message )
            .set( StorageHelper.PUG_FIELDS.PUG_SETTINGS, JSON.stringify( settings || {} ) )

        insertPugSql = insertPugSql.toParam();

        var addPugToDbPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( insertPugSql.text, insertPugSql.values, function ( err, result ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill( result );
                    }
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            addPugToDbPromise()
                .then( function ( result ) {
                    return self.doRetrievePug( result.insertId );
                } )
                .done( fulfill, reject );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {Number} slot
     * @returns {Promise}
     */
    this.doStorePugPlayer = function ( pugId, userId, slot ) {
        var insertPugPlayerSql = squel.insert()
            .into( StorageHelper.PUG_PLAYERS_TABLE )
            .set( StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID, pugId )
            .set( StorageHelper.PUG_PLAYERS_FIELDS.USER_ID, userId )
            .set( StorageHelper.PUG_PLAYERS_FIELDS.PLAYER_SLOT, slot )
            .onDupUpdate( StorageHelper.PUG_PLAYERS_FIELDS.PLAYER_SLOT, slot )
            .toParam();

        var addPugPlayerToDbPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( insertPugPlayerSql.text, insertPugPlayerSql.values, function ( err, result ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill( result );
                    }
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            addPugPlayerToDbPromise()
                .then( function () {
                    return self.doRetrievePug( pugId );
                } )
                .done( fulfill, reject );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Array<PugPlayer>} pugPlayers
     * @returns {Promise}
     */
    this.doSavePugPlayers = function ( pugId, pugPlayers ) {
        return new Promise( function ( fulfill, reject ) {
            Promise
                .all( pugPlayers.map( function ( pugPlayer ) {
                    var updatePugPlayerSql = squel.update()
                        .table( StorageHelper.PUG_PLAYERS_TABLE )
                        .set( StorageHelper.PUG_PLAYERS_FIELDS.PLAYER_SLOT, pugPlayer.slot )
                        .set( StorageHelper.PUG_PLAYERS_FIELDS.PUG_PLAYER_STANDING, pugPlayer.standing || null )
                        .set( StorageHelper.PUG_PLAYERS_FIELDS.PUG_PLAYER_STANDING_PERCENT, !isNaN( parseFloat( pugPlayer.standingPercent ) ) ? pugPlayer.standingPercent : null )
                        .where( StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + " = ?", pugId )
                        .where( StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " = ?", pugPlayer.userId )
                        .toParam();

                    return new Promise( function ( fulfill, reject ) {
                        dbConnection.query( updatePugPlayerSql.text, updatePugPlayerSql.values, function ( err, result ) {
                            if ( err ) {
                                reject( err );
                            }
                            else {
                                fulfill( result );
                            }
                        } );
                    } );
                } ) )
                .then( function () {
                    return self.doRetrievePugPlayers( pugId );
                } )
                .done( fulfill, reject );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Pug} pug
     * @returns {Promise}
     */
    this.doSavePug = function ( pugId, pug ) {
        var updateUserSql = squel.update()
            .table( StorageHelper.PUG_TABLE )
            .where( StorageHelper.PUG_FIELDS.PUG_ID + " = ?", pugId );

        // state
        if ( pug.state !== undefined ) {
            updateUserSql = updateUserSql.set( StorageHelper.PUG_FIELDS.PUG_STATE, pug.state );
        }

        // settings
        if ( pug.settings !== undefined ) {
            updateUserSql = updateUserSql.set( StorageHelper.PUG_FIELDS.PUG_SETTINGS, JSON.stringify( pug.settings || {} ) );
        }

        // cancel
        if ( pug.canceledMessage || pug.canceledUserId ) {
            updateUserSql = updateUserSql.set( StorageHelper.PUG_FIELDS.PUG_CANCELED_MESSAGE, pug.canceledMessage || null )
                .set( StorageHelper.PUG_FIELDS.PUG_CANCELED_USER_ID, pug.canceledUserId || null )
                .set( StorageHelper.PUG_FIELDS.PUG_CANCELED_DATE, pug.canceledDate );
        }

        // ready
        if ( pug.readyDate ) {
            updateUserSql = updateUserSql.set( StorageHelper.PUG_FIELDS.PUG_READY_DATE, pug.readyDate );
        }

        // finished
        if ( pug.scores ) {
            updateUserSql = updateUserSql.set( StorageHelper.PUG_FIELDS.PUG_SCORES, ( pug.scores || [] ).join( "," ) )
                .set( StorageHelper.PUG_FIELDS.PUG_FINISHED_USER_ID, pug.finishedUserId || null )
                .set( StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE, pug.finishedDate );
        }

        updateUserSql = updateUserSql.toParam();

        var updatePugInDbPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( updateUserSql.text, updateUserSql.values, function ( err, result ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill( result );
                    }
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            updatePugInDbPromise()
                .then( function () {
                    return self.doRetrievePug( pugId );
                } )
                .done( fulfill, reject );
        } );
    };

    // PUG COMMENT

    /**
     * @param {String} commentId
     * @returns {Promise}
     */
    this.doRetrievePugComment = function ( commentId ) {
        var getPugCommentSql = squel.select()
            .from( StorageHelper.PUG_COMMENTS_TABLE )
            .join( StorageHelper.USER_TABLE, null, StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " = " + StorageHelper.PUG_COMMENTS_TABLE + "." + StorageHelper.PUG_COMMENTS_FIELDS.USER_ID )
            .where( StorageHelper.PUG_COMMENTS_FIELDS.COMMENT_ID + " = ?", commentId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getPugCommentSql.text, getPugCommentSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result[0] || null );
            } );
        } );
    };

    /**
     * @param {String} commentId
     * @returns {Promise}
     */
    this.doRetrievePugCommentForPug = function ( pugId ) {
        var getPugCommentSql = squel.select()
            .from( StorageHelper.PUG_COMMENTS_TABLE )
            .join( StorageHelper.USER_TABLE, null, StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " = " + StorageHelper.PUG_COMMENTS_TABLE + "." + StorageHelper.PUG_COMMENTS_FIELDS.USER_ID )
            .where( StorageHelper.PUG_COMMENTS_FIELDS.PUG_ID + " = ?", pugId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getPugCommentSql.text, getPugCommentSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @param {String} commentMessage
     */
    this.doStorePugComment = function ( pugId, userId, commentMessage ) {
        var insertPugCommentSql = squel.insert()
            .into( StorageHelper.PUG_COMMENTS_TABLE )
            .set( StorageHelper.PUG_COMMENTS_FIELDS.PUG_ID, pugId )
            .set( StorageHelper.PUG_COMMENTS_FIELDS.USER_ID, userId )
            .set( StorageHelper.PUG_COMMENTS_FIELDS.COMMENT_MESSAGE, commentMessage )
            .toParam();

        var addPugCommentToDbPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( insertPugCommentSql.text, insertPugCommentSql.values, function ( err, result ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill( result );
                    }
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            addPugCommentToDbPromise()
                .then( function ( result ) {
                    return self.doRetrievePugComment( result.insertId );
                } )
                .done( fulfill, reject );
        } );
    };

    // /PUG COMMENT

    this.doRetrieveFinishedPugsInWeeks = function () {
        var yearWeek = "CONCAT(YEAR(FROM_UNIXTIME(" + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + ")), '/', WEEK(FROM_UNIXTIME(" + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + ")))";

        var selectSql = squel.select()
            .field( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE )
            .field( yearWeek + " as pugs_week" )
            .field( "COUNT(" + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID + ") as pugs_count" )
            .from( StorageHelper.PUG_TABLE )
            .where( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE + " IS NOT NULL" )
            .order( StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_FINISHED_DATE, false )
            .group( yearWeek )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( selectSql.text, selectSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

    /**
     * @param {String} pugId
     * @returns {Promise}
     */
    this.doDeletePug = function ( pugId ) {
        var deletePugSql = squel.delete()
            .from( StorageHelper.PUG_TABLE )
            .where( StorageHelper.PUG_FIELDS.PUG_ID + " = ?", pugId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( deletePugSql.text, deletePugSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                }
                else {
                    fulfill( result );
                }
            } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.doDeletePugs = function () {
        var deletePugsSql = squel.delete().from( StorageHelper.PUG_TABLE );

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( deletePugsSql.toString(), function ( err, result ) {
                if ( err ) {
                    reject( err );
                }
                else {
                    fulfill( result );
                }
            } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.doDeletePugGames = function () {
        var deletePugGamesSql = squel.delete().from( StorageHelper.PUG_GAMES_TABLE );

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( deletePugGamesSql.toString(), function ( err, result ) {
                if ( err ) {
                    reject( err );
                }
                else {
                    fulfill( result );
                }
            } );
        } );
    };

    /**
     * @param {Number} pugId
     * @param {Number} userId
     * @returns {Promise}
     */
    this.doDeletePugPlayer = function ( pugId, userId ) {
        var deletePugPlayerSql = squel.delete()
            .from( StorageHelper.PUG_PLAYERS_TABLE )
            .where( StorageHelper.PUG_PLAYERS_FIELDS.PUG_ID + " = ?", pugId )
            .where( StorageHelper.PUG_PLAYERS_FIELDS.USER_ID + " = ?", userId )
            .toParam();

        var deletePugPlayerPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( deletePugPlayerSql.text, deletePugPlayerSql.values, function ( err, result ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill( result );
                    }
                } );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            deletePugPlayerPromise()
                .then( self.doRetrievePug.bind( null, pugId ) )
                .done( fulfill, reject )
        } );
    };

}

module.exports = PugStorage;