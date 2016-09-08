"use strict";

define( [
    "dom",
    "knockout",
    "lib/global",
    "util/util",
    "helper/user_helper",
    "component/items_dialog_component"
], function ( $, knockout, Global, Util, UserHelper, ItemsDialogComponent ) {

    /**
     * @param {Object} options
     * @param {boolean} [options.hasGroups]
     * @param {boolean} [options.isUserFirst=false]
     * @constructor
     * @extends {ItemsDialogComponent}
     */
    function UsersDialogComponent( options ) {

        var itemsDialogComponent = new ItemsDialogComponent( $.extend( options, {
            sortItems: sortItems,
            getItemSearchFields: getUserSearchFields
        } ) );

        this.selectedUsers = itemsDialogComponent.selectedItems;

        // FUNCTIONS

        /**
         * @param {ItemsDialogComponent.ItemVm} itemVm
         * @returns {Array}
         */
        function getUserSearchFields( itemVm ) {
            return itemVm.user ? [itemVm.title, itemVm.subtitle] : [itemVm.title];
        }

        /**
         * @returns {Array<ItemsDialogComponent.ItemVm>}
         */
        function getAllItems() {
            var itemVms = Global.users().map( function ( userVm ) {
                return {
                    user: true,
                    id: userVm.id,
                    image: userVm.image(),
                    title: userVm.name(),
                    subtitle: userVm.email
                };
            } );

            if ( options.hasGroups ) {
                itemVms = itemVms.concat( UserHelper.getUserGroups( Global.users() ).map( function ( userGroupVm ) {
                    return {
                        group: true,
                        id: userGroupVm.title,
                        title: userGroupVm.title,
                        letter: userGroupVm.title.toUpperCase()[0],
                        color: Util.textToColor( userGroupVm.title ),
                        subtitle: userGroupVm.count + " user(s)"
                    };
                } ) );
            }

            itemVms = itemVms.sort( sortItems );

            return itemVms;
        }

        function sortItems( userVmOrGroupVmLeft, userVmOrGroupVmRight ) {
            if ( options.isUserFirst && userVmOrGroupVmLeft.user && userVmOrGroupVmLeft.id === Global.userId ) {
                return -1;
            }

            return userVmOrGroupVmLeft.title.localeCompare( userVmOrGroupVmRight.title );
        }

        this.doBuild = function ( $wrapper ) {
            itemsDialogComponent.doBuild( $wrapper );
        };

        this.doShow = function ( onSelectedCallback, selectedItems ) {
            selectedItems = selectedItems || [];

            if ( onSelectedCallback ) {
                itemsDialogComponent.onSelected = onSelectedCallback;
            }

            itemsDialogComponent.doShow( getAllItems(), selectedItems );
        };

        this.doHide = function () {
            itemsDialogComponent.doHide( true );
        };

    }

    return UsersDialogComponent;

} );