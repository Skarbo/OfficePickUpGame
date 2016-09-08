"use strict";

define( [
    "knockout",
    "lib/asset",
    "lib/global",
    "lib/knockout_util"
], function ( knockout, Asset, Global, KnockoutUtil ) {

    /**
     * @constructor
     */
    function DrawerComponent() {

        var self = this;

        self.logo = Asset.svg.kpug;
        self.header = "Pick-Up Game";
        self.menuItems = knockout.observableArray( [] );

        /**
         * @param {DrawerComponent.MenuItem} menuItem
         * @returns {*} MenuItem
         */
        function createMenuItem( menuItem ) {
            return {
                name: menuItem.name,
                title: menuItem.title,
                icon: menuItem.icon,
                onClick: function () {
                    if ( Global.isViewDisabled() ) {
                        return;
                    }

                    menuItem.onClick();
                    Global.drawerOpen( false );
                },
                selected: menuItem.isSelected,
                disabled: Global.isViewDisabled,
                splitter: menuItem.isSplitter || false,
                visible: KnockoutUtil.observable( menuItem.isVisible, true )
            }
        }

        /**
         * @param {DrawerComponent.MenuItem} menuItem
         */
        this.addMenuItem = function ( menuItem ) {
            self.menuItems.push( createMenuItem( menuItem ) )
        };

        this.doBuild = function ( $drawer ) {
            self.$drawer = $drawer;
        };

        this.doShow = function () {
            $( "drawer-shadow" ).click( function () {
                Global.drawerOpen( false );
            } );
        };

    }

    /**
     * @typedef {Object} DrawerComponent.MenuItem
     * @property {string} name
     * @property {string} title
     * @property {string} icon
     * @property {Function} onClick
     * @property {boolean|observable} [isSelected]
     * @property {boolean|observable} isVisible
     * @property {boolean} [isSplitter]
     */

    return DrawerComponent;

} );