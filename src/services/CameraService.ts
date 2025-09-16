import { LoggingService } from './LoggingService';
import { ErrorHandlingService } from './ErrorHandlingService';

export interface CameraConfig {
  deviceId?: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  quality: number;
  autoFocus: boolean;
  ledFlash: boolean;
  facingMode?: 'user' | 'environment';
}

export interface CameraStatus {
  isConnected: boolean;
  isStreaming: boolean;
  currentResolution: string;
  fps: number;
  error?: string;
}

export interface CaptureResult {
  success: boolean;
  imagePath?: string;
  imageData?: string;
  timestamp: number;
  metadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  error?: string;
}

class CameraService {
  private logger = new LoggingService();
  private errorHandler = new ErrorHandlingService();
  private config: CameraConfig;
  private status: CameraStatus;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor(config: CameraConfig) {
    this.config = config;
    this.status = {
      isConnected: false,
      isStreaming: false,
      currentResolution: `${config.resolution.width}x${config.resolution.height}`,
      fps: config.fps,
    };
  }

  /**
   * 카메라 초기화 및 연결
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('camera', '카메라 서비스 초기화 시작');

      // 사용 가능한 카메라 장치 확인
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('사용 가능한 카메라 장치가 없습니다.');
      }

      this.logger.info('camera', `발견된 카메라 장치: ${videoDevices.length}개`, 
        videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
      );

      // Logitech C920 우선 선택
      const logitechC920 = videoDevices.find(device => 
        device.label.toLowerCase().includes('c920') || 
        device.label.toLowerCase().includes('logitech') ||
        device.label.toLowerCase().includes('hd pro webcam')
      );
      
      if (logitechC920) {
        this.config.deviceId = logitechC920.deviceId;
        this.logger.info('camera', 'Logitech C920 카메라 선택됨', { 
          deviceId: logitechC920.deviceId,
          label: logitechC920.label 
        });
      } else {
        // Logitech C920이 없으면 첫 번째 장치 사용
        this.config.deviceId = videoDevices[0].deviceId;
        this.logger.info('camera', '기본 카메라 장치 선택됨', { 
          deviceId: videoDevices[0].deviceId,
          label: videoDevices[0].label 
        });
      }

      // 카메라 연결 성공
      this.status.isConnected = true;
      this.logger.info('camera', '카메라 서비스 초기화 완료');
      
      return true;
    } catch (error) {
      const errorMessage = '카메라 초기화 실패';
      this.logger.error('camera', errorMessage, error);
      this.errorHandler.logError(error as Error, '카메라 초기화', 'high');
      return false;
    }
  }

  /**
   * 카메라 스트림 시작
   */
  async startStream(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.logger.info('camera', '카메라 스트림 시작');
      
      this.videoElement = videoElement;

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: this.config.resolution.width },
          height: { ideal: this.config.resolution.height },
          frameRate: { ideal: this.config.fps },
          facingMode: 'user',
          ...(this.config.deviceId && { deviceId: { exact: this.config.deviceId } })
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      
      // 스트림 시작 대기
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => resolve();
      });

      this.status.isStreaming = true;
      this.logger.info('camera', '카메라 스트림 시작 완료', {
        resolution: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        fps: this.config.fps
      });

      return true;
    } catch (error) {
      const errorMessage = '카메라 스트림 시작 실패';
      this.logger.error('camera', errorMessage, error);
      this.errorHandler.logError(error as Error, '카메라 스트림 시작', 'high');
      return false;
    }
  }

  /**
   * 카메라 스트림 중지
   */
  stopStream(): void {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      this.status.isStreaming = false;
      this.logger.info('camera', '카메라 스트림 중지 완료');
    } catch (error) {
      this.logger.error('camera', '카메라 스트림 중지 실패', error);
    }
  }

  /**
   * 사진 촬영
   */
  async capturePhoto(canvas: HTMLCanvasElement): Promise<CaptureResult> {
    try {
      if (!this.videoElement || !this.stream) {
        throw new Error('카메라 스트림이 활성화되지 않았습니다.');
      }

      this.logger.info('camera', '사진 촬영 시작');

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('캔버스 컨텍스트를 가져올 수 없습니다.');
      }

      // 캔버스 크기 설정
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      // 비디오 프레임을 캔버스에 그리기
      context.drawImage(this.videoElement, 0, 0);

      // 이미지 데이터 추출
      const imageData = canvas.toDataURL('image/jpeg', this.config.quality / 100);
      
      // 파일명 생성 (타임스탬프 기반)
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;

      // 이미지 메타데이터 추출
      const metadata = {
        width: canvas.width,
        height: canvas.height,
        size: Math.round(imageData.length * 0.75), // base64 크기 추정
        format: 'JPEG'
      };

      const result: CaptureResult = {
        success: true,
        imagePath: filename,
        imageData,
        timestamp,
        metadata
      };

      this.logger.info('camera', '사진 촬영 완료', {
        filename,
        metadata
      });

      return result;
    } catch (error) {
      const errorMessage = '사진 촬영 실패';
      this.logger.error('camera', errorMessage, error);
      
      return {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * LED 플래시 제어
   */
  async toggleFlash(on: boolean): Promise<boolean> {
    try {
      if (!this.config.ledFlash) {
        this.logger.warn('camera', 'LED 플래시 기능이 지원되지 않습니다.');
        return false;
      }

      // Electron 환경에서 하드웨어 LED 제어
      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        if (on) {
          await window.beautiBoxAPI.controller.ledOn();
        } else {
          await window.beautiBoxAPI.controller.ledOff();
        }
      }

      this.logger.info('camera', `LED 플래시 ${on ? '켜짐' : '꺼짐'}`);
      return true;
    } catch (error) {
      this.logger.error('camera', 'LED 플래시 제어 실패', error);
      return false;
    }
  }

  /**
   * 카메라 설정 업데이트
   */
  updateConfig(newConfig: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('camera', '카메라 설정 업데이트', {
      config: this.config
    });
  }

  /**
   * 카메라 상태 조회
   */
  getStatus(): CameraStatus {
    return { ...this.status };
  }

  /**
   * 카메라 연결 해제
   */
  disconnect(): void {
    this.stopStream();
    this.status.isConnected = false;
    this.logger.info('camera', '카메라 연결 해제 완료');
  }

  /**
   * 카메라 장치 목록 조회
   */
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      this.logger.error('camera', '카메라 장치 목록 조회 실패', error);
      return [];
    }
  }

  /**
   * 카메라 테스트
   */
  async testCamera(): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 장치 연결 테스트
      const devices = await this.getAvailableDevices();
      if (devices.length === 0) {
        return { success: false, message: '연결된 카메라가 없습니다.' };
      }

      // 2. 스트림 시작 테스트
      const testVideo = document.createElement('video');
      const streamStarted = await this.startStream(testVideo);
      if (!streamStarted) {
        return { success: false, message: '카메라 스트림을 시작할 수 없습니다.' };
      }

      // 3. 촬영 테스트
      const testCanvas = document.createElement('canvas');
      const captureResult = await this.capturePhoto(testCanvas);
      if (!captureResult.success) {
        return { success: false, message: '사진 촬영에 실패했습니다.' };
      }

      // 정리
      this.stopStream();

      return { 
        success: true, 
        message: `카메라 테스트 성공: ${devices.length}개 장치 발견, ${captureResult.metadata?.width}x${captureResult.metadata?.height} 해상도` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `카메라 테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      };
    }
  }
}

// 싱글톤 인스턴스 생성
const defaultConfig: CameraConfig = {
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  quality: 90,
  autoFocus: true,
  ledFlash: true,
  deviceId: undefined, // Logitech C920 자동 선택
  facingMode: 'user'
};

export const cameraService = new CameraService(defaultConfig);
export default CameraService; 