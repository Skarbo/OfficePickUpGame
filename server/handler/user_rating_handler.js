"use strict";

var Promise = require( "promise" ),
    trueSkill = require( 'com.izaakschroeder.trueskill' ).create(),
    UserRatingStorage = require( "./../storage/user_rating_storage" ),
    Util = require( "../util/util" );

/**
 * @typedef {Object} UserRatingHandler.UserRating
 * @property {Number} userId
 * @property {Number} pugId
 * @property {Object|Array} rate
 * @property {Object|Array} rateDiff
 * @property {String} pugGame
 * @property {String} ratingType
 * @property {String} created
 */

/**
 * @param {*} dbConnection
 * @constructor
 */
function UserRatingHandler( dbConnection ) {

    var TAG = "[UserRatingHandler]";

    var self = this;

    /**
     * @type {UserRatingStorage}
     */
    this.userRatingStorage = new UserRatingStorage( dbConnection );

    /**
     * @param {Database.UserRating} userRatingDb
     * @returns {*}
     */
    function createUserRating( userRatingDb ) {
        return {
            userId: userRatingDb.user_id,
            pugId: userRatingDb.pug_id,
            rate: JSON.parse( userRatingDb.user_rate || "{}" ), // TODO pars according to rating type
            rateDiff: JSON.parse( userRatingDb.user_rate_diff || "{}" ),
            pugGame: userRatingDb.pug_game,
            ratingType: userRatingDb.game_rating_type,
            created: userRatingDb.user_rate_created
        };
    }

    /**
     * @param {Array<UserRatingHandler.UserRating>} usersRatings
     * @param {Array<PugPlayerShort>} players
     * @param {Array<Number>} scores
     * @param {String} ratingType
     * @returns {Array<UserRatingHandler.UserRating>}
     */
    function adjustUserRatings( usersRatings, players, scores, ratingType ) {
        var userRanksObj = {},
            playersObj = {},
            teamRanks = [];

        // assign team ranks
        scores.forEach( function ( score, i ) {
            score = parseInt( score );
            teamRanks[i + 1] = {
                score: score,
                rank: 100 - score, // highest score is winner
                players: []
            }
        } );

        // create players obj
        for ( var i = 0; i < players.length; i++ ) {
            playersObj[players[i].userId] = players[i];
            playersObj[players[i].userId].slot = parseInt( players[i].slot ) || (i + 1);
        }

        /**
         * @param {UserRatingHandler.UserRating} userRating
         */
        var createUserRank = function ( userRating ) {
            var playerTeam = playersObj[userRating.userId].team;
            var rank = teamRanks[playerTeam].rank;
            var userRank = {
                rating: userRating.rate, // TODO Change according to rating type
                rank: rank,
                userId: userRating.userId,
                team: playerTeam
            };

            return userRank;
        };

        /**
         * @param {PugPlayerShort} player
         */
        var createDefaultUserRank = function ( player ) {
            var playerTeam = playersObj[player.userId].team;
            var rank = teamRanks[playerTeam].rank;
            var userRank = {
                rating: trueSkill.createRating(), // TODO Default skill for rating type
                rank: rank,
                userId: player.userId,
                team: playerTeam
            };

            return userRank;
        };

        // assign user ranks for user ratings
        for ( var i = 0; i < usersRatings.length; i++ ) {
            userRanksObj[usersRatings[i].userId] = createUserRank( usersRatings[i] );
        }

        // assign default user ranks for players that do not have user rating
        for ( var i = 0; i < players.length; i++ ) {
            if ( !userRanksObj[players[i].userId] ) {
                userRanksObj[players[i].userId] = createDefaultUserRank( players[i] );
            }
        }

        // assign players to team ranks
        for ( var userId in userRanksObj ) {
            teamRanks[userRanksObj[userId].team].players.push( userRanksObj[userId] );
        }

        // adjust user skills
        var results = [],
            teams = [];
        teamRanks.slice( 1 ).forEach( function ( teamRank ) {
            results.push( teamRank.rank );
            teams.push( teamRank.players.map( function ( userRank ) {
                return userRank.rating;
            } ) );
        } );

        var newRatings = trueSkill.update( teams, results );

        for ( var teamIndex = 0; teamIndex < newRatings.length; teamIndex++ ) {
            for ( var playerIndex = 0; playerIndex < newRatings[teamIndex].length; playerIndex++ ) {
                var playerFromTeamRank = teamRanks[teamIndex + 1].players[playerIndex];
                playerFromTeamRank.ratingOld = playerFromTeamRank.rating;
                playerFromTeamRank.rating = newRatings[teamIndex][playerIndex];
            }
        }

        var newPlayerRatings = Util.objectToArray( userRanksObj ).map( function ( userRank ) {
            // TODO Handle different rating type
            var rateDiff = (function () {
                return {
                    mu: parseFloat( userRank.rating["mu"] ) - parseFloat( userRank.ratingOld["mu"] ),
                    sigma: parseFloat( userRank.rating["sigma"] ) - parseFloat( userRank.ratingOld["sigma"] )
                };
            })();

            return {
                userId: userRank.userId,
                rate: userRank.rating,
                rateDiff: rateDiff
            };
        } );

        return newPlayerRatings;
    }

    /**
     * @param {Number} pugId
     * @returns {Promise}
     */
    this.doGetUsersRatingForPug = function ( pugId ) {
        return new Promise( function ( fulfill, reject ) {
            self.userRatingStorage.doRetrieveRatingForUsersForPug( pugId )
                .then( function ( userRatingDbList ) {
                    fulfill( userRatingDbList.map( createUserRating ) );
                }, function ( err ) {
                    reject( {
                        message: "Error while getting user ratings for pug",
                        error: err
                    } );
                } )
        } );
    };

    /**
     * @param {Pug} pug
     * @param {PugGame} pugGame
     */
    this.doAdjustUserRatings = function ( pug, pugGame ) {
        var playerUserIds = pug.players.map( function ( player ) {
            return player.userId;
        } );

        /**
         * @param {Array<UserRatingHandler.UserRating>} usersRatings
         * @returns {Promise}
         */
        var storeUserRatingsPromise = function ( usersRatings ) {
            return new Promise( function ( fulfill, reject ) {
                Promise.all( usersRatings.map( function ( userRating ) {
                    return self.userRatingStorage.doStoreRating( userRating.userId, pug.id, userRating.rate, userRating.rateDiff );
                } ) ).then( fulfill, reject );
            } );
        };

        return new Promise( function ( fulfill, reject ) {
            self.userRatingStorage.doRetrieveLatestRatingForUsers( playerUserIds, pug.gameId )
                .then( function ( userRatingDbList ) {
                    var usersRatings = userRatingDbList.map( createUserRating );
                    var newUsersRatings = adjustUserRatings( usersRatings, pug.players, pug.scores, pugGame.ratingType );

                    return storeUserRatingsPromise( newUsersRatings );
                } )
                .done( function ( userRatingDbList ) {
                    fulfill( userRatingDbList.map( createUserRating ) );
                }, function ( err ) {
                    reject( {
                        message: "Error while adjusting user ratings",
                        error: err
                    } );
                } );
        } );
    };

}

module.exports = UserRatingHandler;