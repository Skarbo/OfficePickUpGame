"use strict";

define( [
    "knockout",
    "lib/global",
    "lib/asset",
    "util/util",
    "component/input_component",
    "component/textarea_component",
    "component/checkbox_component",
    "component/select_game_component",
    "component/drag_component",
    "component/users_dialog_component",
    "component/toggle_component",
    "helper/game_helper",
    "helper/user_helper",
    "handler/pug_handler",
    "handler/event_handler",
    "vm/pug_vm"
], function ( knockout, Global, Asset, Util, InputComponent, TextareaComponent, CheckboxComponent, SelectGameComponent, DragComponent, UsersDialogComponent, ToggleComponent, GameHelper, UserHelper, PugHandler, eventHandler, PugVm ) {

    function NewPugPage() {

        // VARIABLES

        var self = this;
        var viewModel = {};
        var isViewDisabled = Global.isViewDisabled;
        var isCreatingNewPug = false;
        var pugHandler = new PugHandler();

        var readyPlayers = knockout.observableArray( [] );
        var inviteList = knockout.observableArray( [] );

        viewModel.selectGameText = "Select game";
        viewModel.messageText = "Message";
        viewModel.playersText = "Players";
        viewModel.freeText = "Free";
        viewModel.readyPlayersTipText = "Players ready for game";
        viewModel.inviteText = "Invite";
        viewModel.inviteEveryoneText = "Inviting everyone";
        viewModel.removeIcon = Asset.svg.remove;

        var numberOfPlayersAllowed = null,
            numberOfTeamsAllowed = null;

        // ... COMPONENTS

        var selectGame = new SelectGameComponent( {
            disabled: isViewDisabled
        } );

        var messageTextarea = new TextareaComponent( {
            placeholder: "Message",
            disabled: isViewDisabled
        } );

        var playersDrag = new DragComponent( {
            steps: 9,
            tip: "Number of players needed",
            createValue: function ( step ) {
                return parseInt( step ) + 1;
            },
            onChanged: doChangeMaxPlayers.bind( self )
        } );

        var usersDialog = new UsersDialogComponent( {
            title: "Select Player",
            onSelected: onPlayerUserSelected,
            isUserFirst: true
        } );

        var inviteInput = new InputComponent( {
            placeholder: "Invite user",
            tip: "Invite users to game",
            datalist: [],
            onSelectedDatabind: function ( playerOrGroupSelected ) {
                if ( playerOrGroupSelected ) {
                    if ( playerOrGroupSelected.user ) {
                        doInviteUser( playerOrGroupSelected.user );
                    }
                    else if ( playerOrGroupSelected.group ) {
                        doInviteGroup( playerOrGroupSelected.group );
                    }
                    inviteInput.value( "" );
                }
            },
            disabled: isViewDisabled
        } );

        var teamsToggle = new ToggleComponent( {
            disabled: Global.isViewDisabled,
            tip: "Teams",
            options: {}
        } );

        var teamModeToggle = new ToggleComponent( {
            disabled: Global.isViewDisabled,
            tip: "Team mode",
            options: {}
        } );

        // FUNCTIONS

        /**
         * Create new Pug
         */
        function doCreateNewPug() {
            if ( isCreatingNewPug ) {
                return;
            }

            if ( !doValidatePug() ) {
                return;
            }

            isCreatingNewPug = true;
            isViewDisabled( true );
            eventHandler.fire( "waiting", "Creating Pick-Up Game..." );

            var gameId = selectGame.checked(),
                gameOtherTitle = selectGame.otherInput.value(),
                message = messageTextarea.value(),
                playersMax = playersDrag.value(),
                teams = teamsToggle.value(),
                teamMode = teamModeToggle.value();

            var game = GameHelper.getGameFromId( gameId, Global.games );

            var pugOptions = {};
            pugOptions[PugVm.SETTING_TEAMS] = teams;
            pugOptions[PugVm.SETTING_TEAM_MODE] = teamMode;
            pugOptions[PugVm.SETTING_PLAYERS] = playersMax;
            pugOptions[PugVm.SETTING_GAME_OTHER] = game.other ? gameOtherTitle : null;

            if ( readyPlayers().length > 0 ) {
                pugOptions[PugVm.OPTION_READY_PLAYERS] = readyPlayers().map( function ( readyPlayerVm ) {
                    return readyPlayerVm.user() ? {
                        userId: readyPlayerVm.user().id,
                        slot: readyPlayerVm.slot
                    } : null;
                } ).filter( function ( userVm ) {
                    return !!userVm;
                } );
            }

            if ( inviteList().length > 0 ) {
                pugOptions[PugVm.SETTING_INVITES] = inviteList().map( function ( invite ) {
                    return invite.user ? invite.user.id : invite.group.title;
                } );
            }

            pugHandler.doAddPug( gameId, message, pugOptions )
                .then( function ( pugVm ) {
                    eventHandler.fire( "toast", "Created new Pick-Up Game" );
                    Global.pageHandler.doRedirectToPage( "pugs/" + pugVm.id );
                }, function ( err ) {
                    console.error( "Error while adding Pug", err );
                    eventHandler.fire( "toast", "Could not create Pick-Up Game" );
                } )
                .finally( function () {
                    isCreatingNewPug = false;
                    isViewDisabled( false );
                    eventHandler.fire( "waiting", false );
                } );
        }

        /**
         * Validate Pug
         *
         * @returns {boolean} True if Pug is valid
         */
        function doValidatePug() {
            selectGame.error( "" );
            selectGame.otherInput.error( "" );
            playersDrag.error( "" );

            var gameId = selectGame.checked(),
                game = GameHelper.getGameFromId( gameId, Global.games );

            if ( !gameId || !game ) {
                selectGame.error( "Must select one game" );
                selectGame.doScroll();
                return false;
            }

            var gameOtherTitle = selectGame.otherInput.value();
            if ( game.other && !gameOtherTitle ) {
                selectGame.otherInput.error( "Game must be specified" );
                selectGame.otherInput.hasFocus( true );
                selectGame.doScroll();
                return false;
            }

            var players = playersDrag.value();
            if ( !players ) {
                playersDrag.error( "Set number of players" );
                playersDrag.doScroll();
                return false;
            }

            var gameMode = parseInt( teamsToggle.value() );
            if ( PugVm.TEAMS.indexOf( gameMode ) === -1 ) {
                teamsToggle.error( "Game mode does not exist" );
                teamsToggle.doScroll();
                return false;
            }

            var teamMode = teamModeToggle.value();
            if ( PugVm.TEAM_MODES.indexOf( teamMode ) === -1 ) {
                teamModeToggle.error( "Team mode does not exist" );
                teamModeToggle.doScroll();
                return false;
            }

            return true;
        }

        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'new-pug': '',
                'html': Asset.TEMPLATE.NEW_PUG_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            selectGame.doBuild( self.$page.find( "wrapper[select-game]" ) );
            messageTextarea.doBuild( self.$page.find( "wrapper[message-textarea]" ) );
            playersDrag.doBuild( self.$page.find( "wrapper[players-drag]" ) );
            usersDialog.doBuild( Global.$dialogWrapper );
            inviteInput.doBuild( self.$page.find( "wrapper[invite-input]" ) );
            teamsToggle.doBuild( self.$page.find( "wrapper[game-mode-toggle]" ) );
            teamModeToggle.doBuild( self.$page.find( "wrapper[team-mode-toggle]" ) );
        };

        function doUpdateReadyPlayers() {
            var playersMax = playersDrag.value();
            var teams = teamsToggle.value();

            readyPlayers( readyPlayers().slice( 0, playersMax ) );

            for ( var i = 0; i < playersMax; i++ ) {
                var slot = i + 1;
                var team = Math.ceil( slot / (playersMax / teams) );

                if ( !readyPlayers()[i] ) {
                    readyPlayers.push( {
                        slot: slot,
                        team: knockout.observable( team ),
                        user: knockout.observable( null )
                    } );
                }
                else {
                    readyPlayers()[i].team( team );
                }
            }

            teamsToggle.options( createTeamsOptions() );
            doUpdateTeamMode();
        }

        function doToggleReadyPlayer( userId, index ) {
            var isAlreadyReady = false;
            for ( var i = 0; i < readyPlayers().length; i++ ) {
                if ( readyPlayers()[i].user() && readyPlayers()[i].user().id === userId ) {
                    isAlreadyReady = true;
                    break;
                }
            }

            readyPlayers()[index].user( !isAlreadyReady ? UserHelper.getUserFromId( userId, Global.users() ) : null );
            readyPlayers.notifySubscribers();

            //doUpdateReadyPlayers();
        }

        function doPopulateInviteDatalist() {
            var inviteDatalist = [];

            Global.users().forEach( function ( user ) {
                inviteDatalist.push( {
                    title: user.name(),
                    subtitle: user.email,
                    search: user.getSearch(),
                    image: user.image(),
                    user: user
                } );
            } );

            UserHelper.getUserGroups( Global.users() ).forEach( function ( userGroupVm ) {
                inviteDatalist.push( {
                    title: userGroupVm.title,
                    subtitle: userGroupVm.count + " users",
                    search: userGroupVm.title,
                    letter: {
                        letter: userGroupVm.title.toUpperCase()[0],
                        color: Util.textToColor( userGroupVm.title )
                    },
                    group: userGroupVm
                } );
            } );

            inviteInput.datalist( inviteDatalist );
        }

        function doInviteUser( userVm ) {
            for ( var i = 0; i < inviteList().length; i++ ) {
                if ( inviteList()[i].user && inviteList()[i].user.id === userVm.id ) {
                    return false;
                }
            }

            inviteList.push( {
                image: userVm.image(),
                title: userVm.name(),
                subtitle: userVm.email,
                user: userVm
            } );
        }

        function doInviteGroup( userGroupVm ) {
            for ( var i = 0; i < inviteList().length; i++ ) {
                if ( inviteList()[i].group && inviteList()[i].group.title === userGroupVm.title ) {
                    return false;
                }
            }

            inviteList.push( {
                letter: userGroupVm.title.toUpperCase()[0],
                color: Util.textToColor( userGroupVm.title ),
                title: userGroupVm.title,
                subtitle: userGroupVm.count + " users",
                group: userGroupVm
            } );
        }

        function doRemoveInvite( invite ) {
            inviteList.remove( function ( invite_ ) {
                return (invite.user && invite_.user && invite.user.id === invite_.user.id) || (invite.group && invite_.group && invite.group.title === invite_.group.title);
            } );
        }

        function createTeamsOptions() {
            var teamsMax = Math.ceil( playersDrag.value() / 2 );

            var teamsPossibleObj = {
                    1: "All vs. all",
                    2: "Two teams",
                    3: "Three teams",
                    4: "Four teams",
                    5: "Five teams"
                },
                teamsObj = {};

            if ( numberOfTeamsAllowed === null ) {
                for ( var i = 1; i <= teamsMax; i++ ) {
                    teamsObj[i] = teamsPossibleObj[i];
                }
            }
            else {
                for ( var i = 0; i < numberOfTeamsAllowed.length; i++ ) {
                    teamsObj[numberOfTeamsAllowed[i]] = teamsPossibleObj[numberOfTeamsAllowed[i]];
                }
            }

            return teamsObj;
        }

        function createTeamModeOptions() {
            var options = {};

            if ( teamsToggle.value() == PugVm.TEAM_ALL_VS_ALL ) {
                options[PugVm.TEAM_MODE_NONE] = "None";
            }
            else {
                options[PugVm.TEAM_MODE_ASSIGNED] = "Assigned";
                options[PugVm.TEAM_MODE_RANDOM] = "Random";
            }

            return options;
        }

        this.onShowPage = function () {
            Global.toolbar.title( "New Pick-Up Game" );
            Global.toolbar.icon( Asset.FONT_ICON.OPUG_CONTROLLER );
            Global.toolbar.addButton( {
                title: "Create Pick-Up Game",
                label: "Create PUG",
                icon: Asset.FONT_ICON.OPUG_CONTROLLER,
                onClick: doCreateNewPug.bind( this )
            } );

            selectGame.doShow( null, Global.games );
            messageTextarea.doShow( "" );
            playersDrag.setStep( 3 );
            teamsToggle.doShow( 2, createTeamsOptions() );
            teamModeToggle.doShow( PugVm.TEAM_MODE_ASSIGNED, createTeamModeOptions() );
            readyPlayers( [] );
            inviteList( [] );
            inviteInput.value( "" );

            doUpdateReadyPlayers();
            doToggleReadyPlayer( Global.userId, 0 );
            doPopulateInviteDatalist();
        };

        this.onShownPage = function () {
            playersDrag.doShow();
            doUpdateReadyPlayers();
        };

        this.onHidePage = function () {
            usersDialog.doHide();
        };

        this.onHiddenPage = function () {

        };

        function onSelectGame( gameId ) {
            var game = GameHelper.getGameFromId( gameId, Global.games );

            playersDrag.doEnable();
            if ( game ) {
                if ( game.players ) {
                    numberOfPlayersAllowed = [].concat( game.players );
                    doChangeMaxPlayers();

                    if ( numberOfPlayersAllowed.length === 1 ) {
                        playersDrag.doEnable( true );
                    }
                }
                else {
                    numberOfPlayersAllowed = null;
                }

                numberOfTeamsAllowed = game.teams ? [].concat( game.teams ) : null;
            }

            doUpdateTeams();
        }

        function onPlayerReadyClick( playerReadyVm, index ) {
            if ( !playerReadyVm.user() ) {
                usersDialog.playerReadyIndex = index;
                usersDialog.doShow();
            }
            else {
                doToggleReadyPlayer( playerReadyVm.user().id, index );
            }
        }

        /**
         * @param {ItemsDialogComponent.ItemVm} itemVm
         */
        function onPlayerUserSelected( itemVm ) {
            if ( !itemVm ) {
                return;
            }

            var readyPlayersWithUsers = readyPlayers().filter( function ( readyPlayerVm ) {
                return readyPlayerVm.user();
            } );
            if ( readyPlayersWithUsers.length >= playersDrag.value() ) {
                console.warn( "Could not add selected player; max players reached", itemVm );
                return;
            }

            for ( var i = 0; i < readyPlayers().length; i++ ) {
                if ( readyPlayers()[i].user() && readyPlayers()[i].user().id === itemVm.id ) {
                    console.info( "Could not add selected player; is already player", itemVm );
                    return;
                }
            }

            doToggleReadyPlayer( itemVm.id, usersDialog.playerReadyIndex );
        }

        function doChangeMaxPlayers( step ) {
            if ( numberOfPlayersAllowed !== null ) {
                var newMaxPlayers = Util.closestNumberInArray( playersDrag.value(), numberOfPlayersAllowed ),
                    newStep = newMaxPlayers - 1;
                if ( step != newStep ) {
                    playersDrag.setStep( newStep );
                }
            }
        }

        function doUpdateTeams() {
            teamsToggle.options( createTeamsOptions() );

            if ( numberOfTeamsAllowed !== null ) {
                teamsToggle.value( Util.closestNumberInArray( teamsToggle.value(), numberOfTeamsAllowed ) );
            }
        }

        function doUpdateTeamMode() {
            teamModeToggle.options( createTeamModeOptions() );
        }

        function onChangedTeams() {
            doUpdateReadyPlayers();
        }

        //

        selectGame.checked.subscribe( onSelectGame.bind( self ) );
        playersDrag.value.subscribe( doUpdateReadyPlayers.bind( self ) );
        teamsToggle.value.subscribe( onChangedTeams.bind( self ) );

        // VIEW MODEL

        viewModel.selectGame = selectGame;
        viewModel.messageTextarea = messageTextarea;
        viewModel.playersDrag = playersDrag;
        viewModel.inviteInput = inviteInput;
        viewModel.readyPlayers = readyPlayers;
        viewModel.invitePlayers = inviteList;
        viewModel.isViewDisabled = isViewDisabled;
        viewModel.teamsToggle = teamsToggle;
        viewModel.teamModeToggle = teamModeToggle;
        viewModel.onPlayerReadyClick = onPlayerReadyClick;
        viewModel.doRemoveInvite = doRemoveInvite;
        viewModel.onFormSubmit = doCreateNewPug.bind( this );

    }

    return NewPugPage;

} );