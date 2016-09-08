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
     * @callback PugHandler.JoinPugCallback
     * @param {Error} error
     * @param {Object} result
     * @param {PugVm} result.pugVmOriginal
     * @param {PugVm} result.pugVm
     */

    /**
     * @param {number} userId
     * @param {number} pugId
     * @param {number|null} slot
     * @param {PugHandler.JoinPugCallback} callback
     */
    function joinPugCommand( PugHandler, userId, pugId, slot, callback ) {
        Global.kpugApi.doJoinPug( userId, pugId, slot )
            .then( function ( pug ) {
            }, function ( err ) {
                callback( $.extend( {
                    message: "Error when joining pug",
                    code: PugHandler.ERROR_JOIN_PUG,
                    error: err
                }, err ) );
            } );
    }

    return joinPugCommand;

} );