"use strict";

define( function () {

    var Constant = {
        TRANSITION: {
            LOADER: 150,
            WAITING: 150,
            TOAST: 150,
            DIALOG: 150,
            PAGE: 150,
            TOOLBAR_CONTEXT: 150
        },
        TOAST: {
            LONG: 7000,
            SHORT: 5000,
            PUG: 10000
        },
        NOTIFY: {
            NEW_PUG: 2 * 60 * 1000,
            CANCEL_PUG: 2 * 60 * 1000
        },
        KEY: {
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            SPACE: 32,
            TAB: 9
        },
        DELAY: {
            RETRIEVE_PUG: 10 * 1000,
            RETRIEVE_DATA: 1000 * 60
        }
    };

    return Constant;

} );