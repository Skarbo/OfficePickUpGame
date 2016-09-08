"use strict";

define( [
    "lib/global",
    "util/util",
    "vm/pug_vm",
    "helper/pug_helper",
    "helper/user_helper",
    "helper/player_helper",
    "helper/game_helper"
], function ( Global, Util, PugVm, PugHelper, UserHelper, PlayerHelper, GameHelper ) {

    /**
     * @param {number} userId
     * @param {number} gameId
     * @param {string} message
     * @param {PugHandler.PugSettings} settings
     * @param {PugHandler.CreatePugCallback} callback
     */
    function createPugCommand( PugHandler, userId, gameId, message, settings, callback ) {
        settings = settings || {};

        try {
            if ( !UserHelper.isUser( userId, Global.users() ) ) {
                throw {
                    message: "User does not exist",
                    code: PugHandler.ERROR_USER_NOT_EXIST
                };
            }

            var game = GameHelper.getGame( gameId, settings[PugVm.SETTING_GAME_OTHER], Global.games );

            if ( game.other && !game.otherTitle ) {
                throw {
                    message: "Game other title is not given",
                    code: PugHandler.ERROR_CREATE_PUG_GAME_OTHER
                };
            }

            var gameMode = parseInt( settings[PugVm.SETTING_TEAMS] );
            if ( PugVm.TEAMS.indexOf( gameMode ) === -1 ) {
                settings[PugVm.SETTING_TEAMS] = PugVm.TEAM_ALL_VS_ALL;
            }

            var teams = settings[PugVm.SETTING_TEAM_MODE];
            if ( PugVm.TEAM_MODES.indexOf( teams ) === -1 ) {
                settings[PugVm.SETTING_TEAM_MODE] = PugVm.TEAM_MODE_ASSIGNED;
            }
        }
        catch ( error ) {
            callback( $.extend( {
                message: "Error while creating PUG",
                code: PugHandler.ERROR_CREATE_PUG,
                error: error
            }, error ) );
            return;
        }

        Global.kpugApi.createPug( gameId, message, settings )
            .done( function ( pug ) {
                callback( null, new PugVm( pug ) );
            }, function ( err ) {
                callback( $.extend( {
                    message: "Error while creating PUG",
                    code: PugHandler.ERROR_CREATE_PUG,
                    error: err
                }, err ) );
            } );
    }

    return createPugCommand;

} );