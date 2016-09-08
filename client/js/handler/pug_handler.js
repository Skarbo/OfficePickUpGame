"use strict";

define( [
    "dom",
    "moment",
    "knockout",
    "lib/global",
    "lib/asset",
    "util/util",
    "helper/user_helper",
    "helper/pug_helper",
    "helper/player_helper",
    "helper/game_helper",
    "helper/error_helper",
    "vm/pug_vm",
    "vm/pug_comment_vm",
    "vm/user_vm",
    "handler/event_handler",
    "handler/command/join_pug_command",
    "handler/command/leave_pug_command",
    "handler/command/create_pug_command",
    "handler/command/finish_pug_command",
    "handler/command/cancel_pug_command",
    "handler/command/add_comment_pug_command",
    "handler/command/get_comments_pug_command",
    "handler/command/notify_users_pug_command",
    "handler/command/get_pug_command",
    "handler/command/get_list_pug_command"
], function ( $, moment, knockout, Global, Asset, Util, UserHelper, PugHelper, PlayerHelper, GameHelper, ErrorHelper, PugVm, PugCommentVm, UserVm, eventHandler, joinPugCommand, leavePugCommand, createPugCommand, finishPugCommand, cancelPugCommand, addCommentPugCommand, getCommentsPugCommand, notifyUsersPugCommand, getPugCommand, getListPugCommand ) {

    /**
     * @constructor
     */
    function PugHandler( pugReadyHandler ) {

        var TAG = "[PugHandler]";

        var self = this;
        /**
         * @type {PugReadyHandler}
         */
        this.pugReadyHandler = pugReadyHandler;

        /**
         * @callback PugHandler.GetPugResult
         * @param {Object} result
         * @param {PugVm} result.pugVm
         * @param {Array<PugCommentVm>} result.pugCommentVms
         */

        /**
         * @param {number} pugId
         * @returns {Promise<PugHandler.GetPugResult, Error>}
         */
        this.getPug = function ( pugId ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.getPug( pugId )
                    .then( function ( result ) {
                        var pugVm = PugHelper.doInjectPug( result.pug, Global.pugs() );
                        var pugCommentVms = (result.pugComments || []).map( function ( pugComment ) {
                            return new PugCommentVm( pugComment );
                        } );
                        var pugPlayersForm = createPugPlayersFormVm( result.pugPlayersForm || [] );

                        fulfill( {
                            pugVm: pugVm,
                            pugCommentVms: pugCommentVms,
                            pugPlayersForm: pugPlayersForm
                        } );
                    }, function ( err ) {
                        reject( $.extend( {
                            message: "Error while retrieving PUG",
                            error: err,
                            code: PugHandler.ERROR_GET_PUG
                        }, err ) );
                    } );
            } );
        };

        /**
         * @param {Object} [filter]
         * @param {Array<Number>} [filter.states]
         * @param {Array<Date>} [filter.finishedFromTo]
         * @returns {Promise}
         */
        this.getPugs = function ( filter ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.getPugs( filter )
                    .then( function ( pugs ) {
                        var pugVms = [];

                        pugs.forEach( function ( pug ) {
                            pugVms.push( PugHelper.doInjectPug( pug, Global.pugs() ) );
                        } );

                        fulfill( pugVms );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not get PUGs", Asset.ERROR_CODE.PUG_GET_ERROR, {
                            isFinished: filter
                        } ) );
                    } )
            } );
        };

        /**
         * @param {number} gameId
         * @param {string} message
         * @param {PugSettings|PugHandler.AddPugOptions} options
         * @returns {Promise}
         */
        this.doAddPug = function ( gameId, message, options ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.createPug( gameId, message, options )
                    .done( function ( pug ) {
                        fulfill( new PugVm( pug ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not add Pug", Asset.ERROR_CODE.PUG_ADD_ERROR, {
                            gameId: gameId,
                            message: message,
                            options: options
                        } ) );
                    } );
            } );
        };

        /**
         * @param {number} userId
         * @param {number} pugId
         * @param {number|null} slot
         * @param {PugHandler.JoinPugCallback} callback
         * @type {Function}
         */
        this.doJoinPug = function ( userId, pugId, slot, callback ) {
            Global.kpugApi.joinPug( userId, pugId, slot )
                .then( function ( pug ) {
                    callback( null, new PugVm( pug ) );
                }, function ( err ) {
                    callback( $.extend( {
                        message: "Error when joining pug",
                        code: PugHandler.ERROR_JOIN_PUG,
                        error: err
                    }, err ) );
                } );
        };

        /**
         * @param {number} userId
         * @param {number} pugId
         * @param {PugHandler.LeavePugCallback} callback
         * @type {Function}
         */
        this.doLeavePug = function ( userId, pugId, callback ) {
            Global.kpugApi.leavePug( userId, pugId )
                .then( function ( pug ) {
                    callback( null, new PugVm( pug ) );
                }, function ( err ) {
                    callback( $.extend( {
                        message: "Error when leaving PUG",
                        code: PugHandler.ERROR_LEAVE_PUG,
                        error: err
                    }, err ) );
                } );
        };

        /**
         * @param {Number} pugId
         * @returns {Promise}
         */
        this.getPugPlayersForm = function ( pugId ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.getPugPlayersForm( pugId )
                    .done( function ( playersForm ) {
                        fulfill( createPugPlayersFormVm( playersForm ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not get Pug Players form", Asset.ERROR_CODE.PUG_GET_PLAYERS_FORM_ERROR, {
                            pugId: pugId
                        } ) );
                    } )
            } );
        };

        /**
         * @callback PugHandler.FinishPugResult
         * @param {PugVm} pugVm
         */

        /**
         * @param {string} pugId
         * @param {array<number>} scores
         * @returns {Promise<PugHandler.FinishPugResult, Error>}
         */
        this.finishPug = function ( pugId, scores ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.finishPug( pugId, scores )
                    .done( function ( pug ) {
                        fulfill( new PugVm( pug ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not finish Pug", Asset.ERROR_CODE.PUG_FINISH_ERROR, {
                            pugId: pugId,
                            scores: scores
                        } ) );
                    } )
            } );
        };

        /**
         * @callback PugHandler.CancelPugResult
         * @param {PugVm} pugVm
         */

        /**
         * @param {number} pugId
         * @param {String} cancelMessage
         * @returns {Promise<PugHandler.CancelPugResult, Error>}
         */
        this.cancelPug = function ( pugId, cancelMessage ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.cancelPug( pugId, cancelMessage )
                    .done( function ( pug ) {
                        fulfill( new PugVm( pug ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not cancel Pug", Asset.ERROR_CODE.PUG_CANCEL_ERROR, {
                            pugId: pugId
                        } ) );
                    } )
            } );
        };

        // ... COMMENTS

        /**
         * @callback PugHandler.AddPugCommentResult
         * @param {PugCommentVm} pugCommentVm
         */

        /**
         * @param {number} userId
         * @param {number} pugId
         * @param {string} pugMessage
         * @returns {Promise<PugHandler.AddPugCommentResult, Error>}
         */
        this.addPugComment = function ( pugId, pugMessage ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.addPugComment( pugId, pugMessage )
                    .done( function ( pugComment ) {
                        fulfill( new PugCommentVm( pugComment ) );
                    }, function ( err ) {
                        reject( $.extend( {
                            message: "Could not add Pug Comment",
                            code: Asset.ERROR_CODE.PUG_COMMENT_ADD_ERROR,
                            error: err
                        }, err ) );
                    } );
            } );
        };

        // ... /COMMENTS

        // ... INVITE

        /**
         * @callback PugHandler.NotifyPugUsersResult
         * @param {PugVm} pugVm
         */

        /**
         * @param {Number} pugId
         * @param {Array<Number|String>} notifyList
         * @returns {Promise<PugHandler.NotifyPugUsersResult, Error>}
         */
        this.doInviteUsers = function ( pugId, inviteList ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.doInviteUsers( pugId, inviteList )
                    .done( function ( pug ) {
                        fulfill( new PugVm( pug ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not invite users", Asset.ERROR_CODE.PUG_INVITE_USERS_ERROR, {
                            pugId: pugId,
                            inviteList: inviteList
                        } ) );
                    } )
            } );
        };

        // ... /INVITE

        this.getResultsForFinishedPugs = function ( from, to ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.getResultsForFinishedPugs( from, to )
                    .done( function ( result ) {
                        // update pugs
                        result.pugs.forEach( function ( pug ) {
                            PugHelper.doInjectPug( pug, Global.pugs() );
                        } );

                        fulfill( result.pugsTables );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not get results for Pugs", Asset.ERROR_CODE.GENERAL_ERROR ) );
                    } )
            } );
        };

        this.getFinishedPugsPrWeek = function () {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.getFinishedPugsPrWeek()
                    .done( function ( finishedPugsPrWeek ) {
                        var ret = [];
                        if ( finishedPugsPrWeek.length > 0 ) {
                            var retObj = {};
                            finishedPugsPrWeek.forEach( function ( finishedPugForWeek ) {
                                finishedPugForWeek.date = new Date( finishedPugForWeek.date );
                                finishedPugForWeek.pugsCount = parseInt( finishedPugForWeek.pugsCount );

                                var dateMoment = moment( finishedPugForWeek.date );
                                var key = dateMoment.format( "YYYY-MM" );

                                if ( !retObj[key] ) {
                                    retObj[key] = {
                                        count: 0,
                                        date: dateMoment.clone().toDate(),
                                        weeks: []
                                    };
                                }

                                retObj[key].count += finishedPugForWeek.pugsCount;
                                retObj[key].weeks.push( finishedPugForWeek );
                            } );

                            ret = Util.objectToArray( retObj );
                        }

                        fulfill( ret.sort( function ( left, right ) {
                            return right.date - left.date;
                        } ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not get finished pugs pr. week", Asset.ERROR_CODE.GENERAL_ERROR ) );
                    } );
            } );
        };

        function createPugPlayersFormVm( playersForm ) {
            return playersForm
                .map( function ( playerForm ) {
                    playerForm.form.forEach( function ( form ) {
                        form.date = new Date( form.date );
                        form.standing = Util.parseNumbersInArray( form.standing );
                    } );
                    playerForm.form.sort( function ( left, right ) {
                        return right.date - left.date;
                    } );

                    return playerForm;
                } );
        }

        /**
         * @param {Pug} pug
         * @returns {PugVm}
         */
        function doUpdatePug( pug ) {
            var pugVm = PugHelper.doInjectPug( pug, Global.pugs() );
            Global.pugs.notifySubscribers();
            return pugVm;
        }

        /**
         * @param {Pug} pug
         */
        this.onNewPug = function ( pug ) {
            var pugVm = doUpdatePug( pug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            if ( !pugVm.isStateWaiting() ) {
                return;
            }

            if ( !PugHelper.canUserPlayPug( userVm.id, userVm.groups(), pugVm ) ) {
                return;
            }

            if ( PugHelper.isUserPugCreator( userVm.id, pugVm ) ) {
                return;
            }

            var pugCreatorUserVm = UserHelper.getUserFromId( pugVm.userId, Global.users() );

            eventHandler.fire(
                "pug_toast",
                pugCreatorUserVm,
                pugVm,
                PlayerHelper.isUserInPug( userVm.id, pugVm ) ? "Added to Pick-Up Game!" : "New Pick-Up Game!",
                {
                    type: "pug_new",
                    subtitles: [
                        Util.filterArray( [
                            pugVm.title,
                            pugVm.message
                        ] ).join( " - " ),
                        PugHelper.getPugPlayersNeededString( pugVm )
                    ]
                }
            );
        };

        /**
         * @param {Pug} pug
         */
        this.onReadyPug = function ( pug ) {
            var pugVm = doUpdatePug( pug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            // add pug to ready queue
            if ( PlayerHelper.isUserInPug( userVm.id, pugVm ) && self.pugReadyHandler ) {
                self.pugReadyHandler.doAddPugReadyToQueue( pugVm );
            }
            // user is pug creator
            else if ( PugHelper.isUserPugCreator( userVm.id, pugVm ) ) {
                eventHandler.fire( "pug_toast", userVm, pugVm, "Pick-Up Game is ready!", {
                    type: "pug_ready",
                    subtitles: ["With " + PugHelper.getPugPlayersString( pugVm )]
                } );
            }
        };

        /**
         * @param {Pug} pug
         * @param {Number} userId User that finished the Pug
         */
        this.onFinishedPug = function ( pug, userId ) {
            var pugVm = doUpdatePug( pug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            if ( !PugHelper.isUserInvolvedInPug( userVm.id, pugVm ) ) {
                return;
            }

            var userFinishedPugUserVm = UserHelper.getUserFromId( userId, Global.users() );

            eventHandler.fire( "pug_toast", userFinishedPugUserVm, pugVm, "Finished Pick-Up Game!", {
                type: "pug_finished",
                subtitles: ["Score: " + pugVm.scores().join( " - " )]
            } );
        };

        /**
         * @param {Pug} pug
         */
        this.onCanceledPug = function ( pug ) {
            doUpdatePug( pug );
        };

        /**
         * @param {Pug} pug
         * @param {Number} userId User that joined the Pug
         * @param {boolean} isMovedSlot
         */
        this.onJoinPug = function ( pug, userId, isMovedSlot ) {
            var pugVm = doUpdatePug( pug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            if ( isMovedSlot ) {
                return;
            }

            if ( !pugVm.isStateWaiting() ) {
                return;
            }

            if ( userId === userVm.id ) {
                return;
            }

            if ( !PugHelper.isUserInvolvedInPug( userVm.id, pugVm ) ) {
                return;
            }

            var joinedUserVm = UserHelper.getUserFromId( userId, Global.users() );

            eventHandler.fire( "pug_toast", joinedUserVm, pugVm, "Joined Pick-Up Game!", {
                type: "pug_join"
            } );
        };

        /**
         * @param {Pug} pug
         * @param {Number} userId User that joined the Pug
         */
        this.onLeavePug = function ( pug, userId ) {
            var pugVm = doUpdatePug( pug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            if ( !pugVm.isStateWaiting() ) {
                return;
            }

            if ( userId === userVm.id ) {
                return;
            }

            if ( !PugHelper.isUserInvolvedInPug( userVm.id, pugVm ) ) {
                return;
            }

            var leftUserVm = UserHelper.getUserFromId( userId, Global.users() );

            eventHandler.fire( "pug_toast", leftUserVm, pugVm, "Left Pick-Up Game!", {
                type: "pug_left"
            } );
        };

        /**
         * @param {Pug} pug
         * @param {Pug} oldPug
         */
        this.onInvitePug = function ( pug, oldPug ) {
            var pugVm = doUpdatePug( pug );
            var oldPugVm = new PugVm( oldPug );
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            if ( PugHelper.isUserPugCreator( userVm.id, pugVm ) ) {
                return;
            }

            if ( !PugHelper.canUserPlayPug( userVm.id, userVm.groups(), pugVm ) ) {
                return;
            }

            // could user already play in pug?
            if ( PugHelper.canUserPlayPug( userVm.id, userVm.groups(), oldPugVm ) ) {
                return;
            }

            var pugCreatorUserVm = UserHelper.getUserFromId( pugVm.userId, Global.users() );

            eventHandler.fire(
                "pug_toast",
                pugCreatorUserVm,
                pugVm,
                "Invited to Pick-Up Game!",
                {
                    type: "pug_invited",
                    subtitles: [
                        Util.filterArray( [
                            pugVm.title,
                            pugVm.message
                        ] ).join( " - " ),
                        PugHelper.getPugPlayersNeededString( pugVm )
                    ]
                }
            );
        };

        /**
         * @param {PugComment} pugComment
         * @param {Pug} pug
         */
        this.onNewPugComment = function ( pugComment, pug ) {
            var pugCommentVm = new PugCommentVm( pugComment );
            var pugVm = new PugVm( pug );

            eventHandler.fire( "pug_comment_new", pugCommentVm );

            // fire pug toast
            if ( pugCommentVm.userId !== Global.userId && PugHelper.isUserInvolvedInPug( Global.userId, pugVm ) ) {
                eventHandler.fire( "pug_toast", UserHelper.getUserFromId( pugCommentVm.userId, Global.users() ), pugVm, $( pugCommentVm.messageHtml )[0].innerText, {
                    type: "comment"
                } );
            }
        };

    }

    PugHandler.API_ERROR_USER_NOT_EXIST = "USER_DOES_NOT_EXIST";
    PugHandler.API_ERROR_PUG_NOT_EXIST = "PUG_DOES_NOT_EXIST";
    PugHandler.API_ERROR_PUG_IS_CANCELED = "PUG_IS_CANCELED";
    PugHandler.API_ERROR_USER_NOT_IN_PUG = "USER_NOT_IN_PIG";
    PugHandler.API_ERROR_CREATE_PUG_OTHER_NOT_GIVEN = "PUG_GAME_NOT_GIVEN";
    PugHandler.API_ERROR_PUG_NOT_PLAYING = "PUG_STATE_NOT_READY";
    PugHandler.API_ERROR_PUG_FINISHED = "PUG_STATE_FINISHED";
    PugHandler.API_ERROR_USER_NOT_PUG_CREATOR = "USER_NOT_PUG_CREATOR";
    PugHandler.API_PUG_EMPTY_COMMENT = "PUG_EMPTY_COMMENT";
    PugHandler.API_ERROR_PUG_STATE_FINISHED = "PUG_STATE_FINISHED";

    PugHandler.ERROR_JOIN_PUG = "error_join_pug";
    PugHandler.ERROR_JOIN_PUG_IS_FULL = "error_join_pug_is_full";
    PugHandler.ERROR_LEAVE_PUG = "error_leave_pug";
    PugHandler.ERROR_CREATE_PUG = "error_create_pug";
    PugHandler.ERROR_CREATE_PUG_GAME_OTHER = "error_create_pug_game_other";
    PugHandler.ERROR_USER_NOT_EXIST = "error_user_not_exist";
    PugHandler.ERROR_PUG_NOT_EXIST = "error_pug_not_exist";
    PugHandler.ERROR_PUG_NOT_PLAYING = "error_pug_not_playing";
    PugHandler.ERROR_PUG_IS_CANCELED = "error_pug_is_canceled";
    PugHandler.ERROR_USER_NOT_IN_PUG = "error_user_not_in_pug";
    PugHandler.ERROR_PUG_COMMENT_EMPTY = "error_empty_comment";
    PugHandler.ERROR_PUG_COMMENT = "error_comment";
    PugHandler.ERROR_PUG_COMMENTS = "error_comments";
    PugHandler.ERROR_PUG_NOTIFY = "error_pug_notify";
    PugHandler.ERROR_PUG_IS_FINISHED = "error_pug_finished";
    PugHandler.ERROR_CANCEL_PUG = "error_pug_cancel";
    PugHandler.ERROR_USER_NOT_PUG_CREATOR = "error_user_not_pug_creator";
    PugHandler.ERROR_GET_PUG = "error_get_pug";

    return PugHandler;

} );