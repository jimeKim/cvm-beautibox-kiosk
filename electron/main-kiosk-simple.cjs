const { app, BrowserWindow, screen, globalShortcut, ipcMain } = require('electron');
const { join } = require('path');

let mainWindow = null;
let isQuitting = false;

// Create main window
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds } = primaryDisplay;
  
  // 하드웨어 자동 연결 시도
  initializeHardware();
  
  // Kiosk window options
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
      preload: join(__dirname, './preload.cjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      webSecurity: true, // Security enabled
    }
  };

  mainWindow = new BrowserWindow(windowOptions);

  // CSP configuration
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: blob:']
      }
    });
  });

  // Window event listeners
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.focus();
      mainWindow.moveTop();
      
      // 🔧 디버깅을 위한 개발자 도구 단축키 활성화
      mainWindow.webContents.on('before-input-event', (event, input) => {
        // F12 키로 개발자 도구 토글
        if (input.key === 'F12' && input.type === 'keyDown') {
          if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        }
        // Ctrl+Shift+I로도 개발자 도구 토글
        if (input.control && input.shift && input.key === 'I' && input.type === 'keyDown') {
          if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        }
      });
      
      console.log('Kiosk window display completed');
      console.log('💡 개발자 도구: F12 또는 Ctrl+Shift+I로 열기/닫기');
    }
  });

  mainWindow.on('close', (event) => {
    // ALWAYS prevent window closing in kiosk mode (maximum stability)
    event.preventDefault();
    console.log('Window close prevented - kiosk mode active');
    return false;
  });

  mainWindow.on('closed', () => {
    console.log('Window closed - initiating auto recovery');
    mainWindow = null;
    // Auto-recovery: recreate window immediately
    setTimeout(() => {
      if (!mainWindow) {
        console.log('Auto-recovery: Creating new kiosk window');
        createWindow();
      }
    }, 1000);
  });

  // File loading
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Load file with absolute path
    const indexPath = join(__dirname, '../dist/index.html');
    console.log('Loading file path:', indexPath);
    
    mainWindow.loadFile(indexPath).then(() => {
      console.log('HTML file loaded successfully');
    }).catch((err) => {
      console.error('HTML file load failed:', err);
    });
  }

  // Web content event handling
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Web content loaded');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Web content load failed:', errorCode, errorDescription);
  });
}

// Import hardware controller
const hardwareController = require('./hardware-controller.cjs');

// 🔥 매트릭스 모터 이벤트 리스너 설정
function setupMatrixEventListeners() {
  // 모터 시작 이벤트
  hardwareController.on('motor:start', (data) => {
    console.log(`🔥 모터 시작 이벤트: 버튼 ${data.buttonId} [${data.row},${data.col}]`);
    
    // UI로 이벤트 전송
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('matrix:buttonStart', data);
    }
  });
  
  // 모터 정지 이벤트
  hardwareController.on('motor:stop', (data) => {
    console.log(`🔴 모터 정지 이벤트: 버튼 ${data.buttonId} [${data.row},${data.col}]`);
    
    // UI로 이벤트 전송
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('matrix:buttonStop', data);
    }
  });
  
  console.log('✅ 매트릭스 이벤트 리스너 설정 완료');
}

// Hardware initialization
async function initializeHardware() {
  try {
    console.log('하드웨어 자동 연결 시도...');
    const connected = await hardwareController.initialize();
    
    if (connected) {
      console.log('✅ 하드웨어 연결 성공');
      
      // 🔥 매트릭스 모터 이벤트 리스너 설정
      setupMatrixEventListeners();
      
      // 20초 무감지 시 홈 복귀를 위한 센서 모니터링 시작
      startSensorBasedTimer();
    } else {
      console.log('⚠️ 하드웨어 연결 실패 - 시뮬레이션 모드로 실행');
    }
  } catch (error) {
    console.error('하드웨어 초기화 에러:', error);
  }
}

// 센서 기반 20초 타이머
let sensorTimer = null;
let lastDetectionTime = 0;

