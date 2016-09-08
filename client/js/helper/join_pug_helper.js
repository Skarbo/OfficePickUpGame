"use strict";

define( [
    "lib/global",
    "lib/asset",
    "handler/event_handler",
    "helper/pug_helper",
    "helper/player_helper",
    "helper/user_helper",
    "component/alert_dialog_component",
    "component/users_dialog_component"
], function ( Global, Asset, eventHandler, PugHelper, PlayerHelper, UserHelper, AlertDialogComponent, UsersDialogComponent ) {

    /**
     * @param {Object} options
     * @param {PugHandler} options.pugHandler
     * @param {observable} options.isViewDisabled
     * @constructor
     */
    function JoinPugHelper( options ) {

        var TAG = "[JoinPugHelper]";

        var pugActionAlertDialog = new AlertDialogComponent( {
            onHidden: function () {
                options.isViewDisabled( false );
            }
        } );

        var usersDialog = new UsersDialogComponent( {
            title: "Add player"
        } );

        this.doHide = function () {
            pugActionAlertDialog.doHide();
            usersDialog.doHide();
        };

        this.doBuild = function () {
            pugActionAlertDialog.doBuild( Global.$dialogWrapper );
            usersDialog.doBuild( Global.$dialogWrapper );
        };

        this.doShowLeavePugDialog = function ( userId, pugVm ) {
            if ( !userId ) {
                console.warn( "Could not leave PUG; User id not given" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not leave PUG; PUG not given" );
                return;
            }

            if ( !PlayerHelper.isUserInPug( userId, pugVm ) ) {
                console.warn( "Could not leave PUG; User not in PUG" );
                return;
            }

            function doLeavePug( userId, pugVm ) {
                options.pugHandler.doLeavePug( userId, pugVm.id, function ( error, pugVm ) {
                    if ( error ) {
                        console.error( "Could not leave PUG", error );
                        eventHandler.fire( "toast", "Could not leave PUG" );
                    }
                    else if ( pugVm ) {
                        eventHandler.fire( "toast", "Left Pick-Up Game" );
                    }
                } );
            };

            pugActionAlertDialog.doShow( {
                icon: Asset.svg.pug_action_remove,
                title: Global.userId === userId ? "Leave PUG?" : "Remove from PUG?",
                message: Global.userId === userId ? "Do you want to leave Pick-Up Game?" : "Do you want to remove player from Pick-Up Game?",
                okText: Global.userId === userId ? "Leave" : "Remove",
                onOk: doLeavePug.bind( self, userId, pugVm )
            } );
        };

        /**
         * @param {number} userId
         * @param {PugVm} pugVm
         * @param {number} [slot]
         */
        this.doShowJoinPugDialog = function ( userId, pugVm, slot ) {
            if ( !userId ) {
                console.warn( "Could not join PUG; User id not given" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not join PUG; PUG not given" );
                return;
            }

            if ( !pugVm.isStateWaiting() ) {
                console.warn( "Could not join PUG; PUG is not waiting" );
                return;
            }

            if ( PlayerHelper.isUserInPug( userId, pugVm ) ) {
                console.warn( "Could not join PUG; User already in PUG" );
                return;
            }

            function doJoinPug( userId, pugVm, slot ) {
                options.pugHandler.doJoinPug( userId, pugVm.id, slot, function ( error, result ) {
                    if ( error ) {
                        console.error( "Could not join PUG", error );
                        eventHandler.fire( "toast", "Could not join PUG" );
                    }
                    else if ( result.pugVm ) {
                        eventHandler.fire( "toast", "Joined Pick-Up Game" );
                    }
                } );
            }

            var isUserLoggedInUser = Global.userId === userId,
                userVm = UserHelper.getUserFromId( userId, Global.users() );

            pugActionAlertDialog.doShow( {
                icon: Asset.svg.pug_action_join,
                title: isUserLoggedInUser ? "Join Pick-Up Game?" : "Add to Pick-Up Game?",
                message: isUserLoggedInUser ? "Do you want to join Pick-Up Game?" : "Do you want to add " + userVm.firstName() + " to Pick-Up Game?",
                okText: isUserLoggedInUser ? "Join" : "Add",
                onOk: doJoinPug.bind( self, userId, pugVm, slot )
            } );
        };

        this.doShowFinishPugDialog = function ( userId, pugVm, scores ) {
            if ( !userId ) {
                console.warn( "Could not finish PUG; User id not given" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not finish PUG; PUG not given" );
                return;
            }

            if ( !pugVm.isStatePlaying() ) {
                console.warn( "Could not finish PUG; PUG is not playing" );
                return;
            }

            if ( !PugHelper.canUserFinishPug( userId, pugVm ) ) {
                console.warn( "Could not finish PUG; User can not finish PUG" );
                return;
            }

            function doFinishPug( userId, pugVm ) {
                options.pugHandler.finishPug( pugVm.id, scores )
                    .then( function () {
                        eventHandler.fire( "toast", "Finished Pick-Up Game" );
                    }, function ( err ) {
                        console.error( TAG, err.message, err, err.stack );
                        eventHandler.fire( "toast", "Could not finish PUG" );
                    } );
            }

            var isScoresSumZero = scores.reduce( function ( a, b ) {
                    return a + b;
                } ) === 0;

            pugActionAlertDialog.doShow( {
                icon: Asset.svg.pug_action_finish,
                title: "Finish PUG?",
                message: isScoresSumZero ? "Do you really want to finish Pick-Up Game with no scores?" : "Do you want to finish Pick-Up Game?",
                okText: "Finish",
                onOk: doFinishPug.bind( self, userId, pugVm )
            } );
        };

        /**
         * @param {Number} userId
         * @param {PugVm} pugVm
         * @param {Number} slot
         */
        this.doJoinDifferentPugSlot = function ( userId, pugVm, slot ) {
            options.pugHandler.doJoinPug( userId, pugVm.id, slot, function ( error ) {
                if ( error ) {
                    console.error( "Could not join different PUG slot", error );
                    eventHandler.fire( "toast", "Could not join different slot" );
                }
            } );
        };

        this.doShowUsersDialog = function ( onSelectedCallback ) {
            usersDialog.doShow( onSelectedCallback );
        };

    }

    return JoinPugHelper;

} );