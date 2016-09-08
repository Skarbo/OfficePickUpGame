"use strict";

define( [
    "knockout",
    "lib/global",
    "util/util",
    "vm/user_vm",
    "vm/pug_vm",
    "vm/pug_comment_vm",
    "helper/pug_helper",
    "helper/user_helper",
    "helper/game_helper",
    "handler/event_handler"
], function ( knockout, Global, Util, UserVm, PugVm, PugCommentVm, PugHelper, UserHelper, GameHelper, eventHandler ) {

    function DataHandler() {

        var lastData;

        /**
         * @returns {Promise}
         */
        this.doRetrieveData = function () {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.retrieveData().then(
                    /**
                     * @param {Object} data
                     * @param {Array<User>} data.users
                     * @param {Array<Pug>} data.pugs
                     * @param {Array<PugGame>} data.pugGames
                     */
                    function ( data ) {
                        var users = data.users || [],
                            pugs = data.pugs || [],
                            games = data.pugGames || [];

                        // games
                        Global.games = GameHelper.createGames( games );

                        // users
                        Global.users.removeAll();
                        users.forEach( function ( user ) {
                            Global.users.push( new UserVm( user ) );
                        } );

                        // pugs
                        Global.pugs.removeAll();
                        pugs.forEach( function ( pug ) {
                            Global.pugs.push( new PugVm( pug ) );
                        } );

                        fulfill( null, {
                            users: Global.users(),
                            pugs: Global.pugs(),
                            games: Global.games
                        } );
                    }, function ( err ) {
                        reject( err );
                    } );
            } );
        };

        this.doReloadData = function ( callback ) {
            if ( Global.isReloadingData() ) {
                callback( {
                    message: "Already retrieving data"
                } );
                return;
            }

            Global.isReloadingData( true );

            Global.kpugApi.doRetrieveData( lastData, function ( error, data ) {
                if ( Util.getProperty( data, "data" ) ) {
                    var users = Util.getProperty( [], data, "data", "users" ),
                        pugs = Util.getProperty( [], data, "data", "pugs" ),
                        comments = Util.getProperty( [], data, "data", "comments" );

                    // users
                    var userVm;

                    users.forEach( function ( user ) {
                        userVm = UserHelper.doUpdateUser( user, Global.users() );

                        // ... new user
                        if ( !userVm ) {
                            userVm = new UserVm( user );
                            Global.users.push( userVm );
                        }
                    } );

                    // pugs
                    var pugVm, pugVmUpdated, pugsUpdated = [];
                    pugs.forEach( function ( pug ) {
                        pugVmUpdated = PugHelper.doUpdatePug( pug, Global.pugs() );

                        // ... new pug
                        if ( !pugVmUpdated ) {
                            pugVm = new PugVm( pug );
                            Global.pugs.push( pugVm );

                            pugsUpdated.push( {
                                type: "new",
                                pugVm: pugVm
                            } );
                        }
                        else {
                            // ... canceled
                            if ( PugHelper.hasPugBeenCanceled( pugVmUpdated, pug ) ) {
                                pugsUpdated.push( {
                                    type: "canceled",
                                    pugVm: pugVmUpdated
                                } );
                            }
                            // ... updated state
                            else if ( PugHelper.hasPugStateBeenUpdated( pugVmUpdated, pug ) ) {
                                pugsUpdated.push( {
                                    type: "state",
                                    pugVm: pugVmUpdated
                                } );
                            }
                        }
                    } );

                    pugsUpdated.forEach( function ( obj ) {
                        switch ( obj.type ) {
                            case "state":
                                eventHandler.fire( "pug_state_change", obj.pugVm );
                                break;
                            case "canceled":
                                eventHandler.fire( "pug_canceled", obj.pugVm );
                                break;
                            case "new":
                                eventHandler.fire( "pug_new", obj.pugVm );
                                break;
                        }
                    } );

                    // notify pug comments
                    var pugCommentVmsToNotify = comments.map( function ( comment ) {
                        return new PugCommentVm( comment );
                    } ).filter( function ( pugCommentVm ) {
                        return pugCommentVm.user_id !== Global.userId;
                    } );

                    if ( pugCommentVmsToNotify.length > 0 ) {
                        eventHandler.fire( "pug_comments", pugCommentVmsToNotify );
                    }

                    callback( null, {
                        users: Global.users(),
                        pugs: Global.pugs()
                    } );

                    lastData = Date.now();
                }
                else {
                    callback( {
                        message: "Could not retrieve data",
                        error: Util.getProperty( data, "error" ) || error
                    } );
                }

                Global.isReloadingData( false );
            } );
        };

    }

    return DataHandler;

} );