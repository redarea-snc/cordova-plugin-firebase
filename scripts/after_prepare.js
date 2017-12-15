#!/usr/bin/env node
'use strict';

/**
 * This hook makes sure projects using [cordova-plugin-firebase](https://github.com/arnesson/cordova-plugin-firebase)
 * will build properly and have the required key files copied to the proper destinations when the app is build on Ionic Cloud using the package command.
 * Credits: https://github.com/arnesson.
 */
var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var builder = new xml2js.Builder({
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8'
    }
});

fs.ensureDirSync = function (dir) {
    if (!fs.existsSync(dir)) {
        dir.split(path.sep).reduce(function (currentPath, folder) {
            currentPath += folder + path.sep;
            if (!fs.existsSync(currentPath)) {
                fs.mkdirSync(currentPath);
            }
            return currentPath;
        }, '');
    }
};

var config = fs.readFileSync('config.xml').toString();
var name = getValue(config, 'name');

var IOS_DIR = 'platforms/ios';
var ANDROID_DIR = 'platforms/android';

var PLATFORM = {
    IOS: {
        dest: [
            IOS_DIR + '/' + name + '/Resources/GoogleService-Info.plist',
            IOS_DIR + '/' + name + '/Resources/Resources/GoogleService-Info.plist'
        ],
        src: [
            'GoogleService-Info.plist',
            IOS_DIR + '/www/GoogleService-Info.plist',
            'www/GoogleService-Info.plist'
        ]
    },
    ANDROID: {
        dest: [
            ANDROID_DIR + '/google-services.json'
        ],
        src: [
            'google-services.json',
            ANDROID_DIR + '/assets/www/google-services.json',
            'www/google-services.json'
        ],
        stringsXml: ANDROID_DIR + '/app/src/main/res/values/strings.xml'
    }
};

function updateStringsXml(contents) {
    //--Rut - 22/09/2017 - CORREZIONE SCRIPT DI CONFIGURAZIONE DELLE google_app_id E google_api_key (non so perché, ma
    // non funziona correttamente il sorgente originale del repository ufficiale)
    // NON FUNZIONA readFileSync originale, forse per concorrenza di altri script nell'accesso al file, ma dato che non
    // genera errori non posso saperlo
    // readFile con la callback invece FUNZIONA
    fs.readFile(PLATFORM.ANDROID.stringsXml, 'utf8', function (err, data) {
        if(err != null){
            console.error('COULD NOT READ STRINGS FILE AT PATH ' + PLATFORM.ANDROID.stringsXml);
            console.error(err);
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('!!!!!!!!!!!!!!!!!!!! CHECK CONFIGURATION, FIREBASE ANALYTICS MAY NOT BE CONFIGURED !!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            return;
        }

        parser.parseString(data, function (err, xmlStructure) {

            //--Rut - 22/09/2017 - queste istruzioni presenti nel file plugin.xml:
            //  <config-file parent="/resources" target="res/values/strings.xml">
            //     <string name="google_app_id">@string/google_app_id</string>
            //  </config-file>
            //  <config-file parent="/resources" target="res/values/strings.xml">
            //     <string name="google_api_key">@string/google_api_key</string>
            //  </config-file>
            //
            // generano elementi duplicati nel file strings.xml
            // Quindi, il parser xml cerca duplicati e li rimuove
            var foundElements = {google_app_id: false, google_api_key: false};
            var stringElementsUpdated = new Array();

            // Contenuti del file google-services.json
            var googleServicesJson = JSON.parse(contents);

            for(var i=0; i<xmlStructure.resources.string.length; i++){
                var element = xmlStructure.resources.string[i];

                // DUPLICATO - NON VIENE PROCESSATO E QUINDI NON INSERITO NEI RISULTATI
                if(foundElements.hasOwnProperty(element.$.name) && foundElements[element.$.name]){
                    continue;
                }

                // Replace valori chiavi di Google
                if(element.$.name == 'google_app_id' || element.$.name == 'google_api_key'){
                    // Marcatura come trovato
                    foundElements[element.$.name] = true;
                    if(element.$.name == 'google_app_id'){
                        element._ = googleServicesJson.client[0].client_info.mobilesdk_app_id;
                    }
                    else{
                        element._ = googleServicesJson.client[0].api_key[0].current_key;
                    }

                }

                stringElementsUpdated.push(element);
            }

            xmlStructure.resources.string = stringElementsUpdated;
            var outputStringsXml = builder.buildObject(xmlStructure);

            fs.writeFile(PLATFORM.ANDROID.stringsXml, outputStringsXml);

            console.log(PLATFORM.ANDROID.stringsXml + ' updated with Firebase Google Keys **');
        });
    });


}

function copyKey(platform, callback) {
    for (var i = 0; i < platform.src.length; i++) {
        var file = platform.src[i];
        if (fileExists(file)) {
            try {
                var contents = fs.readFileSync(file).toString();

                try {
                    platform.dest.forEach(function (destinationPath) {
                        var folder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
                        fs.ensureDirSync(folder);
                        fs.writeFileSync(destinationPath, contents);
                    });
                } catch (e) {
                    // skip
                }

                callback && callback(contents);
            } catch (err) {
                console.log(err)
            }

            break;
        }
    }
}

function getValue(config, name) {
    var value = config.match(new RegExp('<' + name + '>(.*?)</' + name + '>', 'i'));
    if (value && value[1]) {
        return value[1]
    } else {
        return null
    }
}

function fileExists(path) {
    try {
        return fs.statSync(path).isFile();
    } catch (e) {
        return false;
    }
}

function directoryExists(path) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}

module.exports = function(context) {
    //get platform from the context supplied by cordova
    var platforms = context.opts.platforms;
    // Copy key files to their platform specific folders
    if (platforms.indexOf('ios') !== -1 && directoryExists(IOS_DIR)) {
        console.log('Preparing Firebase on iOS');
        copyKey(PLATFORM.IOS);
    }
    if (platforms.indexOf('android') !== -1 && directoryExists(ANDROID_DIR)) {
        console.log('Preparing Firebase on Android');
        copyKey(PLATFORM.ANDROID, updateStringsXml)
    }
};