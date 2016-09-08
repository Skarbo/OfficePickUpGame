"use strict";

define( [
    "lib/global"
], function ( Global ) {

    function ApplicationHandler() {

        var TAG = "[ApplicationHandler]";

        var self = this;

        this.isAndroid = !!window["Android"];

        this.showToast = function ( mesage ) {
            if ( self.isAndroid ) {
                console.log( TAG, "ShowToast", mesage );
                window["Android"].showToast( mesage );
            }
        };

        /**
         * @returns {String} Device register token
         */
        this.getRegisterToken = function () {
            if ( self.isAndroid ) {
                return window["Android"].getRegisterToken();
            }
            return null;
        };

        /**
         * @returns {String} Device name
         */
        this.getDeviceName = function () {
            if ( self.isAndroid ) {
                return "Android Application";
            }
            return "Unknown";
        }
    }

    return ApplicationHandler;

} );