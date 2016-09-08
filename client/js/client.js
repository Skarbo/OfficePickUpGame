"use strict";

requirejs.config( {
    config: {
        'GA': {
            'id': "UA-16538668-9"
        }
    },
    "baseUrl": "js",
    "paths": {
        //"dom": "bower_components/zepto/zepto.min",
        "dom": "bower_components/jquery/dist/jquery.min",
        "knockout": "bower_components/knockout/dist/knockout",
        "humanize": "bower_components/humanize/humanize",
        "mousetrap": "bower_components/mousetrap/mousetrap.min",
        "moment": "bower_components/moment/min/moment.min",
        "dragdealer": "bower_components/dragdealer/src/dragdealer",
        "interact": "bower_components/interact/interact.min",
        "markdown": "bower_components/markdown-js/dist/markdown.min",
        "EventEmitter": "bower_components/event-emitter/dist/EventEmitter",
        "GA": "bower_components/requirejs-google-analytics/dist/GoogleAnalytics",
        "text": "bower_components/requirejs-text/text",
        "socketio": "bower_components/socket.io-client/socket.io"
    }, shim: {
        "dom": {
            "exports": "$"
        },
        "knockout": {
            "exports": "knockout"
        },
        "humanize": {
            "exports": "humanize"
        },
        "mousetrap": {
            "exports": "Mousetrap"
        },
        "GA": {
            "exports": "GA"
        },
        "EventEmitter": {
            "exports": "EventEmitter"
        },
        "socketio": {
            "exports": "io"
        }
    }
} );

requirejs( ["app/main_app"] );