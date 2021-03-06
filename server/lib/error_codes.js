"use strict";

var ErrorCodes = {
    MISSING_REQUEST_DATA: "MISSING_REQUEST_DATA",
    USER_NOT_EXIST: "USER_NOT_EXIST",
    PUG_GET_ERROR: "PUG_GET_ERROR",
    PUG_GET_PLAYERS_FORM_ERROR: "PUG_GET_PLAYERS_FORM_ERROR",
    PUG_UPDATE_ERROR: "PUG_UPDATE_ERROR",
    PUG_ADD_PLAYER_ERROR: "PUG_ADD_PLAYER_ERROR",
    PUG_NOT_EXIST: "PUG_NOT_EXIST",
    PUG_GAME_NOT_GIVEN: "PUG_GAME_NOT_GIVEN",
    PUG_GAME_NOT_EXIST: "PUG_GAME_NOT_EXIST",
    PUG_ADD_ERROR: "PUG_ADD_ERROR",
    PUG_READY_ERROR: "PUG_READY_ERROR",
    PUG_COULD_NOT_BE_READY: "PUG_COULD_NOT_BE_READY",
    PUG_IS_NOT_READY: "PUG_IS_NOT_READY",
    PUG_IS_NOT_WAITING: "PUG_IS_NOT_WAITING",
    PUG_PLAYER_SLOT_IS_ILLEGAL: "PUG_PLAYER_SLOT_IS_ILLEGAL",
    PUG_IS_CANCELED: "PUG_IS_CANCELED",
    PUG_IS_FINISHED: "PUG_IS_FINISHED",
    PUG_FINISH_ERROR: "PUG_FINISH_ERROR",
    PUG_CANCEL_ERROR: "PUG_CANCEL_ERROR",
    PUG_ADD_COMMENT_ERROR: "PUG_ADD_COMMENT_ERROR",
    PUG_GET_COMMENT_ERROR: "PUG_GET_COMMENT_ERROR",
    PUG_INVITE_USERS_ERROR: "PUG_INVITE_USERS_ERROR",
    PUG_ILLEGAL_MAX_PLAYERS: "PUG_ILLEGAL_MAX_PLAYERS",
    PUG_ILLEGAL_TEAMS: "PUG_ILLEGAL_TEAMS",
    PUG_ILLEGAL_TEAM_MODE: "PUG_ILLEGAL_TEAM_MODE",
    CANDIDATE_DOES_NOT_EXIST: "CANDIDATE_DOES_NOT_EXIST",
    USER_CAN_NOT_FINISH_PUG: "USER_CAN_NOT_FINISH_PUG",
    PUG_SCORES_NOT_CORRECT: "PUG_RESULT_NOT_CORRECT",
    USER_IS_NOT_PUG_CREATOR: "USER_IS_NOT_PUG_CREATOR",
    PUG_COMMENT_ADD_ERROR: "PUG_COMMENT_ADD_ERROR",
    USER_SAVE_ERROR: "USER_SAVE_ERROR",
    USER_EMAIL_ILLEGAL: "USER_EMAIL_ILLEGAL",
    USER_DEVICE_ERROR: "USER_DEVICE_ERROR",
    NOTIFY_ERROR: "NOTIFY_ERROR",
    GENERAL_ERROR: "GENERAL_ERROR"
};

ErrorCodes.createUserDoesNotExist = function ( userId ) {
    return {
        message: "User '" + userId + "' does not exist",
        code: ErrorCodes.USER_NOT_EXIST
    }
};

ErrorCodes.createPugDoesNotExistError = function ( pugId ) {
    return {
        message: "Pug does not exist",
        code: ErrorCodes.PUG_NOT_EXIST
    }
};

ErrorCodes.createPugIsCanceled = function ( pugId ) {
    return {
        message: "Pug '" + pugId + "' is canceled",
        code: ErrorCodes.PUG_IS_CANCELED
    }
};

ErrorCodes.createPugIsFinished = function ( pugId ) {
    return {
        message: "Pug '" + pugId + "' is finished",
        code: ErrorCodes.PUG_IS_FINISHED
    }
};

module.exports = ErrorCodes;