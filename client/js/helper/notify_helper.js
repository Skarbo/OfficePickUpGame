"use strict";

define( [
    "dom",
    "lib/asset",
    "util/util",
], function ( $, Asset, Util ) {

    var NotifyHelper = {};

    NotifyHelper.requestNotificationPermission = function () {
        if ( !NotifyHelper.isNotificationSupported() && !NotifyHelper.isNotificationGranted() && !NotifyHelper.isNotificationDenied() ) {
            return false;
        }

        window.Notification.requestPermission( function ( /*status*/ ) {

        } );

        return true;
    };

    NotifyHelper.isNotificationSupported = function () {
        return "Notification" in window;
    };

    NotifyHelper.isNotificationGranted = function () {
        return NotifyHelper.isNotificationSupported() && Notification.permission === "granted";
    };

    NotifyHelper.isNotificationDenied = function () {
        return NotifyHelper.isNotificationSupported() && Notification.permission === "denied";
    };

    /**
     * @param {String} title
     * @param {String} body
     * @param {Object} [options]
     * @param {String} [options.icon]
     * @param {String} [options.tag]
     * @param {Function} [options.onClick]
     * @param {Function} [options.onShow]
     * @param {Function} [options.onError]
     * @param {Function} [options.onClose]
     * @param {number} [options.timer]
     * @return {Notification}
     */
    NotifyHelper.createNotification = function ( title, body, options ) {
        options = $.extend( {}, {
            icon: Util.getLocationUrlBase() + Asset.img.KPUG_LOGO_PNG,
            tag: null,
            onClick: null,
            onShow: null,
            onError: null,
            onClose: null
        }, options );

        if ( !NotifyHelper.isNotificationGranted() ) {
            return null;
        }

        var notification = new window.Notification( title, {
            body: body,
            icon: options.icon,
            tag: options.tag
        } );

        notification.onclick = options.onClick;
        notification.onShow = options.onShow;
        notification.onerror = options.onError;
        notification.onclose = options.onClose;

        setTimeout( function () {
            if ( notification ) {
                notification.close();
            }
        }, 1000 * 60 * 1 );

        return notification;
    };

    return NotifyHelper;

} );