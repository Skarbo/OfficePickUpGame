"use strict";

var Promise = require( "promise" ),
    Util = require( "../util/util" ),
    StorageHelper = require( "./../helper/storage_helper" ),
    UserStorage = require( "./../storage/user_storage" ),
    CandidateHandler = require( "./candidate_handler" ),
    ErrorCodes = require( "../lib/error_codes" );

/**
 * @typedef {Object} UserPlacingRate
 * @property {Number} pugId
 * @property {Object} rate
 */

/**
 * @typedef {Object} UserPlacing
 * @property {String} pugGame
 * @property {Number} pugCount
 * @property {Number} standingPercent
 * @property {Array<UserPlacingRate>} rates
 */

/**
 * @typedef {Object} User
 * @property {Number} id
 * @property {String} email
 * @property {String} name
 * @property {String} image
 * @property {Array<Object>} devices Array(Object(id, name, date))
 * @property {Array<String>} groups
 * @property {Object} settings
 * @property {boolean} [dontUsePushNotification]
 * @property {boolean} [dontNotify]
 * @property {Array<UserPlacing>} placing
 */

/**
 * @param {Object} dbConnection
 * @param {NotificationHandler} notificationHandler
 * @constructor
 */
function UserHandler( dbConnection, notificationHandler ) {

    var TAG = "UserHandler",
        REGEX_EMAIL_VALID = /[^\s@]+@[^\s@]+\.[^\s@]+/;

    var self = this;
    /**
     * @type {NotificationHandler}
     */
    this.notificationHandler = notificationHandler;
    /**
     * @type {UserStorage}
     */
    this.userStorage = new UserStorage( dbConnection );
    /**
     * @type {CandidateHandler}
     */
    this.candidateHandler = new CandidateHandler();

    /**
     * @param {Database.User} userDb
     * @returns {User}
     */
    function createUser( userDb ) {
        return {
            id: userDb.user_id,
            email: userDb.user_email,
            name: userDb.user_name,
            image: userDb.user_image,
            devices: JSON.parse( userDb.user_devices || "[]" ),
            groups: userDb.user_groups ? userDb.user_groups.split( "," ) : [],
            settings: JSON.parse( userDb.user_settings || "{}" ),
            placing: userDb[StorageHelper.FIELD_ALIAS_USER_PLACING] ? userDb[StorageHelper.FIELD_ALIAS_USER_PLACING]
                .split( StorageHelper.FIELD_CONCAT_SEPARATOR )
                .map( function ( userPlacingRaw ) {
                    var userPlacingArray = userPlacingRaw.split( StorageHelper.FIELD_CONCAT_SUB_SEPARATOR );
                    var userRates = userPlacingArray[3] ? userPlacingArray[3]
                        .split( StorageHelper.FIELD_CONCAT_SEPARATOR2 )
                        .map( function ( userRateRaw ) {
                            var userRateArray = userRateRaw.split( StorageHelper.FIELD_CONCAT_SUB_SEPARATOR2 );
                            return {
                                pugId: parseInt( userRateArray[0] ),
                                rate: JSON.parse( userRateArray[1] || "{}" )
                            }
                        } )
                        : [];

                    return {
                        pugGame: userPlacingArray[0],
                        pugCount: parseInt( userPlacingArray[1] ),
                        standingPercent: parseFloat( userPlacingArray[2] ),
                        rates: userRates
                    };
                } )
                : []
        };
    }

    /**
     * @param {Number} userId
     * @returns {Promise}
     */
    this.doGetUser = function ( userId ) {
        return new Promise( function ( fulfill, reject ) {
            self.userStorage.doRetrieveUser( userId )
                .then( function ( userDb ) {
                    fulfill( userDb ? createUser( userDb ) : null );
                }, function ( err ) {
                    reject( {
                        message: "Error while getting User '" + userId + "'",
                        error: err,
                        params: {
                            userId: userId
                        }
                    } );
                } );
        } );
    };

    /**
     * @param {Array<Number>|null} [userIds]
     * @returns {Promise}
     */
    this.doGetUsers = function ( userIds ) {
        userIds = userIds || null;

        return new Promise( function ( fulfill, reject ) {
            self.userStorage.doRetrieveUsers( userIds )
                .then( function ( userDbList ) {
                    fulfill( userDbList.map( createUser ) );
                }, function ( err ) {
                    reject( {
                        message: "Error while getting Users",
                        error: err
                    } );
                } );
        } );
    };

    /**
     * @param {String} userEmail
     * @returns {Promise}
     */
    this.doGetUserFromEmail = function ( userEmail ) {
        return new Promise( function ( fulfill, reject ) {
            self.userStorage.doRetrieveUserFromEmail( userEmail )
                .then( function ( userDb ) {
                    fulfill( userDb ? createUser( userDb ) : null );
                }, function ( err ) {
                    reject( {
                        message: "Error while getting User '" + userEmail + "' from email",
                        error: err
                    } );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {String} userEmail
     * @returns {Promise}
     */
    this.doesUserExist = function ( userId, userEmail ) {
        return new Promise( function ( fulfill, reject ) {
            self.doGetUserFromEmail( userEmail )
                .then( function ( user ) {
                    fulfill( user );
                }, function ( err ) {
                    reject( err );
                } );
        } );
    };

    /**
     * @param {String} email
     * @param {String} name
     * @param {String} [image]
     * @returns {Promise}
     */
    this.doAddUser = function ( email, name, image ) {
        // validate user
        if ( !email || !name ) {
            return Promise.reject( {
                message: "Could not add User; User is illegal",
                params: {
                    email: email,
                    name: name,
                    image: image
                }
            } );
        }

        /**
         * @param {User} addedUser
         * @returns {*}
         */
        var addUserToDbIfNotExistPromise = function ( addedUser ) {
            // user does not exist, add user to DB
            if ( !addedUser ) {
                return self.userStorage.doStoreUser( email, name, image || null );
            }
            // user already exists
            else {
                return Promise.reject( {
                    message: "Could not add User; User '" + email + "' already exists",
                    params: {
                        user: user
                    }
                } );
            }
        };

        return new Promise( function ( fulfill, reject ) {
            self.doGetUserFromEmail( email )
                .then( addUserToDbIfNotExistPromise )
                .done( function ( userDb ) {
                    fulfill( userDb ? createUser( userDb ) : null );
                }, function ( err ) {
                    reject( err );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {User} userUpdate
     * @returns {Promise}
     */
    this.doUpdateUser = function ( userId, userUpdate ) {
        return new Promise( function ( fulfill, reject ) {
            var user;

            self.doGetUser( userId )
                .then( function ( user ) {
                    // user does not exist
                    if ( !user ) {
                        return Promise.reject( {message: "User '" + userId + "' does not exist"} );
                    }

                    return self.userStorage.doSaveUser( userId, Util.extend( user, userUpdate ) );
                } )
                .then( function ( dbUser ) {
                    user = createUser( dbUser );

                    return Promise.resolve();
                } )
                .then( function () {
                    notificationHandler.doNotifyUpdateUser( user );

                    return Promise.resolve();
                } )
                .done( function () {
                    fulfill( user );
                }, function ( err ) {
                    reject( Util.extend( {
                        message: "Error while updating User '" + userId + "'",
                        error: err,
                        params: {
                            userId: userId,
                            user: user
                        }
                    }, err ) );
                } );
        } );
    };

    /**
     * @param {String} email
     * @returns {Promise}
     */
    this.loginUser = function ( email ) {
        email = email || "";
        email = email.toLowerCase().trim();

        var CODE_USER_EXISTS = "CODE_USER_EXISTS";

        // email must be legal
        if ( !REGEX_EMAIL_VALID.test( email ) ) {
            return Promise.reject( {
                message: "Email is illegal",
                code: ErrorCodes.USER_EMAIL_ILLEGAL
            } );
        }

        /**
         * @param {User} user
         */
        var getCandidateIfNotExistsPromise = function ( user ) {
            // user is already added
            if ( user ) {
                return Promise.reject( {
                    user: user,
                    code: CODE_USER_EXISTS
                } );
            }
            // get candidate from email
            else {
                return Promise.denodeify( self.candidateHandler.doGetCandidateFromEmail )( email );
            }
        };

        /**
         * @param {Candidate} candidate
         */
        var addUserIfCandidateExistsPromise = function ( candidate ) {
            // add candidate as user
            if ( candidate ) {
                return self.doAddUser( candidate.email, candidate.name, candidate.image );
            }
            // candidate from email does not exist
            else {
                return Promise.reject( {
                    message: "Candidate does not exist",
                    code: ErrorCodes.CANDIDATE_DOES_NOT_EXIST
                } );
            }
        };

        return new Promise( function ( fulfill, reject ) {
            var user;

            self.doGetUserFromEmail( email )
                .then( getCandidateIfNotExistsPromise )
                .then( addUserIfCandidateExistsPromise )
                .then( function ( user_ ) {
                    user = user_;

                    return notificationHandler.doNotifyNewUser( user );
                } )
                .done( function () {
                    fulfill( user );
                }, function ( err ) {
                    // user exists
                    if ( err.code === CODE_USER_EXISTS ) {
                        fulfill( err.user );
                    }
                    // error
                    else {
                        reject( Util.extend( {
                            message: "Error while logging in user",
                            error: err,
                            params: {
                                email: email
                            }
                        }, err ) );
                    }
                } );
        } );
    };

    /**
     * @param userId
     * @param deviceId
     * @param isRemove
     * @param {Object} options
     * @param {String} [options.name]
     * @returns {Promise}
     */
    this.doAddOrRemoveUserDevice = function ( userId, deviceId, isRemove, options ) {
        /**
         * @param {User} user
         * @returns {Promise}
         */
        var addOrRemoveUserDeviceIfUserExistsPromise = function ( user ) {
            // user does not exist
            if ( !user ) {
                return Promise.reject( ErrorCodes.createUserDoesNotExist( userId ) );
            }

            var devices = user.devices || [];

            // remove duplicate device
            devices = devices.filter( function ( device ) {
                return device.id !== deviceId;
            } );

            // add device
            if ( !isRemove ) {
                devices.push( {
                    id: deviceId,
                    name: options.name || (new Date()).toString(),
                    date: (new Date()).toString()
                } );
            }

            return Promise.resolve( devices );
        };

        /**
         * @param {Array<Object>} registerIds
         * @returns {Promise}
         */
        var updateUserPromise = function ( registerIds ) {
            return self.doUpdateUser( userId, {
                registerIds: registerIds
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            self.doGetUser( userId )
                .then( addOrRemoveUserDeviceIfUserExistsPromise )
                .then( updateUserPromise )
                .done( function ( user ) {
                    fulfill( user );
                }, function ( err ) {
                    reject( Util.extend( {
                        message: "Error while adding/removing register id for User '" + userId + "'",
                        error: err,
                        params: {
                            userId: userId,
                            registerId: deviceId,
                            isRemove: isRemove
                        }
                    }, err ) );
                } );
        } );
    };

    /**
     * @param {Number} userId
     * @param {Array<String>} groups
     * @returns {Promise}
     */
    this.doSetUserGroups = function ( userId, groups ) {
        return new Promise( function ( fulfill, reject ) {
            self.doGetUser( userId )
                .then( function ( user ) {
                    if ( Util.isArray( groups ) ) {
                        user.groups = groups;
                    }

                    return self.doUpdateUser( userId, user );
                } )
                .done( function ( user ) {
                    fulfill( user );
                }, function ( err ) {
                    reject( Util.extend( {
                        message: "Error while setting User '" + userId + "' groups",
                        params: {
                            userId: userId,
                            groups: groups
                        }
                    }, err ) );
                } );
        } );
    };

    /**
     * @param {String} userId
     * @returns {Promise}
     */
    this.doRemoveUser = function ( userId ) {
        return new Promise( function ( fulfill, reject ) {
            self.userStorage.doDeleteUser( userId )
                .then( function ( isRemoved ) {
                    reject( isRemoved );
                }, function ( err ) {
                    fulfill( Util.extend( {
                        message: "Error while removing User '" + userId + "'",
                        error: err,
                        params: {
                            userId: userId
                        }
                    }, err ) );
                } );
        } );
    };

    /**
     * @returns {Promise}
     */
    this.doRemoveUsers = function () {
        return new Promise( function ( fulfill, reject ) {
            self.userStorage.doDeleteUsers()
                .then( function ( numberRemoved ) {
                    fulfill( numberRemoved );
                }, function ( err ) {
                    reject( Util.extend( {
                        message: "Error while removing Users",
                        error: err
                    }, err ) );
                } );
        } );
    };

}

module.exports = UserHandler;