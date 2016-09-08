"use strict";

define( [
    "knockout",
    "util/dom_util",
    "lib/constant",
    "lib/knockout_util",
    "lib/global"
], function ( knockout, DomUtil, Constant, KnockoutUtil, Global ) {

    /**
     * @param {Object} options
     * @param {Function} [options.onShown]
     * @param {Function} [options.onHidden]
     * @constructor
     */
    function AlertDialogComponent( options ) {
        options = options || {};

        var self = this;
        var viewModel = {};

        var okButton = {
            visible: knockout.observable( true ),
            text: knockout.observable( "OK" ),
            onClick: onClickOk.bind( self )
        };
        var cancelButton = {
            visible: knockout.observable( true ),
            text: knockout.observable( "Cancel" ),
            onClick: onClickCancel.bind( self )
        };

        var onOk = null,
            onCancel = null;

        var icon = knockout.observable(),
            title = knockout.observable(),
            message = knockout.observable(),
            promptPlaceholder = knockout.observable( false ),
            hasPrompt = knockout.computed( function () {
                return promptPlaceholder();
            } ),
            promptHasFocus = knockout.observable( false ),
            prompt = knockout.observable();

        // FUNCTIONS

        this.doBuild = function ( $wrapper ) {
            self.$wrapper = $wrapper;

            self.$dialog = $( "<dialog />", {
                'alert': '',
                'data-bind': "template: { name: 'alert-dialog-component' }"
            } );

            knockout.applyBindings( viewModel, self.$dialog[0] );

            self.$wrapper.append( self.$dialog );
        };

        /**
         * @param {Object} showOptions
         * @param {String} [showOptions.icon]
         * @param {String} [showOptions.title]
         * @param {String} [showOptions.message]
         * @param {Function} [showOptions.onOk]
         * @param {Function} [showOptions.onCancel]
         * @param {String} [showOptions.okText]
         * @param {String} [showOptions.cancelText]
         * @param {boolean} [showOptions.hasNoOk]
         * @param {boolean} [showOptions.hasNoCancel]
         * @param {String} [showOptions.promptPlaceholder]
         */
        this.doShow = function ( showOptions ) {
            if ( self.isShown || self.isShowingOrHiding ) {
                return;
            }

            onOk = showOptions.onOk || null;
            onCancel = showOptions.onCancel || null;

            okButton.text( showOptions.okText || "OK" );
            okButton.visible( !showOptions.hasNoOk );
            cancelButton.text( showOptions.cancelText || "Cancel" );
            cancelButton.visible( !showOptions.hasNoCancel );

            icon( showOptions.icon || null );
            title( showOptions.title || null );
            message( showOptions.message || null );
            prompt( "" );
            promptPlaceholder( showOptions.promptPlaceholder || null );

            self.isShowingOrHiding = true;

            self.$dialog.on( "click", onDialogClick );
            $( "body" ).on( "keyup", onDialogKey );

            Global.isViewDisabled( false );

            DomUtil.doAnimate( self.$dialog, Constant.TRANSITION.DIALOG, {
                classBeforeAnimate: "visible",
                'class': "show",
                callback: function () {
                    self.isShown = true;
                    self.isShowingOrHiding = false;

                    if ( hasPrompt() ) {
                        promptHasFocus( true );
                    }

                    if ( options.onShown ) {
                        options.onShown();
                    }
                },
                callbackOnSet: function () {

                }
            } );
        };

        this.doHide = function () {
            if ( !self.isShown || self.isShowingOrHiding ) {
                return;
            }

            self.isShowingOrHiding = true;

            self.$dialog.off( "click", onDialogClick );
            $( "body" ).off( "keyup", onDialogKey );

            DomUtil.doAnimate( self.$dialog, Constant.TRANSITION.DIALOG, {
                'class': "show",
                classAfterAnimate: "visible",
                remove: true,
                callback: function () {
                    self.isShown = false;
                    self.isShowingOrHiding = false;

                    if ( options.onHidden ) {
                        options.onHidden();
                    }
                }
            } );
        };

        function onDialogClick( event ) {
            if ( $( event.target ).find( "article[dialog]" ).length > 0 ) {
                self.doHide();
            }
        }

        function onDialogKey( event ) {
            if ( event.which === Constant.KEY.ESC ) { // ESC key
                self.doHide();
            }
        }

        function onClickOk() {
            if ( onOk ) {
                onOk( prompt() || null );
            }

            self.doHide();
        }

        function onClickCancel() {
            if ( onCancel ) {
                onCancel();
            }

            self.doHide();
        }

        // VIEW MODEL

        viewModel.okButton = okButton;
        viewModel.cancelButton = cancelButton;
        viewModel.icon = icon;
        viewModel.title = title;
        viewModel.message = message;
        viewModel.prompt = {
            visible: hasPrompt,
            placeholder: promptPlaceholder,
            value: prompt,
            hasFocus: promptHasFocus
        };

    }

    return AlertDialogComponent;

} );