import { LoggingService } from './LoggingService';
import { ErrorHandlingService } from './ErrorHandlingService';

export interface ControllerConfig {
  port?: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  timeout: number;
  retryAttempts: number;
}

export interface ControllerStatus {
  isConnected: boolean;
  isInitialized: boolean;
  lastHeartbeat: number;
  errorCount: number;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

export interface MotorConfig {
  id: number;
  type: 'stepper' | 'servo' | 'dc';
  maxSpeed: number;
  acceleration: number;
  stepsPerRevolution?: number;
  minAngle?: number;
  maxAngle?: number;
}

export interface LEDConfig {
  id: number;
  type: 'rgb' | 'white' | 'ir';
  brightness: number;
  isOn: boolean;
}

export interface SensorConfig {
  id: number;
  type: 'distance' | 'proximity' | 'touch' | 'temperature';
  pin: number;
  threshold: number;
  isEnabled: boolean;
}

// 🔘 매트릭스 버튼 인터페이스 추가
export interface MatrixButton {
  id: number;          // 1-40
  row: number;         // 1-5
  col: number;         // 1-8
  isOn: boolean;       // 현재 상태
  lastToggled: number; // 마지막 토글 시간
}

// 📊 매트릭스 상태 인터페이스
export interface MatrixStatus {
  isConnected: boolean;
  totalButtons: number;
  activeButtons: number;
  lastCommand: string | null;
  lastResponse: string | null;
  errorCount: number;
}

class ControllerService {
  private logger = new LoggingService();
  private errorHandler = new ErrorHandlingService();
  private config: ControllerConfig;
  private status: ControllerStatus;
  private serialPort: any = null; // SerialPort 인스턴스
  private isInitializing = false;

  // 하드웨어 구성
  private motors: Map<number, MotorConfig> = new Map();
  private leds: Map<number, LEDConfig> = new Map();
  private sensors: Map<number, SensorConfig> = new Map();
  
  // 🔘 매트릭스 버튼 관리
  private matrixButtons: Map<number, MatrixButton> = new Map();
  private matrixStatus: MatrixStatus = {
    isConnected: false,
    totalButtons: 40,
    activeButtons: 0,
    lastCommand: null,
    lastResponse: null,
    errorCount: 0
  };

  constructor(config: ControllerConfig) {
    console.log('🔧 [DEBUG] ControllerService constructor 시작');
    
    this.config = config;
    this.status = {
      isConnected: false,
      isInitialized: false,
      lastHeartbeat: 0,
      errorCount: 0
    };

    console.log('🔧 [DEBUG] initializeHardwareConfig 호출 전');
    this.initializeHardwareConfig();
    
    console.log('🔧 [DEBUG] initializeMatrixButtons 호출 전');
    this.initializeMatrixButtons(); // 🔘 매트릭스 버튼 초기화
    
    console.log('🔧 [DEBUG] ControllerService constructor 완료');
  }

  /**
   * 하드웨어 구성 초기화
   */
  private initializeHardwareConfig(): void {
    // 모터 구성 (예: 상품 배출 모터)
    this.motors.set(1, {
      id: 1,
      type: 'stepper',
      maxSpeed: 1000,
      acceleration: 500,
      stepsPerRevolution: 200
    });

    // LED 구성 (예: 조명, 상태 표시)
    this.leds.set(1, {
      id: 1,
      type: 'white',
      brightness: 100,
      isOn: false
    });

    this.leds.set(2, {
      id: 2,
      type: 'rgb',
      brightness: 80,
      isOn: false
    });

    // 센서 구성
    this.sensors.set(1, {
      id: 1,
      type: 'distance',
      pin: 8,
      threshold: 50,
      isEnabled: true
    });
  }

  // 🔘 매트릭스 버튼 초기화
  private initializeMatrixButtons(): void {
    console.log('🔧 [DEBUG] initializeMatrixButtons 시작');
    
    // 5x8 그리드 (40개) 버튼 생성
    for (let i = 1; i <= 40; i++) {
      const row = Math.ceil(i / 8);  // 1-5행
      const col = ((i - 1) % 8) + 1; // 1-8열
      
      const button = {
        id: i,
        row: row,
        col: col,
        isOn: false,
        lastToggled: 0
      };
      
      this.matrixButtons.set(i, button);
      
      if (i <= 3) { // 처음 3개만 로그 출력
        console.log(`🔧 [DEBUG] 버튼 ${i} 생성:`, button);
      }
    }
    
    console.log('🔧 [DEBUG] initializeMatrixButtons 완료, Map 크기:', this.matrixButtons.size);
    this.logger.info('controller', `매트릭스 버튼 ${this.matrixButtons.size}개 초기화 완료`);
  }

