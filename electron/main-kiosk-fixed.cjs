const { app, BrowserWindow, screen, globalShortcut, powerMonitor, ipcMain, Menu, dialog } = require('electron');
const { join } = require('path');
const serve = require('electron-serve');

// 정적 파일 서빙 설정
const loadURL = serve({
  directory: join(__dirname, '../dist'),
  scheme: 'app',
  hostname: 'localhost'
});

let mainWindow = null;
let isQuitting = false;

// 메인 윈도우 생성
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds } = primaryDisplay;
  
  // 키오스크 윈도우 옵션
  const windowOptions = {
    x: bounds.x,
    y: bounds.y,
    width: 1920,
    height: 1080,
    show: false,
    frame: false,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, './preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      webSecurity: true,
    }
  };

  mainWindow = new BrowserWindow(windowOptions);

  // 윈도우 이벤트 리스너
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.focus();
      mainWindow.moveTop();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      // 키오스크 모드에서는 창 닫기 방지
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 파일 로드 - electron-serve 사용
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // electron-serve를 사용하여 로드
    loadURL(mainWindow);
  }

  // 보안 설정
  setupKioskSecurity();
}

// 키오스크 보안 설정
function setupKioskSecurity() {
  if (!mainWindow) return;

  // 새 윈도우 생성 차단
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // 네비게이션 제한
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // 로컬 앱 프로토콜과 파일 프로토콜만 허용
    if (parsedUrl.protocol !== 'app:' && 
        parsedUrl.protocol !== 'http:' && 
        parsedUrl.protocol !== 'https:' && 
        parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
}

// 전역 단축키 설정
function setupGlobalShortcuts() {
  // 관리자 모드 단축키
  globalShortcut.register('Ctrl+Alt+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 긴급 종료 단축키
  globalShortcut.register('Ctrl+Alt+Shift+Q', () => {
    isQuitting = true;
    app.quit();
  });
}

// 애플리케이션 이벤트
app.whenReady().then(() => {
  createWindow();
  setupGlobalShortcuts();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

console.log('CVM 키오스크 (electron-serve 버전) 메인 프로세스 시작'); 