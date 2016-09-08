"use strict";

define( [
    "lib/global",
    "helper/pug_helper"
], function ( Global, PugHelper ) {

    /**
     * @callback PugHandler.CancelPugCallback
     * @param {Error} error
     * @param {PugVm} pugVm
     */

    /**
     * @param {string} pugId
     * @param {PugHandler.CancelPugCallback} callback
     */
    function cancelPugCommand( PugHandler, pugId, callback ) {
        try {
            if ( !PugHelper.isPug( pugId, Global.pugs() ) ) {
                throw {
                    message: "Pug does not exist",
                    code: PugHandler.ERROR_PUG_NOT_EXIST
                };
            }

            var pugVm = PugHelper.getPugFromId( pugId, Global.pugs() );

            if ( !PugHelper.isUserPugCreator( Global.userId, pugVm ) ) {
                throw {
                    message: "User is not pug creator",
                    code: PugHandler.ERROR_USER_NOT_PUG_CREATOR
                };
            }

            if ( pugVm.isStateFinished() ) {
                throw {
                    message: "Pug is finished",
                    code: PugHandler.ERROR_PUG_IS_FINISHED
                };
            }
        }
        catch ( error ) {
            callback( $.extend( {
                message: "Could not cancel pug",
                error: error,
                code: PugHandler.ERROR_CANCEL_PUG
            }, error ) );
            return;
        }

        Global.kpugApi.doCancelPug( pugId, Global.userId, function ( error, data ) {
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
                        case PugHandler.API_ERROR_PUG_NOT_EXIST:
                            errorObj.message = "Pug does not exist";
                            errorObj.code = PugHandler.ERROR_PUG_NOT_EXIST;
                            break;

                        case PugHandler.API_ERROR_PUG_FINISHED:
                            errorObj.message = "Pug is finished";
                            errorObj.code = PugHandler.ERROR_PUG_IS_FINISHED;
                            break;

                        case PugHandler.API_ERROR_USER_NOT_PUG_CREATOR:
                            errorObj.message = "User not pug creator";
                            errorObj.code = PugHandler.ERROR_USER_NOT_PUG_CREATOR;
                            break;
                    }

                    throw errorObj;
                }

                Global.pugs.remove( function ( pugVm ) {
                    return pugVm.pugId() === pugId;
                } );

                callback( null, true );
            }
            catch ( error ) {
                callback( $.extend( {
                    message: "Could not cancel pug",
                    error: error,
                    code: PugHandler.ERROR_CANCEL_PUG
                }, error ) );
            }
        } );
    }

    return cancelPugCommand;

} );