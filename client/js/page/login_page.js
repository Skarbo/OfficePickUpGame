"use strict";

define( [
    "knockout",
    "lib/global",
    "lib/asset",
    "handler/login_handler",
    "component/input_component",
    "component/spinner_component",
    "util/dom_util"
], function ( knockout, Global, Asset, LoginHandler, InputComponent, SpinnerComponent, DomUtil ) {

    function LoginPage() {

        // VARIABLES

        var TAG = "[LoginPage]";

        var self = this;
        var isViewDisabled = knockout.observable( false );
        var isLoggingIn = false;
        var viewModel = {};
        var loginHandler = new LoginHandler();

        // ... COMPONENTS

        var emailInput = new InputComponent( {
            placeholder: "Email",
            hasTopPlaceholder: true,
            disabled: isViewDisabled,
            type: "email",
            tip: "Knowit or Gravatar user"
        } );

        var loginButton = {
            text: "Login",
            title: "Login",
            onClick: doLogin.bind( self ),
            disabled: isViewDisabled,
            spinner: new SpinnerComponent( {type: SpinnerComponent.TYPE_2} ),
            hasFocus: knockout.observable( false )
        };

        // ... /COMPONENTS

        // FUNCTIONS

        function doLogin() {
            if ( isLoggingIn ) {
                return;
            }

            isLoggingIn = true;
            isViewDisabled( true );
            loginButton.spinner.visible( true );

            var email = emailInput.value();

            loginHandler.doLogin( email, function ( err, userVm ) {
                isLoggingIn = false;
                loginButton.spinner.visible( false );
                isViewDisabled( false );

                if ( !userVm ) {
                    err = err || {};
                    console.error( TAG, "Could not login", err );
                    emailInput.error( err.message || "Could not login" );
                    emailInput.hasFocus( true );
                    return;
                }

                DomUtil.doRefresh();
            } );
        }

        this.doBuild = function ( $pagesWrapper ) {
            self.$pagesWrapper = $pagesWrapper;

            self.$page = $( "<page />", {
                'login': '',
                'data-bind': "template: { name: 'login-page' }"
            } );

            knockout.applyBindings( viewModel, self.$page[0] );

            self.$pagesWrapper.append( self.$page );

            emailInput.doBuild( self.$page.find( "wrapper[email-input]" ) );
        };

        this.onShowPage = function () {
            Global.toolbar.title( "Login" );
            Global.toolbar.icon( Asset.FONT_ICON.PERSON_OUTLINE );
        };

        this.onShownPage = function () {
            emailInput.hasFocus( true );
        };

        this.onHidePage = function () {

        };

        this.onHiddenPage = function () {

        };

        // VIEW MODEL

        viewModel.emailInput = emailInput;
        viewModel.loginButton = loginButton;
        viewModel.onFormSubmit = doLogin.bind( this );

    }

    return LoginPage;

} );