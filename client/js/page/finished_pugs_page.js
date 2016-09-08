"use strict";

define( [
    "knockout",
    "moment",
    "lib/promise",
    "lib/global",
    "lib/asset",
    "vm/pug_vm",
    "util/dom_util",
    "handler/event_handler",
    "handler/pug_handler",
    "helper/pug_helper",
    "helper/game_helper",
    "helper/user_helper",
    "helper/player_helper",
    "component/dropdown_button_component",
    "component/toggle_buttons_component"
], function ( knockout, moment, Promise, Global, Asset, PugVm, DomUtil, eventHandler, PugHandler, PugHelper, GameHelper, UserHelper, PlayerHelper, DropdownButtonComponent, ToggleButtonsComponent ) {

    function FinishedPugsPage() {

        // VARIABLES

        var TAG = "FinishedPugsPage";

        var self = this;
        var pugs = knockout.observableArray( [] ),
            pugsTables = knockout.observableArray( [] );
        var isViewDisabled = Global.isViewDisabled;
        var handleScrollTimeout;
        var pugHandler = new PugHandler();
        var pugsSubscriber;
        var isFinishedPugsPrWeekRetrieved = false,
            isFilterGameDropdownPopulated = false;

        // ... VIEW MODEL

        var viewModel = {
            pugs: pugs,
            pugsTables: pugsTables,
            noPugs: knockout.computed( function () {
                return pugs().length === 0;
            } ),
            pugPageButton: {
                title: "View Pick-Up Game page",
                icon: Asset.svg.arrow_next,
                onClick: onPugPageClick.bind( self ),
                isDisabled: Global.isViewDisabled
            },
            isViewDisabled: isViewDisabled,
            noPugsText: "No finished pick-up games",
            inviteIcon: Asset.svg.verified,
            filter: {
                game: null,
                date: null,
                typeToggle: null
            }
        };

        // ... COMPONENTS

        var filterGameDropdown = new DropdownButtonComponent( {
                title: "Filter by game"
            } ),
            filterDateDropdown = new DropdownButtonComponent( {
                title: "Filter by date",
                defaultIcon: "calendar_blank"
            } ),
            filterTypeToggle = new ToggleButtonsComponent();

        // ... SUBSCRIPTION

        filterGameDropdown.selected.subscribe( onGameFilterChange, self );
        filterDateDropdown.selected.subscribe( onDateFilterChange, self );

        // FUNCTIONS

        function getPugPlayers( pugVm ) {
            return {
                players: PugHelper.getPugPlayersWithSlots( pugVm ),
                teams: pugVm.teams,
                teamMode: pugVm.teamMode
            }
        }

        /**
         * @param {PugVm} pugVm
         * @returns {Array}
         */
        function getTeams( pugVm ) {
            if ( !pugVm ) {
                return [];
            }

            var players = PugHelper.getPugPlayersWithSlots( pugVm ),
                teams = [],
                player,
                results = pugVm.scores();

            for ( var i = 0; i < players.length; i++ ) {
                player = players[i];
                var teamIndex = player.team - 1;

                if ( !teams[teamIndex] ) {
                    teams[teamIndex] = {
                        players: [],
                        teams: pugVm.teams,
                        team: player.team,
                        teamMode: pugVm.teamMode,
                        score: results[teamIndex],
                        scoreDouble: results[teamIndex + 1] || null
                    };
                }
                teams[teamIndex].players.push( player );
            }

            return teams;
        }

        function getCalendarText( date ) {
            return moment( new Date( date ) ).calendar();
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

        function retrieveFinishedPugsPrWeekPromise() {
            if ( isFinishedPugsPrWeekRetrieved ) {
                return Promise.resolve( true );
            }

            return new Promise( function ( fulfill, reject ) {
                pugHandler.getFinishedPugsPrWeek().then( function ( finishedPugsPrWeek ) {
                    finishedPugsPrWeek.forEach( function ( finishedPugsForMonth ) {
                        var dateMoment = moment( finishedPugsForMonth.date );
                        dateMoment.startOf( "month" ).startOf( "day" );

                        filterDateDropdown.addItem( "month", dateMoment.format( "MMMM" ), dateMoment.format( "YYYY - " ) + finishedPugsForMonth.count + " games", "calendar_blank", {
                            date: finishedPugsForMonth.date,
                            from: dateMoment.toDate(),
                            to: dateMoment.clone().add( 1, "months" ).subtract( 1, "days" ).endOf( "day" ).toDate()
                        } );

                        finishedPugsForMonth.weeks.forEach( function ( finishedPugsForMonthWeek ) {
                            var dateMoment = moment( finishedPugsForMonthWeek.date ),
                                startOfWeekMoment = dateMoment.clone().startOf( "week" ).startOf( "day" ),
                                endOfWeekMoment = startOfWeekMoment.clone().add( 6, "days" );

                            filterDateDropdown.addItem( "week", dateMoment.format( "[Week] W" ), startOfWeekMoment.format( "D/M-" ) + endOfWeekMoment.format( "D/M - " ) + finishedPugsForMonthWeek.pugsCount + " games", " ", {
                                date: finishedPugsForMonthWeek.date,
                                from: startOfWeekMoment.toDate(),
                                to: startOfWeekMoment.clone().add( 6, "days" ).endOf( "day" ).toDate()
                            } );
                        } );
                    } );

                    isFinishedPugsPrWeekRetrieved = true;

                    return true;
                } ).then( fulfill, reject );
            } );
        }

        this.doBuild = function ( $wrapper ) {
            self.$wrapper = $wrapper;

            self.$page = $( "<page />", {
                'finished-pugs': '',
                'html': Asset.TEMPLATE.FINISHED_PUGS_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$wrapper.append( self.$page );

            self.$scroller = $( "wrapper[pages]" );
            self.$pugs = self.$page.find( "pugs" );

            // add items to type toggler and set selected
            filterTypeToggle.addItem( "results", "Results", null, "view_headline" );
            filterTypeToggle.addItem( "table", "Table", null, "format_list_numbered" );
            filterTypeToggle.doSetSelected( filterTypeToggle.items()[0] );
        };

        function doUpdatePugs() {
            if ( self.isShow ) {
                var sortPugsFunc = function ( pugVmLeft, pugVmRight ) {
                    return pugVmRight.finishedDate() - pugVmLeft.finishedDate();
                };

                /**
                 * @param {PugVm} pugVm
                 */
                var filterFunc = function ( pugVm ) {
                    var isGame = filterGameDropdown.selected() && (filterGameDropdown.selected().value === "all" || filterGameDropdown.selected().value === pugVm.game.id);
                    var isDate = filterDateDropdown.selected() && filterDateDropdown.selected().options.from <= pugVm.finishedDate() && filterDateDropdown.selected().options.to >= pugVm.finishedDate();
                    return isGame && isDate;
                };

                pugs( Global.pugs().filter( function ( pugVm ) {
                    return pugVm.isStateFinished() && !pugVm.isCanceled() && filterFunc( pugVm );
                } ) );

                pugs.sort( sortPugsFunc );

                self.doRefreshPage();
            }
        }

        function doUpdatePugsTables( pugsTables_ ) {
            pugsTables.removeAll();

            for ( var gameId in pugsTables_ ) {
                if ( pugsTables_.hasOwnProperty( gameId ) ) {
                    var game = GameHelper.getGameFromId( gameId, Global.games );
                    var pugsTable = {
                        game: game,
                        hasRate: !!game.ratingType,
                        sortBy: !!game.ratingType ? "rate-diff" : "standing-percent",
                        players: []
                    };

                    pugsTable.isToShowTable = knockout.computed( function () {
                        return filterGameDropdown.selected() && (filterGameDropdown.selected().value === "all" || filterGameDropdown.selected().value === this.game.id);
                    }, pugsTable );

                    for ( var userId in pugsTables_[gameId] ) {
                        if ( pugsTables_[gameId].hasOwnProperty( userId ) ) {
                            var playerStanding = pugsTables_[gameId][userId];

                            pugsTable.players.push( {
                                user: UserHelper.getUserFromId( userId, Global.users() ),
                                pugCount: parseInt( playerStanding.pugCount ),
                                standingPercent: Math.round( parseFloat( playerStanding.standingPercent ) * 100 ),
                                rateDiff: playerStanding.rateDiff ? parseFloat( playerStanding.rateDiff ).toFixed( 2 ) : null,
                                rate: playerStanding.lastRate ? parseFloat( playerStanding.lastRate ).toFixed( 2 ) : null,
                                form: playerStanding.lastForm.map( PlayerHelper.createPlayerFormResultAndType ),
                                placing: 0
                            } );
                        }
                    }

                    pugsTable.players.sort( function ( left, right ) {
                        if ( pugsTable.hasRate ) {
                            return right.rateDiff - left.rateDiff;
                        }
                        else {
                            return right.standingPercent - left.standingPercent;
                        }
                    } ).forEach( function ( playerStanding, index ) {
                        playerStanding.placing = index + 1;
                    } );

                    pugsTables.push( pugsTable );
                }
            }
        }

        this.doRefreshPage = function () {
            doLazyLoadImages();
        };

        function doLazyLoadImages() {
            DomUtil.doLoadLazyImages( self.$scroller, self.$scroller );
        }

        function doShowPlayerProfile( userId ) {
            Global.pageHandler.doRedirectToPage( "user/" + userId );
        }

        function doRetrieveResultsForFinishedPugs() {
            if ( !filterDateDropdown.selected() ) {
                return;
            }

            Global.isReloadingData( true );

            pugHandler.getResultsForFinishedPugs( filterDateDropdown.selected().options.from, filterDateDropdown.selected().options.to )
                .then( function ( pugsTables ) {
                    doUpdatePugsTables( pugsTables );
                    doUpdatePugs();
                    Global.isReloadingData( false );
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    Global.eventHandler.fire( "toast", "Error while retrieving PUGs" );
                } );
        }

        function doPopulateGameDropdownFilter() {
            if ( isFilterGameDropdownPopulated ) {
                return;
            }

            filterGameDropdown.addItem( "all", "All games", null, "opug_controller" );
            Global.games.forEach( function ( game ) {
                filterGameDropdown.addItem( game.id, game.title, null, game.src );
            } );

            // set the first game as game filter
            filterGameDropdown.doSetSelected( filterGameDropdown.items()[0] );

            isFilterGameDropdownPopulated = true;
        }

        this.onShowPage = function () {
            Global.toolbar.title( "Finished Pick-Up Games" );
            Global.toolbar.icon( Asset.FONT_ICON.FORMAT_LIST_NUMBERED );

            //doUpdatePugs();
            self.$scroller.on( "scroll", onScroll );

            // populate games to dropdown filter
            doPopulateGameDropdownFilter();

            return new Promise( function ( fulfill, reject ) {
                retrieveFinishedPugsPrWeekPromise()
                    .then( function () {
                        // select first date in dropdown filter
                        if ( !filterDateDropdown.selected() ) {
                            filterDateDropdown.doSetSelected( filterDateDropdown.items()[0] );
                        }
                        fulfill();
                    }, reject );
            } );
        };

        this.onShownPage = function () {
            doLazyLoadImages();
            pugsSubscriber = Global.pugs.subscribe( doUpdatePugs.bind( this ) );
        };

        this.onHidePage = function () {
            if ( pugsSubscriber ) {
                pugsSubscriber.dispose();
            }
        };

        this.onHiddenPage = function () {
        };

        function onScroll() {
            clearTimeout( handleScrollTimeout );
            handleScrollTimeout = setTimeout( doLazyLoadImages, 100 );
        }

        function onPlayerClick( playerVm, pugVm ) {
            if ( !Global.userId ) {
                console.warn( "Could not join PUG; user not set" );
                return;
            }

            if ( !pugVm ) {
                console.warn( "Could not join PUG; PUG not set" );
                return;
            }

            doShowPlayerProfile( playerVm.user_id );
        }

        /**
         * @param {PugVm} pugVm
         */
        function onPugPageClick( pugVm ) {
            Global.pageHandler.doRedirectToPage( "pug/" + pugVm.id );
        }

        function onGameFilterChange() {
            doUpdatePugs();
        }

        function onDateFilterChange() {
            doRetrieveResultsForFinishedPugs();
        }

        // EVENTS

        eventHandler.on( "resize", self.doRefreshPage.bind( this ) );

        // VIEW MODEL

        viewModel.getPugPlayers = getPugPlayers;
        viewModel.getTeams = getTeams;
        viewModel.getCalendarText = getCalendarText;
        viewModel.getTeamsText = getTeamsText;
        viewModel.getTeamModeText = getTeamModeText;
        viewModel.onPlayerClick = onPlayerClick;
        viewModel.filter.game = filterGameDropdown;
        viewModel.filter.date = filterDateDropdown;
        viewModel.filter.typeToggle = filterTypeToggle;

    }

    return FinishedPugsPage;

} );