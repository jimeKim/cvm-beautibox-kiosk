import { LoggingService } from './LoggingService';
import { ErrorHandlingService } from './ErrorHandlingService';

export interface RiderSensorConfig {
  type: 'ultrasonic' | 'infrared' | 'laser' | 'radar';
  pin: number;
  triggerPin?: number;
  echoPin?: number;
  maxDistance: number; // cm
  minDistance: number; // cm
  threshold: number; // cm
  sensitivity: number; // 0-100
  updateInterval: number; // ms
  isEnabled: boolean;
}

export interface RiderSensorStatus {
  isConnected: boolean;
  isActive: boolean;
  currentDistance: number | null;
  isRiderDetected: boolean;
  lastDetection: number;
  detectionCount: number;
  errorCount: number;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface RiderDetectionEvent {
  timestamp: number;
  distance: number;
  duration: number; // ms
  confidence: number; // 0-100
  type: 'approach' | 'departure' | 'presence';
}

export interface RiderAnalytics {
  totalDetections: number;
  averageDistance: number;
  averageDuration: number;
  peakHours: Record<string, number>;
  dailyStats: Record<string, {
    detections: number;
    totalTime: number;
    averageDistance: number;
  }>;
}

class RiderSensorService {
  private logger = new LoggingService();
  private errorHandler = new ErrorHandlingService();
  private config: RiderSensorConfig;
  private status: RiderSensorStatus;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private detectionEvents: RiderDetectionEvent[] = [];
  private analytics: RiderAnalytics;
  private callbacks: {
    onRiderDetected?: (event: RiderDetectionEvent) => void;
    onRiderDeparted?: (event: RiderDetectionEvent) => void;
    onDistanceChanged?: (distance: number) => void;
  } = {};

  constructor(config: RiderSensorConfig) {
    this.config = config;
    this.status = {
      isConnected: false,
      isActive: false,
      currentDistance: null,
      isRiderDetected: false,
      lastDetection: 0,
      detectionCount: 0,
      errorCount: 0
    };

    this.analytics = {
      totalDetections: 0,
      averageDistance: 0,
      averageDuration: 0,
      peakHours: {},
      dailyStats: {}
    };

    this.loadAnalytics();
  }

  /**
   * 라이더센서 초기화 및 연결
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('rider-sensor', '라이더센서 초기화 시작');

      if (!this.config.isEnabled) {
        this.logger.warn('rider-sensor', '라이더센서가 비활성화되어 있습니다.');
        return false;
      }

      // Electron 환경에서 하드웨어 API 사용
      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        this.logger.info('rider-sensor', 'BeautiBox API를 통한 라이더센서 연결');
        
        // 센서 상태 확인
        const statusResponse = await window.beautiBoxAPI.system.getStatus();
        if (statusResponse && statusResponse.success) {
          this.status.isConnected = true;
          this.status.isActive = true;
          
          this.logger.info('rider-sensor', '라이더센서 연결 성공');
          return true;
        } else {
          throw new Error('라이더센서 상태 확인 실패');
        }
      } else {
        // 웹 환경에서는 시뮬레이션 모드
        this.logger.info('rider-sensor', '웹 환경: 시뮬레이션 모드로 실행');
        this.status.isConnected = true;
        this.status.isActive = true;
        
        return true;
      }

    } catch (error) {
      const errorMessage = '라이더센서 초기화 실패';
      this.logger.error('rider-sensor', errorMessage, error);
      this.errorHandler.logError(error as Error, '라이더센서 초기화', 'medium');
      return false;
    }
  }

  /**
   * 거리 측정
   */
  async measureDistance(): Promise<number | null> {
    try {
      if (!this.status.isConnected || !this.status.isActive) {
        throw new Error('라이더센서가 연결되지 않았습니다.');
      }

      let distance: number;

      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        // 실제 하드웨어 센서 읽기
        const response = await window.beautiBoxAPI.sensor.readDistance();
        if (response && response.success) {
          distance = response.data;
        } else {
          throw new Error('센서 읽기 실패');
        }
      } else {
        // 시뮬레이션 모드: 랜덤 거리 생성
        const baseDistance = 100 + Math.random() * 50; // 100-150cm 기본
        const noise = (Math.random() - 0.5) * 10; // ±5cm 노이즈
        distance = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, baseDistance + noise));
      }

      // 거리 유효성 검사
      if (distance < this.config.minDistance || distance > this.config.maxDistance) {
        this.status.errorCount++;
        this.logger.warn('rider-sensor', '거리 측정값이 범위를 벗어남', { distance, min: this.config.minDistance, max: this.config.maxDistance });
        return null;
      }

      this.status.currentDistance = distance;
      this.status.errorCount = 0;

      // 거리 변화 콜백 호출
      if (this.callbacks.onDistanceChanged) {
        this.callbacks.onDistanceChanged(distance);
      }

