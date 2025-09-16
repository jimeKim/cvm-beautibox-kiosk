import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

interface KioskInfo {
  id: string;
  deviceId: string;
  location: string;
  region: string;
  storeCode: string;
  macAddress: string;
  ipAddress: string;
  osInfo: string;
  hardwareInfo: string;
  version: string;
  registeredAt: string;
  lastSeen: string;
  status: 'active' | 'inactive' | 'maintenance';
  updateChannel: 'stable' | 'beta' | 'alpha';
}

interface RegistrationRequest {
  storeCode: string;
  location: string;
  region: string;
  adminPassword: string;
}

/**
 * 키오스크 등록 및 관리 서비스
 */
export class KioskRegistrationService {
  private readonly STORAGE_KEY = 'cvm_kiosk_registration';
  private readonly API_BASE_URL = process.env.VITE_KIOSK_API_URL || 'https://api.yourcompany.com/kiosk';
  private kioskInfo: KioskInfo | null = null;

  constructor() {
    this.loadStoredRegistration();
  }

  /**
   * 저장된 등록 정보 로드
   */
  private loadStoredRegistration(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.kioskInfo = JSON.parse(stored);
        console.log('기존 키오스크 등록 정보 로드:', this.kioskInfo?.id);
      }
    } catch (error) {
      console.error('등록 정보 로드 실패:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * 키오스크 등록 여부 확인
   */
  isRegistered(): boolean {
    return this.kioskInfo !== null && this.kioskInfo.id !== '';
  }

  /**
   * 현재 키오스크 정보 반환
   */
  getKioskInfo(): KioskInfo | null {
    return this.kioskInfo;
  }

  /**
   * 고유 디바이스 ID 생성
   */
  private async generateDeviceId(): Promise<string> {
    try {
      // 시스템 정보 수집
      const systemInfo = await this.getSystemInfo();
      
      // MAC 주소, CPU 정보 등을 조합하여 고유 ID 생성
      const deviceSignature = JSON.stringify({
        mac: systemInfo.macAddress,
        cpu: systemInfo.cpuInfo,
        motherboard: systemInfo.motherboardInfo,
        timestamp: Date.now()
      });
      
      // SHA-256 해시로 디바이스 ID 생성
      const deviceId = CryptoJS.SHA256(deviceSignature).toString();
      return deviceId.substring(0, 16); // 16자리로 단축
    } catch (error) {
      console.warn('하드웨어 기반 ID 생성 실패, UUID 사용:', error);
      return uuidv4().replace(/-/g, '').substring(0, 16);
    }
  }

  /**
   * 시스템 정보 수집
   */
  private async getSystemInfo(): Promise<any> {
    try {
      // Electron의 경우 main process에서 정보 수집
      if (window.beautiBoxAPI?.system?.getStatus) {
        return await window.beautiBoxAPI.system.getStatus();
      }
      
      // 웹 환경에서는 제한적 정보만 수집
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        memoryInfo: (navigator as any).deviceMemory || 'unknown',
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        macAddress: 'web-unknown', // 웹에서는 수집 불가
        cpuInfo: 'web-unknown',
        motherboardInfo: 'web-unknown'
      };
    } catch (error) {
      console.error('시스템 정보 수집 실패:', error);
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        error: error.message
      };
    }
  }

  /**
   * 네트워크 정보 수집
   */
  private async getNetworkInfo(): Promise<any> {
    try {
      // IP 주소 확인 (외부 서비스 이용)
      const ipResponse = await fetch('https://api.ipify.org?format=json', { timeout: 5000 });
      const ipData = await ipResponse.json();
      
      return {
        publicIp: ipData.ip,
        connection: (navigator as any).connection,
        onlineStatus: navigator.onLine
      };
    } catch (error) {
      console.warn('네트워크 정보 수집 실패:', error);
      return {
        publicIp: 'unknown',
        onlineStatus: navigator.onLine
      };
    }
  }

  /**
   * 키오스크 등록
   */
  async register(request: RegistrationRequest): Promise<boolean> {
    try {
      console.log('키오스크 등록 시작:', request.storeCode);

      // 1. 디바이스 정보 수집
      const deviceId = await this.generateDeviceId();
      const systemInfo = await this.getSystemInfo();
      const networkInfo = await this.getNetworkInfo();

      // 2. 등록 데이터 구성
      const registrationData = {
        deviceId,
        storeCode: request.storeCode,
        location: request.location,
        region: request.region,
        systemInfo,
        networkInfo,
        appVersion: this.getAppVersion(),
        registeredAt: new Date().toISOString(),
        adminPassword: request.adminPassword // 서버에서 검증용
      };

      // 3. 서버에 등록 요청
      const response = await fetch(`${this.API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `CVM-Kiosk/${this.getAppVersion()}`
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`등록 실패: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      // 4. 등록 정보 저장
      this.kioskInfo = {
        id: result.kioskId,
        deviceId,
        location: request.location,
        region: request.region,
        storeCode: request.storeCode,
        macAddress: systemInfo.macAddress || 'unknown',
        ipAddress: networkInfo.publicIp || 'unknown',
        osInfo: systemInfo.platform || navigator.platform,
        hardwareInfo: JSON.stringify(systemInfo),
        version: this.getAppVersion(),
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: 'active',
        updateChannel: result.updateChannel || 'stable'
      };

      // 5. 로컬 저장
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kioskInfo));

      console.log('키오스크 등록 완료:', this.kioskInfo.id);
      return true;

    } catch (error) {
      console.error('키오스크 등록 실패:', error);
      throw error;
    }
  }

  /**
   * 등록 해제
   */
  async unregister(): Promise<boolean> {
    try {
      if (!this.kioskInfo) {
        throw new Error('등록되지 않은 키오스크입니다');
      }

      // 서버에 등록 해제 요청
      const response = await fetch(`${this.API_BASE_URL}/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.kioskInfo.id}`
        },
        body: JSON.stringify({
          kioskId: this.kioskInfo.id,
          deviceId: this.kioskInfo.deviceId
        })
      });

      if (!response.ok) {
        console.warn('서버 등록 해제 실패, 로컬만 삭제');
      }

      // 로컬 정보 삭제
      this.kioskInfo = null;
      localStorage.removeItem(this.STORAGE_KEY);

      console.log('키오스크 등록 해제 완료');
      return true;

    } catch (error) {
      console.error('등록 해제 실패:', error);
      throw error;
    }
  }

  /**
   * 등록 정보 업데이트
   */
  async updateRegistration(updates: Partial<KioskInfo>): Promise<boolean> {
    try {
      if (!this.kioskInfo) {
        throw new Error('등록되지 않은 키오스크입니다');
      }

      // 서버에 업데이트 요청
      const response = await fetch(`${this.API_BASE_URL}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.kioskInfo.id}`
        },
        body: JSON.stringify({
          kioskId: this.kioskInfo.id,
          updates
        })
      });

      if (!response.ok) {
        throw new Error(`업데이트 실패: ${response.statusText}`);
      }

      // 로컬 정보 업데이트
      this.kioskInfo = { ...this.kioskInfo, ...updates };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kioskInfo));

      console.log('등록 정보 업데이트 완료');
      return true;

    } catch (error) {
      console.error('등록 정보 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 하트비트 전송
   */
  async sendHeartbeat(): Promise<boolean> {
    try {
      if (!this.kioskInfo) {
        return false;
      }

      const heartbeatData = {
        kioskId: this.kioskInfo.id,
        timestamp: new Date().toISOString(),
        status: this.getKioskStatus(),
        version: this.getAppVersion(),
        systemInfo: await this.getSystemInfo()
      };

      const response = await fetch(`${this.API_BASE_URL}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.kioskInfo.id}`
        },
        body: JSON.stringify(heartbeatData)
      });

      if (response.ok) {
        // lastSeen 업데이트
        this.kioskInfo.lastSeen = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kioskInfo));
        return true;
      }

      return false;

    } catch (error) {
      console.warn('하트비트 전송 실패:', error);
      return false;
    }
  }

  /**
   * 키오스크 상태 확인
   */
  private getKioskStatus(): string {
    // 실제로는 더 정교한 상태 판별 로직 필요
    if (!navigator.onLine) return 'offline';
    
    // 업데이트 중인지 확인
    if (this.isUpdating()) return 'updating';
    
    return 'online';
  }

  /**
   * 업데이트 중인지 확인
   */
  private isUpdating(): boolean {
    // electron-updater 상태 확인
    // 실제 구현에서는 autoUpdater 상태를 확인
    return false;
  }

  /**
   * 앱 버전 가져오기
   */
  private getAppVersion(): string {
    // package.json에서 버전 정보 가져오기
    // 또는 환경변수에서 가져오기
    return process.env.VITE_APP_VERSION || '1.0.0';
  }

  /**
   * 정기적 하트비트 시작
   */
  startHeartbeat(intervalMs: number = 60000): void {
    // 기존 하트비트 정리
    this.stopHeartbeat();

    // 새 하트비트 시작
    const heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, intervalMs);

    // 정리를 위해 저장
    (window as any).kioskHeartbeatInterval = heartbeatInterval;

    console.log(`하트비트 시작: ${intervalMs}ms 간격`);
  }

  /**
   * 하트비트 중지
   */
  stopHeartbeat(): void {
    const interval = (window as any).kioskHeartbeatInterval;
    if (interval) {
      clearInterval(interval);
      (window as any).kioskHeartbeatInterval = null;
      console.log('하트비트 중지');
    }
  }

  /**
   * 원격 설정 가져오기
   */
  async fetchRemoteConfig(): Promise<any> {
    try {
      if (!this.kioskInfo) {
        throw new Error('등록되지 않은 키오스크입니다');
      }

      const response = await fetch(`${this.API_BASE_URL}/config/${this.kioskInfo.id}`, {
        headers: {
          'Authorization': `Bearer ${this.kioskInfo.id}`
        }
      });

      if (!response.ok) {
        throw new Error(`설정 가져오기 실패: ${response.statusText}`);
      }

      const config = await response.json();
      console.log('원격 설정 수신:', config);
      
      return config;

    } catch (error) {
      console.error('원격 설정 가져오기 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const kioskRegistration = new KioskRegistrationService();
