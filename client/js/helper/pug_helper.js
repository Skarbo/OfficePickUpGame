"use strict";

define( [
    "util/util",
    "lib/global",
    "lib/constant",
    "vm/pug_vm",
    "helper/notify_helper",
    "helper/player_helper",
    "helper/user_helper"
], function ( Util, Global, Constant, PugVm, NotifyHelper, PlayerHelper, UserHelper ) {

    var TAG = "[PugHelper]";

    var PugHelper = {};

    /**
     * @param {Number} pugId
     * @param {Array<PugVm>} pugs
     * @return {PugVm}
     */
    PugHelper.getPugFromId = function ( pugId, pugs ) {
        if ( !pugId || !pugs ) {
            return null;
        }

        for ( var i in pugs ) {
            if ( pugId == pugs[i].id ) {
                return pugs[i];
            }
        }

        return null;
    };

    PugHelper.getCommentPugId = function ( pugComment ) {
        return Util.getProperty( pugComment, "pug_id" );
    };

    /**
     * @param {Number} teams
     * @returns {String}
     */
    PugHelper.getTeamsText = function ( teams ) {
        return [null, "All vs. all", "Two teams", "Three teams", "Four teams", "Five teams"][teams];
    };

    /**
     * @param {String} teamMode
     * @returns {String}
     */
    PugHelper.getTeamModeText = function ( teamMode ) {
        var teamModeTexts = [];
        teamModeTexts[PugVm.TEAM_MODE_ASSIGNED] = "Assigned teams";
        teamModeTexts[PugVm.TEAM_MODE_RANDOM] = "Random teams";
        return teamModeTexts[teamMode] || null;
    };

    /**
     * @param {String} pugId
     * @param {Array<UserVm>} pugs
     * @return {Boolean} True if pug
     */
    PugHelper.isPug = function ( pugId, pugs ) {
        return PugHelper.getPugFromId( pugId, pugs ) != null;
    };

    /**
     * @param {number} userId
     * @param {PugVm} pugVm
     */
    PugHelper.isUserPugCreator = function ( userId, pugVm ) {
        return pugVm.userId === userId;
    };

    /**
     * @param {Number} userId
     * @param {PugVm} pugVm
     * @returns {boolean} True if User can finish Pug
     */
    PugHelper.canUserFinishPug = function ( userId, pugVm ) {
        return PlayerHelper.isUserInPug( userId, pugVm ) || PugHelper.isUserPugCreator( userId, pugVm )
    };

    /**
     * @param {Pug} pug
     * @param {Array<PugVm>} pugVms
     * @return {PugVm} Updated pug, null if no original pug found
     */
    PugHelper.doUpdatePug = function ( pug, pugVms ) {
        var pugVm = PugHelper.getPugFromId( pug.id, pugVms );

        if ( !pugVm ) {
            return null;
        }

        pugVm.doMerge( pug );

        return pugVm;
    };

    /**
     * Updates or inserts Pug
     *
     * @param {Pug} pug
     * @param {Array<PugVm>} pugVms
     * @returns {PugVm}
     */
    PugHelper.doInjectPug = function ( pug, pugVms ) {
        var pugVm = PugHelper.getPugFromId( pug.id, pugVms );

        if ( !pugVm ) {
            pugVm = new PugVm( pug );
            pugVms.push( pugVm );
        }
        else {
            pugVm.doMerge( pug );
        }

        return pugVm;
    };

    /**
     * @param {PugVm} pugVm
     */
    PugHelper.doNotifyNewPug = function ( pugVm ) {
        if ( !Global.hasKpugPlugin ) {
            NotifyHelper.createNotification(
                "New Pick-Up Game!", [
                    pugVm.game.title + (pugVm.game.other ? " - " + pugVm.game.otherTitle : ""),
                    (parseInt( pugVm.playersMax ) - pugVm.playersCount()) + " player(s) needed",
                    pugVm.message ? "\n" + pugVm.message : ""
                ].join( "\n" ),
                {
                    timer: Constant.NOTIFY.NEW_PUG
                }
            );
        }
    };

    /**
     * @param {PugVm} pugVm
     * @param {PageHandler} pageHandler
     */
    PugHelper.doNotifyCanceledPug = function ( pugVm, pageHandler ) {
        if ( !Global.userId ) {
            return;
        }

        if ( !Global.hasKpugPlugin && PlayerHelper.isUserInPug( Global.userId, pugVm ) ) {
            NotifyHelper.createNotification(
                "Canceled Pick-Up Game!", [
                    pugVm.title,
                    pugVm.message ? "\n" + pugVm.message : ""
                ].join( "\n" ),
                {
                    timer: Constant.NOTIFY.CANCEL_PUG,
                    onClick: function () {
                        pageHandler.doRedirectToPage( "pug/" + pugVm.id )
                    }
                }
            );
        }
    };

    /**
     * @param {PugVm} pugVm
     * @param {Pug} pug
     */
    PugHelper.hasPugBeenCanceled = function ( pugVm, pug ) {
        return pugVm.canceled() && !pug.canceled;
    };

    /**
     * @param {PugVm} pugVm
     * @param {Pug} pug
     */
    PugHelper.hasPugStateBeenUpdated = function ( pugVm, pug ) {
        return pugVm.state != pug.state;
    };

    /**
     * @param {Number} userId
     * @param {Array<String>} userGroups
     * @param {Pug|PugVm} pugOrPugVm
     * @returns {boolean} True if User is creator, invited or already a player
     */
    PugHelper.canUserPlayPug = function ( userId, userGroups, pugOrPugVm ) {
        var pug = pugOrPugVm._raw || pugOrPugVm;

        var pugInvites = Util.parseNumbersInArray( pug.settings.invites || [] ),
            pugPlayers = (pug.players || []),
            userIdAndGroups = [userId].concat( userGroups );

        // not invite only
        if ( pugInvites.length === 0 ) {
            return true;
        }

        // is pug creator
        if ( pug.userId === userId ) {
            return true;
        }

        // is invited
        for ( var i = 0; i < userIdAndGroups.length; i++ ) {
            if ( pugInvites.indexOf( userIdAndGroups[i] ) > -1 ) {
                return true;
            }
        }

        // is player
        for ( var i = 0; i < pugPlayers.length; i++ ) {
            if ( pugPlayers[i].userId == userId ) {
                return true;
            }
        }

        return false;
    };

    /**
     * @param {Number} userId
     * @param {PugVm} pugVm
     * @returns {boolean} True if pug creator or user is in pug
     */
    PugHelper.isUserInvolvedInPug = function ( userId, pugVm ) {
        return PugHelper.isUserPugCreator( userId, pugVm ) || PlayerHelper.isUserInPug( userId, pugVm );
    };

    /**
     * @param {PugVm} pugVm
     * @returns {string}
     */
    PugHelper.getPugPlayersNeededString = function ( pugVm ) {
        return (pugVm.settings.players - pugVm.players().length) + " player(s) needed"
    };

    /**
     * @param {PugVm} pugVm
     * @returns {String}
     */
    PugHelper.getPugPlayersString = function ( pugVm ) {
        var players = pugVm.players().map( function ( player ) {
            return UserHelper.firstName( player.userName );
        } );

        return players.length > 1 ? players.slice( 0, -1 ).join( ", " ) + " and " + players.slice( -1 )[0] : players[0] || "";
    };

    /**
     * @param {PugVm} pugVm
     * @returns {Array}
     */
    PugHelper.getPugPlayersWithSlots = function ( pugVm ) {
        if ( pugVm.teamMode == PugVm.TEAM_MODE_ASSIGNED || ((pugVm.isStatePlaying() || pugVm.isStateFinished()) && pugVm.teamMode == PugVm.TEAM_MODE_RANDOM) ) {
            var playersWithSlots = {};

            pugVm.players().forEach( function ( player ) {
                playersWithSlots[player.slot] = player;
            } );

            for ( var slot = 1; slot <= pugVm.playersMax; slot++ ) {
                if ( !playersWithSlots[slot] ) {
                    playersWithSlots[slot] = {
                        userId: null,
                        slot: slot,
                        team: Math.ceil( slot / (pugVm.playersMax / pugVm.teams) )
                    };
                }
            }

            var ret = Object.keys( playersWithSlots ).map( function ( key ) {
                return playersWithSlots[key];
            } );

            return ret;
        }
        else {
            var playersWithSlots = [].concat( pugVm.players() ),
                playersSlotsCount = pugVm.playersMax - pugVm.playersCount();

            for ( var slot = 1; slot <= playersSlotsCount; slot++ ) {
                playersWithSlots.push( {
                    userId: null
                } );
            }

            return playersWithSlots;
        }
    };

    return PugHelper;

} );