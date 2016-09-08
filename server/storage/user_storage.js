"use strict";

var StorageHelper = require( "./../helper/storage_helper" ),
    Promise = require( "promise" ),
    squel = require( "squel" ),
    Util = require( "../util/util" );

/**
 * @typedef {Object} Database.User
 * @property {Number} user_id
 * @property {String} user_email
 * @property {String} user_name
 * @property {String} user_image
 * @property {String} user_devices
 * @property {String} user_groups
 * @property {String} user_settings
 * @property {String} user_loggedin
 * @property {String} user_registered
 * @property {String} user_updated
 */

/**
 * @param {Object} dbConnection
 * @constructor
 */
function UserStorage( dbConnection ) {

    var TAG = "UserStorage";

    var self = this;

    var userQuery = squel.select()
            .field( StorageHelper.USER_TABLE + ".*" )
            .field( "GROUP_CONCAT(DISTINCT CONCAT_WS('" + StorageHelper.FIELD_CONCAT_SUB_SEPARATOR + "', " + StorageHelper.USER_PLACING_VIEW + "." + StorageHelper.USER_PLACING_FIELDS.PUG_GAME + ", " + StorageHelper.USER_PLACING_VIEW + "." + StorageHelper.USER_PLACING_FIELDS.PUG_COUNT + ", " + StorageHelper.USER_PLACING_VIEW + "." + StorageHelper.USER_PLACING_FIELDS.PLAYER_STANDING_PERCENT + ", " + StorageHelper.USER_PLACING_VIEW + "." + StorageHelper.USER_PLACING_FIELDS.USER_RATES + ") SEPARATOR '" + StorageHelper.FIELD_CONCAT_SEPARATOR + "')", StorageHelper.FIELD_ALIAS_USER_PLACING )
            .from( StorageHelper.USER_TABLE )
            .left_join( StorageHelper.USER_PLACING_VIEW, null, StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " = " + StorageHelper.USER_PLACING_VIEW + "." + StorageHelper.USER_PLACING_FIELDS.USER_ID )
            .group( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID )
            .order( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_NAME )
        ;

    /**
     * @param {Number} userId
     * @returns {Promise}
     */
    this.doRetrieveUser = function ( userId ) {
        var getUserSql = userQuery.clone()
            .where( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " = ?", userId )
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
     * @param {Array<Number>|null} userIds
     * @returns {Promise}
     */
    this.doRetrieveUsers = function ( userIds ) {
        var getUsersSql = userQuery.clone();

        if ( Util.isArray( userIds ) ) {
            getUsersSql = getUsersSql.where( StorageHelper.USER_TABLE + "." + StorageHelper.USER_FIELDS.USER_ID + " IN ?", userIds.length === 0 ? [0] : userIds );
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
     * @param {String} userEmail
     * @returns {Promise}
     */
    this.doRetrieveUserFromEmail = function ( userEmail ) {
        var getUserSql = squel.select()
            .from( StorageHelper.USER_TABLE )
            .where( StorageHelper.USER_FIELDS.USER_EMAIL + " = ?", userEmail )
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
     * @param {String} email
     * @param {String} name
     * @param {String} [image]
     * @returns {Promise}
     */
    this.doStoreUser = function ( email, name, image ) {
        var insertUserSql = squel.insert()
            .into( StorageHelper.USER_TABLE )
            .set( StorageHelper.USER_FIELDS.USER_EMAIL, email )
            .set( StorageHelper.USER_FIELDS.USER_NAME, name )
            .set( StorageHelper.USER_FIELDS.USER_IMAGE, image || null )
            .toParam();

        var addUserToDbPromise = function () {
            return new Promise( function ( fulfill, reject ) {
                dbConnection.query( insertUserSql.text, insertUserSql.values, function ( err, result ) {
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
            addUserToDbPromise()
                .then( function ( result ) {
                    return self.doRetrieveUser( result.insertId );
                } )
                .done( function ( userDb ) {
                    fulfill( userDb );
                }, function ( err ) {
                    reject( err );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {User} user
     * @returns {Promise}
     */
    this.doSaveUser = function ( userId, user ) {
        var updateUserSql = squel.update()
            .table( StorageHelper.USER_TABLE )
            .set( StorageHelper.USER_FIELDS.USER_NAME, user.name )
            .set( StorageHelper.USER_FIELDS.USER_IMAGE, user.image || null )
            .set( StorageHelper.USER_FIELDS.USER_DEVICES, JSON.stringify( user.devices || [] ) )
            .set( StorageHelper.USER_FIELDS.USER_GROUPS, ( user.groups || [] ).join( "," ) )
            .set( StorageHelper.USER_FIELDS.USER_SETTINGS, JSON.stringify( user.settings || {} ) )
            .where( StorageHelper.USER_FIELDS.USER_ID + " = ?", userId )
            .toParam();

        var updateUserInDbPromise = function () {
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
            updateUserInDbPromise()
                .then( function () {
                    return self.doRetrieveUser( userId );
                } )
                .done( function ( userDb ) {
                    fulfill( userDb );
                }, function ( err ) {
                    reject( err );
                } );
        } );
    };

    /**
     * @param {String} userId
     * @returns {Promise}
     */
    this.doDeleteUser = function ( userId ) {
        var deleteUsersSql = squel.delete()
            .from( StorageHelper.USER_TABLE )
            .where( StorageHelper.USER_FIELDS.USER_ID + " = ?", userId )
            .toParam();

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( deleteUsersSql.toString(), function ( err, result ) {
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
    this.doDeleteUsers = function () {
        var deleteUsersSql = squel.delete().from( StorageHelper.USER_TABLE );

        return new Promise( function ( fulfill, reject ) {
            dbConnection.query( deleteUsersSql.toString(), function ( err, result ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                fulfill( result );
            } );
        } );
    };

}

module.exports = UserStorage;