  // 🔘 매트릭스 버튼 토글
  async toggleMatrixButton(buttonId: number): Promise<{ success: boolean; message: string; button?: MatrixButton }> {
    try {
      const button = this.matrixButtons.get(buttonId);
      if (!button) {
        return { 
          success: false, 
          message: `버튼 ID ${buttonId}를 찾을 수 없습니다.`
        };
      }

      // 아두이노로 명령 전송
      const success = await this.sendMatrixCommand(buttonId);
      
      if (success) {
        // 버튼 상태 토글
        button.isOn = !button.isOn;
        button.lastToggled = Date.now();
        
        // 활성 버튼 수 업데이트
        this.updateMatrixStatus();
        
        this.logger.info('controller', 
          `매트릭스 버튼 ${buttonId} [${button.row},${button.col}] → ${button.isOn ? 'ON' : 'OFF'}`
        );
        
        return { 
          success: true, 
          message: `버튼 ${buttonId} ${button.isOn ? '활성화' : '비활성화'}`,
          button: { ...button }
        };
      } else {
        this.matrixStatus.errorCount++;
        return { 
          success: false, 
          message: `버튼 ${buttonId} 제어 실패 - 아두이노 통신 오류`
        };
      }
         } catch (error: any) {
       this.matrixStatus.errorCount++;
       this.logger.error('controller', `매트릭스 버튼 토글 오류: ${error.message}`);
       return { 
         success: false, 
         message: `버튼 토글 오류: ${error.message}`
       };
    }
  }

  // 🚀 매트릭스 시작신호만 전송 (간단한 버전)
  async sendMatrixStartSignal(buttonId: number): Promise<{ success: boolean; message: string; button?: MatrixButton }> {
    try {
      const button = this.matrixButtons.get(buttonId);
      if (!button) {
        return { 
          success: false, 
          message: `버튼 ID ${buttonId}를 찾을 수 없습니다.`
        };
      }

      // 아두이노로 시작신호만 전송
      const success = await this.sendMatrixCommand(buttonId);
      
      if (success) {
        this.logger.info('controller', 
          `실제 아두이노로 매트릭스 명령 전송: ${buttonId}`
        );
        
        return { 
          success: true, 
          message: `버튼 ${buttonId}`,
          button: { ...button }
        };
      } else {
        this.matrixStatus.errorCount++;
        return { 
          success: false, 
          message: `버튼 ${buttonId} 제어 실패 - 아두이노 통신 오류`
        };
      }
    } catch (error: any) {
      this.matrixStatus.errorCount++;
      this.logger.error('controller', `매트릭스 시작신호 전송 오류: ${error.message}`);
      return { 
        success: false, 
        message: `시작신호 전송 오류: ${error.message}`
      };
    }
  }

  // 🎯 버튼 상태 직접 변경 (UI 전용)
  setButtonActive(buttonId: number, isActive: boolean): void {
    const button = this.matrixButtons.get(buttonId);
    if (button) {
      button.isOn = isActive;
      button.lastToggled = Date.now();
      
      // 활성 버튼 수 업데이트
      this.updateMatrixStatus();
      
      this.logger.info('controller', 
        `UI 버튼 ${buttonId} [${button.row},${button.col}] → ${isActive ? 'ON' : 'OFF'}`
      );
    }
  }

