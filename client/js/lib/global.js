"use strict";

define( [
    "knockout",
    "util/util",
    "handler/event_handler"
], function ( knockout, Util, eventHandler ) {

    var LOCAL_STORAGE_USER_STORE = "userStore";

    var Global = {
        doReset: doReset.bind( this ),
        kpugApi: null,
        /**
         * @type {Number}
         */
        user: null,
        users: knockout.observableArray( [] ),
        pugs: knockout.observableArray( [] ),
        /**
         * @type {Array<Game>}
         */
        games: [],
        /**
         * @type {ToolbarComponent}
         */
        toolbar: null,
        /**
         * @type {PageHandler}
         */
        pageHandler: null,
        userStore: knockout.observable( Util.getLocalStorage( LOCAL_STORAGE_USER_STORE ) ),
        drawerOpen: knockout.observable( false ),
        isReloadingData: knockout.observable( false ),
        isViewDisabled: knockout.observable( false ),
        isLoggedIn: knockout.observable( false ),
        hasKpugPlugin: !!document.querySelector( "body" ).getAttribute( "kpug_plugin" ),
        isApplication: !!window["Android"]
    };

    function doReset() {
        Global.kpugApi = null;
        Global.userId = null;
        Global.users( [] );
        Global.pugs( [] );
        Global.games = [];
        Global.drawerOpen( false );
        Global.$dialogWrapper = null;
        Global.isReloadingData( false );
        Global.isViewDisabled( false );
    }

    Global.doReset();

    Global.eventHandler = eventHandler;

    Global.userStore.subscribe( function ( value ) {
        Util.setLocalStorage( LOCAL_STORAGE_USER_STORE, value );
    } );

    window._global = Global; // TODO Remove
    return Global;

} );