var eventTypes = require('./eventTypes');

var LightBox = require('../lightbox');
var ChildWindow = require('../childwindow');
var Helpers = require('../helpers');
var Device = require('../device');

module.exports = (function () {
    function AppCommon(options) {
        /**
            * Open payment interface (PayStation)
        */
    }

    AppCommon.prototype.getPaystationUrl = function () {
        var SANDBOX_PAYSTATION_URL = 'https://sandbox-secure.xsolla.com/paystation2/?';
        return this.config.sandbox ? SANDBOX_PAYSTATION_URL : 'https://' + this.config.host + '/paystation2/?';
    };

    AppCommon.prototype.open = function () {
        this.checkConfig();
        this.checkApp();

        var triggerSplitStatus = (function (data) {
            switch (((data || {}).paymentInfo || {}).status) {
                case 'invoice':
                    this.triggerEvent(eventTypes.STATUS_INVOICE, data);
                    break;
                case 'delivering':
                    this.triggerEvent(eventTypes.STATUS_DELIVERING, data);
                    break;
                case 'troubled':
                    this.triggerEvent(eventTypes.STATUS_TROUBLED, data);
                    break;
                case 'done':
                    this.triggerEvent(eventTypes.STATUS_DONE, data);
                    break;
            }
        }).bind(this);

        var query = {};
        if (this.config.access_token) {
            query.access_token = this.config.access_token;
        } else {
            query.access_data = JSON.stringify(this.config.access_data);
        }

        var url = this.getPaystationUrl() + Helpers.param(query);
        var that = this;

        function handleStatus(event) {
            var statusData = event.detail;
            that.triggerEvent(eventTypes.STATUS, statusData);
            triggerSplitStatus(statusData);
        }

        this.postMessage = null;
        if ((new Device).isMobile()) {
            var childWindow = new ChildWindow;
            childWindow.on('open', function handleOpen() {
                that.postMessage = childWindow.getPostMessage();
                that.triggerEvent(eventTypes.OPEN);
                that.triggerEvent(eventTypes.OPEN_WINDOW);
                childWindow.off('open', handleOpen);
            });
            childWindow.on('load', function handleLoad() {
                that.triggerEvent(eventTypes.LOAD);
                childWindow.off('load', handleLoad);
            });
            childWindow.on('close', function handleClose() {
                that.triggerEvent(eventTypes.CLOSE);
                that.triggerEvent(eventTypes.CLOSE_WINDOW);
                childWindow.off('status', handleStatus);
                childWindow.off('close', handleClose);
            });
            childWindow.on('status', handleStatus);
            childWindow.open(url, this.config.childWindow);
        } else {
            var lightBox = new LightBox;
            lightBox.on('open', function handleOpen() {
                that.postMessage = lightBox.getPostMessage();
                that.triggerEvent(eventTypes.OPEN);
                that.triggerEvent(eventTypes.OPEN_LIGHTBOX);
                lightBox.off('open', handleOpen);
            });
            lightBox.on('load', function handleLoad() {
                that.triggerEvent(eventTypes.LOAD);
                lightBox.off('load', handleLoad);
            });
            lightBox.on('close', function handleClose() {
                that.triggerEvent(eventTypes.CLOSE);
                that.triggerEvent(eventTypes.CLOSE_LIGHTBOX);
                lightBox.off('status', handleStatus);
                lightBox.off('close', handleClose);
            });
            lightBox.on('status', handleStatus);
            lightBox.openFrame(url, this.config.lightbox);
        }
    };

    return AppCommon;
})();
