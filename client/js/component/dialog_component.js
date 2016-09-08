"use strict";

define( [
    "knockout",
    "util/dom_util",
    "lib/constant",
    "handler/event_handler"
], function ( knockout, DomUtil, Constant, eventHandler ) {

    /**
     * @param {Object} options
     * @param {String} options.name
     * @param {String} options.template
     * @param {Function} [options.onShown]
     * @param {Function} [options.onHidden]
     * @constructor
     */
    function DialogComponent( options ) {
        options = options || {};

        var MAX_HEIGHT = 300;

        var self = this;
        var $scroll = null;
        var lazySelector = null;
        var handleScrollTimeout = null;

        // FUNCTIONS

        this.setScroll = function ( $scroll_, lazySelector_ ) {
            $scroll = $scroll_;
            lazySelector = lazySelector_;
        };

        this.doBuild = function ( $wrapper, viewModel ) {
            self.$wrapper = $wrapper;

            var params = {
                'data-bind': "template: { name: '" + options.template + "' }"
            };
            params[options.name] = '';

            self.$dialog = $( "<dialog />", params );

            knockout.applyBindings( viewModel, self.$dialog[0] );

            self.$wrapper.append( self.$dialog );

            self.$content = self.$dialog.find( "article[dialog]" );
        };

        this.doShow = function () {
            if ( self.isShown || self.isShowingOrHiding ) {
                return false;
            }

            self.isShowingOrHiding = true;

            self.$dialog.on( "click", onDialogClick );
            $( "body" ).on( "keyup", onDialogKey );

            if ( $scroll && lazySelector ) {
                $scroll.scrollTop( 0 );
                $scroll.on( "scroll", onScroll );
            }

            DomUtil.doAnimate( self.$dialog, Constant.TRANSITION.DIALOG, {
                classBeforeAnimate: "visible",
                'class': "show",
                callback: function () {
                    self.isShown = true;
                    self.isShowingOrHiding = false;

                    doSetDialogMaxHeight();
                    self.doRefresh();

                    if ( options.onShown ) {
                        options.onShown();
                    }
                },
                callbackOnSet: function () {

                }
            } );

            return true;
        };

        this.doHide = function ( isCancel ) {
            if ( !self.isShown || self.isShowingOrHiding ) {
                return false;
            }

            self.isShowingOrHiding = true;

            self.$dialog.off( "click", onDialogClick );
            $( "body" ).off( "keyup", onDialogKey );

            if ( $scroll && lazySelector ) {
                $scroll.off( "scroll", onScroll );
            }

            DomUtil.doAnimate( self.$dialog, Constant.TRANSITION.DIALOG, {
                'class': "show",
                classAfterAnimate: "visible",
                remove: true,
                callback: function () {
                    self.isShown = false;
                    self.isShowingOrHiding = false;

                    if ( options.onHidden ) {
                        options.onHidden( isCancel );
                    }
                }
            } );

            return true;
        };

        this.doRefresh = function () {
            doLazyLoadImages();
        };

        function onDialogClick( event ) {
            if ( $( event.target ).find( "article[dialog]" ).length > 0 ) {
                self.doHide( true );
            }
        }

        function onDialogKey( event ) {
            if ( event.which === Constant.KEY.ESC ) { // ESC key
                self.doHide( true );
            }
        }

        function onScroll() {
            clearTimeout( handleScrollTimeout );
            handleScrollTimeout = setTimeout( doLazyLoadImages, 100 );
        }

        function doSetDialogMaxHeight() {
            if ( !$scroll || !self.isShown || self.isShowingOrHiding ) {
                return;
            }
            $scroll.hide();

            var dialogHeight = self.$content.height(),
                windowHeight = window.innerHeight,
                resultsMaxHeight = windowHeight - dialogHeight - 60;

            $scroll.css( "max-height", Math.min( resultsMaxHeight, MAX_HEIGHT ) + "px" );
            $scroll.show();
        }

        function doLazyLoadImages() {
            if ( lazySelector ) {
                DomUtil.doLoadLazyImages( $scroll, $scroll.find( lazySelector ), true );
            }
        }

        //

        eventHandler.on( "resize", doSetDialogMaxHeight.bind( this ) );

        // VIEW MODEL

    }

    return DialogComponent;

} );