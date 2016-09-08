"use strict";

define( [
    "lib/global",
    "util/util",
    "vm/pug_vm",
    "vm/pug_comment_vm",
    "helper/pug_helper"
], function ( Global, Util, PugVm, PugCommentVm, PugHelper ) {

    /**
     * @param PugHandler
     * @param {number} pugId
     * @param {number} timeSince
     * @param {PugHandler.GetPugCallback} callback
     */
    function getPugCommand( PugHandler, pugId, timeSince, callback ) {
        Global.kpugApi.doGetPug( pugId, timeSince, function ( error, result ) {
            try {
                error = Util.getProperty( error, result, "error" );
                if ( error ) {
                    var err = {
                        error: error
                    };

                    switch ( error.code ) {
                        case PugHandler.API_ERROR_PUG_NOT_EXIST:
                            err.message = "Pug does not exist";
                            err.code = PugHandler.ERROR_PUG_NOT_EXIST;
                            break;
                    }

                    throw err;
                }
                else {
                    /**
                     * @type {Pug}
                     */
                    var pug = Util.getProperty( result, "data", "pug" ),
                        pugComments = Util.getProperty( [], result, "data", "comments" );

                    if ( !pug ) {
                        callback( {
                            error: "Pug is not set in data response"
                        } );
                    }

                    if ( !pugComments ) {
                        callback( {
                            error: "Pug comments is not set in data response"
                        } );
                    }

                    // update pug
                    var pugVm = PugHelper.doUpdatePug( pug, Global.pugs() );

                    // pug is updated
                    if ( pugVm ) {
                        Global.pugs.notifySubscribers();

                        // ... canceled
                        if ( PugHelper.hasPugBeenCanceled( pugVm, pug ) ) {
                            Global.eventHandler.fire( "pug_canceled", pugVm );
                        }
                        // ... updated state
                        else if ( PugHelper.hasPugStateBeenUpdated( pugVm, pug ) ) {
                            Global.eventHandler.fire( "pug_state_change", pugVm );
                        }
                    }
                    // pug is new
                    else {
                        pugVm = new PugVm( pug );
                        Global.pugs.push( pugVm );

                        Global.eventHandler.fire( "pug_new", pugVm );
                    }

                    // pug comments
                    var pugCommentVms = pugComments.map( function ( comment ) {
                        return new PugCommentVm( comment );
                    } );

                    callback( null, {
                        pugVm: pugVm,
                        pugCommentVms: pugCommentVms
                    } );
                }
            } catch ( err ) {
                callback( $.extend( {
                    message: "Error while retrieving PUGs",
                    error: err,
                    code: PugHandler.ERROR_GET_PUG
                }, err ) );
            }
        } );
    }

    return getPugCommand;

} );