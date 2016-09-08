"use strict";

define( [
    "knockout",
    "moment",
    "lib/global",
    "lib/asset",
    "util/util",
    "util/dom_util",
    "helper/player_helper",
    "helper/pug_helper",
    "helper/user_helper",
    "helper/join_pug_helper",
    "handler/event_handler",
    "handler/pug_handler"
], function ( knockout, moment, Global, Asset, Util, DomUtil, PlayerHelper, PugHelper, UserHelper, JoinPugHelper, eventHandler, PugHandler ) {

    function PugsPage() {

        // VARIABLES

        var TAG = "[PugsPage]";

        var self = this;

        // timeout/intervals
        var handleScrollTimeout,
            updateTimeInterval,
            domRenderTimeout;

        // observables

        /**
         * List of Pugs to be shown
         *
         * @type {observable}
         */
        var pugs = knockout.observableArray( [] );
        /**
         * Is view disabled observable
         *
         * @type {computed}
         */
        var isViewDisabled = knockout.computed( function () {
            return Global.isViewDisabled();
        } );
        /**
         * No Pugs to be shown observable
         *
         * @type {computed}
         */
        var hasNoPugs = knockout.computed( function () {
            return pugs().length === 0;
        } );
        /**
         * Selected Pug observable
         *
         * @type {observable}
         */
        var selectedPugId = knockout.observable( null );

        // handlers

        /**
         * @type {PugHandler}
         */
        var pugHandler = new PugHandler();

        // subscribers
        var pugsSubscriber;

        // view model
        var viewModel = {};
        viewModel.pugs = pugs;
        viewModel.pugsPlayingText = "Playing";
        viewModel.pugsWaitingText = "Waiting";
        viewModel.noPugsText = "No available pick-up games";
        viewModel.newPugText = "New Pick-Up Game";
        viewModel.noPugs = hasNoPugs;
        viewModel.freePlayerText = "Join PUG";
        viewModel.freePlayerTitle = "Free";
        viewModel.inviteIcon = Asset.svg.verified;
        viewModel.isViewDisabled = isViewDisabled;

        // ... COMPONENTS

        /**
         * @type {JoinPugHelper}
         */
        var joinPugHelper = new JoinPugHelper( {
            isViewDisabled: isViewDisabled,
            pugHandler: pugHandler
        } );

        /**
         * Pug page button view model
         *
         * @type {Object}
         */
        var pugPageButton = {
            title: "View Pick-Up Game page",
            icon: Asset.svg.arrow_next,
            onClick: onPugPageClick.bind( self ),
            isDisabled: Global.isViewDisabled
        };

        // FUNCTIONS

        /**
         * @param {PugVm} pugVm
         * @returns {boolean} True if given Pug is selected
         */
        function isPugSelected( pugVm ) {
            return pugVm && selectedPugId() == pugVm.id;
        }

        /**
         * @param {PugVm} pugVm
         * @param {number} index
         * @returns {Object|null}
         */
        function getStateHeader( pugVm, index ) {
            var pugVmPrevious = pugs()[index - 1],
                obj = {
                    title: pugVm.isStatePlaying() ? "Playing Pick-Up Games" : "Available Pick-Up Games",
                    icon: pugVm.isStatePlaying() ? Asset.FONT_ICON.CHECK : Asset.FONT_ICON.OPUG_CONTROLLER
                };

            if (
                (!pugVmPrevious && index > 0) ||
                (!pugVmPrevious && index === 0 && pugVm.isStatePlaying()) ||
                (pugVmPrevious && pugVm.isStateWaiting() && pugVmPrevious.isStatePlaying())
            ) {
                return obj;
            }

            return null;
        }

        /**
         * @deprecated
         * @param pugVm
         * @returns {null}
         */
        function getTimeDatetime( pugVm ) {
            //var time = pugVm.time();
            //return time ? new Date( time ).toString() : null;
            return null;
        }

        /**
         * Get Pug state status
         * @param {PugVm} pugVm
         * @returns {*}
         */
        function getStateStatus( pugVm ) {
            if ( pugVm.isStateWaiting() ) {
                return "Waiting for players";
            }
            else if ( pugVm.isStatePlaying() ) {
                return "Game is playing";
            }
            return "";
        }

        /**
         * Get Pug action button viewmodel
         *
         * @param {PugVm} pugVm
         * @returns {{onClick: (function(this:PugsPage)), icon: null, title: null, disabled: *}}
         */
        function getPugActionButton( pugVm ) {
            var actionButton = {
                onClick: onPugActionClick.bind( self, pugVm ),
                icon: null,
                title: null,
                disabled: isViewDisabled
            };

            var isUserInPug = PlayerHelper.isUserInPug( Global.userId, pugVm );
            if ( pugVm.isStateWaiting() ) {
                if ( isUserInPug ) {
                    actionButton.icon = Asset.svg.pug_action_remove;
                    actionButton.title = "Remove from PUG";
                }
                else {
                    actionButton.icon = Asset.svg.pug_action_join;
                    actionButton.title = "Join PUG";
                }
            }
            else if ( pugVm.isStatePlaying() ) {
                actionButton.icon = Asset.svg.pug_action_finish;
                actionButton.title = "Finish PUG";
            }

            return actionButton;
        }

        /**
         * @deprecated
         * @param number
         * @returns {string}
         */
        function getFreeSlotText( number ) {
            return "Click to join Pick-Up Game";
        }

        /**
         * Get players from Pug
         * @param {PugVm} pugVm
         * @returns {{players: Array, gameMode: Number, teamMode: Number, teams: Number, state: Number}}
         */
        function getPugPlayers( pugVm ) {
            return {
                players: PugHelper.getPugPlayersWithSlots( pugVm ),
                gameMode: pugVm.gameMode,
                teamMode: pugVm.teamMode,
                teams: pugVm.teams,
                state: pugVm.state
            };
        }

        /**
         * @param {PugVm} pugVm
         * @returns {String}
         */
        function getTeamsText( pugVm ) {
            return PugHelper.getTeamsText( pugVm.teams );
        }

        /**
         * @param {PugVm} pugVm
         * @returns {String}
         */
        function getTeamModeText( pugVm ) {
            return PugHelper.getTeamModeText( pugVm.teamMode );
        }

        /**
         * Build page
         *
         * @param {jQuery} $pagesWrapper
         */
        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'pugs': '',
                'html': Asset.TEMPLATE.PUGS_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            self.$scroller = $( "wrapper[pages]" );
            self.$pugs = self.$page.find( "pugs" );

            joinPugHelper.doBuild();
        };

        /**
         * Load lazy images on page
         */
        function doLazyLoadImages() {
            DomUtil.doLoadLazyImages( self.$scroller, self.$pugs.find( "pug" ) );
        }

        /**
         * Load lazy images after timeout
         */
        function doLazyLoadImagesAfterTimeout() {
            clearTimeout( handleScrollTimeout );
            handleScrollTimeout = setTimeout( doLazyLoadImages, 100 );
        }

        /**
         * Refresh page; load lazy images and update times
         */
        this.doRefreshPage = function () {
            doLazyLoadImages();
            doUpdateTime();
        };

        /**
         * Update all Pugs
         */
        function doUpdatePugs() {
            if ( !self.isShow ) {
                return;
            }

            console.trace( TAG, "doUpdatePugs" );
            var userId = Global.userId,
                userVm = UserHelper.getUserFromId( userId, Global.users() );

            /**
             * Sort Pugs function
             *
             * @param {PugVm} pugVmLeft
             * @param {PugVm} pugVmRight
             * @returns {number}
             */
            var sortPugsFunc = function ( pugVmLeft, pugVmRight ) {
                var sortUpdated = pugVmRight.lastUpdated() - pugVmLeft.lastUpdated();
                if ( pugVmLeft.state() === pugVmRight.state() ) {
                    return sortUpdated;
                }
                return pugVmRight.state() - pugVmLeft.state();
            };

            /**
             * @param {PugVm} pugVm
             * @returns {boolean}
             */
            var filterPugsFunc = function ( pugVm ) {
                return !pugVm.isCanceled() && ((pugVm.isStateWaiting() && PugHelper.canUserPlayPug( userId, userVm.groups(), pugVm )) || (pugVm.isStatePlaying() && (PlayerHelper.isUserInPug( userId, pugVm ) || PugHelper.isUserPugCreator( userId, pugVm ))));
            };

            // populate Pugs to be visible
            pugs( Global.pugs().filter( filterPugsFunc ).sort( sortPugsFunc ) );

            // refresh page
            self.doRefreshPage();
        }

        /**
         * Update time attributes on page
         */
        function doUpdateTime() {
            var $times = self.$pugs.find( "time[update]" ),
                now = new Date();
            $times.each( function ( i, timeElement ) {
                var $time = $( timeElement ),
                    datetime = $time.attr( "datetime" ),
                    date = new Date( datetime ),
                    isFuture = now < date;
                $time.text( datetime && isFuture ? moment( date ).calendar() : "Now" );
            } );
        }

        /**
         * Start update time interval
         */
        function doStartUpdateTimeInterval() {
            clearInterval( updateTimeInterval );
            updateTimeInterval = setInterval( doUpdateTime, 1000 * 60 );
        }

        /**
         * Apply argument to page
         *
         * @param {Number} [pugId]
         * @param {String} [action]
         */
        this.doApplyArgument = function ( pugId, action ) {
            if ( pugId ) {
                if ( Global.userId && action === "join" ) {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, PugHelper.getPugFromId( pugId, Global.pugs() ) );
                }

                doFocusPug( pugId );
                Global.pageHandler.doRedirectToPage( true, "pugs" );
            }
        };

        /**
         * Set focus on Pug
         *
         * @param {Number} pugId
         */
        function doFocusPug( pugId ) {
            selectedPugId( pugId );

            var $pugSelected = self.$pugs.find( "pug.selected" );

            if ( $pugSelected.length === 0 ) {
                return;
            }

            var elOffset = $pugSelected.offset().top;
            var elHeight = $pugSelected.height();
            var windowHeight = self.$scroller.height();
            var offset;

            if ( elHeight < windowHeight ) {
                offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
            }
            else {
                offset = elOffset;
            }

            self.$scroller.animate( {
                scrollTop: offset
            }, 250 );
        }

        /**
         * Bind/unbind scroller scroll to handler
         */
        function doBindScroller( isUnbind ) {
            if ( isUnbind ) {
                self.$scroller.off( "scroll", onScroll );
            }
            else {
                self.$scroller.on( "scroll", onScroll );
            }
        }

        /**
         * Update toolbar
         */
        function doUpdateToolbar() {
            Global.toolbar.title( "Pick-Up Games" );
            Global.toolbar.icon( Asset.FONT_ICON.REORDER );
        }

        /**
         * Subscribe/unsubscribe to global Pugs observer
         */
        function doSubscribeToGlobalPugs( isUnsubscribe ) {
            if ( isUnsubscribe && pugsSubscriber ) {
                pugsSubscriber.dispose();
            }
            else if ( !isUnsubscribe ) {
                pugsSubscriber = Global.pugs.subscribe( doUpdatePugs, self );
            }
        }

        /**
         * Bind/unbind pages wrapper click event to handler
         */
        function doBindPagesWrapper( isUnbind ) {
            if ( isUnbind ) {
                self.$pagesWrapper.unbind( "click", onPagesClick );
            }
            else {
                self.$pagesWrapper.bind( "click", onPagesClick );
            }
        }

        /**
         * Handle Pug action click
         *
         * @param {PugVm} pugVm
         */
        function onPugActionClick( pugVm ) {
            if ( !Global.userId ) {
                console.warn( "Could not action PUG; User not set" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not action PUG; Pug not set" );
                return;
            }

            var isUserInPug = PlayerHelper.isUserInPug( Global.userId, pugVm );
            if ( pugVm.isStateWaiting() ) {
                if ( isUserInPug ) {
                    joinPugHelper.doShowLeavePugDialog( Global.userId, pugVm );
                }
                else {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, pugVm );
                }
            }
            else if ( pugVm.isStatePlaying() ) {
                Global.pageHandler.doRedirectToPage( "pug/" + pugVm.id );
                eventHandler.fire( "toast", "Set score to finish game" );
            }
        }

        /**
         * Handle Pug page click
         *
         * @param {PugVm} pugVm
         * @param {Void} _
         * @param {*} event
         */
        function onPugPageClick( pugVm, _, event ) {
            event.stopPropagation();
            Global.pageHandler.doRedirectToPage( "pug/" + pugVm.id );
        }

        /**
         * Handle on player in slot click
         *
         * @param {PugVm} pugVm
         * @param {PlayerVm} playerVm
         * @param {Event} event
         */
        function onPlayerSlotClick( pugVm, playerVm, event ) {
            event.stopPropagation();

            if ( !Global.userId ) {
                console.warn( "Could not join PUG; user not set" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not join PUG; PUG not set" );
                return;
            }

            if ( pugVm.isStateWaiting() ) {
                var isUserInPug = PlayerHelper.isUserInPug( Global.userId, pugVm );

                if ( !isUserInPug ) {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, pugVm, parseInt( playerVm.slot ) );
                }
                else if ( isUserInPug && pugVm.isTeamModeAssigned() && playerVm.slot ) {
                    joinPugHelper.doJoinDifferentPugSlot( Global.userId, pugVm, parseInt( playerVm.slot ) );
                }
            }
        }

        /**
         * Handle scroll on scroller container
         */
        function onScroll() {
            doLazyLoadImagesAfterTimeout();
        }

        /**
         * Handle before page is shown
         */
        this.onShowPage = function () {
            doUpdateToolbar();
            doUpdatePugs();
            doUpdateTime();
            doBindScroller( false );
            doStartUpdateTimeInterval();
        };

        /**
         * Handle after page is shown
         *
         * @param {Number} [pugId]
         * @param {String} [action]
         */
        this.onShownPage = function ( pugId, action ) {
            if ( pugId ) {
                // show join Pug dialog if action is join
                if ( action === "join" && Global.userId ) {
                    var pugToJoin = PugHelper.getPugFromId( pugId, Global.pugs() );
                    joinPugHelper.doShowJoinPugDialog( Global.userId, pugToJoin );
                }

                // focus on Pug
                doFocusPug( pugId );

                // remove exec hash attributes
                Global.pageHandler.doRedirectToPage( true, "pugs" );
            }

            doLazyLoadImages();
            doSubscribeToGlobalPugs( false );
            doBindPagesWrapper();
        };

        /**
         * Handle before page is hidden
         */
        this.onHidePage = function () {
            doBindScroller( true );
            doBindPagesWrapper( true );
            doSubscribeToGlobalPugs( true );

            // hide "join pug helper" dialog
            joinPugHelper.doHide();

            // clear interval timers
            clearInterval( updateTimeInterval );
            clearTimeout( domRenderTimeout );
        };

        /**
         * Handle on click on "pages" container
         *
         * @param event
         */
        function onPagesClick( event ) {
            var isClickPugItem = $( event.target ).parents( "pug" ).length > 0;
            if ( !isClickPugItem ) {
                selectedPugId( null );
            }
        }

        /**
         * Handle click on Pug
         *
         * @param {PugVm} pugVm
         * @param event
         * @returns {boolean}
         */
        function onPugClick( pugVm, event ) {
            event.stopPropagation();

            doFocusPug( pugVm.id );
            return true;
        }

        /**
         * Handle click on "new Pug" button
         */
        function onNewPugClick() {
            Global.pageHandler.doRedirectToPage( "new" );
        }

        /**
         * Click on player
         *
         * @param {PlayerVm} playerVm
         * @param {PugVm} pugVm
         */
        function onPlayerClick( playerVm, pugVm ) {
            if ( !Global.userId ) {
                console.warn( TAG, "Could not join PUG; user not set" );
                return;
            }

            if ( !pugVm ) {
                console.warn( TAG, "Could not join PUG; PUG not set" );
                return;
            }

            if ( pugVm.isStateWaiting() ) {
                var isUserInPug = PlayerHelper.isUserInPug( Global.userId, pugVm );

                if ( !isUserInPug ) {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, pugVm, parseInt( playerVm.slot ) );
                }
                else if ( isUserInPug && pugVm.isTeamModeAssigned && playerVm.slot ) {
                    joinPugHelper.doJoinDifferentPugSlot( Global.userId, pugVm, parseInt( playerVm.slot ) );
                }
            }
        }

        // EVENTS

        eventHandler.on( "resize", self.doRefreshPage.bind( self ) );

        // VIEW MODEL

        viewModel.pugPageButton = pugPageButton;
        viewModel.getPugActionButton = getPugActionButton;
        viewModel.onPlayerSlotClick = onPlayerSlotClick;
        viewModel.onPlayerClick = onPlayerClick;
        viewModel.getTimeDatetime = getTimeDatetime;
        viewModel.getStateStatus = getStateStatus;
        viewModel.getFreeSlotText = getFreeSlotText;
        viewModel.getPugPlayers = getPugPlayers;
        viewModel.getTeamsText = getTeamsText;
        viewModel.getTeamModeText = getTeamModeText;
        viewModel.getStateHeader = getStateHeader;
        viewModel.isPugSelected = isPugSelected;
        viewModel.onPugClick = onPugClick;
        viewModel.onNewPugClick = onNewPugClick;

    }

    return PugsPage;

} );