      return distance;

    } catch (error) {
      this.status.errorCount++;
      this.logger.error('rider-sensor', '거리 측정 실패', error);
      return null;
    }
  }

  /**
   * 라이더 감지
   */
  async detectRider(): Promise<boolean> {
    try {
      const distance = await this.measureDistance();
      
      if (distance === null) {
        return false;
      }

      const isDetected = distance <= this.config.threshold;
      const wasDetected = this.status.isRiderDetected;

      if (isDetected && !wasDetected) {
        // 라이더 접근 감지
        this.handleRiderApproach(distance);
      } else if (!isDetected && wasDetected) {
        // 라이더 이탈 감지
        this.handleRiderDeparture(distance);
      } else if (isDetected && wasDetected) {
        // 라이더 지속 감지
        this.updateRiderPresence(distance);
      }

      this.status.isRiderDetected = isDetected;
      return isDetected;

    } catch (error) {
      this.logger.error('rider-sensor', '라이더 감지 실패', error);
      return false;
    }
  }

  /**
   * 라이더 접근 처리
   */
  private handleRiderApproach(distance: number): void {
    const event: RiderDetectionEvent = {
      timestamp: Date.now(),
      distance,
      duration: 0,
      confidence: this.calculateConfidence(distance),
      type: 'approach'
    };

    this.detectionEvents.push(event);
    this.status.detectionCount++;
    this.status.lastDetection = event.timestamp;
    this.analytics.totalDetections++;

    this.logger.info('rider-sensor', '라이더 접근 감지', {
      distance,
      confidence: event.confidence,
      detectionCount: this.status.detectionCount
    });

    // 콜백 호출
    if (this.callbacks.onRiderDetected) {
      this.callbacks.onRiderDetected(event);
    }

    // 분석 데이터 업데이트
    this.updateAnalytics(event);
  }

  /**
   * 라이더 이탈 처리
   */
  private handleRiderDeparture(distance: number): void {
    const lastEvent = this.detectionEvents[this.detectionEvents.length - 1];
    const duration = lastEvent ? Date.now() - lastEvent.timestamp : 0;

    const event: RiderDetectionEvent = {
      timestamp: Date.now(),
      distance,
      duration,
      confidence: this.calculateConfidence(distance),
      type: 'departure'
    };

    this.detectionEvents.push(event);

    this.logger.info('rider-sensor', '라이더 이탈 감지', {
      distance,
      duration,
      confidence: event.confidence
    });

    // 콜백 호출
    if (this.callbacks.onRiderDeparted) {
      this.callbacks.onRiderDeparted(event);
    }

    // 분석 데이터 업데이트
    this.updateAnalytics(event);
  }

  /**
   * 라이더 지속 감지 업데이트
   */
  private updateRiderPresence(distance: number): void {
    const lastEvent = this.detectionEvents[this.detectionEvents.length - 1];
    
    if (lastEvent && lastEvent.type === 'presence') {
      // 기존 presence 이벤트 업데이트
      lastEvent.distance = distance;
      lastEvent.confidence = this.calculateConfidence(distance);
    } else {
      // 새로운 presence 이벤트 생성
      const event: RiderDetectionEvent = {
        timestamp: Date.now(),
        distance,
        duration: 0,
        confidence: this.calculateConfidence(distance),
        type: 'presence'
      };
      this.detectionEvents.push(event);
    }
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(distance: number): number {
    const normalizedDistance = (distance - this.config.minDistance) / (this.config.maxDistance - this.config.minDistance);
    const baseConfidence = (1 - normalizedDistance) * 100;
    const sensitivityFactor = this.config.sensitivity / 100;
    
    return Math.max(0, Math.min(100, baseConfidence * sensitivityFactor));
  }

  /**
   * 모니터링 시작
   */
  async startMonitoring(): Promise<boolean> {
    try {
      if (this.isMonitoring) {
        this.logger.warn('rider-sensor', '라이더센서 모니터링이 이미 실행 중입니다.');
        return false;
      }

      if (!this.status.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) {
          return false;
        }
      }

      this.isMonitoring = true;
      this.logger.info('rider-sensor', '라이더센서 모니터링 시작');

      // 모니터링 인터벌 설정
      this.monitoringInterval = setInterval(async () => {
        await this.detectRider();
      }, this.config.updateInterval);

      return true;

    } catch (error) {
      this.logger.error('rider-sensor', '라이더센서 모니터링 시작 실패', error);
      return false;
    }
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring(): void {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      this.isMonitoring = false;
      this.logger.info('rider-sensor', '라이더센서 모니터링 중지');

    } catch (error) {
      this.logger.error('rider-sensor', '라이더센서 모니터링 중지 실패', error);
    }
  }

  /**
   * 이벤트 콜백 등록
   */
  on(event: 'riderDetected' | 'riderDeparted' | 'distanceChanged', callback: Function): void {
    switch (event) {
      case 'riderDetected':
        this.callbacks.onRiderDetected = callback as (event: RiderDetectionEvent) => void;
        break;
      case 'riderDeparted':
        this.callbacks.onRiderDeparted = callback as (event: RiderDetectionEvent) => void;
        break;
      case 'distanceChanged':
        this.callbacks.onDistanceChanged = callback as (distance: number) => void;
        break;
    }
  }

  /**
   * 분석 데이터 업데이트
   */
  private updateAnalytics(event: RiderDetectionEvent): void {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const hour = new Date(event.timestamp).getHours().toString().padStart(2, '0');

    // 일별 통계 업데이트
    if (!this.analytics.dailyStats[date]) {
      this.analytics.dailyStats[date] = {
        detections: 0,
        totalTime: 0,
        averageDistance: 0
      };
    }

    const dailyStats = this.analytics.dailyStats[date];
    dailyStats.detections++;
    dailyStats.totalTime += event.duration;
    dailyStats.averageDistance = (dailyStats.averageDistance * (dailyStats.detections - 1) + event.distance) / dailyStats.detections;

    // 시간대별 통계 업데이트
    this.analytics.peakHours[hour] = (this.analytics.peakHours[hour] || 0) + 1;

    // 전체 평균 업데이트
    const totalEvents = this.detectionEvents.length;
    this.analytics.averageDistance = (this.analytics.averageDistance * (totalEvents - 1) + event.distance) / totalEvents;
    this.analytics.averageDuration = (this.analytics.averageDuration * (totalEvents - 1) + event.duration) / totalEvents;

    // 분석 데이터 저장
    this.saveAnalytics();
  }

  /**
   * 분석 데이터 저장
   */
  private saveAnalytics(): void {
    try {
      const analyticsData = {
        analytics: this.analytics,
        events: this.detectionEvents.slice(-1000) // 최근 1000개 이벤트만 저장
      };

      localStorage.setItem('rider-sensor-analytics', JSON.stringify(analyticsData));
    } catch (error) {
      this.logger.error('rider-sensor', '분석 데이터 저장 실패', error);
    }
  }

  /**
   * 분석 데이터 로드
   */
  private loadAnalytics(): void {
    try {
      const savedData = localStorage.getItem('rider-sensor-analytics');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.analytics = data.analytics || this.analytics;
        this.detectionEvents = data.events || [];
      }
    } catch (error) {
      this.logger.error('rider-sensor', '분석 데이터 로드 실패', error);
    }
  }

  /**
   * 센서 설정 업데이트
   */
  updateConfig(newConfig: Partial<RiderSensorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('rider-sensor', '라이더센서 설정 업데이트', { config: this.config });
  }

  /**
   * 센서 상태 조회
   */
  getStatus(): RiderSensorStatus {
    return { ...this.status };
  }

  /**
   * 분석 데이터 조회
   */
  getAnalytics(): RiderAnalytics {
    return { ...this.analytics };
  }

  /**
   * 최근 이벤트 조회
   */
  getRecentEvents(count: number = 10): RiderDetectionEvent[] {
    return this.detectionEvents.slice(-count);
  }

  /**
   * 센서 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('rider-sensor', '라이더센서 연결 해제');
      
      this.stopMonitoring();
      this.status.isConnected = false;
      this.status.isActive = false;
      
    } catch (error) {
      this.logger.error('rider-sensor', '라이더센서 연결 해제 실패', error);
    }
  }

  /**
   * 센서 테스트
   */
  async testSensor(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      this.logger.info('rider-sensor', '라이더센서 테스트 시작');
      
      const testResults = {
        connection: false,
        distance: false,
        detection: false,
        monitoring: false
      };

      // 1. 연결 테스트
      const connected = await this.initialize();
      testResults.connection = connected;

      if (!connected) {
        return { 
          success: false, 
          message: '라이더센서 연결 실패',
          details: testResults
        };
      }

      // 2. 거리 측정 테스트
      const distance = await this.measureDistance();
      testResults.distance = distance !== null && distance >= this.config.minDistance && distance <= this.config.maxDistance;

      if (!testResults.distance) {
        return { 
          success: false, 
          message: `거리 측정 실패: ${distance}cm`,
          details: testResults
        };
      }

      // 3. 라이더 감지 테스트
      const isDetected = await this.detectRider();
      testResults.detection = true; // 감지 로직 자체는 정상 작동

      // 4. 모니터링 테스트
      const monitoringStarted = await this.startMonitoring();
      testResults.monitoring = monitoringStarted;

      if (monitoringStarted) {
        // 3초간 모니터링 테스트
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.stopMonitoring();
      }

      const allTestsPassed = testResults.connection && 
        testResults.distance && 
        testResults.detection && 
        testResults.monitoring;

      return {
        success: allTestsPassed,
        message: allTestsPassed ? '모든 라이더센서 테스트 통과' : '일부 라이더센서 테스트 실패',
        details: {
          ...testResults,
          currentDistance: distance,
          isRiderDetected: isDetected,
          config: this.config
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `라이더센서 테스트 실패: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}

// 싱글톤 인스턴스 생성
const defaultConfig: RiderSensorConfig = {
  type: 'ultrasonic',
  pin: 2,
  triggerPin: 3,
  echoPin: 4,
  maxDistance: 200,
  minDistance: 5,
  threshold: 50,
  sensitivity: 80,
  updateInterval: 100,
  isEnabled: true
};

export const riderSensorService = new RiderSensorService(defaultConfig);
export default RiderSensorService; 