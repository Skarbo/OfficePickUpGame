"use strict";

define( [
    "knockout",
    "lib/constant",
    "util/dom_util",
    "lib/asset",
    "lib/knockout_util"
], function ( knockout, Constant, DomUtil, Asset, KnockoutUtil ) {

    /**
     * @param {Object} [options]
     * @param {observableArray|Array} options.options Array(value => valueString)
     * @param {String} [options.value]
     * @param {String|observable} [options.tip]
     * @param {String|observable} [options.error]
     * @param {observable} [options.disabled]
     * @constructor
     */
    function ToggleComponent( options ) {
        var self = this;

        this.options = KnockoutUtil.observable( options.options, {} );
        this.value = KnockoutUtil.observable( options.value, null );
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.disabled = knockout.computed( function () {
            return KnockoutUtil.toValue( options.disabled ) || Object.keys( self.options() ).length < 2;
        } );

        this.icon = Asset.svg.arrow_down;
        this.warningIcon = Asset.svg.warning;

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        this.valueLabel = knockout.computed( function () {
            return self.options()[self.value()] || "";
        } );

        function onValueOrOptionsChanged() {
            var values = Object.keys( self.options() );

            if ( values.indexOf( "" + self.value() ) === -1 ) {
                self.value( values[0] );
            }

            self.error( "" );
        }

        this.doBuild = function ( $toggleWrapper ) {
            self.$wrapper = $toggleWrapper;
        };

        this.doShow = function ( value, options ) {
            if ( options !== undefined ) {
                self.options( options );
            }
            self.value( value );
        };

        this.doScroll = function () {
            self.$wrapper[0].scrollIntoView( true );
        };

        this.onClick = function () {
            var values = Object.keys( self.options() ),
                indexOf = values.indexOf( self.value() ),
                nextValue = values[(indexOf + 1) % values.length];
            self.value( nextValue );
        };

        //

        self.value.subscribe( onValueOrOptionsChanged.bind( this ) );
        self.options.subscribe( onValueOrOptionsChanged.bind( this ) );

    }

    return ToggleComponent;

} );