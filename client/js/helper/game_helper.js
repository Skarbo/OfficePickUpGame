"use strict";

/**
 * @typedef {Object} Game
 * @property {string} id
 * @property {string} title
 * @property {string} src
 * @property {boolean} other
 * @property {string} otherTitle
 * @property {PugGameSettings} settings
 */

define( [
    "dom",
    "lib/asset",
    "util/util"
], function ( $, Asset, Util ) {

    var GameHelper = {};

    /**
     * @param {Array<PugGame>} pugGames Raw object array with games
     * @returns {Array<Game>}
     */
    GameHelper.createGames = function ( pugGames ) {
        var gamesArray = pugGames.map( function ( pugGame ) {
            return GameHelper.createGame(
                pugGame.id,
                pugGame.title,
                pugGame.icon,
                pugGame.ratingType,
                pugGame.settings
            );
        } );

        gamesArray.push( GameHelper.GAME_OTHER );

        return gamesArray;
    };

    /**
     * @param id
     * @param title
     * @param src
     * @param options
     * @returns {Game}
     */
    GameHelper.createGame = function ( id, title, src, ratingType, options ) {
        return $.extend( {
            id: id,
            title: title,
            src: src,
            ratingType: ratingType,
            other: false,
            otherTitle: null
        }, options );
    };

    /**
     * @param gameId
     * @param {Array<Game>} games
     * @returns {Game}
     */
    GameHelper.getGameFromId = function ( gameId, games ) {
        for ( var i in games ) {
            if ( games[i].id === gameId ) {
                return games[i];
            }
        }
        return null;
    };

    /**
     * @param gameId
     * @param gameOtherTitle
     * @param games
     * @returns {Game}
     */
    GameHelper.getGame = function ( gameId, gameOtherTitle, games ) {
        for ( var i in games ) {
            var game = games[i];
            if ( game.id === gameId ) {
                if ( game.other ) {
                    game = $.extend( {}, game, {otherTitle: gameOtherTitle} );
                }
                return game;
            }
        }
        return $.extend( {}, GameHelper.GAME_OTHER, {otherTitle: gameOtherTitle} );
    };

    GameHelper.GAME_OTHER = GameHelper.createGame( "other", "Other", Asset.svg.pug_game_other, null, {other: true} );

    return GameHelper;

} );