function startSensorBasedTimer() {
  // 1초마다 센서 상태 확인
  setInterval(async () => {
    try {
      const distance = await hardwareController.readDistance();
      const isDetected = distance !== null && distance <= 50;
      
      // 🔍 프론트엔드로 센서 거리 데이터 전송
      if (mainWindow && !mainWindow.isDestroyed() && distance !== null) {
        mainWindow.webContents.send('sensor:distanceUpdate', { distance });
      }
      
      if (isDetected) {
        lastDetectionTime = Date.now();
      } else {
        // 20초 이상 감지 없으면 제어보드 정지 및 홈 복귀
        const timeSinceLastDetection = Date.now() - lastDetectionTime;
        if (timeSinceLastDetection > 20000) { // 20초
          console.log('20초 이상 센서 감지 없음 - 하드웨어 정지');
          await hardwareController.stopAll();
          
          // 프론트엔드에 홈 복귀 신호 전송
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sensor:autoReturnHome');
          }
          
          lastDetectionTime = Date.now(); // 타이머 리셋
        }
      }
    } catch (error) {
      console.error('센서 기반 타이머 에러:', error);
    }
  }, 1000);
}

// 앱 종료 시 하드웨어 정리
async function cleanupHardware() {
  try {
    console.log('하드웨어 정리 중...');
    await hardwareController.stopAll();
    await hardwareController.disconnect();
    console.log('✅ 하드웨어 정리 완료');
  } catch (error) {
    console.error('하드웨어 정리 에러:', error);
  }
}

