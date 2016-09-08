"use strict";

var StorageHelper = require( "./../helper/storage_helper" ),
    Promise = require( "promise" ),
    squel = require( "squel" ).useFlavour( 'mysql' );

/**
 * @typedef {Object} Database.UserRating
 * @property {Number} user_id
 * @property {String} pug_id
 * @property {String} user_rate
 * @property {String} user_rate_diff
 * @property {String} pug_game
 * @property {String} game_rating_type
 * @property {String} game_settings
 * @property {String} user_rate_created
 */
/**
 * @typeof {Object}
 */

/**
 * @param {*} dbConnection
 * @constructor
 */
function UserRatingStorage( dbConnection ) {

    var TAG = "[UserRatingStorage]";

    var self = this;

    /**
     * @param {Array<Number>} userIds
     * @param {String} gameId
     * @returns {Promise}
     */
    this.doRetrieveLatestRatingForUsers = function ( userIds, gameId ) {
        var getUsersSql = squel.select()
            .from( StorageHelper.USER_RATING_TABLE )
            .join( StorageHelper.PUG_TABLE, null, StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + " = " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID )
            .join( StorageHelper.PUG_GAMES_TABLE, null, StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_GAME + " = " + StorageHelper.PUG_GAMES_TABLE + "." + StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_ID )
            .where( StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_ID + " = ?", gameId )
            .where( StorageHelper.USER_RATING_FIELDS.USER_ID + " IN ?", userIds )
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
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doRetrieveRatingForUserForPug = function ( userId, pugId ) {
        var getUsersSql = squel.select()
            .from( StorageHelper.USER_RATING_TABLE )
            .join( StorageHelper.PUG_TABLE, null, StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + " = " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID )
            .join( StorageHelper.PUG_GAMES_TABLE, null, StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_GAME + " = " + StorageHelper.PUG_GAMES_TABLE + "." + StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_ID )
            .where( StorageHelper.USER_RATING_FIELDS.USER_ID + " = ?", userId )
            .where( StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + " = ?", pugId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( getUsersSql.text, getUsersSql.values, function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result[0] || null );
            } );
        } );
    };

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doRetrieveRatingForUsersForPug = function ( pugId ) {
        var getUsersSql = squel.select()
            .from( StorageHelper.USER_RATING_TABLE )
            .join( StorageHelper.PUG_TABLE, null, StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + " = " + StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_ID )
            .join( StorageHelper.PUG_GAMES_TABLE, null, StorageHelper.PUG_TABLE + "." + StorageHelper.PUG_FIELDS.PUG_GAME + " = " + StorageHelper.PUG_GAMES_TABLE + "." + StorageHelper.PUG_GAMES_FIELDS.PUG_GAME_ID )
            .where( StorageHelper.USER_RATING_TABLE + "." + StorageHelper.USER_RATING_FIELDS.PUG_ID + " = ?", pugId );

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
     * @param {Number} userId
     * @param {Number} pugId
     * @param {*} rate
     * @param {*} rateDiff
     * @returns {Promise}
     */
    this.doStoreRating = function ( userId, pugId, rate, rateDiff ) {
        var insertPugSql = squel.insert()
            .into( StorageHelper.USER_RATING_TABLE )
            .set( StorageHelper.USER_RATING_FIELDS.USER_ID, userId )
            .set( StorageHelper.USER_RATING_FIELDS.PUG_ID, pugId )
            .set( StorageHelper.USER_RATING_FIELDS.USER_RATE, typeof rate === "object" ? JSON.stringify( rate ) : rate )
            .set( StorageHelper.USER_RATING_FIELDS.USER_RATE_DIFF, typeof rate === "object" ? JSON.stringify( rateDiff ) : rateDiff )
            .toParam();

        var addRatingToDbPromise = function () {
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
            addRatingToDbPromise()
                .then( function () {
                    return self.doRetrieveRatingForUserForPug( userId, pugId );
                } )
                .done( fulfill, reject );
        } );
    };

}

module.exports = UserRatingStorage;