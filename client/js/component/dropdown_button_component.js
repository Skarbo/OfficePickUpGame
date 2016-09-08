"use strict";

define( [
    "knockout",
    "dom",
    "lib/knockout_util"
], function ( knockout, $, KnockoutUtil ) {

    /**
     * @param {Object} [options]
     * @param {String} [options.title]
     * @param {String} [options.defaultIcon]
     * @param {Array} [options.items]
     * @param {Function} [options.onSelected]
     * @constructor
     */
    function DropdownButtonComponent( options ) {
        options = options || {};

        var self = this;

        this.title = KnockoutUtil.observable( options.title, null );
        this.isActive = knockout.observable( false );
        this.selected = knockout.observable( null );
        this.items = KnockoutUtil.observableArray( options.items, [] );

        this.onDropdownClick = function () {
            self.isActive( !self.isActive() );

            if ( self.isActive() ) {
                setTimeout( function () {
                    $( "body" ).one( "click", function () {
                        self.isActive( false );
                    } )
                }, 10 );
            }
        };

        this.onItemClick = function ( item ) {
            self.doSetSelected( item );
        };

        this.addItem = function ( value, title, subTitle, icon, options ) {
            self.items.push( {
                value: value,
                title: title,
                subTitle: subTitle,
                icon: icon,
                options: options
            } );
        };

        this.doSetSelected = function ( item ) {
            var selectedItem = $.extend( {}, item );
            selectedItem.icon = (selectedItem.icon || "").trim() || options.defaultIcon;

            self.selected( selectedItem );

            if ( options.onSelected ) {
                options.onSelected( item );
            }
        };

    }

    return DropdownButtonComponent;

} );