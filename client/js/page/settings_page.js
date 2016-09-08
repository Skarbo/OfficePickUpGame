"use strict";

define( [
    "knockout",
    "moment",
    "lib/global",
    "lib/asset",
    "util/util",
    "util/dom_util",
    "handler/event_handler",
    "handler/user_handler",
    "handler/application_handler",
    "helper/user_helper",
    "component/input_component",
    "component/button_component",
    "component/alert_dialog_component",
    "component/checkbox_component"
], function ( knockout, moment, Global, Asset, Util, DomUtil, eventHandler, UserHandler, ApplicationHandler, UserHelper, InputComponent, ButtonComponent, AlertDialogComponent, CheckboxComponent ) {

    function SettingsPage() {

        // VARIABLES

        var TAG = "[SettingsPage]";

        var self = this;

        var isViewDisabled = Global.isViewDisabled;
        var userVm = null;
        var userSubscriber = null;
        var userSettingsUsePushNotification = knockout.observable( false );
        var viewModel = {
            userGroups: knockout.observableArray( [] ),
            removeUserGroupText: "Remove user group",
            notifications: {
                pugNotifications: []
            },
            pushNotification: {
                pushDevices: knockout.observableArray( [] ),
                addDeviceButton: null,
                usePushDevicesCheckbox: null,
                canAddDevice: knockout.observable( false ),
                doRemovePushDevice: doRemovePushDevice.bind( self )
            }
        };
        var userHandler = new UserHandler();
        var applicationHandler = new ApplicationHandler();

        // ... COMPONENTS

        var groupInput = new InputComponent( {
            placeholder: "Add group",
            tip: "Eq: Magma, Foospros",
            datalist: [],
            onSelectedDatabind: function ( groupSelected ) {
                if ( groupSelected ) {
                    doAddGroup( groupSelected.title );
                    groupInput.value( "" );
                }
            },
            onSubmit: doAddGroup
        } );

        var deleteButton = new ButtonComponent( {
            text: "Delete",
            onClick: doShowDeleteUserAlertDialog.bind( self ),
            disabled: Global.isViewDisabled
        } );

        // pug notifications

        viewModel.notifications.pugNotifications.push( new CheckboxComponent( {
            value: "New Pick-Up Game",
            tip: "Notify when a new PUG is created",
            isAlwaysShowTip: true,
            notifyCode: Asset.NOTIFY_CODE.PUG_NEW
        } ) );
        viewModel.notifications.pugNotifications.push( new CheckboxComponent( {
            value: "Ready Pick-Up Game",
            tip: "Notify when your PUG is ready",
            isAlwaysShowTip: true,
            notifyCode: Asset.NOTIFY_CODE.PUG_STATE_READY
        } ) );
        viewModel.notifications.pugNotifications.push( new CheckboxComponent( {
            value: "Finished Pick-Up Game",
            tip: "Notify when your PUG is finished",
            isAlwaysShowTip: true,
            notifyCode: Asset.NOTIFY_CODE.PUG_STATE_FINISH
        } ) );
        viewModel.notifications.pugNotifications.push( new CheckboxComponent( {
            value: "Canceled Pick-Up Game",
            tip: "Notify when your PUG is canceled",
            isAlwaysShowTip: true,
            notifyCode: Asset.NOTIFY_CODE.PUG_CANCELED_MESSAGE
        } ) );

        // /pug notifications

        // use push devices checkbox
        viewModel.pushNotification.usePushDevicesCheckbox = new CheckboxComponent( {
            checked: userSettingsUsePushNotification,
            value: "Use push notification"
        } );

        // add device button
        viewModel.pushNotification.addDeviceButton = new ButtonComponent( {
            text: "Add device",
            onClick: doAddPushDevice.bind( self ),
            disabled: Global.isViewDisabled
        } );

        // delete user alert dialog
        var deleteUserAlert = new AlertDialogComponent( {} );

        // subscribe
        userSettingsUsePushNotification.subscribe( doSaveUserSettings, self );

        viewModel.notifications.pugNotifications.forEach( function ( checkboxComponent ) {
            checkboxComponent.checked.subscribe( doSaveUserSettings, self );
        } );

        // FUNCTIONS

        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'settings': '',
                'html': Asset.TEMPLATE.SETTINGS_PAGE
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            deleteUserAlert.doBuild( Global.$dialogWrapper );
            groupInput.doBuild( self.$page.find( "wrapper[group-input]" ) );
        };

        function doAddPushDevice() {
            var registerId = applicationHandler.getRegisterToken();

            if ( registerId ) {
                userHandler.doAddOrRemoveUserDevice( registerId, false, {
                    name: applicationHandler.getDeviceName()
                } )
                    .then( function () {
                        Global.eventHandler.fire( "toast", "Added push device" );
                    }, function ( err ) {
                        console.error( TAG, err.message, err, err.stack );
                        Global.eventHandler.fire( "toast", "Could not add push device" );
                    } );
            }
        }

        function doRemovePushDevice( device ) {
            userHandler.doAddOrRemoveUserDevice( device.id, true, null )
                .then( function () {
                    Global.eventHandler.fire( "toast", "Removed push device" );
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    Global.eventHandler.fire( "toast", "Could not remove push device" );
                } );
        }

        function doShowDeleteUserAlertDialog() {
            deleteUserAlert.doShow( {
                title: "Delete user?",
                message: "Do you want to delete '" + userVm.name() + "'?",
                okText: "Delete",
                onOk: doDeleteUser.bind( self )
            } );
        }

        function doAddGroup() {
            var userGroup = groupInput.value(),
                userGroups = userVm.groups();

            if ( !(/[a-z]/i.test( userGroup ) ) ) {
                groupInput.error( "Must contain one letter" );
                return;
            }

            userGroups.push( userGroup );
            groupInput.disabled( true );

            doSaveUserGroups( userGroups, function ( err ) {
                if ( !err ) {
                    eventHandler.fire( "toast", "Added user group" );
                }
                groupInput.value( "" );
                groupInput.disabled( false );
                groupInput.hasFocus( true );
            } );
        }

        function doDeleteUser() {
            var user = Global.userId;
            eventHandler.fire( "waiting", "Deleting user" );
            Global.isViewDisabled( true );

            Global.kpugApi.doDeleteUser( user.userId(), user.userEmail(), function ( error, data ) {
                try {
                    if ( error ) {
                        throw error;
                    }
                    else {
                        if ( data.error ) {
                            throw data.error;
                        }
                        else if ( !data.data || !data.data.result ) {
                            throw data.data;
                        }

                        eventHandler.fire( "toast", "User deleted" );
                        DomUtil.doRefresh();
                    }
                }
                catch ( error ) {
                    console.error( "Could not delete user", error );
                    eventHandler.fire( "toast", "Could not delete user" );
                }

                eventHandler.fire( "waiting", false );
            } );
        }

        function doRemoveUserGroup( userGroupVm ) {
            var userGroups = userVm.groups(),
                indexOf = userGroups.indexOf( userGroupVm.title );

            userGroups.splice( indexOf, 1 );

            doSaveUserGroups( userGroups, function ( err ) {
                if ( !err ) {
                    eventHandler.fire( "toast", "Removed user group" );
                }
            } );
        }

        function doSaveUserGroups( userGroups, callback ) {
            userGroups = Util.uniqueArray( userGroups );

            userHandler.setUserGroups( userGroups )
                .then( function () {
                    self.doRefreshPage();

                    if ( callback ) {
                        callback();
                    }
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    eventHandler.fire( "toast", err.message );

                    if ( callback ) {
                        callback( err );
                    }
                } );
        }

        function doSaveUserSettings() {
            if ( !self.isShown ) {
                return;
            }

            // get dont notify codes
            var dontNotifyArray = viewModel.notifications.pugNotifications.map( function ( checkboxComponent ) {
                return checkboxComponent.checked() ? null : checkboxComponent.options.notifyCode;
            } ).filter( function ( notifyCode ) {
                return !!notifyCode;
            } );

            userHandler.doSaveUser( {
                settings: {
                    dontUsePushNotification: !userSettingsUsePushNotification(),
                    dontNotify: dontNotifyArray
                }
            } )
                .then( function () {
                    Global.eventHandler.fire( "toast", "Settings saved" );
                }, function ( err ) {
                    console.error( TAG, err.message, err, err.stack );
                    Global.eventHandler.fire( "toast", "Could not save settings" );
                } );
        }

        this.doRefreshPage = function () {
            var doUpdateUserGroups = function () {
                viewModel.userGroups( userVm.groups().map( function ( userGroup ) {
                    return {
                        title: userGroup,
                        color: Util.textToColor( userGroup )
                    };
                } ) );
            };

            var doUpdateNotification = function () {
                var deviceRegisterId = applicationHandler.getRegisterToken();

                viewModel.pushNotification.pushDevices( userVm.devices().map( function ( device ) {
                    return {
                        name: device.name,
                        date: moment( new Date( device.date ) ).format( "DD. MMM YY" ),
                        id: device.id
                    };
                } ) );
                viewModel.pushNotification.canAddDevice( Global.isApplication && !UserHelper.doesUserHaveDevice( userVm, deviceRegisterId ) );
            };

            var doPopulateGroupsDatalist = function () {
                groupInput.datalist( UserHelper.getUserGroups( Global.users() ).map( function ( userGroupVm ) {
                    return {
                        title: userGroupVm.title,
                        subtitle: userGroupVm.count + " users",
                        search: userGroupVm.title
                    };
                } ) );
            };

            var doUpdateSettings = function () {
                viewModel.notifications.pugNotifications.forEach( function ( checkboxComponent ) {
                    checkboxComponent.checked( (userVm.settings().dontNotify || []).indexOf( checkboxComponent.options.notifyCode ) === -1 );
                } );

                userSettingsUsePushNotification( userVm.settings().dontUsePushNotification !== true );
            };

            doUpdateUserGroups();
            doUpdateNotification();
            doPopulateGroupsDatalist();
            doUpdateSettings();
        };

        this.onShowPage = function () {
            Global.toolbar.title( "Settings" );
            Global.toolbar.icon( Asset.FONT_ICON.SETTINGS );

            userVm = UserHelper.getUserFromId( Global.userId, Global.users() );

            // User must exist
            if ( !userVm ) {
                Global.pageHandler.doRedirectToPage( "pugs" );
                Global.eventHandler.fire( "toast", "Could not get user" );
                return;
            }

            // subscribe to User updates
            userSubscriber = userVm._updated.subscribe( self.doRefreshPage.bind( self ) );

            self.doRefreshPage();
        };

        this.onShownPage = function () {
            applicationHandler.showToast( "Is android: " + applicationHandler.isAndroid + ", is App: " + Global.isApplication );
        };

        this.onHidePage = function () {
            // unsubscribe User updates
            if ( userSubscriber ) {
                userSubscriber.dispose();
            }
        };

        //

        viewModel.deleteButton = deleteButton;
        viewModel.groupInput = groupInput;
        viewModel.onUserGroupClick = doRemoveUserGroup;

    }

    return SettingsPage;

} );