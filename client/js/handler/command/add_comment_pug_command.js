"use strict";

define( [
    "lib/global",
    "util/util",
    "vm/pug_comment_vm",
    "helper/pug_helper",
    "helper/user_helper"
], function ( Global, Util, PugCommentVm, PugHelper, UserHelper ) {

    /**
     * @param {number} userId
     * @param {number} pugId
     * @param {string} comment
     * @param {PugHandler.AddPugCommentCallback} callback
     */
    function addCommentPugCommand( PugHandler, userId, pugId, comment, callback ) {
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

            if ( !comment ) {
                throw {
                    message: "Comment is empty",
                    code: PugHandler.ERROR_PUG_COMMENT_EMPTY
                };
            }

            Global.kpugApi.doAddPugComment( userId, pugId, comment, function ( error, data ) {
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

                            case PugHandler.API_PUG_EMPTY_COMMENT:
                                errorObj.message = "Comment is empty";
                                errorObj.code = PugHandler.ERROR_PUG_COMMENT_EMPTY;
                                break;
                        }

                        throw errorObj;
                    }

                    var comments = Util.getProperty( data, "data", "comments" );

                    if ( !comments ) {
                        throw {
                            error: "PUG comments not in data response"
                        };
                    }

                    var pugCommentVms = comments.map( function ( comment ) {
                        return new PugCommentVm( comment );
                    } );

                    callback( null, pugCommentVms );
                }
                catch ( error ) {
                    callback( $.extend( {
                        message: "Could add PUG comment",
                        code: PugHandler.ERROR_PUG_COMMENT,
                        error: error
                    }, error ) );
                }
            } );
        }
        catch ( error ) {
            callback( $.extend( {
                message: "Could not leave pug",
                code: PugHandler.ERROR_LEAVE_PUG,
                error: error
            }, error ) );
        }
    }

    return addCommentPugCommand;

} );