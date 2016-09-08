"use strict";

var cleanSketch = require( "clean-sketch" ),
    fs = require( 'fs' ),
    svgCleaner = require( 'svg-cleaner' ),
    config = require( "./server/lib/config" );

var phonegapDir = config.phonegapDir || "lib/";

module.exports = function ( grunt ) {

    var svgs = [];

    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),

        compass: {
            watch: {
                options: {
                    config: 'config.rb',
                    watch: true,
                    environment: 'development',
                    outputStyle: 'expanded',
                    noLineComments: false,
                    cssDir: "client/css/"
                }
            },
            development: {
                options: {
                    config: 'config.rb',
                    environment: 'development',
                    outputStyle: 'expanded',
                    noLineComments: false,
                    cssDir: "client/css/"
                }
            },
            production: {
                options: {
                    config: 'config.rb',
                    environment: 'production',
                    outputStyle: 'compressed',
                    noLineComments: true,
                    cssDir: "client/css-min/"
                }
            },
            clean: {
                options: {
                    clean: true
                }
            }
        },

        requirejs: {
            production: {
                options: {
                    baseUrl: "client/js/",
                    mainConfigFile: "client/js/client.js",
                    name: "client",
                    out: "client/js-min/client.min.js"
                }
            }
        },

        htmlmin: {
            production: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    // ignore knockout comments
                    ignoreCustomComments: [
                        /^\s+ko/,
                        /\/ko\s+$/
                    ]
                },
                files: {
                    'client/index.min.html': 'client/index.html'
                }
            }
        },

        prompt: {
            clean_svg: {
                options: {
                    questions: [
                        {
                            config: 'clean_svg.svg',
                            type: 'list',
                            message: 'SVG to clean',
                            choices: function () {
                                return svgs;
                            }
                        }
                    ]
                }
            }
        },

        execute: {
            build_asset: {
                src: ['src/node/build_asset.js']
            }
        },

        compress: {
            phonegap: {
                options: {
                    archive: 'bin/opug_phonegap.zip'
                },
                files: [
                    {src: ['client/index.phonegap.html'], dest: '', filter: 'isFile'},
                    {src: ['client/favicon.ico'], dest: '', filter: 'isFile'},
                    {src: ['client/favicon_alert.ico'], dest: '', filter: 'isFile'},
                    {src: ['client/css-min/*'], dest: '', filter: 'isFile'},
                    {src: ['client/font/*'], dest: '', filter: 'isFile'},
                    {src: ['client/img/*'], dest: '', filter: 'isFile'},
                    {src: ['client/external/*'], dest: '', filter: 'isFile'},
                    {src: ['client/js-min/**'], dest: ''}
                ]
            }
        },

        copy: {
            phonegap: {
                files: [
                    {expand: true, src: ['client/index.phonegap.html'], dest: phonegapDir, filter: 'isFile'},
                    {expand: true, src: ['client/favicon.ico'], dest: phonegapDir, filter: 'isFile'},
                    {expand: true, src: ['client/favicon_alert.ico'], dest: phonegapDir, filter: 'isFile'},
                    {expand: true, src: ['client/css-min/*'], dest: phonegapDir, filter: 'isFile'},
                    {expand: true, src: ['client/font/**'], dest: phonegapDir},
                    {expand: true, src: ['client/img/**'], dest: phonegapDir},
                    {expand: true, src: ['client/external/*'], dest: phonegapDir, filter: 'isFile'},
                    {expand: true, src: ['client/js-min/*'], dest: phonegapDir, filter: 'isFile'}
                ]
            }
        },

        shell: {
            phonegap: {
                command: "cd " + phonegapDir + "; phonegap build android;"
            }
        },

        watch: {
            assets: {
                files: ['src/template/**', 'src/svg/**', 'server/lib/api_codes.js', 'server/lib/error_codes.js', 'server/lib/notify_codes.js'],
                tasks: ['build-assets'],
                options: {
                    spawn: false
                }
            }
        }
    } );

    function retrieveSVGs() {
        svgs = fs.readdirSync( "./svg" ).map( function ( svg ) {
            return {
                name: svg
            };
        } );
        return true;
    }

    function cleanSVG() {
        var svgFile = "./svg/" + grunt.config.get( "clean_svg.svg" ),
            svg = cleanSketch( fs.readFileSync( svgFile, 'utf-8' ) );
        svg = svgCleaner.clean( svg );
        fs.writeFileSync( svgFile, svg );
        return true;
    }

    function replaceMinifiedHtmlPaths() {
        var indexMinHtml = fs.readFileSync( "client/index.min.html", "UTF-8" );

        indexMinHtml = indexMinHtml.replace( /<meta http-equiv="cache-control".*?>/ig, "" );
        indexMinHtml = indexMinHtml.replace( /<meta http-equiv="expires".*?>/ig, "" );
        indexMinHtml = indexMinHtml.replace( /<meta http-equiv="pragma" content="no-cache">/ig, "" );
        indexMinHtml = indexMinHtml.replace( /css\/client\.css/, "css-min/client.css" );
        indexMinHtml = indexMinHtml.replace( /data-main="js\/client"/, 'data-main="js-min/client.min"' );

        fs.writeFileSync( "client/index.min.html", indexMinHtml, {
            encoding: "UTF-8"
        } );
    }

    function createPhonegapIndex() {
        var indexPhonegapHtml = fs.readFileSync( "client/index.min.html", "UTF-8" );

        indexPhonegapHtml = indexPhonegapHtml.replace( /<\/head>/ig, '<script type="text/javascript" src="../PushNotification.js"></script></head>' );
        indexPhonegapHtml = indexPhonegapHtml.replace( /<\/head>/ig, '<script type="text/javascript" src="../cordova.js"></script></head>' );
        indexPhonegapHtml = indexPhonegapHtml.replace( /<\/head>/ig, '<script type=text/javascript>window.PHONEGAP = true;</script></head>' );

        fs.writeFileSync( "client/index.phonegap.html", indexPhonegapHtml, {
            encoding: "UTF-8"
        } );
    }

    grunt.loadNpmTasks( 'grunt-contrib-compass' );
    grunt.loadNpmTasks( 'grunt-contrib-requirejs' );
    grunt.loadNpmTasks( 'grunt-contrib-htmlmin' );
    grunt.loadNpmTasks( 'grunt-contrib-compress' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );
    grunt.loadNpmTasks( 'grunt-prompt' );
    grunt.loadNpmTasks( 'grunt-execute' );
    grunt.loadNpmTasks( 'grunt-shell' );

    grunt.registerTask( 'watch-compass', ['compass:clean', 'compass:watch'] );
    grunt.registerTask( 'watch-assets', ['build-assets', 'watch:assets'] );
    grunt.registerTask( 'retrieve-svgs', retrieveSVGs );
    grunt.registerTask( 'clean-svg', cleanSVG );
    grunt.registerTask( 'clean-svg-prompt', ['retrieve-svgs', 'prompt:clean_svg', 'clean-svg'] );
    grunt.registerTask( 'build-assets', ['execute:build_asset'] );
    grunt.registerTask( 'replace-minified-html-paths', replaceMinifiedHtmlPaths );
    grunt.registerTask( 'create-phonegap-html', createPhonegapIndex );
    grunt.registerTask( 'build-production', ['requirejs:production', 'compass:production', 'htmlmin:production', 'replace-minified-html-paths'] );
    grunt.registerTask( 'build-phonegap', ['build-production', 'create-phonegap-html', 'copy:phonegap', 'shell:phonegap'] );

};