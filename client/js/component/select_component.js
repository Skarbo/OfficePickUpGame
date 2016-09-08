"use strict";

define( [
    "knockout",
    "lib/constant",
    "lib/asset",
    "util/dom_util",
    "lib/knockout_util"
], function ( knockout, Constant, Asset, DomUtil, KnockoutUtil ) {

    /**
     * @typedef SelectItem
     * @property {String} title
     * @property {String} value
     */

    /**
     * @param {Object} options
     * @param {Array} options.options
     * @param {String} [options.optionsText]
     * @param {String|observable} [options.value]
     * @param {String} options.optionsCaption
     * @param {String} [options.tip]
     * @param {String} [options.error]
     * @param {observable} [options.disabled]
     * @param {boolean} [options.hasTopPlaceholder]
     * @constructor
     */
    function SelectComponent( options ) {
        var self = this;

        this.options = KnockoutUtil.observableArray( options.options );
        this.optionsText = options.optionsText || null;
        this.value = KnockoutUtil.observable( options.value, "" );
        this.optionsCaption = options.optionsCaption;
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.disabled = KnockoutUtil.observable( options.disabled, false );
        this.hasTopPlaceholder = options.hasTopPlaceholder || false;

        this.warningIcon = Asset.svg.warning;

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        this.showTopPlaceholder = knockout.computed( function () {
            return self.value();
        } );

        function onUpdateSelected( value ) {
            self.error( "" );

            if ( !self.$select ) {
                return;
            }

            if ( !value ) {
                self.$select.removeClass( "selected" );
            }
            else {
                self.$select.addClass( "selected" );
            }
        }

        this.doBuild = function ( $selectWrapper ) {
            self.$selectWrapper = $selectWrapper;
            self.$select = self.$selectWrapper.find( "select" );
        };

        this.doShow = function ( value ) {
            self.value( self.options().indexOf( value ) > -1 ? value : null );
        };

        //

        self.value.subscribe( onUpdateSelected.bind( this ) );

    }

    return SelectComponent;

} );