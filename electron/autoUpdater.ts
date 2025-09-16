import { app, dialog, BrowserWindow, ipcMain } from "electron";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import { updateFeedManager } from "./updateFeedManager";

interface AutoUpdaterConfig {
  allowPrerelease?: boolean;
  autoDownload?: boolean;
  allowDowngrade?: boolean;
  silent?: boolean;
  checkInterval?: number; // 밀리초 단위
}

export function setupAutoUpdater(config: AutoUpdaterConfig = {}) {
  const {
    allowPrerelease = false,
    autoDownload = true,
    allowDowngrade = false,
    silent = true, // 키오스크: 사용자 상호작용 최소화
    checkInterval = 6 * 60 * 60 * 1000, // 6시간
  } = config;

  // 로그 설정
  log.transports.file.level = "info";
  autoUpdater.logger = log;

  // 업데이터 설정
  autoUpdater.allowPrerelease = allowPrerelease;
  autoUpdater.allowDowngrade = allowDowngrade;
  autoUpdater.autoDownload = autoDownload;
  autoUpdater.autoInstallOnAppQuit = false; // 수동으로 재시작 제어
  autoUpdater.fullChangelog = false;

  // 이벤트 핸들러
  autoUpdater.on("checking-for-update", () => {
    log.info("업데이트 확인 중...");
    // CMS에 상태 보고
    reportToCMS({ status: 'checking', progress: 0 });
  });

  autoUpdater.on("update-available", (info) => {
    log.info(`업데이트 사용 가능: ${info.version}`);
    log.info(`릴리스 날짜: ${info.releaseDate}`);
    log.info(`릴리스 노트: ${info.releaseNotes}`);
    // CMS에 상태 보고
    reportToCMS({ 
      status: 'downloading', 
      targetVersion: info.version,
      progress: 0 
    });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("업데이트가 없습니다.");
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = progressObj.percent.toFixed(1);
    const speed = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
    log.info(`다운로드 진행률: ${percent}% (${speed} MB/s)`);
    log.info(`다운로드: ${progressObj.transferred}/${progressObj.total} bytes`);
    
    // CMS에 진행률 보고
    reportToCMS({ 
      status: 'downloading', 
      progress: progressObj.percent 
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    log.info(`업데이트 다운로드 완료: ${info.version}`);

    // CMS에 다운로드 완료 보고
    reportToCMS({ 
      status: 'installing', 
      targetVersion: info.version,
      progress: 100 
    });

    // 키오스크 모드: 자동 설치 또는 심야 시간 체크
    const shouldInstallNow = shouldAutoInstall(silent);
    
    if (shouldInstallNow) {
      log.info("자동 설치 시작...");
      // CMS에 설치 시작 보고
      reportToCMS({ 
        status: 'installing', 
        targetVersion: info.version,
        progress: 100 
      });
      autoUpdater.quitAndInstall(true, true);
      return;
    }

    // 관리자 모드에서는 사용자에게 확인
    if (!silent) {
      const mainWindow = BrowserWindow.getFocusedWindow();
      if (mainWindow) {
        const response = await dialog.showMessageBox(mainWindow, {
          type: "question",
          buttons: ["지금 재시작", "나중에"],
          defaultId: 0,
          cancelId: 1,
          title: "업데이트 준비 완료",
          message: `업데이트 ${info.version} 설치 준비가 완료되었습니다.`,
          detail: "앱을 재시작하면 업데이트가 설치됩니다.",
        });

        if (response.response === 0) {
          autoUpdater.quitAndInstall(true, true);
        }
      }
    }
  });

  autoUpdater.on("error", (error) => {
    log.error("업데이터 오류:", error);
    
    // 개발 환경에서는 자세한 오류 정보 표시
    if (process.env.NODE_ENV === "development") {
      console.error("Auto updater error:", error);
    }
  });

  // 피드 매니저 초기화
  updateFeedManager.initialize().then(() => {
    log.info("업데이트 피드 시스템 초기화 완료");
    
    // 초기 업데이트 확인 (앱 시작 30초 후)
    setTimeout(() => {
      log.info("초기 업데이트 확인 시작");
      autoUpdater.checkForUpdates();
    }, 30_000);

    // 주기적 업데이트 확인
    setInterval(() => {
      log.info("주기적 업데이트 확인");
      autoUpdater.checkForUpdates();
    }, checkInterval);
  }).catch((error) => {
    log.error("피드 매니저 초기화 실패:", error);
    
    // 피드 매니저 실패 시에도 기본 업데이터는 동작
    setTimeout(() => {
      log.info("기본 업데이트 확인 시작 (피드 매니저 없이)");
      autoUpdater.checkForUpdates();
    }, 30_000);
  });

  log.info(`자동 업데이터 설정 완료 - 확인 주기: ${checkInterval / 1000 / 60}분`);
}

/**
 * 자동 설치 여부 결정
 * 키오스크 환경과 시간대를 고려
 */
function shouldAutoInstall(silent: boolean): boolean {
  // 강제 설치 환경변수가 설정된 경우
  if (process.env.CVM_INSTALL_NOW === "1") {
    return true;
  }

  // 관리자 모드에서는 사용자 확인 필요
  if (!silent) {
    return false;
  }

  // 키오스크 모드에서 심야 시간 체크 (오전 2-5시)
  const now = new Date();
  const hour = now.getHours();
  const isNightTime = hour >= 2 && hour <= 5;

  return isNightTime;
}

/**
 * 수동으로 업데이트 확인
 */
export function checkForUpdatesManually(): void {
  log.info("수동 업데이트 확인 요청");
  autoUpdater.checkForUpdates();
}

/**
 * 현재 업데이트 상태 가져오기
 */
export function getUpdateStatus(): any {
  return {
    isUpdateAvailable: autoUpdater.isUpdaterActive(),
    currentVersion: app.getVersion(),
    feedStatus: updateFeedManager.getFeedStatus(),
  };
}

/**
 * 피드 매니저 상태 가져오기
 */
export function getFeedManagerStatus(): any {
  return updateFeedManager.getFeedStatus();
}

/**
 * 피드 전환
 */
export function switchToFeed(feedIndex: number): Promise<boolean> {
  return updateFeedManager.switchToFeed(feedIndex);
}

/**
 * 모든 피드 헬스체크
 */
export function refreshFeedHealth(): Promise<void> {
  return updateFeedManager.refreshAllFeedHealth();
}

/**
 * CMS에 업데이트 상태 보고
 */
async function reportToCMS(status: {
  status: string;
  targetVersion?: string;
  progress?: number;
  error?: string;
}): Promise<void> {
  try {
    // Renderer 프로세스에 CMS 보고 요청
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (mainWindow) {
      mainWindow.webContents.send('update-status-report', {
        ...status,
        timestamp: new Date().toISOString(),
        currentVersion: app.getVersion()
      });
    }
  } catch (error) {
    log.warn('CMS 상태 보고 실패:', error);
  }
}
