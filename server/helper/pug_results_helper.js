"use strict";

var PugHelper = require( "../helper/pug_helper" );

var PugResultsHelper = {};

/**
 * @param {Array<Pug>} pugs
 */
PugResultsHelper.createPugsTables = function ( pugs ) {
    var pugsForGameObj = {};

    pugs.forEach( function ( pug ) {
        if ( !PugHelper.isPugFinished( pug ) ) {
            return;
        }

        if ( !pugsForGameObj[pug.gameId] ) {
            pugsForGameObj[pug.gameId] = {};
        }

        var pugForGameObj = pugsForGameObj[pug.gameId];

        pug.players.forEach( function ( player ) {
            if ( !pugForGameObj[player.userId] ) {
                pugForGameObj[player.userId] = {
                    userId: player.userId,
                    pugCount: 0,
                    standingPercent: 0,
                    rateDiff: 0,
                    lastPugFinishedDate: null,
                    lastRate: null,
                    lastForm: null
                };
            }

            var playerRankObj = pugForGameObj[player.userId];
            playerRankObj.pugCount++;
            playerRankObj.standingPercent += player.form[0].standingPercent;

            // TODO Different game type
            if ( player.form[0].rateDiff ) {
                playerRankObj.rateDiff += player.form[0].rateDiff["mu"];
            }

            if ( !playerRankObj.lastPugFinishedDate || playerRankObj.lastPugFinishedDate < pug.finishedDate ) {
                playerRankObj.lastPugFinishedDate = pug.finishedDate;
                playerRankObj.lastRate = player.form[0].rate["mu"];
                playerRankObj.lastForm = player.form.slice( -5 ).reverse();
            }
        } );

        for ( var userId in pugForGameObj ) {
            var playerRank = pugForGameObj[userId];
            playerRank.standingPercent = playerRank.standingPercent / playerRank.pugCount;
        }
    } );

    return pugsForGameObj;
};

module.exports = PugResultsHelper;