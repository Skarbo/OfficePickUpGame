"use strict";

define( [
    "lib/global",
    "util/util",
    "vm/pug_vm",
    "helper/pug_helper",
    "helper/user_helper",
    "helper/player_helper"
], function ( Global, Util, PugVm, PugHelper, UserHelper, PlayerHelper ) {

    /**
     * @callback PugHandler.LeavePugCallback
     * @param {Error} error
     * @param {PugVm} pugVm
     */

    /**
     * @param {number} userId
     * @param {number} pugId
     * @param {PugHandler.LeavePugCallback} callback
     */
    function leavePugCommand( PugHandler, userId, pugId, callback ) {
        try {
            var pugVm = PugHelper.getPugFromId( pugId, Global.pugs() );

            if ( !pugVm ) {
                throw {
                    message: "PUG does not exist",
                    code: PugHandler.ERROR_PUG_NOT_EXIST
                }
            }

            if ( pugVm.isCanceled() ) {
                throw {
                    message: "PUG is canceled",
                    code: PugHandler.ERROR_PUG_IS_CANCELED
                }
            }

            if ( !UserHelper.isUser( userId, Global.users() ) ) {
                throw {
                    message: "User does not exist",
                    code: PugHandler.ERROR_USER_NOT_EXIST
                };
            }

            if ( !PlayerHelper.isUserInPug( userId, pugVm ) ) {
                throw {
                    message: "User is not in PUG",
                    code: PugHandler.ERROR_USER_NOT_IN_PUG
                };
            }
        }
        catch
            ( error ) {
            callback( $.extend( {
                message: "Error when leaving PUG",
                code: PugHandler.ERROR_LEAVE_PUG,
                error: error
            }, error ) );
        }

        Global.kpugApi.doLeavePug( userId, pugId, function ( error, data ) {
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
                            errorObj.message = "Pug does not exist";
                            errorObj.code = PugHandler.ERROR_PUG_NOT_EXIST;
                            break;

                        case PugHandler.API_ERROR_USER_NOT_IN_PUG:
                            errorObj.message = "User is not in pug";
                            errorObj.code = PugHandler.ERROR_USER_NOT_IN_PUG;
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

                callback( null, pugVm );
            }
            catch
                ( error ) {
                callback( $.extend( {
                    message: "Error when leaving PUG",
                    code: PugHandler.ERROR_LEAVE_PUG,
                    error: error
                }, error ) );
            }
        } );
    }

    return leavePugCommand;

} );