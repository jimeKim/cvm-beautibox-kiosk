import { contextBridge, ipcRenderer } from 'electron';

export interface BeautiBoxAPI {
  // 시스템 관련
  system: {
    getStatus: () => Promise<any>;
  };
  
  // 센서 관련
  sensor: {
    readDistance: () => Promise<any>;
    startMonitoring: (intervalMs?: number) => Promise<any>;
    stopMonitoring: () => Promise<any>;
    onDistanceUpdate: (callback: (data: any) => void) => void;
    removeDistanceListener: () => void;
  };
  
  // 카메라 관련
  camera: {
    capture: (filename?: string) => Promise<any>;
    getImages: () => Promise<any>;
  };
  
  // 컨트롤러 관련
  controller: {
    ledOn: () => Promise<any>;
    ledOff: () => Promise<any>;
    rotateMotor: (angle: number, speed?: number) => Promise<any>;
    matrixButton: (buttonNumber: number) => Promise<any>;
  };
  
  // 업데이트 관련
  updater: {
    checkForUpdates: () => Promise<void>;
    getUpdateStatus: () => Promise<any>;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onUpdateDownloaded: (callback: (info: any) => void) => void;
    onDownloadProgress: (callback: (progress: any) => void) => void;
    removeUpdateListeners: () => void;
  };
  
  // 앱 관련
  app: {
    quit: () => Promise<any>;
  };
}

// 렌더러 프로세스에서 사용할 API 노출
const beautiBoxAPI: BeautiBoxAPI = {
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
  },
  
  camera: {
    capture: (filename) => ipcRenderer.invoke('camera:capture', filename),
    getImages: () => ipcRenderer.invoke('camera:getImages'),
  },
  
  controller: {
    ledOn: () => ipcRenderer.invoke('controller:ledOn'),
    ledOff: () => ipcRenderer.invoke('controller:ledOff'),
    rotateMotor: (angle, speed = 50) => ipcRenderer.invoke('controller:rotateMotor', angle, speed),
    matrixButton: (buttonNumber) => ipcRenderer.invoke('controller:matrixButton', buttonNumber),
  },
  
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (_, info) => callback(info));
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (_, progress) => callback(progress));
    },
    removeUpdateListeners: () => {
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-downloaded');
      ipcRenderer.removeAllListeners('download-progress');
    },
  },
  
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
  },
};

// contextBridge를 통해 안전하게 API 노출
contextBridge.exposeInMainWorld('beautiBoxAPI', beautiBoxAPI);

// 타입 선언을 위한 전역 인터페이스 확장
declare global {
  interface Window {
    beautiBoxAPI: BeautiBoxAPI;
  }
} 