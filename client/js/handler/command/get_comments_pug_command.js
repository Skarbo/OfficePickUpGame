"use strict";

define( [
    "lib/global",
    "util/util"
], function ( Global, Util ) {

    /**
     * @callback PugHandler.GetPugCommentsCallback
     * @param {Error} error
     * @param {PugVm<PugCommentVm>} pugCommentVms
     */

    /**
     * @param {number} pugId
     * @param {string} comment
     * @param {PugHandler.GetPugCommentsCallback} callback
     */
    function getCommentsPugCommand( PugHandler, pugId, callback ) {
        Global.kpugApi.doGetPugComments( pugId, null, function ( error, data ) {
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
                            errorObj.message = "PUG does not exist";
                            errorObj.code = PugHandler.ERROR_PUG_NOT_EXIST;
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

                callback( null, pugId, pugCommentVms );
            }
            catch ( error ) {
                callback( $.extend( {
                    message: "Could not get pug comments",
                    code: PugHandler.ERROR_PUG_COMMENTS,
                    error: error
                }, error ) );
            }
        } );
    }

    return getCommentsPugCommand;

} );