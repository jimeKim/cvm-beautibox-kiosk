import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { app } from "electron";

interface FeedConfig {
  provider: 'github' | 'generic';
  name: string;
  primary?: boolean;
  config: any;
  healthCheck?: string;
}

/**
 * 업데이트 피드 매니저 - GitHub + 미러 서버 페일오버 지원
 */
export class UpdateFeedManager {
  private feeds: FeedConfig[] = [];
  private currentFeedIndex = 0;
  private maxRetries = 3;
  private retryCount = 0;
  private feedHealthChecks = new Map<string, boolean>();

  constructor() {
    this.setupDefaultFeeds();
    this.setupEventHandlers();
  }

  /**
   * 기본 피드 설정 (GitHub + 미러 서버)
   */
  private setupDefaultFeeds() {
    // 1. 기본 GitHub 피드
    this.feeds.push({
      provider: 'github',
      name: 'GitHub Releases (Primary)',
      primary: true,
      config: {
        provider: 'github',
        owner: 'jimeKim',
        repo: 'CVM-Kiosk-App',
        releaseType: 'release'
      },
      healthCheck: 'https://api.github.com/repos/jimeKim/CVM-Kiosk-App/releases/latest'
    });

    // 2. 미러 서버 피드 (사내 서버 또는 CDN)
    this.feeds.push({
      provider: 'generic',
      name: 'Mirror Server (Fallback)',
      config: {
        provider: 'generic',
        url: 'https://updates.yourcompany.com/cvm-kiosk/', // 실제 미러 서버 URL로 변경
        channel: 'latest'
      },
      healthCheck: 'https://updates.yourcompany.com/cvm-kiosk/latest.yml'
    });

    // 3. 중국 지역 전용 피드 (Alibaba Cloud OSS 등)
    this.feeds.push({
      provider: 'generic',
      name: 'China Mirror (OSS)',
      config: {
        provider: 'generic',
        url: 'https://cvm-updates.oss-cn-beijing.aliyuncs.com/',
        channel: 'latest'
      },
      healthCheck: 'https://cvm-updates.oss-cn-beijing.aliyuncs.com/latest.yml'
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers() {
    // 업데이트 확인 실패 시 다음 피드로 전환
    autoUpdater.on('error', (error) => {
      log.error(`피드 오류 [${this.getCurrentFeedName()}]:`, error.message);
      this.handleFeedError(error);
    });

    // 네트워크 오류 감지
    autoUpdater.on('update-not-available', () => {
      log.info(`업데이트 없음 [${this.getCurrentFeedName()}]`);
      this.retryCount = 0; // 성공적으로 확인되었으므로 리셋
    });

    autoUpdater.on('update-available', (info) => {
      log.info(`업데이트 발견 [${this.getCurrentFeedName()}]:`, info.version);
      this.retryCount = 0; // 성공적으로 확인되었으므로 리셋
    });
  }

  /**
   * 피드 오류 처리 및 페일오버
   */
  private async handleFeedError(error: Error) {
    this.retryCount++;
    
    // 네트워크 관련 오류인지 확인
    const isNetworkError = this.isNetworkError(error);
    
    if (isNetworkError && this.retryCount >= this.maxRetries) {
      log.warn(`피드 실패 (${this.retryCount}/${this.maxRetries}) - 다음 피드로 전환`);
      await this.switchToNextFeed();
    } else if (this.retryCount < this.maxRetries) {
      log.info(`피드 재시도 (${this.retryCount}/${this.maxRetries}) - 5초 후 재시도`);
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 5000);
    } else {
      log.error('모든 피드에서 업데이트 확인 실패');
      this.retryCount = 0;
    }
  }

  /**
   * 네트워크 오류 판별
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'net::ERR_',
      'REQUEST_TIMEOUT',
      'NETWORK_ERROR'
    ];
    
    return networkErrorMessages.some(msg => 
      error.message.includes(msg) || error.name.includes(msg)
    );
  }

  /**
   * 다음 피드로 전환
   */
  private async switchToNextFeed(): Promise<boolean> {
    this.currentFeedIndex = (this.currentFeedIndex + 1) % this.feeds.length;
    this.retryCount = 0;
    
    const newFeed = this.feeds[this.currentFeedIndex];
    log.info(`피드 전환: ${newFeed.name}`);
    
    // 피드 헬스체크
    const isHealthy = await this.checkFeedHealth(newFeed);
    if (!isHealthy) {
      log.warn(`피드 헬스체크 실패: ${newFeed.name}`);
      // 다음 피드로 다시 전환
      if (this.currentFeedIndex < this.feeds.length - 1) {
        return this.switchToNextFeed();
      }
    }
    
    // 새 피드 설정 적용
    autoUpdater.setFeedURL(newFeed.config);
    
    // 즉시 업데이트 확인
    setTimeout(() => {
      log.info(`새 피드로 업데이트 확인: ${newFeed.name}`);
      autoUpdater.checkForUpdates();
    }, 2000);
    
    return true;
  }

  /**
   * 피드 헬스체크
   */
  private async checkFeedHealth(feed: FeedConfig): Promise<boolean> {
    if (!feed.healthCheck) return true;
    
    try {
      const response = await fetch(feed.healthCheck, {
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': `CVM-Kiosk/${app.getVersion()}`
        }
      });
      
      const isHealthy = response.ok;
      this.feedHealthChecks.set(feed.name, isHealthy);
      
      log.info(`피드 헬스체크 [${feed.name}]: ${isHealthy ? '정상' : '실패'}`);
      return isHealthy;
    } catch (error) {
      log.warn(`피드 헬스체크 오류 [${feed.name}]:`, error);
      this.feedHealthChecks.set(feed.name, false);
      return false;
    }
  }

  /**
   * 초기 설정 및 최적 피드 선택
   */
  async initialize(): Promise<void> {
    log.info('업데이트 피드 매니저 초기화');
    
    // 모든 피드 헬스체크
    const healthResults = await Promise.all(
      this.feeds.map(feed => this.checkFeedHealth(feed))
    );
    
    // 첫 번째 정상 피드 선택
    let selectedFeedIndex = 0;
    for (let i = 0; i < this.feeds.length; i++) {
      if (healthResults[i]) {
        selectedFeedIndex = i;
        break;
      }
    }
    
    this.currentFeedIndex = selectedFeedIndex;
    const selectedFeed = this.feeds[selectedFeedIndex];
    
    log.info(`선택된 피드: ${selectedFeed.name}`);
    
    // 지역별 최적 피드 선택 (중국 등)
    await this.selectOptimalFeedByRegion();
    
    // 피드 설정 적용
    autoUpdater.setFeedURL(this.feeds[this.currentFeedIndex].config);
  }

  /**
   * 지역별 최적 피드 선택
   */
  private async selectOptimalFeedByRegion(): Promise<void> {
    try {
      // 사용자 지역 감지 (예: IP 기반)
      const region = await this.detectUserRegion();
      
      if (region === 'CN') {
        // 중국 지역인 경우 중국 미러 우선 사용
        const chinaMirrorIndex = this.feeds.findIndex(feed => 
          feed.name.includes('China') || feed.name.includes('OSS')
        );
        
        if (chinaMirrorIndex !== -1) {
          this.currentFeedIndex = chinaMirrorIndex;
          log.info('중국 지역 감지 - 중국 미러 서버 사용');
        }
      }
    } catch (error) {
      log.warn('지역 감지 실패 - 기본 피드 사용:', error);
    }
  }

  /**
   * 사용자 지역 감지
   */
  private async detectUserRegion(): Promise<string> {
    try {
      // 간단한 지역 감지 (실제 서비스에서는 더 정교한 방법 사용)
      const response = await fetch('https://ipapi.co/country_code/', {
        timeout: 5000
      });
      
      if (response.ok) {
        const countryCode = await response.text();
        return countryCode.trim();
      }
    } catch (error) {
      log.warn('IP 기반 지역 감지 실패:', error);
    }
    
    // 시스템 로케일 기반 추정
    const locale = app.getLocale();
    if (locale.includes('zh-CN') || locale.includes('zh')) {
      return 'CN';
    }
    
    return 'UNKNOWN';
  }

  /**
   * 현재 피드 정보
   */
  getCurrentFeedName(): string {
    return this.feeds[this.currentFeedIndex]?.name || 'Unknown';
  }

  /**
   * 피드 상태 정보
   */
  getFeedStatus() {
    return {
      currentFeed: this.getCurrentFeedName(),
      currentIndex: this.currentFeedIndex,
      totalFeeds: this.feeds.length,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      healthChecks: Object.fromEntries(this.feedHealthChecks),
      feeds: this.feeds.map((feed, index) => ({
        name: feed.name,
        provider: feed.provider,
        active: index === this.currentFeedIndex,
        healthy: this.feedHealthChecks.get(feed.name) || false
      }))
    };
  }

  /**
   * 수동으로 특정 피드로 전환
   */
  async switchToFeed(feedIndex: number): Promise<boolean> {
    if (feedIndex < 0 || feedIndex >= this.feeds.length) {
      log.error(`잘못된 피드 인덱스: ${feedIndex}`);
      return false;
    }
    
    this.currentFeedIndex = feedIndex;
    this.retryCount = 0;
    
    const feed = this.feeds[feedIndex];
    log.info(`수동 피드 전환: ${feed.name}`);
    
    autoUpdater.setFeedURL(feed.config);
    return true;
  }

  /**
   * 모든 피드 강제 헬스체크
   */
  async refreshAllFeedHealth(): Promise<void> {
    log.info('모든 피드 헬스체크 시작');
    
    const promises = this.feeds.map(feed => this.checkFeedHealth(feed));
    await Promise.all(promises);
    
    log.info('모든 피드 헬스체크 완료');
  }
}

// 싱글톤 인스턴스
export const updateFeedManager = new UpdateFeedManager();
