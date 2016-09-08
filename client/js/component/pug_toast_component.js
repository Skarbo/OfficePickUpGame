"use strict";

define( [
    "dom",
    "knockout",
    "lib/asset",
    "lib/constant",
    "lib/global",
    "util/dom_util"
], function ( $, knockout, Asset, Constant, Global, DomUtil ) {

    /**
     * @param {jQuery} $toastWrapper
     * @constructor
     */
    function PugToastComponent( $toastWrapper ) {
        var self = this;
        self.$toastWrapper = $toastWrapper;
        var timeout;
        this.isShowing = false;

        /**
         * @param {UserVm} userVm
         * @param {PugVm} pugVm
         * @param {String} title
         * @param {Object} [options]
         * @param {String} [options.type]
         * @param {String} [options.subtitles]
         */
        this.doShow = function ( userVm, pugVm, title, options ) {
            if ( self.isShowing ) {
                self.doRemove( true );
            }

            self.options = options || {};

            self.$toast = $( "<toast />", {
                'pug-toast': '',
                'html': Asset.TEMPLATE.PUG_TOAST
            } );

            var viewModel = {
                user: userVm,
                pug: pugVm,
                title: title,
                subtitles: options.subtitles || null
            };

            knockout.applyBindings( viewModel, self.$toast[0] );

            self.$toastWrapper.append( self.$toast );

            setTimeout( function () {
                DomUtil.transition( self.$toast, "show", "show", Constant.TRANSITION.TOAST );
            }, 1 );

            clearTimeout( timeout );
            timeout = setTimeout( self.doRemove.bind( this ), Constant.TOAST.PUG );

            setTimeout( function () {
                $( "body" ).one( "click", onBodyClick.bind( self, viewModel, options ) );
            }, 10 );

            self.isShowing = true;
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
                    self.isShowing = false;
                } );
            }
        };

        /**
         * @param {Object} vm
         * @param {Object} options
         * @param {Event} event
         */
        function onBodyClick( vm, options, event ) {
            if ( self.$toast[0].contains( event.target ) || self.$toast[0] === event.target ) {
                var redirect = "pug/" + vm.pug.id;

                if ( options.type === "comment" ) {
                    redirect += "/comments";
                }

                Global.pageHandler.doRedirectToPage( redirect );
            }

            self.doRemove();
        }
    }

    return PugToastComponent;

} );