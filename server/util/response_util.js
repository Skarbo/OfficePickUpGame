"use strict";

var ResponseUtil = {};

/**
 * @param {Pug} pug
 * @param {Array<PugComment>} [pugComments]
 * @param {Array<PugPlayerForm>} [pugPlayersForm]
 * @returns {{pug: Pug, pugComments:Array<PugComment>}}
 */
ResponseUtil.createPugResponse = function ( pug, pugComments, pugPlayersForm ) {
    return {
        pug: pug,
        pugComments: pugComments || [],
        pugPlayersForm: pugPlayersForm || []
    };
};

/**
 * @param {Array<Pug>} pugs
 * @returns {{pugs: Array<Pug>}}
 */
ResponseUtil.createPugsResponse = function ( pugs ) {
    return {
        pugs: pugs
    };
};

/**
 * @param {PugComment} pugComment
 * @returns {{pugComment: PugComment}}
 */
ResponseUtil.createPugCommentResponse = function ( pugComment ) {
    return {
        pugComment: pugComment
    }
};

/**
 * @param {User} user
 * @returns {{user: User}}
 */
ResponseUtil.createUserResponse = function ( user ) {
    return {
        user: user
    };
};

/**
 * @param {Array<User>} users
 * @returns {{users: Array<User>}}
 */
ResponseUtil.createUsersResponse = function ( users ) {
    return {
        users: users
    };
};

/**
 * @param {Array<PugGame>} pugGames
 * @returns {{pugGames: Array<PugGame>}}
 */
ResponseUtil.createPugGamesResponse = function ( pugGames ) {
    return {
        pugGames: pugGames
    };
};

/**
 * @param {Array<PugPlayerForm>} playersForm
 * @returns {{playersForm: Array<PugPlayerForm>}}
 */
ResponseUtil.createPugPlayersFormResponse = function ( playersForm ) {
    return {
        playersForm: playersForm
    };
};

/**
 * @param {Array<Object>} finishedPugsPrWeek
 * @returns {{finishedPugsPrWeek: Array<Object>}}
 */
ResponseUtil.createFinishedPugsPrWeek = function ( finishedPugsPrWeek ) {
    return {
        finishedPugsPrWeek: finishedPugsPrWeek
    };
};

/**
 * @param {Array<Object>} finishedPugsPrWeek
 * @returns {{pugs: Array<Pug>, pugResults: Array<Object>}}
 */
ResponseUtil.createPugResults = function ( pugs, pugsTables ) {
    return {
        pugs: pugs,
        pugsTables: pugsTables
    };
};

/**
 * @param {Object} error
 * @returns {{error: {message: String, code: String}}}
 */
ResponseUtil.createErrorResponse = function ( error ) {
    return {
        error: {
            message: error.message,
            code: error.code
        }
    };
};

module.exports = ResponseUtil;