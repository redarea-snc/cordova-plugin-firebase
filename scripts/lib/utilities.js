/**
 * Utilities and shared functionality for the build hooks.
 */

var path = require("path");

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

  /**
     * Used to get the path to the XCode project's .pbxproj file.
     *
     * @param {object} context - The Cordova context.
     * @returns The path to the XCode project's .pbxproj file.
     */
  getXcodeProjectPath: function (context) {

    var appName = this.getAppName(context);

    return path.join("platforms", "ios", appName + ".xcodeproj", "project.pbxproj");
  },

};