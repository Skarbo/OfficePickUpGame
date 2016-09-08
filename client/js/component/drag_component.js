"use strict";

define( [
    "dom",
    "knockout",
    "dragdealer",
    "lib/knockout_util",
    "lib/asset",
    "lib/constant"
], function ( $, knockout, Dragdealer, KnockoutUtil, Asset, Constant ) {

    /**
     * @param {Object} options
     * @param {number} [options.steps]
     * @param {number} [options.step]
     * @param {Function} [options.onChanged]
     * @param {Function} [options.createValue] Function(step)
     * @constructor
     */
    function DragComponent( options ) {

        var self = this;
        options = $.extend( {
            steps: 10,
            step: 1,
            createValue: function ( step ) {
                return step;
            }
        }, options );
        var dragdealer;

        this.value = knockout.observable( null );
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.warningIcon = Asset.svg.warning;

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        this.doBuild = function ( $wrapper ) {
            self.$wrapper = $wrapper;

            dragdealer = new Dragdealer( $wrapper.find( "drag" )[0], {
                steps: options.steps,
                snap: true,
                slide: false,
                animationCallback: function () {
                    self.value( options.createValue( self.getStep() ) );
                },
                callback: function () {
                    if ( options.onChanged ) {
                        options.onChanged( self.getStep() );
                    }
                }
            } );
        };

        this.doShow = function () {
            if ( dragdealer ) {
                dragdealer.reflow();
            }
        };

        this.doScroll = function () {
            self.$wrapper[0].scrollIntoView( true );
        };

        this.doEnable = function ( isDisable ) {
            if ( dragdealer ) {
                if ( isDisable ) {
                    dragdealer.disable();
                }
                else {
                    dragdealer.enable();
                }
            }
        };

        this.getStep = function () {
            return dragdealer ? parseInt( dragdealer.getStep() ) : options.step;
        };

        this.setStep = function ( step ) {
            if ( dragdealer ) {
                dragdealer.setStep( step );
                self.value( options.createValue( step ) );
            }
        };

        this.onKeyPress = function ( vm, event ) {
            if ( event.which === Constant.KEY.RIGHT ) {
                self.setStep( Math.min( self.getStep() + 1, options.steps ) );
            }
            else if ( event.which === Constant.KEY.LEFT ) {
                self.setStep( Math.max( self.getStep() - 1, 1 ) );
            }
        };

        //

        self.value.subscribe( function () {
            self.error( "" );
        } );

    }

    return DragComponent;

} );