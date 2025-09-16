import { app, BrowserWindow, screen, globalShortcut, powerMonitor, ipcMain, Menu, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import AutoLaunch from 'electron-auto-launch';
import { setupAutoUpdater, checkForUpdatesManually, getUpdateStatus } from './autoUpdater';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface KioskConfig {
  fullscreen: boolean;
  autoStart: boolean;
  disableDevTools: boolean;
  disableMenu: boolean;
  disableShortcuts: boolean;
  preventSleep: boolean;
  autoRestart: boolean;
  restartOnCrash: boolean;
  resolution: {
    width: number;
    height: number;
  };
}

// 키오스크 기본 설정
const defaultConfig: KioskConfig = {
  fullscreen: true,
  autoStart: false, // 관리자 권한 필요 시에만 활성화
  disableDevTools: false, // 개발 중에는 활성화
  disableMenu: true,
  disableShortcuts: true,
  preventSleep: true,
  autoRestart: true, // 키오스크 모드에서는 자동 재시작 필요
  restartOnCrash: true, // 크래시 시 자동 복구
  resolution: {
    width: 1920,
    height: 1080
  }
};

let mainWindow: BrowserWindow | null = null;
let config: KioskConfig = defaultConfig;
let autoLauncher: AutoLaunch | null = null;
let restartTimer: NodeJS.Timeout | null = null;
let isQuitting = false;
let restartCount = 0;
let lastRestartTime = 0;
const MAX_RESTART_COUNT = 5; // 최대 재시작 횟수
const RESTART_INTERVAL = 30000; // 30초 간격
const RESTART_RESET_TIME = 300000; // 5분 후 재시작 카운터 리셋

// 자동 시작 설정 - 안전한 처리
function setupAutoLaunch(): void {
  if (!config.autoStart) {
    console.log('자동 시작이 비활성화되어 있습니다.');
    return;
  }

  try {
    autoLauncher = new AutoLaunch({
      name: 'CVM Kiosk',
      path: app.getPath('exe'),
    });

    autoLauncher.isEnabled()
      .then((isEnabled: boolean) => {
        if (!isEnabled) {
          console.log('자동 시작 활성화 중...');
          return autoLauncher?.enable();
        } else {
          console.log('자동 시작이 이미 활성화되어 있습니다.');
        }
      })
      .then(() => {
        console.log('자동 시작 설정 완료');
      })
      .catch((err: Error) => {
        console.error('자동 시작 설정 실패:', err.message);
        console.log('관리자 권한이 필요할 수 있습니다. 수동으로 설정하세요.');
        
        // 자동 시작 실패 시 알림 (프로덕션에서만)
        if (process.env.NODE_ENV === 'production') {
          dialog.showMessageBox(mainWindow!, {
            type: 'warning',
            title: '자동 시작 설정',
            message: '자동 시작 기능 설정에 실패했습니다.\n관리자 권한으로 실행하시거나 수동으로 설정하세요.',
            buttons: ['확인']
          });
        }
      });
  } catch (error) {
    console.error('자동 시작 모듈 초기화 실패:', error);
  }
}

// 디스플레이 설정 최적화
function getDisplayBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds } = primaryDisplay;
  
  return {
    x: bounds.x,
    y: bounds.y,
    width: config.resolution.width || bounds.width,
    height: config.resolution.height || bounds.height
  };
}

