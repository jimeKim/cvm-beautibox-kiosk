const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API 노출
const beautiBoxAPI = {
    system: {
        getStatus: () => ipcRenderer.invoke('system:getStatus'),
    },
    sensor: {
        readDistance: () => ipcRenderer.invoke('sensor:readDistance'),
        startMonitoring: (intervalMs = 1000) => ipcRenderer.invoke('sensor:startMonitoring', intervalMs),
        stopMonitoring: () => ipcRenderer.invoke('sensor:stopMonitoring'),
        onDistanceUpdate: (callback) => {
            ipcRenderer.on('sensor:distanceUpdate', (_, data) => callback(data));
        },
        removeDistanceListener: () => {
            ipcRenderer.removeAllListeners('sensor:distanceUpdate');
        },
        onAutoReturnHome: (callback) => {
            ipcRenderer.on('sensor:autoReturnHome', () => callback());
        },
        removeAutoReturnListener: () => {
            ipcRenderer.removeAllListeners('sensor:autoReturnHome');
        },
    },
    camera: {
        capture: (filename) => ipcRenderer.invoke('camera:capture', filename),
        getImages: () => ipcRenderer.invoke('camera:getImages'),
    },
    controller: {
        ledOn: (ledNumber = 1) => ipcRenderer.invoke('controller:ledOn', ledNumber),
        ledOff: (ledNumber = 1) => ipcRenderer.invoke('controller:ledOff', ledNumber),
        rotateMotor: (angle, speed = 50) => ipcRenderer.invoke('controller:rotateMotor', angle, speed),
        matrixButton: (buttonNumber) => ipcRenderer.invoke('controller:matrixButton', buttonNumber),
        stopAll: () => ipcRenderer.invoke('controller:stopAll'),
    },
    matrix: {
        onButtonStart: (callback) => {
            ipcRenderer.on('matrix:buttonStart', (_, data) => callback(data));
        },
        onButtonStop: (callback) => {
            ipcRenderer.on('matrix:buttonStop', (_, data) => callback(data));
        },
        removeButtonListeners: () => {
            ipcRenderer.removeAllListeners('matrix:buttonStart');
            ipcRenderer.removeAllListeners('matrix:buttonStop');
        },
    },
    printer: {
        printSilent: (content) => ipcRenderer.invoke('printer:printSilent', content),
    },
    app: {
        quit: () => ipcRenderer.invoke('app:quit'),
        adminShutdown: () => ipcRenderer.invoke('app:adminShutdown'),
    },
};

// contextBridge를 통해 안전하게 API 노출
contextBridge.exposeInMainWorld('beautiBoxAPI', beautiBoxAPI); 