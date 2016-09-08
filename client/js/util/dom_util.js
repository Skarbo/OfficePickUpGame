"use strict";

define( [
    "dom",
    "lib/asset"
], function ( $, Asset ) {

    var alertInterval,
        alertCount;
    var faviconOriginal = "favicon.ico",
        faviconAlert = "favicon_alert.ico";

    var cachedLazyImages = [];

    var DomUtil = {};

    DomUtil.transition = function ( $element, transitionClass, transitionFinishedClass, transitionDuration, callback ) {
        $element.addClass( transitionClass );

        setTimeout( function () {
            $element.removeClass( transitionClass );
            if ( transitionFinishedClass ) {
                $element.addClass( transitionFinishedClass );
            }

            if ( callback ) {
                callback();
            }
        }, transitionDuration );
    };

    /**
     * @param $element
     * @param {number} duration
     * @param {Object} [options]
     * @param {String} [options.class]
     * @param {String} [options.classBeforeAnimate]
     * @param {String} [options.classAfterAnimate]
     * @param {String} [options.callback]
     * @param {String} [options.callbackOnSet]
     * @param {boolean} [options.remove]
     */
    DomUtil.doAnimate = function ( $element, duration, options ) {
        options = options || {};

        if ( !$element || $element.hasClass( "animate" ) ) {
            return;
        }

        function doSetAnimation() {
            $element.addClass( "animate" );

            if ( options["class"] ) {
                if ( options.remove ) {
                    $element.removeClass( options["class"] );
                }
                else {
                    $element.addClass( options["class"] );
                }
            }

            if ( options.callbackOnSet ) {
                options.callbackOnSet();
            }

            setTimeout( function () {
                $element.removeClass( "animate" );

                if ( options.classAfterAnimate ) {
                    if ( options.remove ) {
                        $element.removeClass( options.classAfterAnimate );
                    }
                    else {
                        $element.addClass( options.classAfterAnimate );
                    }
                }

                if ( options.callback ) {
                    options.callback();
                }
            }, duration );
        }

        if ( options.classBeforeAnimate ) {
            if ( options.remove ) {
                $element.removeClass( options.classBeforeAnimate );
            }
            else {
                $element.addClass( options.classBeforeAnimate );
            }
            setTimeout( doSetAnimation, 10 );
        }
        else {
            doSetAnimation();
        }
    };

    function doLoadLazyImage( $element ) {
        var lazySrc;
        $element.find( "img[lazy-src]" ).each( function ( i, img ) {
            img.onerror = function () {
                img.src = Asset.img.EMPTY_PNG;
            };

            img.onload = function () {
                $( img ).removeClass( "loading" );
                cachedLazyImages.push( lazySrc );
            };

            lazySrc = img.getAttribute( "lazy-src" );
            if ( img.src !== lazySrc && lazySrc ) {
                if ( cachedLazyImages.indexOf( lazySrc ) === -1 ) {
                    $( img ).addClass( "loading" );
                }
                img.src = lazySrc;
            }
        } );
    }

    DomUtil.doLoadAllLazyImages = function ( $elements ) {
        $elements.each( function ( i, element ) {
            doLoadLazyImage( $( element ) );
        } );
    };

    DomUtil.doLoadLazyImages = function ( $viewPort, $elements ) {
        var viewPortOffset = $viewPort.offset(),
            viewPortTop = viewPortOffset.top,
            viewPortHeight = $viewPort.height(),
            viewPortBottom = viewPortTop + viewPortHeight,
            $element,
            elementOffset,
            elementHeight,
            lazySrc,
            isElementAboveViewPort,
            isElementBellowViewPort,
            elementsLength = $elements.length;

        for ( var i = 0; i < elementsLength; i++ ) {
            $element = $( $elements[i] );
            elementHeight = $element.height();
            elementOffset = $element.offset();
            isElementAboveViewPort = (elementOffset.top + elementHeight) > viewPortTop;
            isElementBellowViewPort = elementOffset.top < viewPortBottom;

            if ( isElementAboveViewPort && isElementBellowViewPort ) {
                doLoadLazyImage( $element );
            }

            if ( !isElementBellowViewPort ) {
                break;
            }
        }
    };

    /**
     * @param {jQuery} $element
     * @param {Function} [callback]
     */
    DomUtil.doReplaceErrorImages = function ( $element, callback ) {
        var onErrorFunc = function ( event ) {
            event.target.setAttribute( "src", Asset.img.EMPTY_PNG );

            if ( callback ) {
                callback( event );
            }
        };
        $element.find( "img" ).off( "error", onErrorFunc ).on( "error", onErrorFunc );
    };

    DomUtil.doRefresh = function () {
        location.reload();
    };

    DomUtil.doSetHeadTitle = function ( headTitle ) {
        $( "head title" ).text( headTitle );
    };

    DomUtil.doSetFavicon = function ( favicon ) {
        var link = $( "<link />", {
            type: 'image/x-icon',
            rel: 'shortcut icon',
            href: favicon
        } );
        $( "head" ).append( link );
    };

    DomUtil.doAlertTab = function ( titleOriginal, titleUpdate, delay ) {
        delay = delay || 1500;

        function doReset() {
            alertCount = 0;
            clearInterval( alertInterval );
            DomUtil.doSetHeadTitle( titleOriginal );

            DomUtil.doSetFavicon( faviconOriginal );
        }

        doReset();

        alertInterval = setInterval( function () {
            DomUtil.doSetHeadTitle( alertCount % 2 === 0 ? titleUpdate : titleOriginal );
            DomUtil.doSetFavicon( alertCount % 2 === 0 ? faviconAlert : faviconOriginal );
            alertCount++;
        }, delay );

        return doReset.bind( this );
    };

    return DomUtil;

} );