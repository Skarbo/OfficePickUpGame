"use strict";

define( [
    "dom",
    "knockout",
    "lib/global",
    "lib/asset",
    "component/dialog_component"
], function ( $, knockout, Global, Asset, DialogComponent ) {

    /**
     * @typedef {Object} ContextDialogComponent.Item
     * @property {String} title
     * @property {String} icon
     * @property {Function} onSelect
     */

    /**
     * @param {Object} options
     * @param {String} options.title
     * @param {Array<ContextDialogComponent.Item>} options.items
     * @constructor
     */
    function ContextDialogComponent( options ) {
        options = $.extend( {}, options );

        var self = this;

        var dialog = new DialogComponent( {
            name: 'context',
            template: 'context-dialog-component',
            onHidden: onHidden,
            onShown: onShown
        } );

        var viewModel = {
            title: options.title,
            items: options.items,
            onItemClick: onItemClick
        };

        // FUNCTIONS

        this.doBuild = function ( $wrapper ) {
            dialog.doBuild( $wrapper, viewModel );
        };

        this.doShow = function () {
            if ( !dialog.doShow() ) {
                return;
            }
        };

        this.doHide = function () {
            if ( !dialog.doHide() ) {
                return;
            }
        };

        function onHidden() {

        }

        function onShown() {

        }

        /**
         * @param {ContextDialogComponent.Item} item
         */
        function onItemClick( item ) {
            dialog.doHide();
            item.onSelect();
        }

    }

    return ContextDialogComponent;

} );