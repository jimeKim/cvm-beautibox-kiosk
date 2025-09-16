var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join } from 'path';
var mainWindow = null;
var isDev = process.env.NODE_ENV === 'development';
// IPC 핸들러 설정
function setupIPCHandlers() {
    var _this = this;
    // 시스템 상태 조회
    ipcMain.handle('system:getStatus', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, {
                    success: true,
                    data: {
                        overall: 'OK',
                        sensor: 'Simulation',
                        camera: 'Ready',
                        controller: 'Ready'
                    }
                }];
        });
    }); });
    // 거리 측정
    ipcMain.handle('sensor:readDistance', function () { return __awaiter(_this, void 0, void 0, function () {
        var distance;
        return __generator(this, function (_a) {
            distance = Math.random() * 100 + 20;
            return [2 /*return*/, { success: true, data: distance }];
        });
    }); });
    // 거리 모니터링 시작
    ipcMain.handle('sensor:startMonitoring', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    // 거리 모니터링 중지
    ipcMain.handle('sensor:stopMonitoring', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    // 카메라 캡처
    ipcMain.handle('camera:capture', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true, data: { path: 'simulation-photo.jpg' } }];
        });
    }); });
    // 카메라 이미지 목록
    ipcMain.handle('camera:getImages', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true, data: [] }];
        });
    }); });
    // LED 제어
    ipcMain.handle('controller:ledOn', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    ipcMain.handle('controller:ledOff', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    // 모터 제어
    ipcMain.handle('controller:rotateMotor', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    // 매트릭스 버튼
    ipcMain.handle('controller:matrixButton', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: true }];
        });
    }); });
    // 앱 종료
    ipcMain.handle('app:quit', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            app.quit();
            return [2 /*return*/];
        });
    }); });
}
// 메인 윈도우 생성
function createWindow() {
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
    }
    else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }
    // 윈도우가 준비되면 표시
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
        // 프로덕션 모드에서는 전체화면
        if (!isDev) {
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.setFullScreen(true);
        }
    });
    // 윈도우 닫기 이벤트
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    // 개발 모드에서 새로고침 단축키
    if (isDev) {
        mainWindow.webContents.on('before-input-event', function (event, input) {
            if (input.control && input.key.toLowerCase() === 'r') {
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.reload();
            }
            if (input.key === 'F12') {
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.toggleDevTools();
            }
        });
    }
}
// 앱 준비 완료
app.whenReady().then(function () {
    setupIPCHandlers();
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 모든 윈도우가 닫혔을 때
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// 보안 설정
app.on('web-contents-created', function (event, contents) {
    contents.setWindowOpenHandler(function () {
        return { action: 'deny' };
    });
});
console.log('CVM Electron 앱이 시작되었습니다.');
