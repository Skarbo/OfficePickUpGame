"use strict";

var Util = require( "../util/util" );

var PugHelper = {};

PugHelper.TEAM_ALL_VS_ALL = 1;
PugHelper.TEAMS = [PugHelper.TEAM_ALL_VS_ALL, 2, 3, 4, 5];

PugHelper.TEAM_MODE_ASSIGNED = "assigned";
PugHelper.TEAM_MODE_RANDOM = "random";
PugHelper.TEAM_MODE_NONE = "none";
PugHelper.TEAM_MODES = [PugHelper.TEAM_MODE_ASSIGNED, PugHelper.TEAM_MODE_RANDOM, PugHelper.TEAM_MODE_NONE];

PugHelper.PUG_STATE_WAITING = 0;
PugHelper.PUG_STATE_READY = 1;
PugHelper.PUG_STATE_FINISH = 2;

/**
 * @param {Pug} pug
 * @returns {boolean}
 */
PugHelper.isPugWaiting = function ( pug ) {
    return PugHelper.PUG_STATE_WAITING === pug.state;
};

/**
 * @param {Pug} pug
 * @returns {boolean}
 */
PugHelper.isPugReady = function ( pug ) {
    return PugHelper.PUG_STATE_READY === pug.state;
};

/**
 * @param {Pug} pug
 * @returns {boolean}
 */
PugHelper.isPugFinished = function ( pug ) {
    return PugHelper.PUG_STATE_FINISH === pug.state;
};

/**
 * @param {Pug} pug
 * @returns {boolean}
 */
PugHelper.shouldBeReady = function ( pug ) {
    return PugHelper.isPugWaiting( pug ) && pug.settings.players === pug.players.length;
};

/**
 * @param {Pug} pug
 * @returns {boolean}
 */
PugHelper.isTeamModeRandom = function ( pug ) {
    return pug.settings.teamMode === PugHelper.TEAM_MODE_RANDOM;
};

/**
 * @param {PugVm} pug
 * @param {Number} userId
 * @returns {boolean}
 */
PugHelper.isPlayerInPug = function ( pug, userId ) {
    for ( var i = 0; i < pug.players.length; i++ ) {
        if ( String( pug.players[i].userId ).localeCompare( userId ) === 0 ) {
            return true;
        }
    }

    return false;
};

/**
 * @param {Pug} pug
 * @param {Number} userId
 * @returns {boolean}
 */
PugHelper.canUserFinishPug = function ( pug, userId ) {
    return String( pug.userId ).localeCompare( userId ) === 0 || PugHelper.isPlayerInPug( pug, userId );
};

/**
 * @param {Pug} pug
 * @param {Number} slot
 * @returns {Number|null} Null if could not be assigned
 */
PugHelper.assignPugPlayerSlot = function ( pug, slot ) {
    slot = parseInt( slot );

    var slots = pug.players.map( function ( player ) {
            return parseInt( player.slot );
        } ),
        isLegalSlot = !isNaN( slot ) && slot >= 1 && slot <= pug.settings.players && slots.indexOf( slot ) === -1;

    if ( !isLegalSlot ) {
        slot = Util.createRangeArray( pug.settings.players + 1 )
                .slice( 1 )
                .filter( function ( number ) {
                    return slots.indexOf( number ) === -1;
                } )[0] || null;
    }

    return slot;
};

module.exports = PugHelper;