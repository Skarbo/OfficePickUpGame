"use strict";

define( [
    "knockout",
    "interact",
    "moment",
    "lib/promise",
    "lib/global",
    "lib/asset",
    "lib/constant",
    "vm/pug_vm",
    "vm/pug_comment_vm",
    "helper/pug_helper",
    "helper/player_helper",
    "helper/user_helper",
    "helper/join_pug_helper",
    "handler/pug_handler",
    "util/util",
    "util/dom_util",
    "component/context_dialog_component",
    "component/textarea_component",
    "component/spinner_component",
    "component/users_dialog_component",
    "component/alert_dialog_component",
    "component/tabs_component"
], function ( knockout, interact, moment, Promise, Global, Asset, Constant, PugVm, PugCommentVm, PugHelper, PlayerHelper, UserHelper, JoinPugHelper, PugHandler, Util, DomUtil, ContextDialogComponent, TextareaComponent, SpinnerComponent, UsersDialogComponent, AlertDialogComponent, TabsComponent ) {

    function PugPage() {

        // VARIABLES

        var TAG = "[PugPage]";

        var self = this;

        // observables
        var isViewDisabled = knockout.computed( function () {
            return Global.isViewDisabled();
        } );

        // view model
        var viewModel = {
            pug: knockout.observable( null ),
            comments: knockout.observableArray( [] ),
            result: {
                home: knockout.observable( null ),
                mode: knockout.observable( null ),
                away: knockout.observable( null )
            },
            teams: knockout.observable( [] ),
            isEditable: knockout.observable( true ),
            isDouble: knockout.observable( true ),
            isPlayerAssignMode: knockout.observable( false ),
            isCanceled: knockout.observable( false ),
            isNotPlayable: knockout.observable( false ),
            isInviteOnly: knockout.observable( false ),
            isPlayerDisabled: false,
            freePlayerText: "Join PUG",
            freePlayerTitle: "Free",
            actionButton: {
                isVisible: knockout.observable( false ),
                onClick: onPugActionClick,
                icon: knockout.observable( null ),
                title: knockout.observable( null ),
                disabled: isViewDisabled
            },
            state: knockout.observable( null ),
            info: {
                statusText: knockout.observable( null ),
                userText: knockout.observable( null ),
                userLink: knockout.observable( null ),
                createdText: knockout.observable( null ),
                createdDate: knockout.observable( null ),
                gameText: knockout.observable( null ),
                messageText: knockout.observable( null ),
                teamsText: knockout.observable( null ),
                teamModeText: knockout.observable( null ),
                playersMax: knockout.observable( null )
            },
            infoTab: {
                remainingTime: knockout.observable( null ),
                invites: knockout.observableArray( [] ),
                pug: {
                    icon: Asset.svg.pug_action_join,
                    user: knockout.observable( null ),
                    created: knockout.observable( null ),
                    createdFormatted: knockout.observable( null ),
                    game: knockout.observable( null ),
                    title: knockout.observable( null ),
                    message: knockout.observable( null )
                },
                form: knockout.observableArray( [] )
            }
        };

        // toolbar items
        var assignPlayersMoreItem = null,
            notifyPugMoreItem = null,
            invitePugMoreItem = null,
            cancelPugMoreItem = null;

        // timeouts / intervals
        var retrievePugTimeout;
        var remainingTimeInterval = null;
        var domRenderTimeout = null;

        var scores = [];
        var isReadyToShow = false;
        var pugCommentEventToken = null;
        var pugPlayersForm = null;

        // subscribers
        var pugSubscriber = null;

        // functions
        var sortPugCommentsFunc = function ( pugCommentVmLeft, pugCommentVmRight ) {
            return pugCommentVmRight.created - pugCommentVmLeft.created;
        };

        // ... HANDLER

        /**
         * @type {PugHandler}
         */
        var pugHandler = new PugHandler();

        // ... HELPER

        /**
         * @type {JoinPugHelper}
         */
        var joinPugHelper = new JoinPugHelper( {
            isViewDisabled: isViewDisabled,
            pugHandler: pugHandler
        } );

        // ... COMPONENTS

        /**
         * Player context menu
         *
         * @type {ContextDialogComponent}
         */
        var playerContextMenu = new ContextDialogComponent( {
            title: "Player action",
            items: [
                {
                    title: "View player profile",
                    icon: Asset.svg.user,
                    onSelect: function () {
                        doShowPlayerProfile( playerContextMenu.userId );
                    }
                },
                {
                    title: "Remove player from PUG",
                    icon: Asset.svg.pug_action_remove,
                    onSelect: doRemovePlayerFromPug
                }
            ]
        } );

        /**
         * @type {TextComponent}
         */
        var commentTextareaComponent = new TextareaComponent( {
            placeholder: "Comment",
            disabled: knockout.observable( false ),
            onKeyPress: function ( vm, event ) {
                if ( event.which === 13 && (event.metaKey || event.ctrlKey) ) {
                    doAddPugComment();
                    return false;
                }
                return true;
            }
        } );

        /**
         * Comment button view model
         *
         * @type {Object}
         */
        var commentButton = {
            text: "Add",
            title: "Add comment",
            onClick: doAddPugComment,
            disabled: knockout.observable( false ),
            spinner: new SpinnerComponent( {type: SpinnerComponent.TYPE_2} ),
            hasFocus: knockout.observable( false )
        };

        // ... invite users dialog component

        var inviteUsersOkButtonText = knockout.observable( "Invite" );

        /**
         * @type {UsersDialogComponent}
         */
        var inviteUsersComponent = new UsersDialogComponent( {
            title: "Invite users",
            onSelected: doInviteUsersAndGroups,
            type: "multiple",
            hasGroups: true,
            okButtonVisible: true,
            okButtonText: inviteUsersOkButtonText
        } );

        // subscribe to selected users in invite users component, change invited users OK button text
        inviteUsersComponent.selectedUsers.subscribe( function ( selectedItems ) {
            inviteUsersOkButtonText( selectedItems.length === 0 ? "Invite everyone" : "Invite " + selectedItems.length + " user(s)" );
        } );

        // ... /invite users dialog component

        /**
         * @type {TabsComponent}
         */
        var tabsComponent = new TabsComponent( {
            selectedTab: "info",
            tabs: [{
                id: "info",
                title: "Info",
                icon: Asset.FONT_ICON.INFO
            }, {
                id: "comments",
                title: "Comments",
                icon: Asset.FONT_ICON.MODE_COMMENT
            }]
        } );

        /**
         * @type {AlertDialogComponent}
         */
        var cancelPugAlertDialog = new AlertDialogComponent( {
            onHidden: function () {
                Global.isViewDisabled( false );
            }
        } );

        // FUNCTIONS

        /**
         * Create Pug players form for info tab
         *
         * @param {PlayerVm} player
         * @returns {Array} List of players form result and type
         * @see PlayerHelper.createPlayerFormResultAndType
         */
        function createPugPlayersFormInfoTab( player ) {
            var start = viewModel.pug().isStateFinished() ? 1 : 0,
                end = viewModel.pug().isStateFinished() ? 6 : 5;

            return player.form
                .slice( start, end )
                .reverse()
                .map( PlayerHelper.createPlayerFormResultAndType );
        }

        /**
         * Get players for each teams for Pug
         *
         * @returns {Array}
         */
        function getTeams() {
            var pugVm = viewModel.pug();
            if ( !pugVm ) {
                console.warn( TAG, "Could not get Teams; Pug is not set yet" );
                return [];
            }

            var players = PugHelper.getPugPlayersWithSlots( pugVm ),
                teams = [],
                player;

            for ( var i = 0; i < players.length; i++ ) {
                player = players[i];
                var teamIndex = player.team - 1;

                if ( !teams[teamIndex] ) {
                    teams[teamIndex] = {
                        players: [],
                        team: player.team,
                        teams: pugVm.teams,
                        teamMode: pugVm.teamMode,
                        score: scores[teamIndex],
                        scoreDouble: scores[teamIndex + 1] || null,
                        state: pugVm.state(),
                        getPugPlayerRate: getPugPlayerRate
                    };
                }
                teams[teamIndex].players.push( player );
            }

            return teams;
        }

        /**
         * Get score view model for given team
         *
         * @param {Object} team
         * @param {boolean} isSecond
         * @returns {Object}
         */
        function getScoreViewModel( team, isSecond ) {
            var score = isSecond ? team.scoreDouble : team.score;
            return {
                score: score,
                onScoreIncClick: doAdjustScore.bind( self, score, false ),
                onScoreDecClick: doAdjustScore.bind( self, score, true )
            };
        }

        /**
         * @param {Date} date
         * @returns {String} Date from now date as string
         */
        function getFromNowText( date ) {
            return moment( date ).fromNow();
        }

        /**
         * @returns {String|null} Remaining time left before Pug is canceled because of inactivity
         */
        function getRemainingTimeLeft() {
            if ( !viewModel.pug() || !viewModel.pug().isStateWaiting() ) {
                return null;
            }

            var padFunc = function ( num ) {
                return num < 10 ? "0" + num : num;
            };

            var lastUpdatedDate = new Date( viewModel.pug().lastUpdated() );
            lastUpdatedDate.setMinutes( lastUpdatedDate.getMinutes() + 15 );

            var until = Math.max( 0, Math.round( (lastUpdatedDate.getTime() - Date.now()) / 1000 ) );

            var hours = Math.round( until / 60 ),
                minutes = until % 60;

            return padFunc( hours ) + ":" + padFunc( minutes );
        }

        function getPugPlayerRate( pugPlayer ) {
            if ( !viewModel.pug().isStateFinished() ) {
                return {};
            }

            return {};
            //var pugPlayerForm = pugPlayersForm[pugPlayer.userId];
            //if ( !pugPlayerForm ) {
            //    return {};
            //}
            //
            //if ( !pugPlayerForm.form || pugPlayerForm.form.length === 0 ) {
            //    return {};
            //}
            //
            //// TODO handle different type
            //
            //var lastForm = (pugPlayerForm.form[0] || {rate: [25.0]}),
            //    nextLastForm = (pugPlayerForm.form[1] || {rate: [25.0]});
            //
            //var lastRank = nextLastForm.rate[0],
            //    currentRank = lastForm.rate[0],
            //    diff = currentRank - lastRank;
            //
            //return {
            //    visible: true,
            //    diff: Math.round( Math.abs( diff ) * 100 ) / 100,
            //    type: diff > 0 ? 1 : 0
            //};
        }

        /**
         * Build Page
         *
         * @param {*} $pagesWrapper
         */
        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'pug': '',
                'html': Asset.TEMPLATE.PUG_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            // build components
            playerContextMenu.doBuild( Global.$dialogWrapper );
            joinPugHelper.doBuild();
            inviteUsersComponent.doBuild( Global.$dialogWrapper );
            cancelPugAlertDialog.doBuild( Global.$dialogWrapper );
            tabsComponent.doBuild( self.$page.find( "tabs" ), self.$page );
        };

        /**
         * Adjust score for given score observable
         *
         * @param {observable} scoreObservable
         * @param {boolean} [isDecrease]
         */
        function doAdjustScore( scoreObservable, isDecrease ) {
            scoreObservable( Math.max( Math.min( scoreObservable() + (isDecrease ? -1 : 1), 99 ), 0 ) );
        }

        /**
         * Refresh page
         */
        this.doRefreshPage = function () {
            DomUtil.doLoadAllLazyImages( self.$page.find( "player" ) );
            DomUtil.doReplaceErrorImages( self.$page );
        };

        /**
         * Update Pug view model
         */
        function doUpdatePug() {
            if ( !isReadyToShow ) {
                return;
            }

            console.trace( TAG, "UpdatePug", viewModel.pug() );
            /**
             * @type {PugVm}
             */
            var pugVm = viewModel.pug();
            /**
             * @type {UserVm}
             */
            var userVm = UserHelper.getUserFromId( Global.userId, Global.users() );
            /**
             * @type {UserVm}
             */
            var pugCreatorUserVm = UserHelper.getUserFromId( pugVm.userId, Global.users() );

            // editable
            viewModel.isEditable( (pugVm.isStateWaiting() || pugVm.isStatePlaying() ) && (PlayerHelper.isUserInPug( Global.userId, pugVm ) || PugHelper.isUserPugCreator( Global.userId, pugVm )) );
            assignPlayersMoreItem.hidden( !viewModel.isEditable() );
            notifyPugMoreItem.hidden( !(pugVm.isStatePlaying() && PugHelper.isUserPugCreator( Global.userId, pugVm ) ) );
            invitePugMoreItem.hidden( !(pugVm.isStateWaiting() && PugHelper.isUserPugCreator( Global.userId, pugVm ) ) );
            cancelPugMoreItem.hidden( !(!pugVm.isStateFinished() && PugHelper.isUserPugCreator( Global.userId, pugVm ) ) );

            // teams
            viewModel.teams( getTeams() );

            // is double
            viewModel.isDouble( pugVm.isDouble );

            // is canceled
            viewModel.isCanceled( pugVm.isCanceled() );

            // is invite only
            viewModel.isInviteOnly( pugVm.invites().length > 0 );

            // is not playable for user
            viewModel.isNotPlayable( !PugHelper.canUserPlayPug( userVm.id, userVm.groups(), pugVm ) );

            // action button
            var isUserInPug = PlayerHelper.isUserInPug( Global.userId, pugVm ),
                isUserPugCreator = PugHelper.isUserPugCreator( Global.userId, pugVm );
            if ( !pugVm.isCanceled() && pugVm.isStateWaiting() && !viewModel.isNotPlayable() ) {
                viewModel.actionButton.isVisible( true );
                if ( isUserInPug ) {
                    viewModel.actionButton.icon( Asset.svg.pug_action_remove );
                    viewModel.actionButton.title( "Remove from PUG" );
                }
                else {
                    viewModel.actionButton.icon( Asset.svg.pug_action_join );
                    viewModel.actionButton.title( "Join PUG" );
                }
            }
            else if ( !pugVm.isCanceled() && pugVm.isStatePlaying() ) {
                viewModel.actionButton.isVisible( isUserInPug || isUserPugCreator );
                viewModel.actionButton.icon( Asset.svg.pug_action_finish );
                viewModel.actionButton.title( "Finish PUG" );
            }
            else {
                viewModel.actionButton.isVisible( false );
            }

            // scores
            if ( pugVm.isStateFinished() ) {
                var scores_ = pugVm.scores();
                scores.forEach( function ( scoreObservable, i ) {
                    scoreObservable( scores_[i] || 0 );
                } );
            }

            // info
            var user = UserHelper.getUserFromId( pugVm.userId, Global.users() );
            viewModel.info.userText( user.name() );
            viewModel.info.userLink( "#user/" + user.id );
            var createdDate = new Date( pugVm.created );
            viewModel.info.createdText( moment( createdDate ).calendar() );
            viewModel.info.createdDate( createdDate );
            viewModel.info.gameText( pugVm.title );
            viewModel.info.messageText( pugVm.message );
            viewModel.info.teamsText( PugHelper.getTeamsText( pugVm.teams ) );
            viewModel.info.teamModeText( PugHelper.getTeamModeText( pugVm.teamMode ) );
            viewModel.info.playersMax( pugVm.playersMax );

            // state
            viewModel.state( pugVm.state() );

            if ( pugVm.isStateWaiting() ) {
                viewModel.info.statusText( "Waiting for players" );
            }
            else if ( pugVm.isStatePlaying() ) {
                viewModel.info.statusText( "Game is playing" );
            }
            else if ( pugVm.isStateFinished() ) {
                viewModel.info.statusText( "Game is finished" );
            }

            // INFO TAB

            // remaining time
            viewModel.infoTab.remainingTime( getRemainingTimeLeft() );

            if ( pugVm.isStateWaiting() ) {
                clearInterval( remainingTimeInterval );
                remainingTimeInterval = setInterval( function () {
                    viewModel.infoTab.remainingTime( getRemainingTimeLeft() );
                }, 1000 );
            }

            // invites
            viewModel.infoTab.invites( pugVm.invites().map( function ( invite ) {
                var title, image, letter, color;

                // user
                if ( /^\d+$/.test( invite ) ) {
                    var userVm = UserHelper.getUserFromId( invite, Global.users() );
                    if ( !userVm ) {
                        return null;
                    }

                    title = userVm.firstName();
                    image = userVm.image();
                }
                // group
                else {
                    letter = invite.toUpperCase().charAt( 0 );
                    color = Util.textToColor( invite );
                    title = invite;
                }

                return {
                    title: title,
                    image: image,
                    letter: letter,
                    color: color
                };
            } ) );

            // pug

            // ... game
            viewModel.infoTab.pug.game( pugVm.game );
            viewModel.infoTab.pug.title( pugVm.title );
            viewModel.infoTab.pug.message( pugVm.message );

            // ... creator
            viewModel.infoTab.pug.user( pugCreatorUserVm );
            viewModel.infoTab.pug.created( pugVm.created );
            viewModel.infoTab.pug.createdFormatted( moment( pugVm.created ).fromNow() );

            // form
            viewModel.infoTab.form( pugVm.players().map( function ( player ) {
                return {
                    userId: player.userId,
                    team: player.team,
                    user: UserHelper.getUserFromId( player.userId, Global.users() ),
                    form: createPugPlayersFormInfoTab( player )
                };
            } ) );

            // /INFO TAB

            // refresh view
            self.doRefreshPage();
        }

        /**
         * Redirect to User page
         *
         * @param {Number} userId
         */
        function doShowPlayerProfile( userId ) {
            Global.pageHandler.doRedirectToPage( "user/" + userId );
        }

        /**
         * Show Users dialog. Assign User to given player slot.
         *
         * @param {Number} playerSlot
         */
        function doShowUsersDialog( playerSlot ) {
            joinPugHelper.doShowUsersDialog(
                /**
                 * @param {ItemsDialogComponent.ItemVm} itemVm
                 */
                function ( itemVm ) {
                    if ( itemVm ) {
                        var isUserInPug = PlayerHelper.isUserInPug( itemVm.id, viewModel.pug() );
                        if ( !isUserInPug ) {
                            joinPugHelper.doShowJoinPugDialog( itemVm.id, viewModel.pug(), playerSlot );
                        }
                        else if ( isUserInPug && viewModel.pug().isTeamModeAssigned && playerSlot ) {
                            joinPugHelper.doJoinDifferentPugSlot( itemVm.id, viewModel.pug(), playerSlot );
                        }
                    }
                } );
        }

        /**
         * Remove logged in User from Pug
         */
        function doRemovePlayerFromPug() {
            if ( !viewModel.pug() ) {
                console.warn( "Could not remove player from PUG; PUG not set" );
                return;
            }

            if ( !PugHelper.isUserPugCreator( Global.userId, viewModel.pug() ) ) {
                console.warn( "Could not remove player from PUG; User is not PUG creator" );
                return;
            }

            var isUserInPug = PlayerHelper.isUserInPug( playerContextMenu.userId, viewModel.pug() );
            if ( viewModel.pug().isStateWaiting() && isUserInPug ) {
                joinPugHelper.doShowLeavePugDialog( playerContextMenu.userId, viewModel.pug() );
            }
        }

        /**
         * Activate player assign mode
         */
        function doActivatePlayerAssignMode() {
            viewModel.isPlayerAssignMode( true );
            Global.toolbar.doShowContext( "Assign players to teams" );

            interact( 'player[taken]' ).draggable( {
                restrict: {
                    restriction: self.$page.find( "teams" )[0]
                },
                context: self.$page.find( "teams" )[0],
                onstart: function ( event ) {
                    event.target.classList.add( "dragging" );
                },
                onmove: function ( event ) {
                    var target = event.target,
                    // keep the dragged position in the data-x/data-y attributes
                        x = (parseFloat( target.getAttribute( 'data-x' ) ) || 0) + event.dx,
                        y = (parseFloat( target.getAttribute( 'data-y' ) ) || 0) + event.dy;

                    // translate the element
                    target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

                    // update the posiion attributes
                    target.setAttribute( 'data-x', x );
                    target.setAttribute( 'data-y', y );
                },
                onend: function ( event ) {
                    setTimeout( function () {
                        var target = event.target;
                        target.classList.remove( "dragging" );
                        target.style.webkitTransform = target.style.transform = 'translate(' + 0 + 'px, ' + 0 + 'px)';
                        target.setAttribute( 'data-x', 0 );
                        target.setAttribute( 'data-y', 0 );
                    }, 0 );
                }
            } );

            interact( 'player' ).dropzone( {
                ondropactivate: function ( event ) {
                    //console.log( "OnDropActive", event );
                },
                ondragenter: function ( event ) {
                    event.target.classList.add( "active" );
                },
                ondragleave: function ( event ) {
                    event.target.classList.remove( "active" );
                },
                ondrop: function ( event ) {
                    event.target.classList.remove( "active" );

                    if ( event.relatedTarget ) {
                        var draggedPlayerUserId = parseInt( event.relatedTarget.getAttribute( "data-player-user-id" ) ),
                            draggedPlayerSlot = parseInt( event.relatedTarget.getAttribute( "data-player-slot" ) ),
                            playerUserId = parseInt( event.target.getAttribute( "data-player-user-id" ) ),
                            playerSlot = parseInt( event.target.getAttribute( "data-player-slot" ) );

                        // TODO Check if user can do it
                        if ( draggedPlayerUserId && playerSlot ) {
                            joinPugHelper.doJoinDifferentPugSlot( draggedPlayerUserId, viewModel.pug(), playerSlot );
                        }
                        if ( playerUserId && draggedPlayerSlot ) {
                            joinPugHelper.doJoinDifferentPugSlot( playerUserId, viewModel.pug(), draggedPlayerSlot );
                        }
                    }
                },
                ondropdeactivate: function ( event ) {
                    //console.log( "OnDropActivate", event.target );
                }
            } );
        }

        /**
         * Deactive player assign mode
         */
        function doDeactivatePlayerAssignMode() {
            viewModel.isPlayerAssignMode( false );
            Global.toolbar.doHideContext();

            interact( 'player[taken]' ).draggable( {
                enabled: false
            } );

            interact( 'player' ).dropzone( {
                enabled: false
            } );
        }

        /**
         * Add Pug comment
         */
        function doAddPugComment() {
            if ( !viewModel.pug() ) {
                return;
            }

            var commentMessage = commentTextareaComponent.value();
            if ( !commentMessage ) {
                commentTextareaComponent.error( "Comment message empty" );
                return;
            }

            commentButton.spinner.visible( true );
            commentButton.disabled( true );
            commentTextareaComponent.disabled( true );

            pugHandler.addPugComment( viewModel.pug().id, commentMessage )
                .then( function () {
                    commentTextareaComponent.value( "" );
                    doScrollToComments();
                }, function ( err ) {
                    console.error( TAG, "Error while adding comment", err, err.stack || err.error && err.error.stack );
                    Global.eventHandler.fire( "toast", "Could not add comment" );
                } )
                .finally( function () {
                    commentButton.disabled( false );
                    commentTextareaComponent.disabled( false );
                    commentButton.spinner.visible( false );
                } );
        }

        /**
         * Append Pug comment
         *
         * @param {PugCommentVm} pugCommentVm
         */
        function doAppendPugComment( pugCommentVm ) {
            if ( isReadyToShow && viewModel.pug() && viewModel.pug().id === pugCommentVm.pugId ) {
                viewModel.comments.push( pugCommentVm );
                viewModel.comments( viewModel.comments().sort( sortPugCommentsFunc ) );
            }
        }

        /**
         * Apply argument to page
         *
         * @param {Number} pugId
         * @param {String} [action]
         * @returns {Promise}
         */
        this.doApplyArgument = function ( pugId, action ) {
            if ( pugId ) {
                // join pug
                if ( action === "join" && Global.userId ) {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, PugHelper.getPugFromId( pugId, Global.pugs() ) );
                }
                // scroll to comments
                else if ( action === "comments" ) {
                    doScrollToComments();
                }

                Global.pageHandler.doRedirectToPage( true, "pug/" + pugId );
            }
            else {
                return doInitiatePugPagePromise( pugId );
            }
        };

        /**
         * @param {Number} pugId
         * @returns {Promise}
         */
        function doInitiatePugPagePromise( pugId ) {
            return new Promise( function ( fulfill ) {
                pugHandler.getPug( pugId )
                    .done( function ( getPugResult ) {
                        // TOOLBAR
                        Global.toolbar.title( getPugResult.pugVm.title );
                        Global.toolbar.subtitle( getPugResult.pugVm.message || "" );
                        Global.toolbar.icon( getPugResult.pugVm.game.src );
                        Global.toolbar.setBack( function () {
                            Global.pageHandler.doRedirectToPage( getPugResult.pugVm.isStateFinished() ? "results" : "pugs" );
                        } );
                        Global.toolbar.setContextDoneCallback( doDeactivatePlayerAssignMode );

                        // toolbar items
                        Global.toolbar.doResetMoreItems();

                        assignPlayersMoreItem = Global.toolbar.addMoreItem( "Assign players", Asset.FONT_ICON.DONE, doActivatePlayerAssignMode, false );

                        notifyPugMoreItem = Global.toolbar.addMoreItem( "Notify users", Asset.FONT_ICON.NOTIFICATIONS, doNotifyUsers, false );
                        invitePugMoreItem = Global.toolbar.addMoreItem( "Invite users", Asset.FONT_ICON.GROUP_ADD, doShowInviteUsersDialog, false );
                        cancelPugMoreItem = Global.toolbar.addMoreItem( "Cancel Pick-Up Game", Asset.FONT_ICON.CLEAR, doShowCancelPugAlert, false );

                        // /TOOLBAR

                        viewModel.isPlayerAssignMode( false );

                        // initiate scores
                        var numberOfTeams = getPugResult.pugVm.teams === PugVm.TEAM_ALL_VS_ALL ? getPugResult.pugVm.playersMax : getPugResult.pugVm.teams;
                        scores = [];
                        for ( var i = 0; i < numberOfTeams; i++ ) {
                            scores[i] = knockout.observable( 0 );
                        }

                        commentButton.disabled( false );
                        commentButton.spinner.visible( false );
                        commentTextareaComponent.disabled( false );

                        // initiate pug and comments
                        viewModel.pug( getPugResult.pugVm );
                        viewModel.comments( getPugResult.pugCommentVms );
                        viewModel.comments( viewModel.comments().sort( sortPugCommentsFunc ) );

                        isReadyToShow = true;
                        doUpdatePug();

                        // subscribe to Pug updates
                        if ( pugSubscriber ) {
                            pugSubscriber.dispose();
                        }
                        pugSubscriber = getPugResult.pugVm._updated.subscribe( doUpdatePug.bind( self ) );

                        // on new Pug Comment
                        pugCommentEventToken = Global.eventHandler.on( "pug_comment_new", doAppendPugComment.bind( self ) );

                        fulfill();
                    }, function ( err ) {
                        if ( err.code === Asset.ERROR_CODE.PUG_NOT_EXIST ) {
                            Global.eventHandler.fire( "toast", "Pug does not exist" );
                        }
                        else {
                            Global.eventHandler.fire( "toast", "Error while initiating Pug" );
                            console.error( "[PugPage] Error while initiating PUG", err, err.stack || err.error && err.error.stack );
                        }

                        Global.pageHandler.doRedirectToPage( "pugs" );
                    } );
            } );
        }

        function doShowCancelPugAlert() {
            function doCancelPug( cancelMessage ) {
                Global.eventHandler.fire( "waiting", "Canceling Pick-Up Game..." );

                pugHandler.cancelPug( viewModel.pug().id, cancelMessage )
                    .then( function () {
                        Global.eventHandler.fire( "waiting", false );
                        Global.eventHandler.fire( "toast", "Pug canceled" );
                        Global.pageHandler.doRedirectToPage( "pugs" );
                    }, function ( err ) {
                        console.error( TAG, err.message, err, err.stack );
                        Global.eventHandler.fire( "toast", "Could not cancel PUG" );
                    } );
            }

            if ( PugHelper.isUserPugCreator( Global.userId, viewModel.pug() ) && (viewModel.pug().isStateWaiting() || viewModel.pug().isStatePlaying()) ) {
                cancelPugAlertDialog.doShow( {
                    icon: Asset.svg.clear,
                    title: "Cancel PUG?",
                    message: "Do you want to cancel Pick-Up Game?",
                    okText: "Yes",
                    cancelText: "No",
                    onOk: doCancelPug,
                    promptPlaceholder: "Reason for cancellation"
                } );
            }
        }

        function doShowInviteUsersDialog() {
            inviteUsersComponent.doShow( null, viewModel.pug().invites() );
        }

        function doNotifyUsers() {
            //if ( viewModel.pug().isStateWaiting() ) {
            //    inviteUsersComponent.doShow();
            //}
            //else if ( viewModel.pug().isStatePlaying() ) {
            //    pugHandler.doNotifyUsers( viewModel.pug().id, null, function ( error, userVms ) {
            //        if ( error ) {
            //            console.error( "Could not notify players", error );
            //            Global.eventHandler.fire( "toast", "Could not notify players" );
            //        }
            //        else {
            //            Global.eventHandler.fire( "toast", "Notified " + userVms.length + " players" );
            //        }
            //    } );
            //}
            console.trace( "doNotifyUsers" );
        }

        function doInviteUsersAndGroups( notifyList ) {
            if ( !Util.isArray( notifyList ) ) {
                return;
            }

            if ( !PugHelper.isUserPugCreator( Global.userId, viewModel.pug() ) ) {
                return;
            }

            pugHandler.doInviteUsers( viewModel.pug().id, notifyList )
                .then( function ( pugVm ) {
                    Global.eventHandler.fire( "toast", pugVm.invites().length === 0 ? "Invited everyone" : "Invited " + pugVm.invites().length + " users" );
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    Global.eventHandler.fire( "toast", "Could not invite users" );
                } );
        }

        function doScrollToComments() {
            self.$pagesWrapper.parent().animate( {
                scrollTop: self.$page.find( "article[comments]" ).offset().top - self.$pagesWrapper.parent().offset().top - 20
            }, 250 );
        }

        /**
         * @param {Number} pugId
         * @returns {Promise}
         */
        this.onShowPage = function ( pugId ) {
            return doInitiatePugPagePromise( pugId );
        };

        this.onShownPage = function ( pugId, action ) {
            if ( pugId ) {
                // join pug
                if ( action === "join" && Global.userId ) {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, PugHelper.getPugFromId( pugId, Global.pugs() ) );
                }
                // scroll to comments
                else if ( action === "comments" ) {
                    doScrollToComments();
                }

                Global.pageHandler.doRedirectToPage( true, "pug/" + pugId );
            }

            interact( "player" ).on( "hold", onPlayerHold );

            tabsComponent.doShow();
        };

        this.onHidePage = function () {
            isReadyToShow = false;
            joinPugHelper.doHide();
            inviteUsersComponent.doHide();

            doDeactivatePlayerAssignMode();
            interact( "player" ).off( "hold", onPlayerHold );
            clearTimeout( retrievePugTimeout );
            clearInterval( remainingTimeInterval );

            if ( pugSubscriber ) {
                pugSubscriber.dispose();
            }

            Global.eventHandler.off( pugCommentEventToken );
        };

        this.onHiddenPage = function () {
        };

        function onDomRender() {
            if ( self.isShow ) {
                clearTimeout( domRenderTimeout );
                domRenderTimeout = setTimeout( self.doRefreshPage.bind( self ), 100 );
            }
        }

        function onPlayerClick( playerVm, _, __, event ) {
            if ( $( event.target ).parents( "player" ).hasClass( "dragging" ) ) {
                return;
            }

            if ( viewModel.isPlayerAssignMode() ) {
                return;
            }

            if ( !viewModel.pug() ) {
                console.warn( "Could not action with player; PUG is not set" );
            }

            if ( !viewModel.pug().isCanceled() && viewModel.pug().isStateWaiting() ) {
                var isUserCreator = PugHelper.isUserPugCreator( Global.userId, viewModel.pug() );

                // free slot
                if ( !playerVm.userId ) {
                    if ( !Global.userId ) {
                        console.warn( "Could not join PUG; user not set" );
                        return;
                    }

                    var isUserInPug = PlayerHelper.isUserInPug( Global.userId, viewModel.pug() );

                    // user is creator
                    if ( isUserCreator ) {
                        doShowUsersDialog( playerVm.slot );
                    } else {
                        // join free slot
                        if ( !isUserInPug ) {
                            joinPugHelper.doShowJoinPugDialog( Global.userId, viewModel.pug(), parseInt( playerVm.slot ) );
                        }
                        // move player to slot
                        else if ( isUserInPug && viewModel.pug().isTeamModeAssigned && playerVm.slot ) {
                            joinPugHelper.doJoinDifferentPugSlot( Global.userId, viewModel.pug(), parseInt( playerVm.slot ) );
                        }
                    }
                }
                // player in slot
                else {
                    if ( isUserCreator || Global.userId === playerVm.userId ) {
                        playerContextMenu.userId = playerVm.userId;
                        playerContextMenu.doShow();
                    }
                    else {
                        doShowPlayerProfile( playerVm.userId );
                    }
                }
            }
            else if ( playerVm.userId ) {
                doShowPlayerProfile( playerVm.userId );
            }
        }

        function onPlayerHold() {
            if ( !viewModel.isPlayerAssignMode() ) {
                doActivatePlayerAssignMode();
            }
        }

        function onPugActionClick() {
            if ( !Global.userId ) {
                console.warn( "Could not action PUG; User not set" );
                return;
            }

            if ( !viewModel.pug() ) {
                console.warn( "Could not action PUG; Pug not set" );
                return;
            }

            var isUserInPug = PlayerHelper.isUserInPug( Global.userId, viewModel.pug() );
            if ( viewModel.pug().isStateWaiting() ) {
                if ( isUserInPug ) {
                    joinPugHelper.doShowLeavePugDialog( Global.userId, viewModel.pug() );
                }
                else {
                    joinPugHelper.doShowJoinPugDialog( Global.userId, viewModel.pug() );
                }
            }
            else if ( viewModel.pug().isStatePlaying() ) {
                joinPugHelper.doShowFinishPugDialog( Global.userId, viewModel.pug(), scores.map( function ( scoreObservable ) {
                    return scoreObservable();
                } ) );
            }
        }

        // EVENTS

        //Global.pugs.subscribe( doUpdatePug.bind( self ) );

        // VIEW MODEL

        viewModel.getScore = getScoreViewModel;
        viewModel.onPlayerClick = onPlayerClick;
        viewModel.isViewDisabled = isViewDisabled;
        viewModel.commentTextarea = commentTextareaComponent;
        viewModel.commentButton = commentButton;
        viewModel.getTeams = getTeams;
        viewModel.onPlayersDomRender = onDomRender;
        viewModel.getFromNowText = getFromNowText;
        viewModel.tabs = tabsComponent;
        viewModel.getPugPlayerRate = getPugPlayerRate;

    }

    return PugPage;

} );