// 메인 윈도우 생성
function createWindow(): void {
  const displayBounds = getDisplayBounds();
  
  // 키오스크 윈도우 옵션
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    ...displayBounds,
    show: false,
    frame: false,
    fullscreen: config.fullscreen,
    kiosk: config.fullscreen,
    alwaysOnTop: true,
    autoHideMenuBar: config.disableMenu,
    webPreferences: {
      preload: join(__dirname, './preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !config.disableDevTools,
      webSecurity: true,
    }
  };

  mainWindow = new BrowserWindow(windowOptions);

  // 윈도우 이벤트 리스너
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      if (config.fullscreen) {
        mainWindow.setKiosk(true);
        mainWindow.setFullScreen(true);
      }
      
      // 포커스 유지
      mainWindow.focus();
      mainWindow.moveTop();
      
      // 성공적으로 시작되었으므로 재시작 카운터 리셋
      restartCount = 0;
      console.log('키오스크 애플리케이션 정상 시작 - 재시작 카운터 리셋');
    }
  });

  // 앱 종료 이벤트 수정
  mainWindow.on('close', (event: Electron.Event) => {
    if (!isQuitting && config.autoRestart) {
      event.preventDefault();
      scheduleRestart();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 개발/프로덕션 환경에 따른 로드
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    if (!config.disableDevTools) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 키오스크 보안 설정
  setupKioskSecurity();
}

// 키오스크 보안 설정
function setupKioskSecurity(): void {
  if (!mainWindow) return;

  // 새 윈도우 생성 차단
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // 네비게이션 제한
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // 로컬 개발 서버와 파일 프로토콜만 허용
    if (parsedUrl.protocol !== 'http:' && 
        parsedUrl.protocol !== 'https:' && 
        parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });

  // 외부 링크 차단
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// 전역 단축키 설정
function setupGlobalShortcuts(): void {
  if (config.disableShortcuts) {
    // 시스템 단축키 비활성화
    const shortcuts = [
      'Alt+Tab',
      'Alt+F4', 
      'Ctrl+Alt+Delete',
      'Ctrl+Shift+Esc',
      'F11',
      'CommandOrControl+R',
      'CommandOrControl+Shift+R',
      'F5'
    ];

    shortcuts.forEach(shortcut => {
      globalShortcut.register(shortcut, () => {
        // 단축키 무시
      });
    });
  }

  // 관리자 모드 단축키
  globalShortcut.register('Ctrl+Alt+Shift+A', () => {
    if (mainWindow) {
      const isDev = !app.isPackaged;
      if (isDev || process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // 긴급 종료 단축키
  globalShortcut.register('Ctrl+Alt+Shift+Q', () => {
    isQuitting = true;
    app.quit();
  });
}

// 절전 모드 방지
function preventSleep(): void {
  if (config.preventSleep) {
    // 시스템 절전 방지
    app.commandLine.appendSwitch('--disable-sleep');
    
    // 화면 보호기 방지
    app.commandLine.appendSwitch('--disable-background-timer-throttling');
    app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  }
}

// 안전한 재시작 스케줄링
function scheduleRestart(): void {
  if (isQuitting) return;
  
  const currentTime = Date.now();
  
  // 5분이 지났으면 재시작 카운터 리셋
  if (currentTime - lastRestartTime > RESTART_RESET_TIME) {
    restartCount = 0;
  }
  
  // 최대 재시작 횟수 초과 시 중단
  if (restartCount >= MAX_RESTART_COUNT) {
    console.error(`최대 재시작 횟수(${MAX_RESTART_COUNT}) 초과 - 재시작 중단`);
    dialog.showErrorBox('시스템 오류', 
      `애플리케이션이 반복적으로 실패하고 있습니다.\n시스템 관리자에게 문의하세요.\n\n재시작 횟수: ${restartCount}`);
    return;
  }
  
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartCount++;
  lastRestartTime = currentTime;
  
  console.log(`키오스크 재시작 예약 - ${RESTART_INTERVAL/1000}초 후 실행 (${restartCount}/${MAX_RESTART_COUNT})`);
  
  restartTimer = setTimeout(() => {
    if (!isQuitting) {
      console.log(`키오스크 재시작 실행 중... (${restartCount}/${MAX_RESTART_COUNT})`);
      
      // 기존 윈도우가 있다면 정리
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
        mainWindow = null;
      }
      
      createWindow();
    }
  }, RESTART_INTERVAL);
}

// 크래시 복구 설정
function setupCrashRecovery(): void {
  if (config.restartOnCrash && mainWindow) {
    // 웹 컨텐츠 크래시 이벤트 수정
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('렌더 프로세스 크래시:', details);
      
      if (!isQuitting) {
        scheduleRestart();
      }
    });

    // 응답 없음 이벤트
    mainWindow.webContents.on('unresponsive', () => {
      console.warn('윈도우 응답 없음 - 재시작 시도');
      
      dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        title: '시스템 알림',
        message: '애플리케이션이 응답하지 않습니다.\n자동으로 재시작됩니다.',
        buttons: ['확인']
      }).then(() => {
        if (!isQuitting) {
          scheduleRestart();
        }
      });
    });

    // 응답 복구
    mainWindow.webContents.on('responsive', () => {
      console.log('윈도우 응답 복구');
    });
  }
}

// 전원 관리 설정
function setupPowerManagement(): void {
  // 전원 이벤트 모니터링 (powerMonitor.start() 제거)
  powerMonitor.on('suspend', () => {
    console.log('시스템 절전 모드 진입');
  });

  powerMonitor.on('resume', () => {
    console.log('시스템 절전 모드 해제');
    
    // 절전 모드 해제 후 윈도우 복구
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.moveTop();
    }
  });

  powerMonitor.on('on-ac', () => {
    console.log('AC 전원 연결');
  });

  powerMonitor.on('on-battery', () => {
    console.log('배터리 전원 사용');
  });
}