  // 🔘 모든 매트릭스 버튼 끄기
  async clearAllMatrixButtons(): Promise<{ success: boolean; message: string; clearedCount: number }> {
    let clearedCount = 0;
    
    try {
      for (const [buttonId, button] of this.matrixButtons) {
        if (button.isOn) {
          const result = await this.toggleMatrixButton(buttonId);
          if (result.success) {
            clearedCount++;
          }
          // 연속 명령 간 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      this.logger.info('controller', `매트릭스 버튼 ${clearedCount}개 클리어 완료`);
      
      return {
        success: true,
        message: `${clearedCount}개 버튼이 비활성화되었습니다.`,
        clearedCount
      };
    } catch (error) {
      return {
        success: false,
        message: `버튼 클리어 오류: ${error.message}`,
        clearedCount
      };
    }
  }

  // 🔘 매트릭스 패턴 테스트
  async testMatrixPattern(pattern: 'sequential' | 'checkerboard' | 'border' | 'cross'): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info('controller', `매트릭스 패턴 테스트 시작: ${pattern}`);
      
      // 모든 버튼 끄기
      await this.clearAllMatrixButtons();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let buttonIds: number[] = [];
      
      switch (pattern) {
        case 'sequential':
          // 1번부터 40번까지 순차적으로
          buttonIds = Array.from({ length: 40 }, (_, i) => i + 1);
          break;
          
        case 'checkerboard':
          // 체스보드 패턴
          buttonIds = [];
          for (let i = 1; i <= 40; i++) {
            const row = Math.ceil(i / 8);
            const col = ((i - 1) % 8) + 1;
            if ((row + col) % 2 === 0) {
              buttonIds.push(i);
            }
          }
          break;
          
        case 'border':
          // 테두리 패턴 (첫 행, 마지막 행, 첫 열, 마지막 열)
          buttonIds = [
            1, 2, 3, 4, 5, 6, 7, 8,        // 첫 행
            33, 34, 35, 36, 37, 38, 39, 40, // 마지막 행
            9, 17, 25,                      // 첫 열 (중간)
            16, 24, 32                      // 마지막 열 (중간)
          ];
          break;
          
        case 'cross':
          // 십자 패턴 (중앙 행과 열)
          buttonIds = [
            17, 18, 19, 20, 21, 22, 23, 24, // 3행 (중간)
            3, 11, 19, 27, 35               // 중간 열
          ];
          break;
      }
      
      // 패턴 버튼들 순차적으로 켜기
      for (const buttonId of buttonIds) {
        await this.toggleMatrixButton(buttonId);
        await new Promise(resolve => setTimeout(resolve, 100)); // 0.1초 지연
      }
      
      return {
        success: true,
        message: `${pattern} 패턴 테스트 완료 (${buttonIds.length}개 버튼)`
      };
    } catch (error) {
      return {
        success: false,
        message: `패턴 테스트 오류: ${error.message}`
      };
    }
  }

  // 🔘 아두이노로 매트릭스 명령 전송
  private async sendMatrixCommand(buttonId: number): Promise<boolean> {
    try {
      // 🔥 실제 아두이노 통신 사용 (beautiBoxAPI 활용)
      if (typeof window !== 'undefined' && window.beautiBoxAPI && window.beautiBoxAPI.controller) {
        this.logger.info('controller', `실제 아두이노로 매트릭스 명령 전송: ${buttonId}`);
        
        const result = await window.beautiBoxAPI.controller.matrixButton(buttonId);
        
        if (result && result.success) {
          this.matrixStatus.lastCommand = `${buttonId}`;
          this.matrixStatus.lastResponse = `BUTTON_${buttonId}:OK`;
          this.logger.info('controller', `아두이노 응답 성공: 버튼 ${buttonId}`);
          return true;
        } else {
          this.logger.error('controller', `아두이노 응답 실패: 버튼 ${buttonId}`, result?.error);
          return false;
        }
      } else {
        // 백업: 시뮬레이션 모드
        this.logger.warn('controller', '아두이노 미연결 - 시뮬레이션 모드');
        this.matrixStatus.lastCommand = `${buttonId}`;
        this.matrixStatus.lastResponse = `BUTTON_${buttonId}:SIMULATED`;
        return true;
      }
    } catch (error: any) {
      this.logger.error('controller', `매트릭스 명령 전송 실패: ${error.message}`);
      return false;
    }
  }

  // 🔘 매트릭스 상태 업데이트
  private updateMatrixStatus(): void {
    this.matrixStatus.activeButtons = Array.from(this.matrixButtons.values())
      .filter(button => button.isOn).length;
  }

  // 🔘 매트릭스 상태 조회
  getMatrixStatus(): MatrixStatus & { buttons: MatrixButton[] } {
    console.log('🔧 [DEBUG] getMatrixStatus 호출됨');
    console.log('🔧 [DEBUG] matrixButtons Map 크기:', this.matrixButtons.size);
    console.log('🔧 [DEBUG] matrixButtons Map 내용:', this.matrixButtons);
    console.log('🔧 [DEBUG] matrixStatus 객체:', this.matrixStatus);
    
    const buttonsArray = Array.from(this.matrixButtons.values()).sort((a, b) => a.id - b.id);
    console.log('🔧 [DEBUG] 변환된 버튼 배열:', buttonsArray);
    
    return {
      ...this.matrixStatus,
      buttons: buttonsArray
    };
  }

