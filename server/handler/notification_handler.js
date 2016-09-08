"use strict";

var Promise = require( "promise" ),
    gcm = require( 'node-gcm' ),
    NotifyCodes = require( "../lib/notify_codes" ),
    Util = require( "../util/util" ),
    ErrorHelper = require( "../helper/error_helper" ),
    ErrorCodes = require( "../lib/error_codes" );

/**
 * @param {Object} options
 * @param {Object} options.socket
 * @param {String} options.gcm API key
 * @constructor
 */
function NotificationHandler( options ) {
    options = options || {};

    var TAG = "[NotificationHandler]";

    var self = this;

    this.socket = options.socket || null;
    this.gcmSender = options.gcm ? new gcm.Sender( options.gcm ) : null;

    /**
     * @param {String} notifyCode
     * @param {Object} data
     * @returns {Promise}
     */
    function doNotifySocket( notifyCode, data ) {
        // notify with socket
        if ( self.socket ) {
            self.socket.emit( notifyCode, data );
        }

        return Promise.resolve();
    }

    /**
     * @param {String} notifyCode
     * @param {Object} data
     * @param {Array<User>} users
     * @returns {Promise}
     */
    function doNotifyGCM( notifyCode, data, users ) {
        if ( !self.gcmSender || !users || users.length === 0 ) {
            return Promise.resolve();
        }

        return new Promise( function ( fulfill, reject ) {
            var regIds = [],
                user;
            for ( var i = 0; i < users.length; i++ ) {
                user = users[i];

                if ( !user.settings.dontUsePushNotification ) {
                    regIds = regIds.concat( user.devices.map( function ( device ) {
                        return device.id;
                    } ) );
                }
            }

            if ( regIds.length === 0 ) {
                fulfill();
                return;
            }

            var message = new gcm.Message( {
                timeToLive: 60 * 15 // 15 min
            } );
            message.addData( "code", notifyCode );
            message.addData( "data", JSON.stringify( data ) );

            console.log( TAG, "doNotifyGCM", message, notifyCode, data, regIds );

            self.gcmSender.send( message, {
                registrationIds: regIds
            }, function ( err, result ) {
                if ( err ) {
                    reject( ErrorHelper.createError( err, "Could not send GCM message", ErrorCodes.NOTIFY_ERROR, {
                        notifyCode: notifyCode,
                        regIds: regIds
                    } ) );
                } else {
                    console.log(TAG, "GCM Result", result);
                    fulfill();
                }
            } );
        } );
    }

    /**
     * @param {String} notifyCode
     * @param {Object} data
     * @param {Array<User>} [users]
     * @returns {Promise}
     */
    function doNotify( notifyCode, data, users ) {
        return new Promise( function ( fulfill ) {
            doNotifySocket( notifyCode, data )
                .then( function () {
                    return doNotifyGCM( notifyCode, data, users );
                } )
                .done( function () {
                    fulfill();
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    fulfill();
                } )
        } );
    }

    // PUG

    /**
     * @param {Pug} pug
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyNewPug = function ( pug, users ) {
        return doNotify( NotifyCodes.PUG_NEW, {
            pug: pug
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyReadyPug = function ( pug, users ) {
        return doNotify( NotifyCodes.PUG_STATE_READY, {
            pug: pug
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Number} userId User that finished the Pug
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyFinishPug = function ( pug, userId, users ) {
        return doNotify( NotifyCodes.PUG_STATE_FINISH, {
            pug: pug,
            userId: userId
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyCanceledPug = function ( pug, users ) {
        return doNotify( NotifyCodes.PUG_CANCELED_MESSAGE, {
            pug: pug
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Number} userId
     * @param {boolean} isMovedSlot
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyJoinPug = function ( pug, userId, isMovedSlot, users ) {
        return doNotify( NotifyCodes.PUG_JOIN, {
            pug: pug,
            userId: userId,
            isMovedSlot: isMovedSlot
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Number} userId
     * @param {Array<User>} users Pug Users
     * @returns {Promise}
     */
    this.doNotifyLeavePug = function ( pug, userId, users ) {
        return doNotify( NotifyCodes.PUG_LEAVE, {
            pug: pug,
            userId: userId
        }, users );
    };

    /**
     * @param {Pug} pug
     * @param {Pug} oldPug
     * @returns {Promise}
     */
    this.doNotifyInvitePug = function ( pug, oldPug ) {
        return doNotify( NotifyCodes.PUG_USERS_INVITE, {
            pug: pug,
            oldPug: oldPug
        } );
    };

    // /PUG

    /**
     * @param {Pug} pug
     * @param {PugComment} pugComment
     */
    this.doNotifyNewPugComment = function ( pug, pugComment ) {
        return doNotify( NotifyCodes.PUG_COMMENT_NEW, {
            pug: pug,
            pugComment: pugComment
        } );
    };

    // USER

    /**
     * @param {User} user
     * @returns {Promise}
     */
    this.doNotifyNewUser = function ( user ) {
        return doNotify( NotifyCodes.USER_NEW, {
            user: user
        } );
    };

    /**
     * @param {User} user
     * @returns {Promise}
     */
    this.doNotifyUpdateUser = function ( user ) {
        return doNotify( NotifyCodes.USER_UPDATE, {
            user: user
        } );
    };

    // /USER

}

module.exports = NotificationHandler;