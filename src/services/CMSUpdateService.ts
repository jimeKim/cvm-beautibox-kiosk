import { databaseService } from './DatabaseService';

interface KioskUpdateConfig {
  kioskId: string;
  storeId: string;
  updateChannel: 'stable' | 'beta' | 'alpha';
  autoUpdate: boolean;
  forceUpdate: boolean;
  scheduledUpdate?: string; // ISO string
}

interface UpdateStatus {
  kioskId: string;
  currentVersion: string;
  targetVersion: string;
  status: 'idle' | 'checking' | 'downloading' | 'installing' | 'completed' | 'failed';
  progress: number;
  lastChecked: string;
  lastUpdated: string;
  error?: string;
}

/**
 * CMS와 연동된 업데이트 관리 서비스
 * 기존 CMS 시스템을 확장하여 자동 업데이트 기능 추가
 */
export class CMSUpdateService {
  private cmsApiUrl: string = '';
  private cmsApiKey: string = '';
  private kioskId: string = '';
  private storeId: string = '';
  private updateConfig: KioskUpdateConfig | null = null;

  constructor() {
    this.initializeFromCMS();
  }

  /**
   * 기존 CMS 설정에서 정보 가져오기
   */
  private initializeFromCMS(): void {
    // DatabaseService에서 CMS 정보 가져오기
    const dbService = databaseService as any;
    this.cmsApiUrl = dbService.cmsApiUrl || '';
    this.cmsApiKey = dbService.cmsApiKey || '';

    // 환경변수나 로컬 스토리지에서 키오스크 정보 가져오기
    this.loadKioskIdentity();

    console.log('CMS 업데이트 서비스 초기화:', {
      kioskId: this.kioskId,
      storeId: this.storeId,
      cmsConnected: !!this.cmsApiUrl
    });
  }

  /**
   * 키오스크 신원 정보 로드
   */
  private loadKioskIdentity(): void {
    // 1. 환경변수에서 확인
    this.kioskId = (window as any).ENV?.VITE_KIOSK_ID || '';
    this.storeId = (window as any).ENV?.VITE_STORE_ID || '';

    // 2. 로컬 스토리지에서 확인
    if (!this.kioskId) {
      const stored = localStorage.getItem('cvm_kiosk_identity');
      if (stored) {
        try {
          const identity = JSON.parse(stored);
          this.kioskId = identity.kioskId || '';
          this.storeId = identity.storeId || '';
        } catch (error) {
          console.warn('키오스크 신원 정보 파싱 실패:', error);
        }
      }
    }

    // 3. 신원 정보가 없으면 생성
    if (!this.kioskId) {
      this.generateKioskIdentity();
    }
  }

  /**
   * 키오스크 신원 정보 생성
   */
  private generateKioskIdentity(): void {
    // 하드웨어 기반 고유 ID 생성 (간단 버전)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const hardwareId = this.getHardwareFingerprint();
    
    this.kioskId = `kiosk_${hardwareId}_${random}`;
    this.storeId = (window as any).ENV?.VITE_DEFAULT_STORE_ID || `store_${timestamp}`;

    // 로컬 스토리지에 저장
    const identity = {
      kioskId: this.kioskId,
      storeId: this.storeId,
      createdAt: new Date().toISOString(),
      hardwareFingerprint: hardwareId
    };

    localStorage.setItem('cvm_kiosk_identity', JSON.stringify(identity));

    console.log('새 키오스크 신원 생성:', identity);
  }

