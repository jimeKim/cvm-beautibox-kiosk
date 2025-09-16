const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class HardwareController {
  constructor() {
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
      
      // 시리얼 포트 연결
      this.port = new SerialPort({
        path: portPath,
        baudRate: 9600,
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
      await this.sendCommand('INIT');
      
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
        // 센서 데이터 파싱: SENSOR:DISTANCE:45
        const parts = data.split(':');
        if (parts[1] === 'DISTANCE') {
          const distance = parseFloat(parts[2]);
          this.sensorData.distance = distance;
          this.sensorData.isDetected = distance <= 50; // 50cm 임계값
          this.sensorData.lastUpdate = Date.now();
          
          console.log(`센서 거리: ${distance}cm, 감지: ${this.sensorData.isDetected}`);
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
      }
    } catch (error) {
      console.error('데이터 파싱 에러:', error);
    }
  }

  /**
   * 명령 전송
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
   * 센서 거리 읽기
   */
  async readDistance() {
    if (!this.isConnected) {
      // 연결되지 않은 경우 시뮬레이션 모드
      return Math.random() * 100 + 20;
    }
    
    // 센서 읽기 명령 전송
    await this.sendCommand('READ_SENSOR:DISTANCE');
    
    // 최신 센서 데이터 반환
    return this.sensorData.distance;
  }

  /**
   * LED 제어
   */
  async controlLED(ledNumber, state) {
    const command = `CONTROL:LED${ledNumber}:${state ? 'ON' : 'OFF'}`;
    await this.sendCommand(command);
    return true;
  }

  /**
   * 모터 제어
   */
  async controlMotor(angle, speed = 50) {
    const command = `CONTROL:MOTOR:${angle}:${speed}`;
    await this.sendCommand(command);
    return true;
  }

  /**
   * 모든 제어 정지
   */
  async stopAll() {
    try {
      await this.sendCommand('STOP_ALL');
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