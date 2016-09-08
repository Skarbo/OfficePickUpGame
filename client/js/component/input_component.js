"use strict";

define( [
    "knockout",
    "lib/constant",
    "util/util",
    "util/dom_util",
    "lib/asset",
    "lib/knockout_util"
], function ( knockout, Constant, Util, DomUtil, Asset, KnockoutUtil ) {

    /**
     * @typedef InputDataItem
     * @property {String} title
     * @property {String} subtitle
     * @property {String} search
     */

    /**
     * @param {Object} [options]
     * @param {String} [options.value]
     * @param {String} [options.placeholder]
     * @param {String} [options.tip]
     * @param {String} [options.error]
     * @param {Array<InputDataItem>} [options.datalist]
     * @param {Function} [options.onSelectedDatabind]
     * @param {Function} [options.onSubmit]
     * @param {observable} [options.disabled]
     * @param {boolean} [options.hasTopPlaceholder]
     * @param {boolean} [options.isAlwaysShowTip]
     * @param {String} [options.type]
     * @param {Function|boolean} [options.hidden]
     * @constructor
     */
    function InputComponent( options ) {
        var self = this;

        var RESULT_TAB = 5;

        this.value = KnockoutUtil.observable( options.value, "" );
        this.placeholder = KnockoutUtil.observable( options.placeholder, "" );
        this.tip = KnockoutUtil.observable( options.tip, "" );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.datalist = options.datalist ? KnockoutUtil.observableArray( options.datalist ) : null;
        this.disabled = KnockoutUtil.observable( options.disabled, false );
        this.hasTopPlaceholder = options.hasTopPlaceholder || false;
        this.isAlwaysShowTip = options.isAlwaysShowTip || false;
        this.hasFocus = knockout.observable( false );
        this.type = options.type || "text";
        this.hidden = KnockoutUtil.observable( options.hidden, false );

        var hasDatalist = !!this.datalist;
        this.datalistResult = knockout.observable( [] );

        this.warningIcon = Asset.svg.warning;

        this.showDatalist = knockout.computed( function () {
            return self.datalistResult().length > 0;
        } );

        this.showTip = knockout.computed( function () {
            return self.tip() && !self.error();
        } );

        this.showError = knockout.computed( function () {
            return self.error();
        } );

        this.showTopPlaceholder = knockout.computed( function () {
            return self.value().length > 0;
        } );

        function isDataListVisible() {
            return self.$datalistWrapper && self.$datalistWrapper.css( 'display' ) !== "none";
        }

        function onValueChanged( value ) {
            if ( self.hasFocus() ) {
                self.error( "" );
                doSearchDatalist( value );
            }
        }

        function doSetFocusOnNextDatalistData( element, isDirectionUp ) {
            if ( !element || !self.showDatalist() || !isDataListVisible() ) {
                return;
            }

            var nextElement = isDirectionUp ?
            element.previousElementSibling || element.parentElement.lastElementChild :
            element.nextElementSibling || element.parentElement.firstElementChild;

            if ( nextElement ) {
                nextElement.focus();
            }
        }

        function doSetFocusOnDatalistData( isLastInList ) {
            if ( !self.showDatalist() || !isDataListVisible() ) {
                return;
            }

            var dataList = self.$datalistWrapper.find( "wrapper[data]" );
            doSetFocusOnNextDatalistData( dataList[isLastInList ? dataList.length - 1 : 0] );
        }

        function doSearchDatalist( searchValue ) {
            if ( !hasDatalist ) {
                return;
            }

            if ( searchValue ) {
                searchValue = Util.escapeRegExp( searchValue );
                var searchRegExp = new RegExp( searchValue.split( " " ).map( function ( searchPart ) {
                    return "(?=.*" + searchPart + ")";
                } ).join( "" ), "i" );

                var datalistResult_ = [],
                    length_ = self.datalist().length;
                for ( var i = 0; i < length_; i++ ) {
                    if ( searchRegExp.test( self.datalist()[i].search ) ) {
                        datalistResult_.push( self.datalist()[i] );
                    }

                    if ( datalistResult_.length >= RESULT_TAB ) {
                        break;
                    }
                }
                self.datalistResult( datalistResult_ );
            }
            else {
                self.datalistResult( [] );
            }

            if ( self.datalistResult().length > 0 ) {
                doShowDatalist();
            }
            else {
                doHideDatalist();
            }
        }

        this.onInputKey = function ( object, event ) {
            var isKeyUp = event.which === Constant.KEY.UP,
                isKeyDown = event.which === Constant.KEY.DOWN,
                isKeyEsc = event.which === Constant.KEY.ESC,
                isKeyTab = event.which === Constant.KEY.TAB,
                isKeyEnter = event.which === Constant.KEY.ENTER;

            if ( isKeyUp || isKeyDown ) {
                doSetFocusOnDatalistData( Constant.KEY.UP );
            }
            else if ( options.onSubmit && isKeyEnter ) {
                options.onSubmit( self.value() );
            }
            else if ( isKeyEsc ) {
                doHideDatalist();
            }
        };

        this.onDatabindDataKey = function ( data, event ) {
            var isKeyUp = event.which === Constant.KEY.UP,
                isKeyDown = event.which === Constant.KEY.DOWN,
                isKeyEsc = event.which === Constant.KEY.ESC,
                isKeyEnter = event.which === Constant.KEY.ENTER,
                isKeySpace = event.which === Constant.KEY.SPACE,
                isKeyTab = event.which === Constant.KEY.TAB;

            if ( isKeyUp || isKeyDown ) {
                doSetFocusOnNextDatalistData( event.target, isKeyUp );
            }
            else if ( isKeyEsc ) {
                doHideDatalist();
                self.hasFocus( true );
            }
            else if ( isKeyEnter || isKeySpace ) {
                doSelectedDatabindData( data );
            }
            else if ( isKeyTab ) {
                doHideDatalistIfNotFocused()
            }
        };

        this.onClickDatabindData = function ( data ) {
            doSelectedDatabindData( data );
        };

        this.doBuild = function ( $inputWrapper ) {
            self.$inputWrapper = $inputWrapper;

            self.$input = self.$inputWrapper.find( "input" );
            if ( hasDatalist ) {
                self.$datalistWrapper = self.$inputWrapper.find( "wrapper[datalist]" );
            }

            if ( hasDatalist ) {
                self.datalistResult( self.datalist() );
            }
        };

        this.doShow = function ( value ) {
            self.value( value || "" );
            self.datalistResult( [] );
        };

        function doHideDatalist() {
            if ( self.$datalistWrapper ) {
                self.$datalistWrapper.hide();
            }
        }

        function doShowDatalist() {
            if ( self.$datalistWrapper ) {
                self.$datalistWrapper.show();
                $( "body" ).one( "click", doHideDatalist.bind( this ) );
            }
        }

        function doHideDatalistIfNotFocused() {
            var isDatalistOrInputFocused = false;

            if ( document.activeElement ) {
                if ( document.activeElement === self.$input[0] ) {
                    isDatalistOrInputFocused = true;
                }
                else {
                    self.$datalistWrapper.find( "wrapper[data]" ).forEach( function ( dataElement ) {
                        if ( !isDatalistOrInputFocused && dataElement === document.activeElement ) {
                            isDatalistOrInputFocused = true;
                        }
                    } );
                }
            }

            if ( !isDatalistOrInputFocused ) {
                doHideDatalist();
                self.hasFocus( true );
            }
        }

        function doSelectedDatabindData( data ) {
            if ( data ) {
                self.value( data.title );
                doHideDatalist();
                self.hasFocus( true );

                if ( options.onSelectedDatabind ) {
                    options.onSelectedDatabind( data );
                }
            }
        }

        //

        self.value.subscribe( onValueChanged.bind( this ) );

    }

    return InputComponent;

} );