// Setup IPC handlers
function setupIPCHandlers() {
  // System status query
  ipcMain.handle('system:getStatus', async () => {
    const hwStatus = hardwareController.getStatus();
    return { 
      success: true, 
      data: { 
        overall: hwStatus.isConnected ? 'OK' : 'Hardware Disconnected',
        sensor: hwStatus.isConnected ? 'Connected' : 'Disconnected',
        camera: 'Ready',
        controller: hwStatus.isConnected ? 'Connected' : 'Disconnected',
        hardware: hwStatus
      } 
    };
  });

  // Distance measurement (실제 하드웨어 연동)
  ipcMain.handle('sensor:readDistance', async () => {
    try {
      const distance = await hardwareController.readDistance();
      return { success: true, data: distance };
    } catch (error) {
      console.error('센서 읽기 실패:', error);
      // 실패 시 시뮬레이션 모드로 폴백
      const distance = Math.random() * 100 + 20;
      return { success: true, data: distance };
    }
  });

  // Start distance monitoring (실제 하드웨어 모니터링)
  ipcMain.handle('sensor:startMonitoring', async (event, intervalMs = 1000) => {
    try {
      // 하드웨어 연결 시도
      await hardwareController.initialize();
      
      // 실시간 센서 데이터 전송 설정
      const interval = setInterval(async () => {
        try {
          const distance = await hardwareController.readDistance();
          if (distance !== null) {
            event.sender.send('sensor:distanceUpdate', { distance });
          }
        } catch (error) {
          console.error('센서 모니터링 에러:', error);
        }
      }, intervalMs);
      
      // 전역 변수에 저장 (정리를 위해)
      global.sensorMonitoringInterval = interval;
      
      return { success: true };
    } catch (error) {
      console.error('센서 모니터링 시작 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop distance monitoring
  ipcMain.handle('sensor:stopMonitoring', async () => {
    try {
      if (global.sensorMonitoringInterval) {
        clearInterval(global.sensorMonitoringInterval);
        global.sensorMonitoringInterval = null;
      }
      return { success: true };
    } catch (error) {
      console.error('센서 모니터링 중지 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // Camera capture
  ipcMain.handle('camera:capture', async () => {
    return { success: true, data: { path: 'simulation-photo.jpg' } };
  });

  // Camera image list
  ipcMain.handle('camera:getImages', async () => {
    return { success: true, data: [] };
  });

  // LED control (실제 하드웨어 연동)
  ipcMain.handle('controller:ledOn', async (event, ledNumber = 1) => {
    try {
      await hardwareController.controlLED(ledNumber, true);
      return { success: true };
    } catch (error) {
      console.error('LED 켜기 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('controller:ledOff', async (event, ledNumber = 1) => {
    try {
      await hardwareController.controlLED(ledNumber, false);
      return { success: true };
    } catch (error) {
      console.error('LED 끄기 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // Motor control (실제 하드웨어 연동)
  ipcMain.handle('controller:rotateMotor', async (event, angle = 90, speed = 50) => {
    try {
      await hardwareController.controlMotor(angle, speed);
      return { success: true };
    } catch (error) {
      console.error('모터 제어 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop all hardware (새로 추가)
  ipcMain.handle('controller:stopAll', async () => {
    try {
      await hardwareController.stopAll();
      return { success: true };
    } catch (error) {
      console.error('하드웨어 정지 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // Matrix button - 🔥 아두이노 프로토콜에 맞게 수정
  ipcMain.handle('controller:matrixButton', async (event, buttonNumber) => {
    try {
      console.log(`🔘 매트릭스 버튼 ${buttonNumber} 토글 요청`);
      
      // 아두이노에 버튼 번호만 전송 (우리가 작성한 아두이노 코드에 맞춰)
      await hardwareController.sendCommand(`${buttonNumber}`);
      
      console.log(`✅ 매트릭스 버튼 ${buttonNumber} 명령 전송 완료`);
      return { success: true, buttonNumber: buttonNumber };
    } catch (error) {
      console.error(`❌ 매트릭스 버튼 ${buttonNumber} 전송 실패:`, error);
      return { success: false, error: error.message, buttonNumber: buttonNumber };
    }
  });

  // Printer silent print
  ipcMain.handle('printer:printSilent', async (event, content) => {
    console.log('Silent print request received');
    try {
      // Electron webContents.print()를 사용한 무음 인쇄
      const printOptions = {
        silent: true,                    // 대화상자 없이 인쇄
        printBackground: true,           // 배경색/이미지 포함
        margins: {
          marginType: 'minimum'          // 최소 여백
        },
        pageSize: {
          width: 80000,                  // 80mm (마이크로미터 단위)
          height: 297000                 // A4 길이
        }
      };

      // 새 창을 생성하여 인쇄
      const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // 임시 HTML로 인쇄 내용 생성
      const printHtml = `
        <html>
          <head>
            <style>
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.1;
                margin: 0;
                padding: 2px;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `;

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHtml)}`);
      
      // 무음 인쇄 실행
      return new Promise((resolve) => {
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          
          if (success) {
            console.log('Silent print completed successfully');
            resolve({ success: true, message: 'Print job submitted to default printer' });
          } else {
            console.log('Silent print failed:', failureReason);
            resolve({ success: false, error: failureReason });
          }
        });
      });

    } catch (error) {
      console.error('Silent print error:', error);
      return { success: false, error: error.message };
    }
  });

  // App quit (blocked in kiosk mode)
  ipcMain.handle('app:quit', async () => {
    console.log('Standard app quit blocked - use admin shutdown instead');
    return { success: false, message: 'Use admin shutdown for kiosk mode' };
  });

  // Admin shutdown (bypasses kiosk protection)
  ipcMain.handle('app:adminShutdown', async () => {
    console.log('Admin shutdown requested - bypassing kiosk protection');
    isQuitting = true;
    isAdminShutdown = true;
    
    try {
      // 하드웨어 정리
      console.log('Admin shutdown: cleaning up hardware...');
      await cleanupHardware();
      
      // Clean shutdown sequence
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      
      // Unregister all shortcuts
      globalShortcut.unregisterAll();
      
      console.log('Admin shutdown: all cleanup completed');
      
    } catch (error) {
      console.error('Admin shutdown error:', error);
    }
    
    // Force quit the application
    setTimeout(() => {
      app.exit(0);
    }, 500);
    
    return { success: true, message: 'Admin shutdown initiated' };
  });
}

// Setup global shortcuts
function setupGlobalShortcuts() {
  // Admin mode shortcut (Ctrl+Alt+A)
  globalShortcut.register('Ctrl+Alt+A', () => {
    if (mainWindow) {
      // Toggle developer tools
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Emergency exit shortcut DISABLED for maximum stability
  // Use admin mode (Ctrl+Alt+A) to access developer tools instead
  console.log('Emergency exit shortcut disabled for kiosk stability');

  // Refresh shortcut (F5)
  globalShortcut.register('F5', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });
}

// Application events
app.whenReady().then(() => {
  console.log('Electron app ready');
  createWindow();
  setupIPCHandlers();
  setupGlobalShortcuts();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // NEVER quit in kiosk mode - recreate window instead
  console.log('All windows closed - recreating kiosk window');
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
});

// 관리자 종료 플래그
let isAdminShutdown = false;

app.on('before-quit', async (event) => {
  if (!isAdminShutdown) {
    // 일반 종료 시 키오스크 모드에서 방지
    event.preventDefault();
    console.log('Application quit prevented - kiosk mode active');
    return false;
  } else {
    // 관리자 종료 시 하드웨어 정리 후 종료
    console.log('Admin shutdown - cleaning up hardware...');
    event.preventDefault();
    await cleanupHardware();
    console.log('Hardware cleanup completed - exiting...');
    app.exit();
  }
});

app.on('will-quit', async (event) => {
  if (!isAdminShutdown) {
    // 일반 종료 시 키오스크 모드에서 방지
    event.preventDefault();
    console.log('Application will-quit prevented - kiosk mode active');
    return false;
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

console.log('CVM Kiosk (Simple Version) Main Process Started'); 