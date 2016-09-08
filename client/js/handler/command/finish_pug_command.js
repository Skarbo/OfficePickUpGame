"use strict";

define( [
    "lib/global",
    "util/util",
    "helper/pug_helper",
    "helper/user_helper",
    "helper/player_helper"
], function ( Global, Util, PugHelper, UserHelper, PlayerHelper ) {



    /**
     * @param {number} userId
     * @param {string} pugId
     * @param {array<number>} scores
     * @param {PugHandler.FinishPugCallback} callback
     */
    function finishPugCommand( PugHandler, userId, pugId, scores, callback ) {
        try {
            if ( !UserHelper.isUser( userId, Global.users() ) ) {
                throw {
                    message: "User does not exist",
                    code: PugHandler.ERROR_USER_NOT_EXIST
                };
            }

            if ( !PugHelper.isPug( pugId, Global.pugs() ) ) {
                throw {
                    message: "Pug does not exist",
                    code: PugHandler.ERROR_PUG_NOT_EXIST
                };
            }

            var pugVm = PugHelper.getPugFromId( pugId, Global.pugs() );

            if ( !pugVm.isStatePlaying() ) {
                throw {
                    message: "Pug is not playing",
                    code: PugHandler.ERROR_PUG_NOT_PLAYING
                };
            }

            if ( !PlayerHelper.isUserInPug( userId, pugVm ) ) {
                throw {
                    message: "User is not in pug",
                    code: PugHandler.ERROR_USER_NOT_IN_PUG
                };
            }

            Global.kpugApi.doFinishPug( userId, pugId, scores, function ( error, data ) {
                try {
                    if ( error ) {
                        throw {
                            error: error
                        };
                    }

                    if ( data.error ) {
                        var errorObj = {
                            error: data.error
                        };

                        switch ( data.error.code ) {
                            case PugHandler.API_ERROR_USER_NOT_EXIST:
                                errorObj.message = "User does not exist";
                                errorObj.code = PugHandler.ERROR_USER_NOT_EXIST;
                                break;

                            case PugHandler.API_ERROR_PUG_NOT_EXIST:
                                errorObj.message = "PUG does not exist";
                                errorObj.code = PugHandler.ERROR_PUG_NOT_EXIST;
                                break;

                            case PugHandler.API_ERROR_USER_NOT_IN_PUG:
                                errorObj.message = "User is not in pug";
                                errorObj.code = PugHandler.ERROR_USER_NOT_IN_PUG;
                                break;

                            case PugHandler.API_ERROR_PUG_NOT_PLAYING:
                                errorObj.message = "PUG is not playing";
                                errorObj.code = PugHandler.ERROR_PUG_NOT_PLAYING;
                                break;
                        }

                        throw errorObj;
                    }

                    /**
                     * @type {Pug}
                     */
                    var pug = Util.getProperty( data, "data", "pug" );
                    if ( !pug ) {
                        throw {
                            error: "PUG is not set in data response"
                        };
                    }

                    // update pug
                    var pugVm = PugHelper.doUpdatePug( pug, Global.pugs() );

                    if ( !pugVm ) {
                        throw {
                            error: "PUG could not be updated"
                        };
                    }

                    Global.pugs.notifySubscribers();

                    callback( null, pugVm );
                }
                catch ( error ) {
                    callback( $.extend( {
                        message: "Could not finish pug",
                        code: PugHandler.ERROR_LEAVE_PUG,
                        error: error
                    }, error ) );
                }
            } );
        }
        catch ( error ) {
            callback( $.extend( {
                message: "Could not finish pug",
                code: PugHandler.ERROR_LEAVE_PUG,
                error: error
            }, error ) );
        }
    }

    return finishPugCommand;

} );