  // 🔘 특정 버튼 상태 조회
  getMatrixButton(buttonId: number): MatrixButton | null {
    return this.matrixButtons.get(buttonId) || null;
  }

  // 🔘 매트릭스 연결 테스트
  async testMatrixConnection(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      this.logger.info('controller', '매트릭스 연결 테스트 시작');
      
      // 아두이노 상태 확인 명령
      const statusResult = await this.sendArduinoCommand('STATUS');
      const pingResult = await this.sendArduinoCommand('PING');
      const memoryResult = await this.sendArduinoCommand('MEMORY');
      
      const testResults = {
        status: statusResult,
        ping: pingResult,
        memory: memoryResult,
        matrixInfo: {
          totalButtons: this.matrixStatus.totalButtons,
          activeButtons: this.matrixStatus.activeButtons,
          errorCount: this.matrixStatus.errorCount
        }
      };
      
      const success = statusResult && pingResult;
      this.matrixStatus.isConnected = success;
      
      return {
        success,
        message: success ? '매트릭스 연결 테스트 성공' : '매트릭스 연결 테스트 실패',
        details: testResults
      };
    } catch (error) {
      this.matrixStatus.isConnected = false;
      return {
        success: false,
        message: `매트릭스 연결 테스트 오류: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  // 🔧 아두이노 명령 전송 (일반)
  private async sendArduinoCommand(command: string): Promise<boolean> {
    try {
      if (!this.status.isConnected) {
        // 시뮬레이션 모드
        this.logger.info('controller', `아두이노 명령 시뮬레이션: ${command}`);
        return true;
      }
      
      // 실제 명령 전송
      if (this.serialPort && this.serialPort.write) {
        await this.serialPort.write(`${command}\n`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('controller', `아두이노 명령 전송 실패: ${error.message}`);
      return false;
    }
  }

  /**
   * 제어보드 초기화 및 연결
   */
  async initialize(): Promise<boolean> {
    if (this.isInitializing) {
      this.logger.warn('controller', '제어보드 초기화가 이미 진행 중입니다.');
      return false;
    }

    this.isInitializing = true;

    try {
      this.logger.info('controller', '제어보드 초기화 시작');

      // Electron 환경에서 하드웨어 API 사용
      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        this.logger.info('controller', 'BeautiBox API를 통한 제어보드 연결');
        
        // 시스템 상태 확인
        const statusResponse = await window.beautiBoxAPI.system.getStatus();
        if (statusResponse && statusResponse.success) {
          this.status.isConnected = true;
          this.status.isInitialized = true;
          this.status.lastHeartbeat = Date.now();
          
          this.logger.info('controller', '제어보드 연결 성공', {
            status: statusResponse.data
          });
          
          // 하트비트 모니터링 시작
          this.startHeartbeatMonitoring();
          
          return true;
        } else {
          throw new Error('제어보드 상태 확인 실패');
        }
      } else if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        // 🔥 Electron 환경에서 beautiBoxAPI가 있으면 실제 연결 모드
        this.logger.info('controller', 'Electron 환경: 실제 아두이노 연결 모드');
        this.status.isConnected = true;
        this.status.isInitialized = true;
        this.status.lastHeartbeat = Date.now();
        
        // 하트비트 모니터링 시작
        this.startHeartbeatMonitoring();
        
        return true;
      } else {
        // 웹 환경에서는 시뮬레이션 모드
        this.logger.info('controller', '웹 환경: 시뮬레이션 모드로 실행');
        this.status.isConnected = false; // 시뮬레이션임을 명시
        this.status.isInitialized = true;
        this.status.lastHeartbeat = Date.now();
        
        return true;
      }

    } catch (error) {
      const errorMessage = '제어보드 초기화 실패';
      this.logger.error('controller', errorMessage, error);
      this.errorHandler.logError(error as Error, '제어보드 초기화', 'high');
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 하트비트 모니터링 시작
   */
  private startHeartbeatMonitoring(): void {
    setInterval(() => {
      this.checkHeartbeat();
    }, 5000); // 5초마다 체크
  }

  /**
   * 하트비트 확인
   */
  private async checkHeartbeat(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        const statusResponse = await window.beautiBoxAPI.system.getStatus();
        if (statusResponse && statusResponse.success) {
          this.status.lastHeartbeat = Date.now();
          this.status.errorCount = 0;
        } else {
          this.status.errorCount++;
          this.logger.warn('controller', `하트비트 실패 (${this.status.errorCount}회)`);
        }
      }
    } catch (error) {
      this.status.errorCount++;
      this.logger.error('controller', '하트비트 확인 실패', error);
    }
  }

  /**
   * 모터 제어
   */
  async controlMotor(motorId: number, command: 'rotate' | 'stop' | 'home', params?: any): Promise<boolean> {
    try {
      const motor = this.motors.get(motorId);
      if (!motor) {
        throw new Error(`모터 ID ${motorId}를 찾을 수 없습니다.`);
      }

      this.logger.info('controller', `모터 제어: ${motorId} - ${command}`, params);

      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        switch (command) {
          case 'rotate':
            const angle = params?.angle || 90;
            const speed = params?.speed || motor.maxSpeed;
            await window.beautiBoxAPI.controller.rotateMotor(angle, speed);
            break;
          case 'stop':
            // 모터 정지 명령
            break;
          case 'home':
            // 홈 포지션으로 이동
            break;
        }
      } else {
        // 시뮬레이션 모드
        this.logger.info('controller', `시뮬레이션: 모터 ${motorId} ${command} 실행`);
      }

      return true;
    } catch (error) {
      this.logger.error('controller', '모터 제어 실패', error);
      return false;
    }
  }

  /**
   * LED 제어
   */
  async controlLED(ledId: number, command: 'on' | 'off' | 'toggle' | 'setBrightness', params?: any): Promise<boolean> {
    try {
      const led = this.leds.get(ledId);
      if (!led) {
        throw new Error(`LED ID ${ledId}를 찾을 수 없습니다.`);
      }

      this.logger.info('controller', `LED 제어: ${ledId} - ${command}`, params);

      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        switch (command) {
          case 'on':
            await window.beautiBoxAPI.controller.ledOn();
            led.isOn = true;
            break;
          case 'off':
            await window.beautiBoxAPI.controller.ledOff();
            led.isOn = false;
            break;
          case 'toggle':
            if (led.isOn) {
              await window.beautiBoxAPI.controller.ledOff();
              led.isOn = false;
            } else {
              await window.beautiBoxAPI.controller.ledOn();
              led.isOn = true;
            }
            break;
          case 'setBrightness':
            const brightness = params?.brightness || 100;
            led.brightness = Math.max(0, Math.min(100, brightness));
            break;
        }
      } else {
        // 시뮬레이션 모드
        this.logger.info('controller', `시뮬레이션: LED ${ledId} ${command} 실행`);
      }

      return true;
    } catch (error) {
      this.logger.error('controller', 'LED 제어 실패', error);
      return false;
    }
  }

  /**
   * 센서 읽기
   */
  async readSensor(sensorId: number): Promise<number | null> {
    try {
      const sensor = this.sensors.get(sensorId);
      if (!sensor) {
        throw new Error(`센서 ID ${sensorId}를 찾을 수 없습니다.`);
      }

      if (!sensor.isEnabled) {
        this.logger.warn('controller', `센서 ${sensorId}가 비활성화되어 있습니다.`);
        return null;
      }

      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        const response = await window.beautiBoxAPI.sensor.readDistance();
        if (response && response.success) {
          return response.data;
        }
      } else {
        // 시뮬레이션 모드: 랜덤 값 반환
        const simulatedValue = Math.random() * 100 + 20; // 20-120cm
        this.logger.debug('controller', `시뮬레이션: 센서 ${sensorId} 값 ${simulatedValue.toFixed(1)}cm`);
        return simulatedValue;
      }

      return null;
    } catch (error) {
      this.logger.error('controller', '센서 읽기 실패', error);
      return null;
    }
  }

  /**
   * 매트릭스 버튼 상태 확인
   */
  async checkMatrixButton(buttonNumber: number): Promise<boolean> {
    try {
      this.logger.debug('controller', `매트릭스 버튼 ${buttonNumber} 상태 확인`);

      if (typeof window !== 'undefined' && window.beautiBoxAPI) {
        const response = await window.beautiBoxAPI.controller.matrixButton(buttonNumber);
        return response && response.success;
      } else {
        // 시뮬레이션 모드: 랜덤 상태
        const isPressed = Math.random() > 0.8; // 20% 확률로 눌림
        this.logger.debug('controller', `시뮬레이션: 버튼 ${buttonNumber} ${isPressed ? '눌림' : '해제'}`);
        return isPressed;
      }
    } catch (error) {
      this.logger.error('controller', '매트릭스 버튼 확인 실패', error);
      return false;
    }
  }

  /**
   * 제어보드 재시작
   */
  async restart(): Promise<boolean> {
    try {
      this.logger.info('controller', '제어보드 재시작 시작');
      
      // 연결 해제
      await this.disconnect();
      
      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 재연결
      const success = await this.initialize();
      
      this.logger.info('controller', `제어보드 재시작 ${success ? '성공' : '실패'}`);
      return success;
    } catch (error) {
      this.logger.error('controller', '제어보드 재시작 실패', error);
      return false;
    }
  }

  /**
   * 제어보드 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('controller', '제어보드 연결 해제');
      
      this.status.isConnected = false;
      this.status.isInitialized = false;
      
      // 모든 LED 끄기
      for (const [ledId, led] of this.leds) {
        if (led.isOn) {
          await this.controlLED(ledId, 'off');
        }
      }
      
      // 모든 모터 정지
      for (const [motorId] of this.motors) {
        await this.controlMotor(motorId, 'stop');
      }
      
    } catch (error) {
      this.logger.error('controller', '제어보드 연결 해제 실패', error);
    }
  }

  /**
   * 제어보드 상태 조회
   */
  getStatus(): ControllerStatus {
    return { ...this.status };
  }

  /**
   * 하드웨어 구성 조회
   */
  getHardwareConfig() {
    return {
      motors: Array.from(this.motors.values()),
      leds: Array.from(this.leds.values()),
      sensors: Array.from(this.sensors.values()),
      matrix: this.getMatrixStatus() // 🔘 매트릭스 상태 추가
    };
  }

  /**
   * 제어보드 테스트
   */
  async testController(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      this.logger.info('controller', '제어보드 테스트 시작');
      
      const testResults = {
        connection: false,
        motors: [] as any[],
        leds: [] as any[],
        sensors: [] as any[],
        matrix: null as any // 🔘 매트릭스 테스트 결과 추가
      };

      // 1. 연결 테스트
      const connected = await this.initialize();
      testResults.connection = connected;

      if (!connected) {
        return { 
          success: false, 
          message: '제어보드 연결 실패',
          details: testResults
        };
      }

      // 2. 매트릭스 테스트 (우선순위)
      const matrixTest = await this.testMatrixConnection();
      testResults.matrix = matrixTest;

      // 3. 모터 테스트
      for (const [motorId, motor] of this.motors) {
        try {
          const success = await this.controlMotor(motorId, 'rotate', { angle: 10, speed: 50 });
          testResults.motors.push({ id: motorId, success, type: motor.type });
          
          if (success) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
            await this.controlMotor(motorId, 'stop');
          }
        } catch (error) {
          testResults.motors.push({ id: motorId, success: false, error: error.message });
        }
      }

      // 4. LED 테스트
      for (const [ledId, led] of this.leds) {
        try {
          const success = await this.controlLED(ledId, 'on');
          testResults.leds.push({ id: ledId, success, type: led.type });
          
          if (success) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
            await this.controlLED(ledId, 'off');
          }
        } catch (error) {
          testResults.leds.push({ id: ledId, success: false, error: error.message });
        }
      }

      // 5. 센서 테스트
      for (const [sensorId, sensor] of this.sensors) {
        try {
          const value = await this.readSensor(sensorId);
          testResults.sensors.push({ 
            id: sensorId, 
            success: value !== null, 
            value, 
            type: sensor.type 
          });
        } catch (error) {
          testResults.sensors.push({ id: sensorId, success: false, error: error.message });
        }
      }

      const allTestsPassed = testResults.connection && 
        testResults.matrix.success &&
        testResults.motors.every(m => m.success) &&
        testResults.leds.every(l => l.success) &&
        testResults.sensors.every(s => s.success);

      return {
        success: allTestsPassed,
        message: allTestsPassed ? '모든 제어보드 테스트 통과' : '일부 제어보드 테스트 실패',
        details: testResults
      };

    } catch (error) {
      return {
        success: false,
        message: `제어보드 테스트 실패: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}

// 싱글톤 인스턴스 생성
const defaultConfig: ControllerConfig = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  timeout: 5000,
  retryAttempts: 3
};

export const controllerService = new ControllerService(defaultConfig);
export default ControllerService; 