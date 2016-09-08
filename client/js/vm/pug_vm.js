"use strict";

/**
 * @typedef {Object} PugVm
 * @property {Pug} _raw
 * @property {Number} id
 * @property {Number} userId
 * @property {String} message
 * @property {Date} created
 * @property {Function} players ObservableArray(PlayerVm)
 * @property {String} title
 * @property {Game} game
 * @property {String} teamMode
 * @property {Number} teams
 * @property {Number} playersMax
 * @property {Boolean} isTeamModeAssigned
 * @property {Boolean} isDouble
 * @property {Object} settings
 * @property {Function} state Observable(Number)
 * @property {Function} scores ObservableArray(Number)
 * @property {Function} canceledMessage Observable(String)
 * @property {Function} canceledUserId Observable(Number)
 * @property {Function} canceledDate Observable(Date)
 * @property {Function} readyDate Observable(Date)
 * @property {Function} finishedUserId Observable(Number)
 * @property {Function} finishedDate Observable(Date)
 * @property {Function} updated Observable(Date)
 * @property {Function} lastUpdated Computer(Date)
 * @property {Function} playersCount Computer(Number)
 * @property {Function} isStateWaiting Computer(Boolean)
 * @property {Function} isStatePlaying Computer(Boolean)
 * @property {Function} isStateFinished Computer(Boolean)
 * @property {Function} isCanceled Computer(Boolean)
 * @property {Function} isInvite Computed(Boolean)
 * @property {Function} invites Observable(Array<Number|String>)
 * @property {Function} _updated Observable(Number)
 */

define( [
    "dom",
    "knockout",
    "lib/global",
    "util/util",
    "helper/game_helper",
    "vm/player_vm"
], function ( $, knockout, Global, Util, GameHelper, PlayerVm ) {

    /**
     * @param {Pug} pug
     * @constructor
     */
    function PugVm( pug ) {

        // VARIABLES

        var self = this;

        $.extend( self, pug );

        this._raw = pug;
        this._updated = knockout.observable( 0 );

        this.state = knockout.observable( null );
        this.canceledMessage = knockout.observable( null );
        this.canceledUserId = knockout.observable( null );
        this.canceledDate = knockout.observable( null );
        this.readyDate = knockout.observable( null );
        this.finishedUserId = knockout.observable( null );
        this.finishedDate = knockout.observable( null );
        this.updated = knockout.observable( null );
        this.players = knockout.observableArray( null );
        this.scores = knockout.observableArray( null );
        this.invites = knockout.observableArray( [] );

        /**
         * @type {Date}
         */
        this.created = new Date( self.created );
        /**
         * @type {Game}
         */
        this.game = GameHelper.getGame( pug.gameId, pug.settings.gameOther, Global.games );
        /**
         * @type {String}
         */
        this.title = self.game.other ? self.game.otherTitle : self.game.title;
        /**
         * @type {Number}
         */
        this.teams = pug.settings.teams;
        /**
         * @type {Number}
         */
        this.teamMode = pug.settings.teamMode;
        /**
         * @type {Number}
         */
        this.playersMax = pug.settings.players;
        /**
         * @type {Boolean}
         */
        this.isTeamModeAssigned = self.teamMode == PugVm.TEAM_MODE_ASSIGNED;
        /**
         * @type {Boolean}
         */
        this.isDouble = self.teams === 2;

        // COMPUTED

        /**
         * @type {Function}
         */
        this.lastUpdated = knockout.pureComputed( function () {
            return self.updated() ? self.updated() : self.created;
        }, this );

        /**
         * @type {Function}
         */
        this.playersCount = knockout.pureComputed( function () {
            return parseInt( self.players().length );
        }, this );

        /**
         * @type {Function}
         */
        this.isStateWaiting = knockout.pureComputed( function () {
            return self.state() == PugVm.STATE_WAITING;
        }, this );

        /**
         * @type {Function}
         */
        this.isStatePlaying = knockout.pureComputed( function () {
            return self.state() == PugVm.STATE_PLAYING;
        }, this );

        /**
         * @type {Function}
         */
        this.isStateFinished = knockout.pureComputed( function () {
            return self.state() == PugVm.STATE_FINISHED;
        }, this );

        /**
         * @type {Function}
         */
        this.isInvite = knockout.pureComputed( function () {
                return self.invites().length > 0;
            },
            this );

        /**
         * @type {Function}
         */
        this.isCanceled = knockout.pureComputed( function () {
            return !!self.canceledMessage();
        }, this );

        // FUNCTIONS

        /**
         * @param {Pug} pug
         */
        function doInit( pug ) {
            self.state( pug.state );
            self.canceledMessage( pug.canceledMessage || null );
            self.canceledUserId( pug.canceledUserId || null );
            self.canceledDate( pug.finishedDate ? new Date( pug.canceledDate ) : null );
            self.readyDate( pug.readyDate ? new Date( pug.readyDate ) : null );
            self.finishedUserId( pug.finishedUserId || null );
            self.finishedDate( pug.finishedDate ? new Date( pug.finishedDate ) : null );
            self.updated( pug.updated ? new Date( pug.updated ) : null );
            self.players( PlayerVm.createPlayers( pug.players, self ) );
            self.scores( self.isStateFinished() ? pug.scores || [] : null );
            self.invites( Util.parseNumbersInArray( pug.settings.invites || [] ) );
        }

        /**
         * Merge raw pug data with current Pug VM
         *
         * @param {Pug} pug
         */
        this.doMerge = function ( pug ) {
            doInit( pug );
            self._raw = pug;
            self._updated( self._updated() + 1 );
        };

        // READY

        doInit( pug );

    }

    PugVm.STATE_WAITING = 0;
    PugVm.STATE_PLAYING = 1;
    PugVm.STATE_FINISHED = 2;

    PugVm.TEAM_ALL_VS_ALL = 1;
    PugVm.TEAMS = [PugVm.TEAM_ALL_VS_ALL, 2, 3, 4, 5];

    PugVm.TEAM_MODE_ASSIGNED = "assigned";
    PugVm.TEAM_MODE_RANDOM = "random";
    PugVm.TEAM_MODE_NONE = "none";
    PugVm.TEAM_MODES = [PugVm.TEAM_MODE_ASSIGNED, PugVm.TEAM_MODE_RANDOM, PugVm.TEAM_MODE_NONE];

    PugVm.OPTION_READY_PLAYERS = "readyPlayers";
    PugVm.SETTING_INVITES = "invites";
    PugVm.SETTING_TEAMS = "teams";
    PugVm.SETTING_TEAM_MODE = "teamMode";
    PugVm.SETTING_PLAYERS = "players";
    PugVm.SETTING_GAME_OTHER = "gameOther";

    return PugVm;

} );