// 시스템 정보 수집
function getSystemInfo(): any {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion(),
    displays: displays.length,
    primaryDisplay: {
      bounds: primaryDisplay.bounds,
      workArea: primaryDisplay.workArea,
      scaleFactor: primaryDisplay.scaleFactor,
      colorDepth: primaryDisplay.colorDepth,
      colorSpace: primaryDisplay.colorSpace
    },
    memory: process.getSystemMemoryInfo(),
    cpu: process.getCPUUsage()
  };
}

// IPC 통신 설정
function setupIPC(): void {
  ipcMain.handle('get-system-info', () => {
    return getSystemInfo();
  });

  ipcMain.handle('get-kiosk-config', () => {
    return config;
  });

  ipcMain.handle('update-kiosk-config', (event, newConfig: Partial<KioskConfig>) => {
    config = { ...config, ...newConfig };
    return config;
  });

  ipcMain.handle('restart-app', () => {
    scheduleRestart();
  });

  ipcMain.handle('quit-app', () => {
    isQuitting = true;
    app.quit();
  });

  // 자동 업데이트 IPC 핸들러
  ipcMain.handle('check-for-updates', () => {
    checkForUpdatesManually();
  });

  ipcMain.handle('get-update-status', () => {
    return getUpdateStatus();
  });
}

// 메뉴 비활성화
function disableMenu(): void {
  if (config.disableMenu) {
    Menu.setApplicationMenu(null);
  }
}

// 애플리케이션 초기화
function initializeApp(): void {
  console.log('CVM 키오스크 모드 초기화');
  
  // 키오스크 설정 적용
  preventSleep();
  setupAutoLaunch();
  disableMenu();
  
  // 자동 업데이터 설정 (프로덕션 환경에서만)
  if (process.env.NODE_ENV === 'production' || app.isPackaged) {
    setupAutoUpdater({
      allowPrerelease: false,
      autoDownload: true,
      allowDowngrade: false,
      silent: true, // 키오스크 모드: 조용한 업데이트
      checkInterval: 6 * 60 * 60 * 1000, // 6시간마다 체크
    });
    console.log('자동 업데이터 활성화됨');
  } else {
    console.log('개발 환경 - 자동 업데이터 비활성화');
  }
  
  // 윈도우 생성
  createWindow();
  
  // 추가 설정
  setupGlobalShortcuts();
  setupPowerManagement();
  setupIPC();
  
  // 크래시 복구는 윈도우 생성 후 설정
  if (mainWindow) {
    setupCrashRecovery();
  }
}

// 애플리케이션 이벤트
app.whenReady().then(() => {
  initializeApp();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!config.autoRestart || isQuitting) {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  
  // 타이머 정리
  if (restartTimer) {
    clearTimeout(restartTimer);
  }
  
  // 글로벌 단축키 해제
  globalShortcut.unregisterAll();
});

// 오류 처리
process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  
  if (!isQuitting && config.restartOnCrash) {
    scheduleRestart();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason, '위치:', promise);
});

console.log('CVM 키오스크 메인 프로세스 시작'); 