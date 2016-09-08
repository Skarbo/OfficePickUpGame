"use strict";

/**
 * @typedef {Object} ItemsDialogComponent.ItemVm
 * @property {String} id
 * @property {String} title
 * @property {String} subtitle
 */

define( [
    "dom",
    "knockout",
    "lib/global",
    "lib/asset",
    "lib/knockout_util",
    "lib/constant",
    "util/util",
    "component/dialog_component"
], function ( $, knockout, Global, Asset, KnockoutUtil, Constant, Util, DialogComponent ) {

    /**
     * @param {Object} options
     * @param {String} options.title
     * @param {Function} options.getItemSearchFields Function( item ) -> [ "search", "fields" ]
     * @param {Function} [options.onSelected]
     * @param {String} [options.type="single"]
     * @param {String} [options.searchPlaceholder="Search..."]
     * @param {boolean|observable} [options.okButtonVisible=false]
     * @param {String|observable} [options.okButtonText="OK"]
     * @constructor
     */
    function ItemsDialogComponent( options ) {
        options = $.extend( {
            type: "single",
            searchPlaceholder: "Search..."
        }, options );

        var SEARCH_RESULT_MAX = 20;

        var self = this;
        this.onSelected = options.onSelected || null;

        var dialog = new DialogComponent( {
            name: 'items',
            template: 'items-dialog-component',
            onHidden: onHidden,
            onShown: onShown
        } );

        var searchValue = knockout.observable( "" );
        var allItems = [],
            items = knockout.observableArray( [] );

        var viewModel = {
            title: options.title,
            search: {
                value: searchValue,
                placeholder: options.searchPlaceholder,
                disabled: false,
                icon: Asset.svg.search,
                onKeyUp: onSearchInputKeyUp
            },
            items: items,
            onItemClick: onItemClick,
            noItemsText: "No items",
            noItems: knockout.computed( function () {
                return items().length === 0;
            } ),
            isItemSelected: isItemSelected,
            okButton: {
                visible: KnockoutUtil.observable( options.okButtonVisible, false ),
                text: KnockoutUtil.observable( options.okButtonText, "OK" ),
                onClick: function () {
                    self.doHide( false );
                }
            },
            cancelButton: {
                visible: true,
                text: knockout.observable( "Cancel" ),
                onClick: function () {
                    self.doHide( true );
                }
            }
        };

        /**
         * @type {observable|observableArray}
         */
        self.selectedItems = isTypeMultiple() ? knockout.observableArray( [] ) : knockout.observable( null );

        // FUNCTIONS

        function isItemSelected( id ) {
            if ( isTypeMultiple() ) {
                return self.selectedItems.indexOf( id ) > -1;
            }
            return false;
        }

        /**
         * @param {ItemsDialogComponent.ItemVm} itemVm
         * @returns {Array}
         */
        function getItemSearchFields( itemVm ) {
            return options.getItemSearchFields ? options.getItemSearchFields( itemVm ) : [itemVm.title, itemVm.subtitle];
        }

        this.doBuild = function ( $wrapper ) {
            dialog.doBuild( $wrapper, viewModel );

            self.$items = dialog.$dialog.find( "section[items]" );
            self.$input = $wrapper.find( "input" );

            dialog.setScroll( self.$items, "button.item" );
        };

        /**
         * @param {Array<ItemsDialogComponent.ItemVm>} allItems_
         * @param {Array<Number|String>} selectedItems
         */
        this.doShow = function ( allItems_, selectedItems ) {
            selectedItems = selectedItems || [];

            if ( !dialog.doShow() ) {
                return;
            }

            allItems = allItems_;
            self.selectedItems( isTypeMultiple() ? selectedItems : null );
            doSearchItems( "" );
        };

        this.doHide = function ( isCancel ) {
            if ( !dialog.doHide( isCancel ) ) {
                return;
            }
        };

        function doSearchItems( searchValue ) {
            var allItems_ = [].concat( allItems ),
                itemResult = [];

            var searchRegExp = new RegExp( searchValue.split( " " ).map( function ( searchPart ) {
                return "(?=.*" + searchPart + ")";
            } ).join( "" ), "i" );

            var isSearchingForFunc = function ( itemVm ) {
                if ( !!searchValue ) {
                    return searchRegExp.test( getItemSearchFields( itemVm ).join( " " ) );
                }
                else {
                    return true;
                }
            };

            for ( var i = 0; i < allItems_.length; i++ ) {
                if ( isSearchingForFunc( allItems_[i] ) ) {
                    itemResult.push( allItems_[i] );
                }

                if ( itemResult >= SEARCH_RESULT_MAX ) {
                    break;
                }
            }

            items( itemResult );
            dialog.doRefresh();
        }

        function doSelectItem( itemVm ) {
            if ( !itemVm ) {
                return;
            }

            self.selectedItems( itemVm );
            self.doHide( false );
        }

        function doSelectFirstItem() {
            doSelectItem( items()[0] );
        }

        /**
         * @param {ItemsDialogComponent.ItemVm} itemVm
         */
        function onItemClick( itemVm ) {
            if ( isTypeMultiple() ) {
                if ( self.selectedItems.indexOf( itemVm.id ) > -1 ) {
                    self.selectedItems.remove( itemVm.id );
                }
                else {
                    self.selectedItems.push( itemVm.id );
                }
            }
            else {
                doSelectItem( itemVm );
            }
        }

        function onHidden( isCancel ) {
            if ( !isCancel && self.onSelected ) {
                self.onSelected( self.selectedItems() || null );
            }
        }

        function onShown() {
            self.$input.focus();
        }

        function onSearchInputKeyUp( vm, event ) {
            if ( event.which === Constant.KEY.ENTER ) {
                doSelectFirstItem();
            }
        }

        function isTypeMultiple() {
            return options.type === "multiple";
        }

        //

        searchValue.subscribe( doSearchItems.bind( self ) );

    }

    return ItemsDialogComponent;

} );