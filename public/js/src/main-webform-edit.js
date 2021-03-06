'use strict';

require( 'enketo-core/src/js/polyfills-ie11' );
// Workaround for https://github.com/kobotoolbox/enketo-express/issues/990
// This can probably be removed in the future. Test modal dialogs called from file input widget (when resetting).
require( './module/dialog' );


var $ = require( 'jquery' );
var gui = require( './module/gui' );
var controller = require( './module/controller-webform' );
var settings = require( './module/settings' );
var connection = require( './module/connection' );
var translator = require( './module/translator' );
var t = translator.t;
var utils = require( './module/utils' );
var $loader = $( 'body > .main-loader' );
var $formheader = $( '.main > .paper > .form-header' );
var survey = {
    enketoId: settings.enketoId,
    instanceId: settings.instanceId,
};

translator.init( survey )
    .then( function( survey ) {
        return Promise.all( [
            connection.getFormParts( survey ),
            connection.getExistingInstance( survey )
        ] );
    } )
    .then( function( responses ) {
        var formParts = responses[ 0 ];
        formParts.instance = responses[ 1 ].instance;
        formParts.instanceAttachments = responses[ 1 ].instanceAttachments;

        if ( formParts.form && formParts.model && formParts.instance ) {
            return gui.swapTheme( formParts );
        } else {
            throw new Error( t( 'error.unknown' ) );
        }
    } )
    .then( _init )
    .then( connection.getMaximumSubmissionSize )
    .then( _updateMaxSizeSetting )
    .catch( _showErrorOrAuthenticate );

function _updateMaxSizeSetting( maxSize ) {
    if ( maxSize ) {
        // overwrite default max size
        settings.maxSize = maxSize;
        $( 'form.or' ).trigger( 'updateMaxSize' );
    }
}

function _showErrorOrAuthenticate( error ) {
    $loader.addClass( 'fail' );
    if ( error.status === 401 ) {
        window.location.href = settings.loginUrl + '?return_url=' + encodeURIComponent( window.location.href );
    } else {
        gui.alert( error.message, t( 'alert.loaderror.heading' ) );
    }
}

function _init( formParts ) {
    $formheader.after( formParts.form );
    translator.localize( document.querySelector( 'form.or' ) );
    $( document ).ready( function() {
        controller.init( 'form.or:eq(0)', {
            modelStr: formParts.model,
            instanceStr: formParts.instance,
            external: formParts.externalData,
            instanceAttachments: formParts.instanceAttachments,
        } ).then( function() {
            $( 'head>title' ).text( utils.getTitleFromFormStr( formParts.form ) );
        } );
    } );
}
