"use strict";

define( [
    "dom",
    "lib/socket",
    "lib/global",
    "lib/promise",
    "lib/asset"
], function ( $, socket, Global, Promise, Asset ) {

    /**
     * @param {Object} options
     * @param {boolean} [options.isTest]
     * @constructor
     */
    function OfficePugApi( options ) {

        var TAG = "[OfficePugApi]";

        options = $.extend( {
            isTest: false
        }, options );

        var self = this;

        var URI = "http://" + location.hostname + "/kpug/api.php?request=",
            URI_DATA = URI + "data/%",
            URI_LOGIN = URI + "user/login",
            URI_USER_GROUPS = URI + "user/groups/%",
            URI_USER_DELETE = URI + "user/delete",
            URI_PUG_CANCEL = URI + "pug/cancel",
            URI_GET_PUG = URI + "pug/get/%/%",
            URI_GET_PUGS = URI + "pugs/%",
            URI_ISLOGGEDIN = URI + "user/isloggedin",
            URI_DELETE = URI + "delete",
            URI_CREATE_PUG = URI + "pug/create",
            URI_JOIN_PUG = URI + "player/add",
            URI_LEAVE_PUG = URI + "player/remove",
            URI_FINISH_PUG = URI + "pug/finish",
            URI_ADD_PUG_COMMENT = URI + "comments/add/%",
            URI_GET_PUG_COMMENTS = URI + "comments/get/%/%",
            URI_NOTIFY_USERS = URI + "users/notify/%";

        function getUri( uri ) {
            var uri_ = uri;

            if ( options.isTest ) {
                uri_ += (uri_.indexOf( "?" ) === -1 ? "?" : "&") + "test";
            }

            return uri_;
        }

        /**
         * @returns {Promise}
         */
        this.retrieveData = function () {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.DATA, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data );
                    }
                } );
            } );
        };

        /**
         * @param {String} email
         * @returns {Promise}
         */
        this.doLoginUser = function ( email ) {
            return new Promise( function ( fulfill, reject ) {
                console.log( TAG, "DoLoginUser", email );
                socket.emit( Asset.API_CODE.USER_LOGIN, email, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.user );
                    }
                } );
            } );
        };

        /**
         * @param {String} userId
         * @param {String} userEmail
         * @returns {Promise}
         */
        this.isUserLoggedIn = function ( userId, userEmail ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.USER_LOGGED_IN, userId, userEmail, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.user );
                    }
                } );
            } );
        };

        /**
         * @param {Number} pugId
         * @param {Promise}
         */
        this.getPug = function ( pugId ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_GET, pugId, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data );
                    }
                } );
            } );
        };

        /**
         * @param {Object} filter
         * @returns {Promise}
         */
        this.getPugs = function ( filter ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUGS_GET, filter, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pugs );
                    }
                } );
            } );
        };

        /**
         * @param {Number} pugId
         * @returns {Promise}
         */
        this.getPugPlayersForm = function ( pugId ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_PLAYERS_FORM, pugId, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.playersForm );
                    }
                } );
            } );
        };

        this.doSetUserGroups = function ( userId, userGroups, callback ) {
            $.post( getUri( URI_USER_GROUPS ).replace( "%", userId ),
                {
                    groups: userGroups
                },
                function ( data, status, xhr ) {
                    if ( status === "success" ) {
                        callback( null, data );
                    }
                    else {
                        callback( {
                            message: "Error while setting user groups",
                            error: xhr
                        } );
                    }
                }
            );
        };

        this.doDeleteUser = function ( userId, userEmail, callback ) {
            $.post( getUri( URI_USER_DELETE ),
                {
                    id: userId,
                    email: userEmail
                },
                function ( data, status, xhr ) {
                    if ( status === "success" ) {
                        callback( null, data );
                    }
                    else {
                        callback( {
                            message: "Error while deleting user",
                            error: xhr
                        } );
                    }
                }
            );
        };

        /**
         * @param {Number} pugId
         * @param {String} cancelMessage
         * @returns {Promise}
         */
        this.cancelPug = function ( pugId, cancelMessage ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_CANCEL, pugId, cancelMessage, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
                } );
            } );
        };

        this.doDeleteAll = function ( callback ) {
            if ( !options.isTest ) {
                callback( {
                    message: "Delete all should only be done in a test environment"
                } );
                return;
            }

            $.getJSON( getUri( URI_DELETE ), function ( data, status, xhr ) {
                if ( status === "success" ) {
                    callback( null, data );
                }
                else {
                    callback( {
                        message: "Error while retrieving data",
                        error: xhr
                    } );
                }
            } );
        };

        /**
         * @param {Number} gameId
         * @param {String} message
         * @param {PugSettings|PugHandler.AddPugOptions} options
         */
        this.createPug = function ( gameId, message, options ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_NEW, gameId, message, options, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
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
                socket.emit( Asset.API_CODE.PUG_JOIN, userId, pugId, slot, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
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
                socket.emit( Asset.API_CODE.PUG_LEAVE, userId, pugId, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
                } );
            } );
        };

        /**
         * @param {Number} pugId
         * @param {Array<Integer>} scores
         * @returns {Promise}
         */
        this.finishPug = function ( pugId, scores ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_FINISH, pugId, scores, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
                } );
            } );
        };

        /**
         * @param {Number} pugId
         * @param {String} pugMessage
         * @returns {Promise}
         */
        this.addPugComment = function ( pugId, pugMessage ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_COMMENT_NEW, pugId, pugMessage, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pugComment );
                    }
                } );
            } );
        };

        this.doInviteUsers = function ( pugId, notify, callback ) {
            $.post( getUri( URI_NOTIFY_USERS.replace( "%", pugId ) ),
                {
                    notify: notify
                },
                function ( data, status, xhr ) {
                    if ( status === "success" ) {
                        callback( null, data );
                    }
                    else {
                        callback( {
                            message: "Error while notifying pug",
                            error: xhr
                        } );
                    }
                }
            );
        };

        /**
         * @param {User} user
         * @returns {Promise}
         */
        this.saveUser = function ( user ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.USER_UPDATE, user, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.user );
                    }
                } );
            } );
        };

        /**
         * @param {Number} pugId
         * @param {Array<Number|String>} notifyList
         * @returns {Promise}
         */
        this.doInviteUsers = function ( pugId, inviteList ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.PUG_INVITE_USERS, pugId, inviteList, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.pug );
                    }
                } );
            } );
        };

        /**
         * @param {String} registerId
         * @param {boolean} isRemove
         * @param {Object} options
         * @param {String} [options.name]
         * @returns {Promise}
         */
        this.doAddOrRemoveUserDevice = function ( registerId, isRemove, options ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.USER_DEVICE, registerId, isRemove, options, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.user );
                    }
                } );
            } );
        };

        /**
         * @returns {Promise}
         */
        this.getFinishedPugsPrWeek = function () {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.FINISHED_PUGS_PR_WEEK, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data.finishedPugsPrWeek );
                    }
                } );
            } );
        };

        /**
         * @returns {Promise}
         */
        this.getResultsForFinishedPugs = function ( from, to ) {
            return new Promise( function ( fulfill, reject ) {
                socket.emit( Asset.API_CODE.FINISHED_PUGS_RESULTS, from, to, function ( err, data ) {
                    if ( err ) {
                        reject( err.error );
                    }
                    else {
                        fulfill( data );
                    }
                } );
            } );
        };

    }

    return OfficePugApi;

} );