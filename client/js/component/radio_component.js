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
     * @param {String} [options.checked]
     * @param {String} [options.label]
     * @param {String} [options.tip]
     * @param {String} [options.error]
     * @param {observable} [options.disabled]
     * @param {Array} [options.icon] [checked icon, unchecked icon]
     * @constructor
     */
    function RadioComponent( options ) {
        var self = this;

        options = $.extend( {
            icon: [Asset.svg.checkbox_blank, Asset.svg.checkbox_checked]
        }, options );

        this.checked = KnockoutUtil.observable( options.checked, "" );
        this.label = KnockoutUtil.observable( options.label, "" );
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.disabled = KnockoutUtil.observable( options.disabled, false );
        this.hasFocus = knockout.observable( false );
        this.icon = knockout.computed( function () {
            return self.checked() ? options.icon[1] : options.icon[0];
        } );
        this.hidden = false;
        this.hasChanged = false;

        this.warningIcon = Asset.svg.warning;

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        function onCheckboxChanged() {
            self.error( "" );
            self.hasChanged = true;
        }

        this.onClickCheckbox = function () {
            if ( self.disabled() ) {
                return;
            }

            self.checked( !self.checked() );
            self.hasFocus( true );
        };

        this.doBuild = function ( $textareaWrapper ) {
            self.$wrapper = $textareaWrapper;
            self.$selectGame = self.$wrapper.find( "input" );
        };

        this.doShow = function ( value ) {
            self.checked( value || "" );
            self.hasChanged = !!value || false;
        };

        //

        self.checked.subscribe( onCheckboxChanged.bind( this ) );

    }

    return RadioComponent;

} );