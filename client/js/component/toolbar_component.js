"use strict";

/**
 * @typedef {Object} ToolbarButton
 * @property {String} title
 * @property {String} [label]
 * @property {*} icon
 * @property {Function} onClick
 * @property {observable} [hidden]
 */

define( [
    "dom",
    "knockout",
    "lib/asset",
    "lib/knockout_util",
    "lib/global",
    "lib/constant",
    "util/dom_util"
], function ( $, knockout, Asset, KnockoutUtil, Global, Constant, DomUtil ) {

    /**
     * @param options
     * @constructor
     * @class ToolbarComponent
     */
    function ToolbarComponent( options ) {
        options = {};

        var self = this;

        var backCallback = knockout.observable( null );
        var searchCallback = knockout.observable( null );
        var contextDoneCallback = null;

        var searchInputHasFocus = knockout.observable( false );

        this.title = knockout.observable( null );
        this.icon = knockout.observable( null );
        this.subtitle = knockout.observable( null );
        this.buttons = knockout.observableArray( [] );
        this.context = {
            onDoneClick: onDoneContext,
            title: knockout.observable( "" ),
            disabled: Global.isViewDisabled
        };

        /**
         * More
         */
        this.more = $.extend( {},
            createButton( {
                title: "More",
                icon: Asset.FONT_ICON.MORE_VERT,
                onClick: function () {
                    self.more.isMoreVisible( !self.more.isMoreVisible() );

                    if ( self.more.isMoreVisible() ) {
                        setTimeout( function () {
                            $( "body" ).one( "click", function () {
                                self.more.isMoreVisible( false );
                            } );
                        }, 10 );
                    }
                }
            } ),
            {
                isMoreVisible: knockout.observable( false ),
                items: knockout.observableArray()
            } );
        this.more.hidden = knockout.computed( function () {
            return self.more.items().length === 0;
        } );

        /**
         * Back
         */
        this.back = createButton( {
            title: "Back",
            icon: Asset.FONT_ICON.CHEVRON_LEFT,
            onClick: function () {
                if ( backCallback() ) {
                    backCallback()();
                }
            },
            hidden: knockout.computed( function () {
                return !backCallback();
            } )
        } );

        /**
         * Drawer
         */
        this.drawer = createButton( {
            title: "Drawer",
            icon: Asset.FONT_ICON.MENU,
            onClick: function () {
                Global.drawerOpen( !Global.drawerOpen() );
            }
        } );

        /**
         * Search
         */
        this.search = {
            input: {
                value: knockout.observable( "" ),
                hasFocus: searchInputHasFocus,
                onClearSearchClick: doClearSearch.bind( this ),
                clearIcon: Asset.svg.cross,
                onKeyUp: onSearchKeyUp
            },
            button: createButton( {
                title: "Search",
                icon: Asset.svg.search,
                onClick: function () {
                    searchInputHasFocus( true );
                }
            } ),
            hidden: knockout.computed( function () {
                return !searchCallback();
            } )
        };

        // FUNCTIONS

        this.isSearching = knockout.computed( function () {
            return searchInputHasFocus() || self.search.input.value().length > 0;
        } );

        this.hasBack = knockout.computed( function () {
            return backCallback();
        } );

        /**
         * @param {ToolbarButton} options
         * @return {*} Button
         */
        this.addButton = function ( options ) {
            var button = createButton( options );
            this.buttons.push( button );
            return button;
        };

        /**
         * @param {string} label
         * @param {string} icon
         * @param {Function} onClick
         * @param {boolean|observable} [hidden]
         * @return {Object} Item
         */
        this.addMoreItem = function ( label, icon, onClick, hidden, disabled ) {
            var moreItem = {
                label: label,
                icon: icon,
                onClick: onClick,
                hidden: KnockoutUtil.observable( hidden, false ),
                disabled: KnockoutUtil.observable( disabled, false )
            };
            this.more.items.push( moreItem );
            return moreItem;
        };

        this.setBack = function ( backCallback_ ) {
            backCallback( backCallback_ || null );
        };

        this.setContextDoneCallback = function ( contextDoneCallback_ ) {
            contextDoneCallback = contextDoneCallback_;
        };

        this.setSearch = function ( searchCallback_ ) {
            searchCallback( searchCallback_ || null );
        };

        this.setSearchValue = function ( searchValue ) {
            self.search.input.value( searchValue );
        };

        /**
         * @param {ToolbarButton} options
         * @return {*}
         */
        function createButton( options ) {
            var button = {
                title: options.title,
                icon: options.icon,
                label: options.label || null,
                onClick: function () {
                    options.onClick();
                    button.doActivate();
                },
                hidden: KnockoutUtil.observable( options.hidden, false ),
                activate: knockout.observable( false ),
                doActivate: function () {
                    button.activate( true );
                    setTimeout( function () {
                        button.activate( false );
                    }, 150 );
                },
                disabled: Global.isViewDisabled
            };
            return button;
        }

        function onSearchKeyUp( vm, event ) {
            if ( event.which === Constant.KEY.ESC ) {
                self.search.input.value( "" );
                searchInputHasFocus( false );
            }
        }

        function onDoneContext() {
            self.doHideContext();

            if ( contextDoneCallback ) {
                contextDoneCallback();
            }
        }

        this.doShowToolbar = function () {

        };

        this.doHideToolbar = function () {
            self.doHideContext();

            self.buttons( [] );
            self.more.items( [] );
            self.title( "" );
            self.icon( null );
            self.subtitle( "" );
            backCallback( null );
            searchCallback( null );
            self.search.input.value( "" );
            contextDoneCallback = null;
            self.context.title( "" );
        };

        function doClearSearch() {
            self.search.input.value( "" );
            searchCallback()( "clear", "" );
        }

        this.doSetSearchFocus = function () {
            self.search.input.hasFocus( true );
        };

        this.doBuild = function ( $wrapper ) {
            self.$wrapper = $wrapper;
            self.$context = $wrapper.find( "wrapper[context]" );
        };

        this.doShowContext = function ( title ) {
            self.context.title( title );

            DomUtil.doAnimate( self.$context, Constant.TRANSITION.TOOLBAR_CONTEXT, {
                classBeforeAnimate: "visible",
                'class': "show"
            } );
        };

        this.doHideContext = function () {
            DomUtil.doAnimate( self.$context, Constant.TRANSITION.TOOLBAR_CONTEXT, {
                classBeforeAnimate: "visible",
                'class': "show",
                remove: true
            } );
        };

        this.doResetMoreItems = function () {
            self.more.items( [] );
        };

        //

        self.search.input.value.subscribe( function ( searchValue ) {
            if ( searchInputHasFocus() && searchCallback() ) {
                searchCallback()( "search", searchValue );
            }
        } );

    }

    return ToolbarComponent;

} );