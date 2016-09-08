"use strict";

define( [
    "dom",
    "knockout",
    "lib/asset",
    "lib/global",
    "util/dom_util",
    "helper/game_helper"
], function ( $, knockout, Asset, Global, DomUtil, GameHelper ) {

    function UsersPage() {

        // VARIABLES

        var self = this;

        var isViewDisabled = knockout.computed( function () {
            return Global.isViewDisabled();
        } );
        var users = knockout.observableArray( [] );

        var viewModel = {
            users: users
        };

        var handleScrollTimeout;

        // ... COMPONENTS

        var userPageButton = {
            title: "View User page",
            onClick: function ( userVm ) {

            },
            isDisabled: isViewDisabled
        };

        // FUNCTIONS

        function createUserPlacing( userPlacing ) {
            var userPlacing = $.extend( {}, userPlacing );

            userPlacing.game = GameHelper.getGameFromId( userPlacing.pugGame, Global.games );
            userPlacing.standingPercentText = Math.round( userPlacing.standingPercent * 100 );
            userPlacing.rateText = userPlacing.rates[0] ? userPlacing.rates[0].rate.mu.toFixed( 2 ) : null; // TODO Fix for different rating types

            return userPlacing;
        }

        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'users': '',
                'html': Asset.TEMPLATE.USERS_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            self.$scroller = $( "wrapper[pages]" );
            self.$users = self.$page.find( "users" );
        };

        function doLazyLoadImages() {
            DomUtil.doLoadLazyImages( self.$scroller, self.$users.find( "user" ) );
        }

        this.doRefreshPage = function () {
            doLazyLoadImages();
        };

        this.onShowPage = function () {
            Global.toolbar.title( "Users" );
            Global.toolbar.icon( Asset.FONT_ICON.PEOPLE );

            users( Global.users() );

            self.$scroller.on( "scroll", onScroll );
        };

        this.onShownPage = function () {
            doLazyLoadImages();
        };

        this.onHidePage = function () {
            self.$scroller.off( "scroll", onScroll );
        };

        function onScroll() {
            clearTimeout( handleScrollTimeout );
            handleScrollTimeout = setTimeout( doLazyLoadImages, 100 );
        }

        // VIEWMODEL

        viewModel.userPageButton = userPageButton;
        viewModel.createUserPlacing = createUserPlacing;

    }

    return UsersPage;

} );