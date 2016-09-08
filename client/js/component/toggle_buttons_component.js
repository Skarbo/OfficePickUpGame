"use strict";

define( [
    "knockout",
    "lib/knockout_util"
], function ( knockout, KnockoutUtil ) {

    /**
     * @param {Object} [options]
     * @param {Function} [options.onSelected]
     * @param {boolean|observable} [options.isDisabled]
     * @constructor
     */
    function ToggleButtonsComponent( options ) {
        options = options || {};

        var self = this;

        this.isDisabled = KnockoutUtil.observable( options.isDisabled || false );
        this.items = knockout.observableArray();
        this.selected = knockout.observable( null );

        this.isSelected = function ( item ) {
            return self.selected() === item.value;
        };

        this.addItem = function ( value, title, text, icon ) {
            self.items.push( {
                value: value,
                title: title,
                text: text,
                icon: icon
            } );
        };

        this.doSetSelected = function ( item ) {
            self.selected( item.value );
        };

        this.onItemClick = function ( item ) {
            self.doSetSelected( item );

            if ( options.onSelected ) {
                options.onSelected( item );
            }
        };

    }

    return ToggleButtonsComponent;

} );