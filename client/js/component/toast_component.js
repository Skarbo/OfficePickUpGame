"use strict";

define( [
    "knockout",
    "lib/constant",
    "util/dom_util"
], function ( knockout, Constant, DomUtil ) {

    function ToastComponent( $toastWrapper ) {
        var self = this;
        self.$toastWrapper = $toastWrapper;
        var timeout;
        var isShowing = false;

        this.doShow = function ( toastMessage, duration ) {
            duration = duration || Constant.TOAST.SHORT;

            if ( isShowing ) {
                self.doRemove( true );
            }

            self.$toast = $( "<toast />", {
                'data-bind': "template: { name: 'toast' }"
            } );

            knockout.applyBindings( {
                text: toastMessage
            }, self.$toast[0] );

            self.$toastWrapper.append( self.$toast );

            setTimeout( function () {
                DomUtil.transition( self.$toast, "show", "show", Constant.TRANSITION.TOAST );
            }, 1 );

            clearTimeout( timeout );
            timeout = setTimeout( self.doRemove.bind( this ), duration );

            setTimeout( function () {
                $( "body" ).one( "click", self.doRemove.bind( self ) );
            }, 10 );

            isShowing = true;
        };

        this.doRemove = function ( isForce ) {
            clearTimeout( timeout );

            if ( isForce ) {
                self.$toast.remove();
                return;
            }

            if ( self.$toast ) {
                var $toast = self.$toast;
                DomUtil.transition( $toast, "remove", null, Constant.TRANSITION.TOAST, function () {
                    $toast.remove();
                    $toast = null;
                    isShowing = false;
                } );
            }
        };
    }

    return ToastComponent;

} );