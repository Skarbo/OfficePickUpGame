"use strict";

var StorageHelper = {};

StorageHelper.FIELD_CONCAT_SUB_SEPARATOR = "$";
StorageHelper.FIELD_CONCAT_SUB_SEPARATOR2 = "#";
StorageHelper.FIELD_CONCAT_SEPARATOR = "|";
StorageHelper.FIELD_CONCAT_SEPARATOR2 = "±";
StorageHelper.FIELD_ALIAS_PLAYERS = "pug_players";
StorageHelper.FIELD_ALIAS_PLAYER_FORM = "player_form";
StorageHelper.FIELD_ALIAS_USER_PLACING = "user_placing";

StorageHelper.USER_TABLE = "users";
StorageHelper.USER_FIELDS = {
    USER_ID: "user_id",
    USER_EMAIL: "user_email",
    USER_NAME: "user_name",
    USER_IMAGE: "user_image",
    USER_DEVICES: "user_devices",
    USER_GROUPS: "user_groups",
    USER_SETTINGS: "user_settings",
    USER_LOGGEDIN: "user_loggedin",
    USER_REGISTERED: "user_registered",
    USER_UPDATED: "user_updated"
};

StorageHelper.USER_RATING_TABLE = "user_ratings";
StorageHelper.USER_RATING_FIELDS = {
    USER_ID: "user_id",
    PUG_ID: "pug_id",
    PUG_GAME: "pug_game",
    USER_RATE: "user_rate",
    USER_RATE_DIFF: "user_rate_diff",
    USER_RATE_REGISTERED: "user_rate_registered"
};

StorageHelper.PUG_TABLE = "pugs";
StorageHelper.PUG_FIELDS = {
    PUG_ID: "pug_id",
    PUG_USER: "pug_user",
    PUG_GAME: "pug_game",
    PUG_STATE: "pug_state",
    PUG_MESSAGE: "pug_message",
    PUG_SETTINGS: "pug_settings",
    PUG_SCORES: "pug_scores",
    PUG_CANCELED_MESSAGE: "pug_canceled_message",
    PUG_CANCELED_USER_ID: "pug_canceled_user_id",
    PUG_CANCELED_DATE: "pug_canceled_date",
    PUG_READY_DATE: "pug_ready_date",
    PUG_FINISHED_USER_ID: "pug_finished_user_id",
    PUG_FINISHED_DATE: "pug_finished_date",
    PUG_UPDATED: "pug_updated",
    PUG_CREATED: "pug_created"
};

StorageHelper.PUG_GAMES_TABLE = "pug_games";
StorageHelper.PUG_GAMES_FIELDS = {
    PUG_GAME_ID: "game_id",
    PUG_GAME_TITLE: "game_title",
    PUG_GAME_ICON: "game_icon",
    PUG_GAME_RATING_TYPE: "game_rating_type",
    PUG_GAME_SETTINGS: "game_settings"
};

StorageHelper.PUG_PLAYERS_TABLE = "pug_players";
StorageHelper.PUG_PLAYERS_FIELDS = {
    PUG_ID: "pug_id",
    USER_ID: "user_id",
    PLAYER_SLOT: "player_slot",
    PUG_PLAYER_STANDING: "pug_player_standing",
    PUG_PLAYER_STANDING_PERCENT: "pug_player_standing_percent",
    PUG_PLAYER_REGISTERED: "pug_player_registered"
};

StorageHelper.PUG_COMMENTS_TABLE = "pug_comments";
StorageHelper.PUG_COMMENTS_FIELDS = {
    COMMENT_ID: "comment_id",
    PUG_ID: "pug_id",
    USER_ID: "user_id",
    COMMENT_MESSAGE: "comment_message",
    COMMENT_CREATED: "comment_created"
};

StorageHelper.USER_PLACING_VIEW = "user_placing";
StorageHelper.USER_PLACING_FIELDS = {
    USER_ID: "user_id",
    PUG_GAME: "pug_game",
    PUG_COUNT: "pug_count",
    PLAYER_STANDING_PERCENT: "player_standing_percent",
    USER_RATES: "user_rates"
};

StorageHelper.createTimestamp = function ( date ) {
    return typeof date === "object" ? "FROM_UNIXTIME(" + Math.round( date.getTime() / 1000 ) + ")" : date;
};

module.exports = StorageHelper;