"use strict";

var tab = "    ",
    assetFile = __dirname + "/../../client/js/lib/asset.js";

var fs = require( "fs" ),
    assetContent = fs.readFileSync( assetFile, "UTF-8" );

// TEMPLATE
function buildTemplate( asset ) {
    var minify = require( "html-minifier" ).minify;
    var templateDir = __dirname + "/../template/";
    var replaceTemplateRegexp = /(<template>)[\s\S]*(\/\/<\/template>)/g;

    var templates = fs.readdirSync( templateDir ).map( function ( templateFilename ) {
        var templateContent = fs.readFileSync( templateDir + templateFilename, {encoding: "UTF-8"} );

        return {
            name: templateFilename.toUpperCase().replace( /\.HTML$/, "" ).replace( /\.TEMPLATE$/, "" ).replace( /\./g, "_" ),
            html: minify( templateContent, {
                removeComments: true,
                collapseWhitespace: true,
                ignoreCustomComments: [
                    /^\s+ko/,
                    /\/ko\s+$/
                ]
            } ).replace( /'/g, '\\\'' ).replace( /\n/g, "" )
        };
    } );

    var templateCode = templates.map( function ( template ) {
        return tab + "Asset.TEMPLATE." + template.name + " = '" + template.html + "';"
    } ).join( "\n" );

    return asset.replace( replaceTemplateRegexp, "$1\n" + templateCode + "\n" + tab + "$2" );
}

// SVG
function buildSvg( asset ) {
    var svgDir = __dirname + "/../svg/";
    var replaceSvgRegexp = /(<svg>)[\s\S]*(\/\/<\/svg>)/g;

    var templates = fs.readdirSync( svgDir ).map( function ( svgFilename ) {
        var svgContent = fs.readFileSync( svgDir + svgFilename, {encoding: "UTF-8"} );

        return {
            name: svgFilename.toLowerCase().replace( /\.svg$/i, "" ).replace( /\./g, "_" ),
            content: svgContent.replace( /'/g, '\\\'' ).replace( /\n/g, "" ).replace( /\s{2,}/g, "" )
        };
    } );

    var svgCode = templates.map( function ( svg ) {
        return tab + "Asset.svg." + svg.name + " = '" + svg.content + "';"
    } ).join( "\n" );

    return asset.replace( replaceSvgRegexp, "$1\n" + svgCode + "\n" + tab + "$2" );
}

// ERROR CODES
function buildErrorCodes( asset ) {
    var ErrorCodes = require( "../../server/lib/error_codes" );
    var replaceErrorCodesRegexp = /(<errorcodes>)[\s\S]*(\/\/<\/errorcodes>)/g;

    var errorCodesCode = "";
    for ( var key in ErrorCodes ) {
        if ( typeof ErrorCodes[key] === "string" ) {
            errorCodesCode += tab + "Asset.ERROR_CODE." + key.toUpperCase() + " = '" + ErrorCodes[key] + "';\n";
        }
    }

    return asset.replace( replaceErrorCodesRegexp, "$1\n" + errorCodesCode + tab + "$2" );
}

// NOTIFY CODES
function buildNotifyCodes( asset ) {
    var NotifyCodes = require( "../../server/lib/notify_codes" );
    var replaceNotifyCodesRegexp = /(<notifycodes>)[\s\S]*(\/\/<\/notifycodes>)/g;

    var notifyCodesCode = "";
    for ( var key in NotifyCodes ) {
        if ( typeof NotifyCodes[key] === "string" ) {
            notifyCodesCode += tab + "Asset.NOTIFY_CODE." + key.toUpperCase() + " = '" + NotifyCodes[key] + "';\n";
        }
    }

    return asset.replace( replaceNotifyCodesRegexp, "$1\n" + notifyCodesCode + tab + "$2" );
}

// API CODES
function buildApiCodes( asset ) {
    var ApiCodes = require( "../../server/lib/api_codes" );
    var replaceApiCodesRegexp = /(<apicodes>)[\s\S]*(\/\/<\/apicodes>)/g;

    var apiCodesCode = "";
    for ( var key in ApiCodes ) {
        if ( typeof ApiCodes[key] === "string" ) {
            apiCodesCode += tab + "Asset.API_CODE." + key.toUpperCase() + " = '" + ApiCodes[key] + "';\n";
        }
    }

    return asset.replace( replaceApiCodesRegexp, "$1\n" + apiCodesCode + tab + "$2" );
}

// FONT ICONS
function buildFontIconsCodes( asset ) {
    var fontSelection = require( "../font/opug/selection.json" );
    var replaceFontIconsRegexp = /(<fonticons>)[\s\S]*(\/\/<\/fonticons>)/g;

    var fontIconCodes = "";
    for ( var i = 0; i < fontSelection["icons"].length; i++ ) {
        var key = fontSelection["icons"][i]["properties"]["name"].toUpperCase();
        if ( /^\d.+/i.test( key ) ) {
            key = '["' + key + '"]';
        }
        else {
            key = "." + key;
        }

        fontIconCodes += tab + "Asset.FONT_ICON" + key + " = '" + fontSelection["icons"][i]["properties"]["name"] + "';\n";
    }

    return asset.replace( replaceFontIconsRegexp, "$1\n" + fontIconCodes + tab + "$2" );
}

assetContent = buildTemplate( assetContent );
assetContent = buildSvg( assetContent );
assetContent = buildErrorCodes( assetContent );
assetContent = buildNotifyCodes( assetContent );
assetContent = buildApiCodes( assetContent );
assetContent = buildFontIconsCodes( assetContent );

fs.writeFileSync( assetFile, assetContent, "utf8" );