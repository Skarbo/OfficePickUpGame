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
     * @param {String} [options.value]
     * @param {String} [options.placeholder]
     * @param {String} [options.tip]
     * @param {String} [options.error]
     * @param {observable} [options.disabled]
     * @param {boolean} [options.hasTopPlaceholder]
     * @param {Function} [options.onKeyPress]
     * @constructor
     */
    function TextComponent( options ) {
        var self = this;

        this.value = KnockoutUtil.observable( options.value, "" );
        this.placeholder = KnockoutUtil.observable( options.placeholder, "" );
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.disabled = KnockoutUtil.observable( options.disabled, false );
        this.hasTopPlaceholder = options.hasTopPlaceholder || false;
        this.onKeyPress = options.onKeyPress || null;

        this.warningIcon = Asset.svg.warning;

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        this.showTopPlaceholder = knockout.computed( function () {
            return self.value().length > 0;
        } );

        function onValueChanged() {
            self.error( "" );
        }

        this.doBuild = function ( $textareaWrapper ) {
            self.$wrapper = $textareaWrapper;
        };

        this.doShow = function ( value ) {
            self.value( value || "" );
        };

        this.doScroll = function () {
            self.$wrapper[0].scrollIntoView( true );
        };

        //

        self.value.subscribe( onValueChanged.bind( this ) );

    }

    return TextComponent;

} );