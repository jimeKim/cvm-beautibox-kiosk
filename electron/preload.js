import { contextBridge, ipcRenderer } from 'electron';
// 렌더러 프로세스에서 사용할 API 노출
var beautiBoxAPI = {
    system: {
        getStatus: function () { return ipcRenderer.invoke('system:getStatus'); },
    },
    sensor: {
        readDistance: function () { return ipcRenderer.invoke('sensor:readDistance'); },
        startMonitoring: function (intervalMs) {
            if (intervalMs === void 0) { intervalMs = 1000; }
            return ipcRenderer.invoke('sensor:startMonitoring', intervalMs);
        },
        stopMonitoring: function () { return ipcRenderer.invoke('sensor:stopMonitoring'); },
        onDistanceUpdate: function (callback) {
            ipcRenderer.on('sensor:distanceUpdate', function (_, data) { return callback(data); });
        },
        removeDistanceListener: function () {
            ipcRenderer.removeAllListeners('sensor:distanceUpdate');
        },
    },
    camera: {
        capture: function (filename) { return ipcRenderer.invoke('camera:capture', filename); },
        getImages: function () { return ipcRenderer.invoke('camera:getImages'); },
    },
    controller: {
        ledOn: function () { return ipcRenderer.invoke('controller:ledOn'); },
        ledOff: function () { return ipcRenderer.invoke('controller:ledOff'); },
        rotateMotor: function (angle, speed) {
            if (speed === void 0) { speed = 50; }
            return ipcRenderer.invoke('controller:rotateMotor', angle, speed);
        },
        matrixButton: function (buttonNumber) { return ipcRenderer.invoke('controller:matrixButton', buttonNumber); },
    },
    app: {
        quit: function () { return ipcRenderer.invoke('app:quit'); },
    },
};
// contextBridge를 통해 안전하게 API 노출
contextBridge.exposeInMainWorld('beautiBoxAPI', beautiBoxAPI);
