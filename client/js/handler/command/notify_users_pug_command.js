"use strict";

define( [
    "lib/global",
    "util/util",
    "helper/pug_helper",
    "helper/user_helper",
    "vm/user_vm"
], function ( Global, Util, PugHelper, UserHelper, UserVm ) {

    /**
     * @callback PugHandler.NotifyPugUsersCallback
     * @param {Error} error
     * @param {PugVm<PugCommentVm>} pugCommentVms
     */

    /**
     * @param {number} pugId
     * @param {array<number|string>} notifyList
     * @param {PugHandler.NotifyPugUsersCallback} callback
     */
    function notifyPugUsersCommand( PugHandler, pugId, notifyList, callback ) {
        Global.kpugApi.doInviteUsers( pugId, notifyList, function ( error, data ) {
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

                        case PugHandler.API_ERROR_PUG_STATE_FINISHED:
                            errorObj.message = "Pug is finished";
                            errorObj.code = PugHandler.ERROR_PUG_IS_FINISHED;
                            break;
                    }

                    throw errorObj;
                }

                var users = Util.getProperty( data, "data", "users" );

                if ( !users ) {
                    throw {
                        error: "Users not in data response"
                    };
                }

                callback( null, users.map( function ( user ) {
                    return new UserVm( user );
                } ) );
            }
            catch ( error ) {
                callback( $.extend( {
                    message: "Could not notify pug",
                    code: PugHandler.ERROR_PUG_NOTIFY,
                    error: error
                }, error ) );
            }
        } );
    }

    return notifyPugUsersCommand;

} );