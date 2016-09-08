"use strict";

define( [
    "lib/global",
    "component/alert_dialog_component",
    "util/dom_util",
    "helper/notify_helper",
    "helper/user_helper"
], function ( Global, AlertDialogComponent, DomUtil, NotifyHelper, UserHelper ) {

    /**
     * @param {Object} options
     * @param {String} options.title
     * @constructor
     */
    function PugReadyHandler( options ) {

        // VARIABLES

        var self = this;

        var pugReadyDialog = new AlertDialogComponent( {
            onHidden: doResetPugReady.bind( self )
        } );
        var pugReadyDialogQueue = [];
        var notification;
        var isShowingPug = false;

        // FUNCTIONS

        this.doBuild = function ( $dialogWrapper ) {
            pugReadyDialog.doBuild( $dialogWrapper );
        };

        var pugReadyTitleUpdateFinish;

        this.doAddPugReadyToQueue = function ( pugVm ) {
            pugReadyDialogQueue.push( pugVm );
            doShowNextPugReady();
        };

        function doShowNextPugReady() {
            if ( isShowingPug ) {
                return;
            }

            var pugVm = pugReadyDialogQueue.shift();
            if ( pugVm ) {
                doUpdatePugReadyTitle();
                doShowPugReadyDialog( pugVm );
                doShowPugReadyNotification( pugVm );
                isShowingPug = true;
            }
        }

        function doResetPugReady() {
            if ( pugReadyTitleUpdateFinish ) {
                pugReadyTitleUpdateFinish();
                pugReadyTitleUpdateFinish = null;
            }

            if ( notification ) {
                notification.close();
                notification = null;
            }

            pugReadyDialog.doHide();

            isShowingPug = false;

            setTimeout( doShowNextPugReady.bind( null ), 1000 );
        }

        function doShowPugReadyDialog( pugVm ) {
            pugReadyDialog.doShow( {
                icon: pugVm.game.src,
                title: "Pick-Up Game is ready!",
                message: "Pick up game is ready...",
                hasNoCancel: true,
                onOk: onPugReadyClick.bind( null, pugVm )
            } );
        }

        function doShowPugReadyNotification( pugVm ) {
            if ( !Global.hasKpugPlugin ) {
                var game = pugVm.game,
                    gameTitle = game.title + (game.other ? " - " + game.otherTitle : ""),
                    players = pugVm.players().map( function ( playerVm ) {
                        return playerVm.getUser().firstName();
                    } ),
                    playersString = players.length > 1 ? players.slice( 0, -1 ).join( ", " ) + " and " + players.slice( -1 )[0] : players[0] || "",
                    message = pugVm.message;

                notification = NotifyHelper.createNotification( "Pick-Up Game is ready!", [gameTitle, playersString].concat( message ? ["", message] : null ).join( "\n" ), {
                    onClick: onPugReadyClick.bind( null, pugVm )
                } );
            }
        }

        function doUpdatePugReadyTitle() {
            var newTitle = "[PUG is ready!] " + options.title;
            pugReadyTitleUpdateFinish = DomUtil.doAlertTab( options.title, newTitle );
        }

        function onPugReadyClick( pugVm ) {
            Global.pageHandler.doRedirectToPage( "pug/" + pugVm.id );
            doResetPugReady();
        }

        window.doShowPugReadyNotification = doShowPugReadyNotification; // TODO Remove
        window.doAddPugReadyToQueue = self.doAddPugReadyToQueue; // TODO Remove
    }

    return PugReadyHandler;

} );