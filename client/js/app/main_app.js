"use strict";

define( [
    "dom",
    "knockout",
    "api/officepug_api",
    "lib/socket",
    "lib/promise",
    "lib/global",
    "lib/constant",
    "lib/asset",
    //"lib/google_analytics",
    "lib/knockout_util",
    "util/dom_util",
    "helper/user_helper",
    "helper/game_helper",
    "helper/notify_helper",
    "helper/pug_comment_helper",
    "helper/player_helper",
    "helper/pug_helper",
    "handler/event_handler",
    "handler/page_handler",
    "handler/data_handler",
    "handler/user_handler",
    "handler/pug_handler",
    "handler/login_handler",
    "handler/pug_ready_handler",
    "component/toolbar_component",
    "component/toast_component",
    "component/waiting_component",
    "component/drawer_component",
    "component/alert_dialog_component",
    "component/pug_toast_component",
    "page/login_page",
    "page/pugs_page",
    "page/new_pug_page",
    "page/settings_page",
    "page/pug_page",
    "page/finished_pugs_page",
    "page/users_page"
], function ( $, knockout, KPugApi, socket, Promise, Global, Constant, Asset, KnockoutUtils, DomUtil, UserHelper, GameHelper, NotifyHelper, PugCommentHelper, PlayerHelper, PugHelper, eventHandler, PageHandler, DataHandler, UserHandler, PugHandler, LoginHandler, PugReadyHandler, ToolbarComponent, ToastComponent, WaitingComponent, DrawerComponent, AlertDialogComponent, PugToastComponent, LoginPage, PugsPage, NewPugPage, SettingsPage, PugPage, FinishedPugsPage, UsersPage ) {

    var TAG = "[MainApp]";

    var title = "Knowit Pick-Up Game";

    var $app = $( "app" );
    var $drawer = $( "drawer" ),
        drawerComponent = new DrawerComponent();
    var $toolbar = $( "toolbar" ),
        toolbarComponent = new ToolbarComponent();
    var $applicationLoader = $( "loading[application]" ),
        applicationLoader = {
            text: knockout.observable( "Loading application..." ),
            isError: knockout.observable( false ),
            errorIcon: Asset.svg.warning
        };
    var $reload = $( "spinner[reload]" ),
        reload = {
            type: knockout.observable( "reload" ),
            visible: knockout.observable( false )
        },
        reloadTimeout;
    var kpugApi = new KPugApi( {
        isTest: /[\?&]test=true/i.test( location.search )
    } );
    var $dialogWrapper = $( "wrapper[dialog]" );
    var $toastWrapper = $( "wrapper[toast]" ),
        toast = new ToastComponent( $toastWrapper );
    var $waitingWrapper = $( "wrapper[waiting]" ),
        waiting = new WaitingComponent( $waitingWrapper );
    var pageHandler = new PageHandler(),
        $pagesWrapper = $( "pages" );
    var pugReadyHandler = new PugReadyHandler( {
            title: title
        } ),
        dataHandler = new DataHandler(),
        userHandler = new UserHandler(),
        pugHandler = new PugHandler( pugReadyHandler ),
        loginHandler = new LoginHandler();
    var viewModel = {};

    Global.kpugApi = kpugApi;
    Global.$dialogWrapper = $dialogWrapper;
    Global.pageHandler = pageHandler;
    Global.drawer = drawerComponent;
    Global.toolbar = toolbarComponent;

    viewModel.toolbar = toolbarComponent;
    viewModel.drawer = drawerComponent;
    viewModel.drawerOpen = Global.drawerOpen;
    viewModel.loading = applicationLoader;
    viewModel.reload = reload;

    var loginPage = new LoginPage(),
        pugsPage = new PugsPage(),
        newPugPage = new NewPugPage(),
        settingsPage = new SettingsPage(),
        pugPage = new PugPage(),
        finishedPugsPage = new FinishedPugsPage(),
        usersPage = new UsersPage();

    pageHandler.addPage( "login", loginPage );
    pageHandler.addPage( "pugs", pugsPage );
    pageHandler.addPage( "new", newPugPage );
    pageHandler.addPage( "settings", settingsPage );
    pageHandler.addPage( "pug", pugPage );
    pageHandler.addPage( "results", finishedPugsPage );
    pageHandler.addPage( "users", usersPage );

    Global.isReloadingData.subscribe( function ( val ) {
        reload.visible( val );
    } );

    // FUNCTIONS

    /**
     * @returns {Promise}
     */
    function doLoadApplicationPromise() {
        return new Promise( function ( fulfill, reject ) {
            loginHandler.isLoggedIn()
                .then( dataHandler.doRetrieveData )
                .done( function () {
                    Global.isLoggedIn( true );

                    fulfill();
                }, function ( err ) {
                    if ( err.code === LoginHandler.ERROR_NOT_LOGGED_IN ) {
                        fulfill();
                    }
                    else {
                        reject();
                    }
                } );
        } );
    }

    // /FUNCTIONS

    // EVENTS

    // ... SOCKET

    socket.on( Asset.NOTIFY_CODE.PUG_NEW, function ( data ) {
        pugHandler.onNewPug( data.pug );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_STATE_READY, function ( data ) {
        pugHandler.onReadyPug( data.pug );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_STATE_FINISH, function ( data ) {
        pugHandler.onFinishedPug( data.pug, data.userId );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_CANCELED_MESSAGE, function ( data ) {
        pugHandler.onCanceledPug( data.pug );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_JOIN, function ( data ) {
        pugHandler.onJoinPug( data.pug, data.userId, data.isMovedSlot );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_LEAVE, function ( data ) {
        pugHandler.onLeavePug( data.pug, data.userId );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_USERS_INVITE, function ( data ) {
        pugHandler.onInvitePug( data.pug, data.oldPug );
    } );

    socket.on( Asset.NOTIFY_CODE.PUG_COMMENT_NEW, function ( data ) {
        pugHandler.onNewPugComment( data.pugComment, data.pug );
    } );

    socket.on( Asset.NOTIFY_CODE.USER_NEW, function ( data ) {
        userHandler.onNewUser( data.user );
    } );

    socket.on( Asset.NOTIFY_CODE.USER_UPDATE, function ( data ) {
        userHandler.onUpdateUser( data.user );
    } );

    socket.on( Asset.NOTIFY_CODE.USERS_ONLINE, function ( usersOnline ) {
        console.log( TAG, "Users online", usersOnline );
    } );

    socket.on( "disconnect", function () {
        Global.isLoggedIn( false );
        eventHandler.fire( "waiting", "Waiting for server..." );
    } );

    socket.on( "reconnect", function () {
        doLoadApplicationPromise()
            .then( function () {
                Global.isLoggedIn( true );
                pageHandler.doRefreshPage();
            } )
            .catch( function ( err ) {
                console.error( TAG, "Error while reloading application", err );

                $applicationLoader.removeClass( "hidden" );
                $toolbar.hide();
                $drawer.hide();
                $pagesWrapper.hide();

                applicationLoader.isError( true );
                applicationLoader.text( "Error while reloading application" );
            } )
            .finally( function () {
                eventHandler.fire( "waiting", false );
            } );
    } );

    // ... /SOCKET

    eventHandler.on( "toast", function ( toastMessage, duration ) {
        toast.doShow( toastMessage, duration );
    } );

    eventHandler.on( "pug_toast", function ( userVm, pugVm, message, options ) {
        new PugToastComponent( $toastWrapper ).doShow( userVm, pugVm, message, options );
    } );

    eventHandler.on( "waiting", function ( waitingMessage, options ) {
        if ( waitingMessage ) {
            waiting.doShow( waitingMessage, options );
        }
        else {
            waiting.doRemove();
        }
    } );

    // ... PUG EVENTS

    eventHandler.on( "pug_new", function ( pugVm ) {
        PugHelper.doNotifyNewPug( pugVm );
    } );

    eventHandler.on( "pug_comments", function ( pugCommentVms ) {
        PugCommentHelper.doNotifyPugComments( $toastWrapper, pugCommentVms );
    } );

    eventHandler.on( "pug_state_change", function ( pugVm ) {
        if ( pugVm.isStatePlaying() ) {
            if ( !Global.userId ) {
                return;
            }

            if ( PlayerHelper.isUserInPug( Global.userId, pugVm ) ) {
                eventHandler.fire( "pug_ready", pugVm );
            }
        }
    } );

    eventHandler.on( "pug_canceled", function ( pugVm ) {
        PugHelper.doNotifyCanceledPug( pugVm, pageHandler );
    } );

    // ... /PUG EVENTS

    // /EVENTS

    // HANDLE RESIZE

    var resizeTimeout,
        resizeTimer = 100,
        resizeHandler = function () {
            eventHandler.fire( "resize" );
        };
    $( window ).on( "resize", function () {
        clearTimeout( resizeTimeout );
        resizeTimeout = setTimeout( resizeHandler, resizeTimer )
    } );

    // HANDLE HASH CHANGE

    $( window ).on( "hashchange", pageHandler.handleHashChange.bind( this ) );

    // REQUEST ACCESS

    NotifyHelper.requestNotificationPermission();

    // DRAWER

    drawerComponent.addMenuItem( {
        name: "pugs",
        title: "Pick-Up Games",
        icon: Asset.FONT_ICON.REORDER,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "pugs" );
        },
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "new",
        title: "New PUG",
        icon: Asset.FONT_ICON.OPUG_CONTROLLER,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "new" );
        },
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "result",
        title: "Results",
        icon: Asset.FONT_ICON.FORMAT_LIST_NUMBERED,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "results" );
        },
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "users",
        title: "Users",
        icon: Asset.FONT_ICON.PEOPLE,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "users" );
        },
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "settings",
        title: "Settings",
        icon: Asset.FONT_ICON.SETTINGS,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "settings" );
        },
        isSplitter: true,
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "logout",
        title: "Logout",
        icon: knockout.computed( function () {
            if ( Global.isLoggedIn() ) {
                var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

                return $( "<img />", {
                    src: userVm.image(),
                    'class': "profile"
                } )[0].outerHTML
            }
            return false;
        } ),
        onClick: function () {
            loginHandler.doLogout();
            DomUtil.doRefresh();
        },
        isVisible: Global.isLoggedIn
    } );

    drawerComponent.addMenuItem( {
        name: "login",
        title: "Login",
        icon: Asset.FONT_ICON.PERSON_OUTLINE,
        onClick: function () {
            Global.pageHandler.doRedirectToPage( "login" );
        },
        isVisible: KnockoutUtils.not( Global.isLoggedIn ),
        isSelected: knockout.computed( function () {
            return pageHandler.page() && pageHandler.page().name === "login";
        } )
    } );

    // /DRAWER

    // BUILD

    knockout.applyBindings( viewModel, $app[0] );

    pageHandler.doBuildPages( $pagesWrapper );
    drawerComponent.doBuild( $drawer );
    pugReadyHandler.doBuild( $dialogWrapper );
    toolbarComponent.doBuild( $toolbar );

    DomUtil.doSetHeadTitle( title );

    // API

    //var retrieveDataPromise = new Promise( function ( resolve, reject ) {
    //        dataHandler.doRetrieveData( function ( error, data ) {
    //            if ( data ) {
    //                resolve( data );
    //            }
    //            else {
    //                reject( error );
    //            }
    //        } );
    //    } ),
    //    checkLoggedInPromise = new Promise( function ( resolve, reject ) {
    //        loginHandler.isLoggedIn( function ( error, userVm ) {
    //            if ( userVm ) {
    //                resolve( userVm );
    //            }
    //            else if ( error && error.code === LoginHandler.ERROR_NOT_LOGGED_IN ) {
    //                resolve( null );
    //            }
    //            else {
    //                reject( error );
    //            }
    //        } );
    //    } );
    //
    //Promise.all( [retrieveDataPromise, checkLoggedInPromise] ).then( function ( result ) {
    //    var resultUserVm = result[1] || null,
    //        isLoggedIn = !!resultUserVm;
    //
    //    if ( isLoggedIn ) {
    //        var userVm = UserHelper.getUserFromId( resultUserVm.userId(), Global.userIds() );
    //        if ( !userVm ) {
    //            loginHandler.doLogout();
    //        }
    //        else {
    //            loginHandler.doSetLoggedInUser( userVm );
    //            eventHandler.fire( "loggedin", userVm );
    //        }
    //    }
    //    else {
    //        loginHandler.doLogout();
    //    }
    //
    //    DomUtil.transition( $applicationLoader, "hide", "hidden", Constant.TRANSITION.LOADER );
    //    drawerComponent.doShow();
    //    pageHandler.doShow();
    //
    //    if ( Global.userId && pageHandler.page().name === "login" ) {
    //        pageHandler.doRedirectToPage( true, "pugs" );
    //        pageHandler.doShow();
    //    }
    //
    //    googleAnalytics.timing( "App", "Loaded", "KpugAPI", Date.now() - window.APP_TIME );
    //}, function ( error ) {
    //    applicationLoader.isError( true );
    //    applicationLoader.text( "Error while loading application" );
    //    console.error( error );
    //} );

    // READY

    applicationLoader.text( "Loading data..." );

    doLoadApplicationPromise()
        .then( function () {
            DomUtil.transition( $applicationLoader, "hide", "hidden", Constant.TRANSITION.LOADER );
            drawerComponent.doShow();
            pageHandler.doShow();

            if ( Global.userId && pageHandler.page() && pageHandler.page().name === "login" ) {
                pageHandler.doRedirectToPage( true, "pugs" );
                pageHandler.doShow();
            }
        }, function ( err ) {
            console.error( TAG, "Error while loading application", err );
            applicationLoader.isError( true );
            applicationLoader.text( "Error while loading application" );
        } );

    //socket.emit( "data", function ( err, data ) {
    //    console.log( "DATA", err, data );
    //} );
    //
    //socket.on( "reconnect", function () {
    //    console.log( "RECONNECT" );
    //} );

    document.body.onerror = function () {
        console.error( "OnError", arguments );
    };

    window.onerror = function myErrorHandler() {
        console.error( "Uncaught error", arguments );
        eventHandler.fire( "toast", "Something wrong happened" );
    };

    window.doTest = function () {
        new PugToastComponent( $toastWrapper ).doShow( UserHelper.getUserFromId( 1, Global.users() ), PugHelper.getPugFromId( 37, Global.pugs() ), "New Pick-Up Game!", {
            subtitles: [
                "Table footbal - Testing bug 2 Testing bug 2 Testing bug 2 Testing bug 2 Testing bug 2",
                "Need 3 player(s)"
            ]
        } );
    };

} );