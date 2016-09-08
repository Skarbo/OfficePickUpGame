"use strict";

define( [
    "knockout",
    "lib/global",
    "lib/constant",
    //"lib/google_analytics",
    "util/util",
    "util/dom_util"
], function ( knockout, Global, Constant, /*googleAnalytics, */Util, DomUtil ) {

    var PAGE_DIRECTION_CLASS_RIGHT = "right",
        PAGE_DIRECTION_CLASS_LEFT = "left";

    /**
     * @constructor
     */
    function PageHandler() {
        var self = this;
        var defaultPage = "pugs",
            loginPage = "login";
        var pages = {};
        this.page = knockout.observable( null );
        var pageToShow,
            isReady = false;
        var ignoreHashChange = false;
        var showPageQueue = [],
            isShowingPage = false;
        var showPageId = null;

        function calculateTransitionDirection( newPage, oldPage, isMovingOut ) {
            if ( isMovingOut ) {
                return PAGE_DIRECTION_CLASS_RIGHT;
            }
            else {
                return PAGE_DIRECTION_CLASS_RIGHT;
            }
        }

        this.addPage = function ( name, page ) {
            pages[name] = page;
        };

        function addPageToQueue( name, page, args ) {
            showPageQueue.push( {
                name: name,
                page: page,
                arguments: args
            } );
        }

        function onShownPage( page, name, args ) {
            page.isShown = true;
            if ( page.onShownPage ) {
                page.onShownPage.apply( self, args );
            }
            isShowingPage = false;

            var location = window.location.protocol +
                '//' + window.location.hostname +
                window.location.pathname +
                window.location.search +
                window.location.hash;

            //googleAnalytics.view( {
            //    'page': window.location.hash,
            //    'title': name,
            //    'location': location
            //} );

            doShowNextPage();
        }

        function onHiddenPage( page ) {
            page.isShown = false;
            if ( page.onHiddenPage ) {
                page.onHiddenPage();
            }
        }

        this.doShowPage = function ( name, args ) {
            if ( !Global.userId ) {
                args = null;
                name = loginPage;
            }
            else if ( !pages[name] ) {
                args = name ? [name].concat( args ) : args;
                name = defaultPage;
            }

            var page = pages[name];
            showPageId = Util.generateRandomString();

            if ( !page ) {
                console.warn( "Could not show page; page does not exist", name, args );
                return;
            }

            addPageToQueue( name, page, args );

            doShowNextPage();
        };

        this.doRedirectToPage = function ( noHistory, name, args ) {
            var hasNoHistoryArg = typeof noHistory === "boolean",
                argumentIndex = hasNoHistoryArg ? 1 : 0,
                hash;

            var noHistory_ = hasNoHistoryArg ? noHistory : false;
            name = arguments[argumentIndex] || false;
            args = Array.prototype.slice.call( arguments, argumentIndex + 1 );
            args = args.length === 0 ? null : args;

            if ( name === defaultPage ) {
                hash = args ? "/" + args.join( "/" ) : "";
            }
            else {
                hash = name + (args ? "/" + args.join( "/" ) : "");
            }

            if ( noHistory_ ) {
                history.replaceState( undefined, undefined, "#" + hash );
            }
            else {
                location.hash = hash;
            }
        };

        this.doRefreshPage = function () {
            if ( self.page() && self.page().page.doRefreshPage ) {
                self.page().page.doRefreshPage();
            }
        };

        this.doShow = function () {
            isReady = true;
            self.handleHashChange();
            doShowNextPage();
        };

        this.doBuildPages = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;
            for ( var key in pages ) {
                if ( pages[key].doBuild ) {
                    pages[key].doBuild( self.$pagesWrapper );
                }
                else {
                    throw Error( "Page '" + key + "' does not have 'doBuild' function" );
                }
            }
        };

        this.doResetHashArgument = function () {
            ignoreHashChange = true;

            if ( self.page().name === defaultPage ) {
                location.hash = "";
            }
            else {
                location.hash = self.page().name;
            }
        };

        function doShowNextPage() {
            if ( !isReady || isShowingPage ) {
                return;
            }

            var pageAndArguments = showPageQueue.splice( 0, 1 )[0] || null;

            if ( !pageAndArguments ) {
                return;
            }

            var name = pageAndArguments.name,
                page = pageAndArguments.page,
                args = pageAndArguments.arguments;

            // page is already shown, apply argument
            if ( self.page() && self.page().name === name ) {
                if ( self.page().page.doApplyArgument ) {
                    self.page().page.doApplyArgument.apply( self, args );
                }
                return;
            }

            if ( self.page() ) {
                self.page().page.isShow = false;
                doHidePage( self.page().page );
            }

            Global.toolbar.doHideToolbar();
            page.isShow = true;
            var showPagePromise;
            if ( page.onShowPage ) {
                showPagePromise = page.onShowPage.apply( self, args );
            }

            var startShowingPageFunc = function () {
                page.$page.removeClass( PAGE_DIRECTION_CLASS_LEFT + " " + PAGE_DIRECTION_CLASS_RIGHT );
                page.$page.addClass( calculateTransitionDirection( null, null, false ) );
                DomUtil.doAnimate( page.$page, Constant.TRANSITION.PAGE, {
                    classBeforeAnimate: "visible",
                    'class': "show",
                    callback: onShownPage.bind( self, page, name, args )
                } );

                if ( self.$pagesWrapper && self.$pagesWrapper[0] ) {
                    self.$pagesWrapper[0].scrollIntoView( true );
                }
            };

            self.page( {
                name: name,
                page: page,
                arguments: args
            } );

            isShowingPage = true;

            if ( showPagePromise ) {
                var showPageIdTemp = showPageId;
                showPagePromise.done( function () {
                    if ( showPageIdTemp === showPageId ) {
                        startShowingPageFunc();
                    }
                } );
            }
            else {
                startShowingPageFunc();
            }
        }

        function doHidePage( page ) {
            if ( page.onHidePage ) {
                page.onHidePage();
            }

            page.$page.removeClass( PAGE_DIRECTION_CLASS_LEFT + " " + PAGE_DIRECTION_CLASS_RIGHT );
            page.$page.addClass( calculateTransitionDirection( null, null, true ) );
            DomUtil.doAnimate( page.$page, Constant.TRANSITION.PAGE, {
                'class': "visible",
                classAfterAnimate: "visible",
                remove: true,
                callback: onHiddenPage.bind( self, page )
            } );
        }

        this.handleHashChange = function () {
            if ( ignoreHashChange ) {
                ignoreHashChange = false;
                return;
            }
            var hash = location.hash.substr( 1 ).split( "/" ),
                page = hash[0] || null,
                args = hash[1] ? hash.slice( 1 ) || null : null;

            self.doShowPage( page, args );
        }

    }

    return PageHandler;

} );