  /**
   * 하드웨어 핑거프린트 생성
   */
  private getHardwareFingerprint(): string {
    const factors = [
      navigator.userAgent,
      navigator.platform,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.language,
      navigator.hardwareConcurrency || 0
    ];

    // 간단한 해시 생성
    let hash = 0;
    const str = factors.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }

    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * CMS에서 업데이트 설정 가져오기
   */
  async fetchUpdateConfig(): Promise<KioskUpdateConfig | null> {
    if (!this.cmsApiUrl || !this.kioskId) {
      console.warn('CMS 연결 정보 또는 키오스크 ID가 없습니다');
      return null;
    }

    try {
      const response = await fetch(`${this.cmsApiUrl}/kiosks/${this.kioskId}/update-config`, {
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = await response.json();
      this.updateConfig = config.data || config;

      console.log('CMS 업데이트 설정 수신:', this.updateConfig);
      return this.updateConfig;

    } catch (error) {
      console.error('CMS 업데이트 설정 가져오기 실패:', error);
      
      // 기본 설정 사용
      this.updateConfig = {
        kioskId: this.kioskId,
        storeId: this.storeId,
        updateChannel: 'stable',
        autoUpdate: true,
        forceUpdate: false
      };

      return this.updateConfig;
    }
  }

  /**
   * CMS에 업데이트 상태 보고
   */
  async reportUpdateStatus(status: Partial<UpdateStatus>): Promise<boolean> {
    if (!this.cmsApiUrl || !this.kioskId) {
      return false;
    }

    try {
      const updateStatus: UpdateStatus = {
        kioskId: this.kioskId,
        currentVersion: this.getCurrentVersion(),
        targetVersion: status.targetVersion || '',
        status: status.status || 'idle',
        progress: status.progress || 0,
        lastChecked: status.lastChecked || new Date().toISOString(),
        lastUpdated: status.lastUpdated || '',
        error: status.error
      };

      const response = await fetch(`${this.cmsApiUrl}/kiosks/${this.kioskId}/update-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateStatus)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('CMS 업데이트 상태 보고 성공:', updateStatus.status);
      return true;

    } catch (error) {
      console.error('CMS 업데이트 상태 보고 실패:', error);
      return false;
    }
  }

  /**
   * 현재 앱 버전 가져오기
   */
  private getCurrentVersion(): string {
    return (window as any).ENV?.VITE_APP_VERSION || 
           process.env.VITE_APP_VERSION || 
           require('../../package.json').version || 
           '1.0.0';
  }

  /**
   * CMS에서 업데이트 명령 확인
   */
  async checkUpdateCommand(): Promise<any> {
    if (!this.cmsApiUrl || !this.kioskId) {
      return null;
    }

    try {
      const response = await fetch(`${this.cmsApiUrl}/kiosks/${this.kioskId}/update-commands`, {
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const commands = await response.json();
      return commands.data || commands;

    } catch (error) {
      console.error('CMS 업데이트 명령 확인 실패:', error);
      return null;
    }
  }

  /**
   * 업데이트 명령 완료 보고
   */
  async acknowledgeUpdateCommand(commandId: string, success: boolean, error?: string): Promise<void> {
    if (!this.cmsApiUrl || !this.kioskId) {
      return;
    }

    try {
      await fetch(`${this.cmsApiUrl}/kiosks/${this.kioskId}/update-commands/${commandId}/ack`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success,
          error,
          timestamp: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error('업데이트 명령 완료 보고 실패:', error);
    }
  }

  /**
   * 키오스크를 CMS에 등록
   */
  async registerKiosk(registrationData: {
    storeCode: string;
    location: string;
    region: string;
    adminPassword?: string;
  }): Promise<boolean> {
    if (!this.cmsApiUrl) {
      console.error('CMS API URL이 설정되지 않았습니다');
      return false;
    }

    try {
      const systemInfo = await this.getSystemInfo();
      
      const payload = {
        kioskId: this.kioskId,
        storeId: this.storeId,
        ...registrationData,
        systemInfo,
        appVersion: this.getCurrentVersion(),
        registeredAt: new Date().toISOString()
      };

      const response = await fetch(`${this.cmsApiUrl}/kiosks/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`등록 실패: HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('키오스크 CMS 등록 성공:', result);

      // 등록 정보 업데이트
      if (result.data?.kioskId) {
        this.kioskId = result.data.kioskId;
      }
      if (result.data?.storeId) {
        this.storeId = result.data.storeId;
      }

      // 로컬 저장
      const identity = {
        kioskId: this.kioskId,
        storeId: this.storeId,
        registeredAt: new Date().toISOString(),
        cmsRegistered: true
      };
      localStorage.setItem('cvm_kiosk_identity', JSON.stringify(identity));

      return true;

    } catch (error) {
      console.error('키오스크 CMS 등록 실패:', error);
      return false;
    }
  }

  /**
   * 시스템 정보 수집
   */
  private async getSystemInfo(): Promise<any> {
    try {
      // Electron API 사용 가능한 경우
      if (window.beautiBoxAPI?.system?.getStatus) {
        return await window.beautiBoxAPI.system.getStatus();
      }

      // 웹 환경 정보
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        connection: (navigator as any).connection?.effectiveType
      };

    } catch (error) {
      console.error('시스템 정보 수집 실패:', error);
      return {
        error: error.message,
        userAgent: navigator.userAgent
      };
    }
  }

  /**
   * 하트비트 전송 (기존 CMS 연결 활용)
   */
  async sendHeartbeat(): Promise<boolean> {
    if (!this.cmsApiUrl || !this.kioskId) {
      return false;
    }

    try {
      const heartbeatData = {
        kioskId: this.kioskId,
        storeId: this.storeId,
        timestamp: new Date().toISOString(),
        version: this.getCurrentVersion(),
        status: this.getKioskStatus(),
        systemInfo: await this.getSystemInfo()
      };

      const response = await fetch(`${this.cmsApiUrl}/kiosks/${this.kioskId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(heartbeatData)
      });

      return response.ok;

    } catch (error) {
      console.warn('하트비트 전송 실패:', error);
      return false;
    }
  }

  /**
   * 키오스크 상태 확인
   */
  private getKioskStatus(): string {
    if (!navigator.onLine) return 'offline';
    
    // 업데이트 중인지 확인 (실제로는 autoUpdater 상태 확인)
    const updateStatus = localStorage.getItem('cvm_update_status');
    if (updateStatus === 'updating') return 'updating';
    
    return 'online';
  }

  /**
   * 키오스크 정보 반환
   */
  getKioskInfo() {
    return {
      kioskId: this.kioskId,
      storeId: this.storeId,
      updateConfig: this.updateConfig,
      cmsConnected: !!this.cmsApiUrl
    };
  }

  /**
   * 키오스크 등록 상태 확인
   */
  isRegistered(): boolean {
    const identity = localStorage.getItem('cvm_kiosk_identity');
    if (!identity) return false;

    try {
      const data = JSON.parse(identity);
      return !!data.cmsRegistered && !!this.kioskId;
    } catch {
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const cmsUpdateService = new CMSUpdateService();
