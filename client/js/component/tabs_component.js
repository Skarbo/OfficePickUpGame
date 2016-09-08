"use strict";

/**
 * @typedef {Object} TabsComponent.Tab
 * @property {String} id
 * @property {String} title
 * @property {String} icon
 */

define( [
    "knockout"
], function ( knockout ) {

    /**
     * @param {Object} options
     * @param {Array<TabsComponent.Tab>} options.tabs
     * @param {String} options.selectedTab
     * @constructor
     */
    function TabsComponent( options ) {

        var self = this;

        this.selectedTab = knockout.observable( options.selectedTab || null );
        this.tabs = options.tabs;

        this.doBuild = function ( $tabsWrapper, $contentWrapper ) {
            self.$tabsWrapper = $tabsWrapper;
            self.$contentWrapper = $contentWrapper;
        };

        this.doShow = function ( selectedTabId ) {
            self.doSelectTab( selectedTabId || self.selectedTab() );
        };

        this.doSelectTab = function ( tabId ) {
            self.selectedTab( tabId );

            self.$contentWrapper.find( "[data-tab]" ).each( function ( i, element ) {
                if ( element.getAttribute( "data-tab" ) === tabId ) {
                    element.classList.add( "active" );
                }
                else {
                    element.classList.remove( "active" );
                }
            } );
        };

        /**
         * @param {TabsComponent.Tab} tab
         */
        this.onTabClick = function ( tab ) {
            self.doSelectTab( tab.id );
        };

        /**
         * @param {TabsComponent.Tab} tab
         * @returns {boolean}
         */
        this.isTabActive = function ( tab ) {
            return self.selectedTab() === tab.id;
        };

    }

    return TabsComponent;

} );