"use strict";

define( [
    "knockout",
    "dom",
    "lib/constant",
    "lib/global",
    "util/dom_util",
    "component/spinner_component"
], function ( knockout, $, Constant, Global, DomUtil, SpinnerComponent ) {

    function WaitingComponent( $waitingWrapper ) {

        var self = this;
        self.$waitingWrapper = $waitingWrapper;
        self.message = knockout.observable();

        var isShowing = false,
            spinner = new SpinnerComponent( {type: SpinnerComponent.TYPE_2} );

        this.doShow = function ( message, options ) {
            options = options || {};

            if ( isShowing ) {
                return false;
            }

            Global.isViewDisabled( true );

            if ( options.spinner ) {
                spinner.type( options.spinner );
            }

            self.message( message );

            self.$waiting = $( "<waiting />", {
                'data-bind': "template: { name: 'waiting' }"
            } );

            knockout.applyBindings( {
                text: self.message,
                spinner: spinner
            }, self.$waiting[0] );

            self.$waitingWrapper.append( self.$waiting );

            spinner.visible( true );

            setTimeout( function () {
                DomUtil.transition( self.$waiting, "showing", "showed", Constant.TRANSITION.WAITING );
            }, 1 );

            isShowing = true;
        };

        this.doRemove = function () {
            if ( self.$waiting && isShowing ) {
                var $waiting = self.$waiting;

                DomUtil.transition( $waiting, "showed", null, Constant.TRANSITION.WAITING, function () {
                    $waiting.remove();
                    self.$waiting = null;
                    $waiting = null;
                    isShowing = false;
                    spinner.visible( false );
                    Global.isViewDisabled( false );
                } );
            }
        };
    }

    return WaitingComponent;

} );