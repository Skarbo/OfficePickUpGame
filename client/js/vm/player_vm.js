"use strict";

/**
 * @typedef {Object} PlayerVm
 * @extends {PugPlayerShort}
 */

define( [
    "dom",
    "lib/global",
    "helper/user_helper"
], function ( $, Global, UserHelper ) {

    /**
     * @param {PugPlayerShort} player
     * @param {PugVm} pugVm
     * @constructor
     */
    function PlayerVm( player, pugVm ) {

        var self = this;
        $.extend( self, {
            rateDiff: null,
            rateType: null
        }, player );

        self.firstName = UserHelper.firstName( self.userName );
        self.slot = parseInt( self.slot ) || null;
        self.team = parseInt( self.team ) || null;

        if ( pugVm.isStateFinished() && pugVm.game.ratingType ) {
            // TODO handle different type
            if ( self.form[0] && self.form[0].rateDiff ) {
                var diff = self.form[0].rateDiff["mu"];
                self.rateDiff = Math.abs( diff ).toFixed( 2 );
                self.rateType = diff > 0 ? 1 : 0;
            }
        }

        this.getUser = function () {
            return UserHelper.getUserFromId( self.userId, Global.users() );
        };

    }

    /**
     * @param {Array<PugPlayerShort>} players
     * @param {PugVm} pugVm
     * @returns {Array<PlayerVm>}
     */
    PlayerVm.createPlayers = function ( players, pugVm ) {
        return players.map( function ( player ) {
            return new PlayerVm( player, pugVm );
        } );
    };

    return PlayerVm;

} );