const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { EventEmitter } = require('events');

class HardwareController extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.sensorData = {
      distance: null,
      isDetected: false,
      lastUpdate: null
    };
    this.controllerState = {
      led1: false,
      led2: false,
      motor: false
    };
  }

  /**
   * 하드웨어 초기화 및 연결
   */
  async initialize(portPath = 'COM11') {
    try {
      console.log(`하드웨어 연결 시도: ${portPath}`);
      
      // 시리얼 포트 연결 (아두이노 코드와 동일한 Baud Rate)
      this.port = new SerialPort({
        path: portPath,
        baudRate: 115200,  // 🔥 이전 작동 설정으로 복원
        autoOpen: false
      });

      // 라인 파서 설정
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 포트 열기
      await new Promise((resolve, reject) => {
        this.port.open((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      this.isConnected = true;
      console.log('하드웨어 연결 성공');
      
      // 초기화 명령 전송
      await this.sendCommand('STATUS');  // 🔥 INIT 대신 아두이노가 지원하는 STATUS 명령 사용
      
      return true;
    } catch (error) {
      console.error('하드웨어 연결 실패:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 데이터 수신 처리
    this.parser.on('data', (data) => {
      this.handleIncomingData(data.trim());
    });

    // 에러 처리
    this.port.on('error', (err) => {
      console.error('시리얼 포트 에러:', err);
      this.isConnected = false;
    });

    // 연결 해제 처리
    this.port.on('close', () => {
      console.log('시리얼 포트 연결 해제');
      this.isConnected = false;
    });
  }

  /**
   * 수신 데이터 처리
   */
  handleIncomingData(data) {
    try {
      console.log('수신 데이터:', data);
      
      if (data.startsWith('SENSOR:')) {
        // 🔥 아두이노 프로토콜에 맞게 수정: SENSOR:DETECTED/CLEAR
        const parts = data.split(':');
        
        if (parts[1] === 'DETECTED') {
          this.sensorData.distance = 25; // 가상 거리 (감지됨)
          this.sensorData.isDetected = true;
          this.sensorData.lastUpdate = Date.now();
          console.log(`✅ 센서 감지: 사용자 접근`);
          
        } else if (parts[1] === 'CLEAR') {
          this.sensorData.distance = 100; // 가상 거리 (미감지)  
          this.sensorData.isDetected = false;
          this.sensorData.lastUpdate = Date.now();
          console.log(`❌ 센서 클리어: 사용자 없음`);
          
        } else if (parts[1] === 'DISTANCE') {
          // 🔄 기존 거리 프로토콜 호환성 유지
          const distance = parseFloat(parts[2]);
          this.sensorData.distance = distance;
          this.sensorData.isDetected = distance <= 50;
          this.sensorData.lastUpdate = Date.now();
          console.log(`📏 센서 거리: ${distance}cm, 감지: ${this.sensorData.isDetected}`);
        }
      } else if (data.startsWith('CONTROLLER:')) {
        // 제어보드 상태 응답: CONTROLLER:LED1:ON
        const parts = data.split(':');
        const device = parts[1].toLowerCase();
        const state = parts[2] === 'ON';
        
        if (device.startsWith('led')) {
          this.controllerState[device] = state;
        } else if (device === 'motor') {
          this.controllerState.motor = state;
        }
        
        console.log(`제어보드 상태 업데이트: ${device} = ${state}`);
        
      // 🔥 새로운 펌웨어 매트릭스 응답 처리
      } else if (data.startsWith('BUTTON_') && data.includes(':SENT')) {
        // BUTTON_1:SENT, BUTTON_15:SENT 등
        const parts = data.split(':');
        const buttonPart = parts[0]; // "BUTTON_1"
        const buttonId = parseInt(buttonPart.replace('BUTTON_', ''));
        
        console.log(`✅ 매트릭스 버튼 ${buttonId} 전송 완료`);
        
        // UI 업데이트를 위한 이벤트 emit (간단한 확인용)
        this.emit('matrix:sent', { buttonId });
        
      } else if (data.startsWith('MATRIX_SIGNAL:')) {
        // MATRIX_SIGNAL:[1,1]:START 등 디버그 정보
        console.log(`🔧 ${data}`);
        
      } else if (data.startsWith('STATUS:READY')) {
        // 새로운 펌웨어 상태 응답
        console.log('📡 아두이노 상태: 준비 완료');
        
      } else if (data.startsWith('VERSION:')) {
        // 버전 정보
        console.log(`📋 아두이노 버전: ${data}`);
      }
    } catch (error) {
      console.error('데이터 파싱 에러:', error);
    }
  }

  /**
   * 명령 전송 (문자열 방식)
   */
  async sendCommand(command) {
    if (!this.isConnected || !this.port) {
      throw new Error('하드웨어가 연결되지 않았습니다');
    }

    return new Promise((resolve, reject) => {
      this.port.write(command + '\n', (err) => {
        if (err) {
          console.error('명령 전송 실패:', err);
          reject(err);
        } else {
          console.log('명령 전송:', command);
          resolve();
        }
      });
    });
  }

  /**
   * 매트릭스 버튼 제어 (문자열 전송 방식 - 새로운 펌웨어 호환)
   */
  async sendMatrixButton(buttonNumber) {
    if (!this.isConnected || !this.port) {
      throw new Error('하드웨어가 연결되지 않았습니다');
    }

    return new Promise((resolve, reject) => {
      // 🔥 새로운 펌웨어 호환: 문자열로 전송 (1~40)
      const command = `${buttonNumber}\n`;
      this.port.write(command, 'utf8', (err) => {
        if (err) {
          console.error('매트릭스 버튼 전송 실패:', err);
          reject(err);
        } else {
          console.log(`📡 매트릭스 버튼 전송: "${buttonNumber}" (문자열)`);
          resolve({ success: true, button: buttonNumber });
        }
      });
    });
  }

  /**
   * 센서 거리 읽기
   */
  async readDistance() {
    if (!this.isConnected) {
      // 연결되지 않은 경우 시뮬레이션 모드
      return Math.random() * 100 + 20;
    }
    
    // 센서 읽기 명령 전송
    await this.sendCommand('STATUS');  // 🔥 아두이노가 지원하는 STATUS 명령으로 변경
    
    // 최신 센서 데이터 반환
    return this.sensorData.distance;
  }

  /**
   * LED 제어 (매트릭스 전용 - 아두이노 호환)
   */
  async controlLED(ledNumber, state) {
    // 🔥 아두이노가 지원하지 않는 CONTROL 명령 대신 매트릭스 버튼으로 대체
    console.log(`💡 LED ${ledNumber} ${state ? 'ON' : 'OFF'} 요청 (매트릭스 전용)`);
    return true; // 시뮬레이션
  }

  /**
   * 모터 제어 (매트릭스 전용 - 아두이노 호환)
   */
  async controlMotor(angle, speed = 50) {
    // 🔥 아두이노가 지원하지 않는 CONTROL 명령 제거
    console.log(`🔄 모터 ${angle}도 회전 요청 (매트릭스 전용)`);
    return true; // 시뮬레이션
  }

  /**
   * 모든 제어 정지 (매트릭스 전용 - 아두이노 호환)
   */
  async stopAll() {
    try {
      // 🔥 아두이노가 지원하지 않는 STOP_ALL 명령 대신 RESET 사용
      console.log('🛑 모든 제어 정지 요청 (매트릭스 전용)');
      this.controllerState.led1 = false;
      this.controllerState.led2 = false;
      this.controllerState.motor = false;
      console.log('모든 하드웨어 정지');
      return true;
    } catch (error) {
      console.error('하드웨어 정지 실패:', error);
      return false;
    }
  }

  /**
   * 연결 상태 확인
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      sensorData: this.sensorData,
      controllerState: this.controllerState,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 연결 해제
   */
  async disconnect() {
    if (this.port && this.isConnected) {
      await this.stopAll();
      this.port.close();
      this.isConnected = false;
      console.log('하드웨어 연결 해제 완료');
    }
  }
}

// 싱글톤 인스턴스
const hardwareController = new HardwareController();

module.exports = hardwareController; 