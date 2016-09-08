"use strict";

define( [
    "lib/global",
    "util/util",
    "vm/pug_vm",
    "helper/pug_helper"
], function ( Global, Util, PugVm, PugHelper ) {

    /**
     * @callback PugHandler.GetPugsCallback
     * @param {Error} error
     * @param {Array<PugVm>} pugVms Pugs in retrieved list
     */

    /**
     * @param {boolean} isFinished
     * @param {PugHandler.GetPugsCallback} callback
     */
    function getListPugCommand( PugHandler, isFinished, callback ) {
        Global.kpugApi.doGetPugs( isFinished, function ( error, result ) {
            try {
                error = Util.getProperty( error, result, "error" );
                if ( error ) {
                    callback( {
                        error: error
                    } );
                }
                else {
                    var pugs = Util.getProperty( result, "data", "pugs" );

                    if ( !pugs ) {
                        callback( {
                            error: "Pugs is not set in data response"
                        } );
                        return;
                    }

                    // pugs
                    var pugVm, pugsUpdated = [], pugVms = [];
                    pugs.forEach( function ( pug ) {
                        pugVm = PugHelper.doUpdatePug( pug, Global.pugs() );

                        // ... new pug
                        if ( !pugVm ) {
                            pugVm = new PugVm( pug );
                            Global.pugs.push( pugVm );

                            pugsUpdated.push( {
                                type: "new",
                                pugVm: pugVm
                            } );
                        }
                        else {
                            // ... canceled
                            if ( PugHelper.hasPugBeenCanceled( pugVm, pug ) ) {
                                pugsUpdated.push( {
                                    type: "canceled",
                                    pugVm: pugVm
                                } );
                            }
                            // ... updated state
                            else if ( PugHelper.hasPugStateBeenUpdated( pugVm, pug ) ) {
                                pugsUpdated.push( {
                                    type: "state",
                                    pugVm: pugVm
                                } );
                            }
                        }

                        pugVms.push( pugVm );
                    } );

                    pugsUpdated.forEach( function ( obj ) {
                        switch ( obj.type ) {
                            case "state":
                                Global.eventHandler.fire( "pug_state_change", obj.pugVm );
                                break;
                            case "canceled":
                                Global.eventHandler.fire( "pug_canceled", obj.pugVm );
                                break;
                            case "new":
                                Global.eventHandler.fire( "pug_new", obj.pugVm );
                                break;
                        }
                    } );

                    callback( null, pugVms );
                }
            } catch ( err ) {
                callback( $.extend( {
                    message: "Error while retrieving PUGs",
                    error: err
                }, err ) );
            }
        } );
    }

    return getListPugCommand;

} );