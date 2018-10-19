/**
 * Utilities and shared functionality for the build hooks.
 */
var fs = require('fs');
var path = require("path");

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

module.exports = {
  /**
     * Used to get the name of the application as defined in the config.xml.
     *
     * @param {object} context - The Cordova context.
     * @returns {string} The value of the name element in config.xml.
     */
  getAppName: function (context) {
    var ConfigParser = context.requireCordovaModule("cordova-lib").configparser;
    var config = new ConfigParser("config.xml");
    return config.name();
  },

  /**
     * The ID of the plugin; this should match the ID in plugin.xml.
     */
  getPluginId: function () {
    return "cordova-plugin-firebase";
  },

  copyKey: function (platform) {
    for (var i = 0; i < platform.src.length; i++) {
      var file = platform.src[i];
      if (this.fileExists(file)) {
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
        } catch (err) {
          console.log(err);
        }

        break;
      }
    }
  },

    /**
     * Used to get the plugin configuration for the given platform.
     *
     * The plugin configuration object will have the API and secret keys
     * for the Fabric.io service that were specified when the plugin
     * was installed.
     *
     * This configuration is obtained from, where "ios" is the platform name:
     *    platforms/ios/ios.json
     *
     * @param {string} platform - The platform to get plugin configuration for, either "ios" or "android".
     * @returns {string} The path to the platform's plugin JSON configuration file.
     */
    getPluginConfig: function(platform) {

        var platformConfigPath = path.join("..", "..", "..", platform + ".json");

        var platformConfig = require(platformConfigPath);

        var pluginId = this.getPluginId();


        var apiKey = platformConfig.installed_plugins[pluginId].FABRIC_API_KEY;
        var apiSecret = platformConfig.installed_plugins[pluginId].FABRIC_API_SECRET;

        var config = {
            apiKey: apiKey,
            apiSecret: apiSecret
        };

        return config;
    },

  getValue: function (config, name) {
    var value = config.match(new RegExp('<' + name + '(.*?)>(.*?)</' + name + '>', 'i'));
    if (value && value[2]) {
      return value[2]
    } else {
      return null
    }
  },

  fileExists: function (path) {
    try {
      return fs.statSync(path).isFile();
    } catch (e) {
      return false;
    }
  },

  directoryExists: function (path) {
    try {
      return fs.statSync(path).isDirectory();
    } catch (e) {
      return false;
    }
  }
};
