import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// IPC 핸들러 설정
function setupIPCHandlers(): void {
  // 시스템 상태 조회
  ipcMain.handle('system:getStatus', async () => {
    return { 
      success: true, 
      data: { 
        overall: 'OK',
        sensor: 'Simulation',
        camera: 'Ready',
        controller: 'Ready'
      } 
    };
  });

  // 거리 측정
  ipcMain.handle('sensor:readDistance', async () => {
    // 시뮬레이션 모드: 랜덤 거리 반환
    const distance = Math.random() * 100 + 20; // 20-120cm
    return { success: true, data: distance };
  });

  // 거리 모니터링 시작
  ipcMain.handle('sensor:startMonitoring', async () => {
    return { success: true };
  });

  // 거리 모니터링 중지
  ipcMain.handle('sensor:stopMonitoring', async () => {
    return { success: true };
  });

  // 카메라 캡처
  ipcMain.handle('camera:capture', async () => {
    return { success: true, data: { path: 'simulation-photo.jpg' } };
  });

  // 카메라 이미지 목록
  ipcMain.handle('camera:getImages', async () => {
    return { success: true, data: [] };
  });

  // LED 제어
  ipcMain.handle('controller:ledOn', async () => {
    return { success: true };
  });

  ipcMain.handle('controller:ledOff', async () => {
    return { success: true };
  });

  // 모터 제어
  ipcMain.handle('controller:rotateMotor', async () => {
    return { success: true };
  });

  // 매트릭스 버튼
  ipcMain.handle('controller:matrixButton', async () => {
    return { success: true };
  });

  // 앱 종료
  ipcMain.handle('app:quit', async () => {
    app.quit();
  });
}

// 메인 윈도우 생성
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
    // 키오스크 모드 설정
    fullscreen: false,
    // 개발 모드에서는 창 크기 조절 가능
    resizable: isDev,
  });

  // 메뉴 숨기기 (키오스크 모드)
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // 개발/프로덕션 모드에 따른 URL 로드
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 개발 모드에서는 DevTools 열기
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // 프로덕션 모드에서는 전체화면
    if (!isDev) {
      mainWindow?.setFullScreen(true);
    }
  });

  // 윈도우 닫기 이벤트
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 개발 모드에서 새로고침 단축키
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        mainWindow?.webContents.reload();
      }
      if (input.key === 'F12') {
        mainWindow?.webContents.toggleDevTools();
      }
    });
  }
}

// 앱 준비 완료
app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫혔을 때
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 보안 설정
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

console.log('CVM Electron 앱이 시작되었습니다.'); 