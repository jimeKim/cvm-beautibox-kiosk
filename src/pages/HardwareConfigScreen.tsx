import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { controllerService, MatrixButton, MatrixStatus } from '@/services/ControllerService';

interface HardwareStatus {
  camera: {
    connected: boolean;
    name: string;
    resolution: string;
    status: string;
  };
  printer: {
    connected: boolean;
    name: string;
    model: string;
    status: string;
  };
  controller: {
    connected: boolean;
    port: string;
    firmware: string;
    status: string;
  };
  sensor: {
    connected: boolean;
    distance: number | null;
    threshold: number;
    status: string;
  };
}

const HardwareConfigScreen: React.FC = () => {
  const { setCurrentStep, currentDistance, systemStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus>({
    camera: {
      connected: false,
      name: 'Logitech C920',
      resolution: '1920x1080',
      status: 'Disconnected'
    },
    printer: {
      connected: false,
      name: 'DP-QW410',
      model: 'Thermal Printer',
      status: 'Disconnected'
    },
    controller: {
      connected: false,
      port: 'COM11',
      firmware: 'v2.0_ENHANCED',
      status: 'Disconnected'
    },
    sensor: {
      connected: currentDistance !== null,
      distance: currentDistance,
      threshold: 50,
      status: currentDistance !== null ? 'Active' : 'Disconnected'
    }
  });

  // 🔘 매트릭스 제어 관련 state 추가
  const [matrixStatus, setMatrixStatus] = useState<MatrixStatus & { buttons: MatrixButton[] }>({
    isConnected: false,
    totalButtons: 40,
    activeButtons: 0,
    lastCommand: null,
    lastResponse: null,
    errorCount: 0,
    buttons: []
  });
  
  const [isMatrixTesting, setIsMatrixTesting] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string>('');

  const [sensorSettings, setSensorSettings] = useState({
    threshold: 50,
    autoTrigger: true,
    delayTime: 3000
  });

  const [cameraSettings, setCameraSettings] = useState({
    resolution: '1920x1080',
    brightness: 50,
    contrast: 50,
    autoFocus: true
  });

  const [printerSettings, setPrinterSettings] = useState({
    paperSize: 'A4',
    printDensity: 100,
    cutMode: 'auto'
  });

  useEffect(() => {
    // 실시간 센서 상태 업데이트
    setHardwareStatus(prev => ({
      ...prev,
      sensor: {
        ...prev.sensor,
        connected: currentDistance !== null,
        distance: currentDistance,
        status: currentDistance !== null ? 'Active' : 'Disconnected'
      }
    }));
  }, [currentDistance]);

  // 🔘 매트릭스 상태 업데이트
  useEffect(() => {
    const updateMatrixStatus = () => {
      console.log('🔘 [DEBUG] ControllerService 인스턴스:', controllerService);
      console.log('🔘 [DEBUG] getMatrixStatus 메서드:', typeof controllerService.getMatrixStatus);
      
      const status = controllerService.getMatrixStatus();
      console.log('🔘 매트릭스 상태 업데이트:', status);
      console.log('🔘 버튼 수:', status.buttons.length);
      console.log('🔘 [DEBUG] 버튼 배열 내용:', status.buttons);
      console.log('🔘 [DEBUG] matrixStatus 객체:', status);
      
      setMatrixStatus(status);
    };
    
    // 초기 로드
    console.log('🔘 매트릭스 상태 초기화 시작');
    updateMatrixStatus();
    
    // 주기적 업데이트 (2초마다)
    const interval = setInterval(updateMatrixStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 매트릭스 실시간 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
      const api = (window as any).beautiBoxAPI;
      
      // 모터 시작 이벤트 리스너
      const handleMatrixStart = (data: any) => {
        console.log('🔥 UI: 모터 시작 이벤트 수신:', data);
        
        // ControllerService의 해당 버튼 상태를 ON으로 업데이트
        const button = controllerService.getMatrixButton(data.buttonId);
        if (button) {
          button.isOn = true;
          button.lastToggled = Date.now();
          
          // UI 상태 즉시 업데이트
          const updatedStatus = controllerService.getMatrixStatus();
          setMatrixStatus(updatedStatus);
          
          console.log(`✅ 버튼 ${data.buttonId} 빨간색으로 변경`);
        }
      };
      
      // 모터 정지 이벤트 리스너
      const handleMatrixStop = (data: any) => {
        console.log('🔴 UI: 모터 정지 이벤트 수신:', data);
        
        // ControllerService의 해당 버튼 상태를 OFF로 업데이트
        const button = controllerService.getMatrixButton(data.buttonId);
        if (button) {
          button.isOn = false;
          button.lastToggled = Date.now();
          
          // UI 상태 즉시 업데이트
          const updatedStatus = controllerService.getMatrixStatus();
          setMatrixStatus(updatedStatus);
          
          console.log(`✅ 버튼 ${data.buttonId} 회색으로 변경`);
        }
      };
      
      // 이벤트 리스너 등록
      console.log('🔥 매트릭스 이벤트 리스너 등록 시도...', !!api.matrix);
      if (api.matrix && api.matrix.onButtonStart) {
        console.log('✅ matrix.onButtonStart 등록');
        api.matrix.onButtonStart(handleMatrixStart);
      } else {
        console.log('❌ matrix.onButtonStart 없음');
      }
      if (api.matrix && api.matrix.onButtonStop) {
        console.log('✅ matrix.onButtonStop 등록');
        api.matrix.onButtonStop(handleMatrixStop);
      } else {
        console.log('❌ matrix.onButtonStop 없음');
      }
      
      // Cleanup
      return () => {
        if (api.matrix && api.matrix.removeButtonListeners) {
          api.matrix.removeButtonListeners();
        }
      };
    }
  }, []);

  const handleTestHardware = async (hardware: string) => {
    switch (hardware) {
      case 'camera':
        setCurrentStep('camera-test');
        break;
      case 'printer':
        setCurrentStep('printer-test');
        break;
      case 'controller':
        await testController();
        break;
      case 'sensor':
        await testSensor();
        break;
      case 'matrix':
        await testMatrixConnection();
        break;
    }
  };

  const testController = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
        const api = (window as any).beautiBoxAPI;
        
        // LED 테스트
        await api.controller.ledOn();
        setTimeout(async () => {
          await api.controller.ledOff();
        }, 2000);
        
        // 모터 테스트
        await api.controller.rotateMotor(90, 50);
        
        setHardwareStatus(prev => ({
          ...prev,
          controller: { ...prev.controller, connected: true, status: 'Test Complete' }
        }));
      }
    } catch (error) {
      console.error('Controller test failed:', error);
    }
  };

  const testSensor = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
        const api = (window as any).beautiBoxAPI;
        const response = await api.sensor.readDistance();
        
        if (response && response.success) {
          setHardwareStatus(prev => ({
            ...prev,
            sensor: { 
              ...prev.sensor, 
              connected: true, 
              distance: response.data,
              status: 'Test Complete' 
            }
          }));
        }
      }
    } catch (error) {
      console.error('Sensor test failed:', error);
    }
  };

  // 🔘 매트릭스 연결 테스트
  const testMatrixConnection = async () => {
    try {
      setIsMatrixTesting(true);
      setMatrixMessage('매트릭스 연결 테스트 중...');
      
      const result = await controllerService.testMatrixConnection();
      
      if (result.success) {
        setMatrixMessage('✅ 매트릭스 연결 테스트 성공!');
        setHardwareStatus(prev => ({
          ...prev,
          controller: { 
            ...prev.controller, 
            connected: true, 
            status: 'Matrix Connected' 
          }
        }));
      } else {
        setMatrixMessage(`❌ 매트릭스 연결 테스트 실패: ${result.message}`);
      }
      
      // 상태 업데이트
      const status = controllerService.getMatrixStatus();
      setMatrixStatus(status);
      
    } catch (error: any) {
      setMatrixMessage(`❌ 테스트 오류: ${error.message}`);
    } finally {
      setIsMatrixTesting(false);
      setTimeout(() => setMatrixMessage(''), 3000);
    }
  };

  // 🔘 매트릭스 버튼 클릭 처리 (강화된 중복 클릭 방지 + 5초 타이머)
  const handleMatrixButtonClick = async (buttonId: number) => {
    try {
      // 🚫 강화된 중복 클릭 방지: 실시간 상태 + UI 상태 체크
      const currentStatus = controllerService.getMatrixStatus();
      const targetButton = currentStatus.buttons.find(btn => btn.id === buttonId);
      
      console.log(`🔍 버튼 ${buttonId} 클릭 시도 - 현재 상태:`, {
        isOn: targetButton?.isOn,
        targetButton: targetButton,
        activeButtons: currentStatus.activeButtons
      });
      
      if (targetButton?.isOn) {
        console.log(`🚫 버튼 ${buttonId} 이미 활성화됨 - 클릭 무시`);
        setMatrixMessage(`⚠️ 버튼 ${buttonId}이 이미 작동 중입니다 (5초 대기)`);
        setTimeout(() => setMatrixMessage(''), 3000);
        return; // 클릭 무시
      }
      
      console.log(`🔘 UI 버튼 클릭: ${buttonId}번 - 5초 모터 작동`);
      
      // 1️⃣ 아두이노로 시작신호만 전송
      const result = await controllerService.sendMatrixStartSignal(buttonId);
      
      if (result.success) {
        // 2️⃣ UI에서 즉시 빨간색으로 변경
        controllerService.setButtonActive(buttonId, true);
        const status = controllerService.getMatrixStatus();
        setMatrixStatus(status);
        setMatrixMessage(`✅ 버튼 ${buttonId} 모터 시작`);
        
        console.log(`✅ 버튼 ${buttonId} 빨간색으로 변경 (5초간 중복 클릭 차단)`);
        
        // 3️⃣ 5초 후 자동으로 회색으로 복귀 (다시 클릭 가능)
        setTimeout(() => {
          controllerService.setButtonActive(buttonId, false);
          const updatedStatus = controllerService.getMatrixStatus();
          setMatrixStatus(updatedStatus);
          console.log(`✅ 버튼 ${buttonId} 회색으로 변경 (다시 클릭 가능)`);
        }, 5000);
        
      } else {
        setMatrixMessage(`❌ ${result.message}`);
      }
      
      setTimeout(() => setMatrixMessage(''), 2000);
    } catch (error: any) {
      setMatrixMessage(`❌ 버튼 제어 오류: ${error.message}`);
      setTimeout(() => setMatrixMessage(''), 2000);
    }
  };

  // 🔘 매트릭스 패턴 테스트
  const handleMatrixPatternTest = async (pattern: 'sequential' | 'checkerboard' | 'border' | 'cross') => {
    try {
      setIsMatrixTesting(true);
      setMatrixMessage(`${pattern} 패턴 테스트 시작...`);
      
      const result = await controllerService.testMatrixPattern(pattern);
      
      if (result.success) {
        setMatrixMessage(`✅ ${result.message}`);
      } else {
        setMatrixMessage(`❌ ${result.message}`);
      }
      
      // 상태 업데이트
      const status = controllerService.getMatrixStatus();
      setMatrixStatus(status);
      
    } catch (error: any) {
      setMatrixMessage(`❌ 패턴 테스트 오류: ${error.message}`);
    } finally {
      setIsMatrixTesting(false);
      setTimeout(() => setMatrixMessage(''), 3000);
    }
  };

  // 🔘 모든 버튼 끄기
  const handleClearAllButtons = async () => {
    try {
      setIsMatrixTesting(true);
      setMatrixMessage('모든 버튼 비활성화 중...');
      
      const result = await controllerService.clearAllMatrixButtons();
      
      if (result.success) {
        setMatrixMessage(`✅ ${result.message}`);
      } else {
        setMatrixMessage(`❌ ${result.message}`);
      }
      
      // 상태 업데이트
      const status = controllerService.getMatrixStatus();
      setMatrixStatus(status);
      
    } catch (error: any) {
      setMatrixMessage(`❌ 초기화 오류: ${error.message}`);
    } finally {
      setIsMatrixTesting(false);
      setTimeout(() => setMatrixMessage(''), 2000);
    }
  };

  const applySettings = () => {
    // 설정 적용 로직
    console.log('Applying settings:', { sensorSettings, cameraSettings, printerSettings });
    alert('설정이 적용되었습니다.');
  };

  const resetSettings = () => {
    setSensorSettings({ threshold: 50, autoTrigger: true, delayTime: 3000 });
    setCameraSettings({ resolution: '1920x1080', brightness: 50, contrast: 50, autoFocus: true });
    setPrinterSettings({ paperSize: 'A4', printDensity: 100, cutMode: 'auto' });
  };

  const handleAdminShutdown = async () => {
    const confirmed = window.confirm(
      '⚠️ 키오스크 시스템을 완전히 종료하시겠습니까?\n\n' +
      '• 모든 진행 중인 작업이 중단됩니다\n' +
      '• 하드웨어 연결이 해제됩니다\n' +
      '• 시스템을 다시 시작하려면 수동으로 실행해야 합니다\n\n' +
      '정말로 종료하시겠습니까?'
    );

    if (confirmed) {
      try {
        console.log('Admin shutdown requested from hardware config');
        
        // Show loading state
        const shutdownButton = document.querySelector('[data-shutdown-btn]') as HTMLButtonElement;
        if (shutdownButton) {
          shutdownButton.textContent = '🔄 종료 중...';
          shutdownButton.disabled = true;
        }

        // Call Electron IPC to shutdown
        const result = await (window as any).beautiBoxAPI?.app?.adminShutdown();
        
        if (result?.success) {
          console.log('Admin shutdown initiated successfully');
        } else {
          console.error('Admin shutdown failed:', result?.message);
          alert('❌ 종료에 실패했습니다: ' + (result?.message || 'Unknown error'));
          
          // Reset button state
          if (shutdownButton) {
            shutdownButton.textContent = '🔌 키오스크 종료';
            shutdownButton.disabled = false;
          }
        }
      } catch (error) {
        console.error('Admin shutdown error:', error);
        alert('❌ 종료 중 오류가 발생했습니다: ' + error);
      }
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 카메라 상태 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📷 카메라</h3>
          <div className={`w-3 h-3 rounded-full ${hardwareStatus.camera.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>모델:</strong> {hardwareStatus.camera.name}</p>
          <p><strong>해상도:</strong> {hardwareStatus.camera.resolution}</p>
          <p><strong>상태:</strong> {hardwareStatus.camera.status}</p>
        </div>
        <button
          onClick={() => handleTestHardware('camera')}
          className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          테스트 실행
        </button>
      </div>

      {/* 프린터 상태 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🖨️ 프린터</h3>
          <div className={`w-3 h-3 rounded-full ${hardwareStatus.printer.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>모델:</strong> {hardwareStatus.printer.name}</p>
          <p><strong>타입:</strong> {hardwareStatus.printer.model}</p>
          <p><strong>상태:</strong> {hardwareStatus.printer.status}</p>
        </div>
        <button
          onClick={() => handleTestHardware('printer')}
          className="mt-4 w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors"
        >
          테스트 실행
        </button>
      </div>

      {/* 제어보드 상태 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🔧 제어보드</h3>
          <div className={`w-3 h-3 rounded-full ${hardwareStatus.controller.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>포트:</strong> {hardwareStatus.controller.port}</p>
          <p><strong>펌웨어:</strong> {hardwareStatus.controller.firmware}</p>
          <p><strong>상태:</strong> {hardwareStatus.controller.status}</p>
        </div>
        <button
          onClick={() => handleTestHardware('controller')}
          className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
        >
          테스트 실행
        </button>
      </div>

      {/* 센서 상태 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📡 센서</h3>
          <div className={`w-3 h-3 rounded-full ${hardwareStatus.sensor.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>거리:</strong> {hardwareStatus.sensor.distance ? `${hardwareStatus.sensor.distance}cm` : 'N/A'}</p>
          <p><strong>임계값:</strong> {hardwareStatus.sensor.threshold}cm</p>
          <p><strong>상태:</strong> {hardwareStatus.sensor.status}</p>
        </div>
        <button
          onClick={() => handleTestHardware('sensor')}
          className="mt-4 w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors"
        >
          테스트 실행
        </button>
      </div>

      {/* 🔘 매트릭스 상태 카드 추가 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🔘 매트릭스 제어보드</h3>
          <div className={`w-3 h-3 rounded-full ${matrixStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <p><strong>총 버튼:</strong> {matrixStatus.totalButtons}개</p>
          <p><strong>활성 버튼:</strong> {matrixStatus.activeButtons}개</p>
          <p><strong>에러 횟수:</strong> {matrixStatus.errorCount}회</p>
          <p><strong>연결 상태:</strong> {matrixStatus.isConnected ? '연결됨' : '연결 안됨'}</p>
        </div>
        {matrixStatus.lastCommand && (
          <div className="mt-2 text-xs text-gray-500">
            <p><strong>마지막 명령:</strong> {matrixStatus.lastCommand}</p>
            {matrixStatus.lastResponse && <p><strong>응답:</strong> {matrixStatus.lastResponse}</p>}
          </div>
        )}
        <button
          onClick={() => handleTestHardware('matrix')}
          disabled={isMatrixTesting}
          className="mt-4 bg-red-500 text-white py-2 px-6 rounded hover:bg-red-600 transition-colors disabled:bg-gray-400"
        >
          {isMatrixTesting ? '테스트 중...' : '매트릭스 연결 테스트'}
        </button>
      </div>
    </div>
  );

  // 🔘 매트릭스 제어 탭 렌더링
  const renderMatrixControl = () => (
    <div className="space-y-6">
      {/* 상태 및 제어 패널 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">🔘 매트릭스 제어 패널</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${matrixStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {matrixStatus.isConnected ? '연결됨' : '연결 안됨'}
            </span>
          </div>
        </div>

        {/* 상태 정보 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-gray-600">총 버튼</div>
            <div className="text-lg font-semibold">{matrixStatus.totalButtons}개</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-gray-600">활성 버튼</div>
            <div className="text-lg font-semibold text-blue-600">{matrixStatus.activeButtons}개</div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-gray-600">에러 횟수</div>
            <div className="text-lg font-semibold text-red-600">{matrixStatus.errorCount}회</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-gray-600">성공률</div>
            <div className="text-lg font-semibold text-green-600">
              {matrixStatus.totalButtons > 0 
                ? Math.round(((matrixStatus.totalButtons - matrixStatus.errorCount) / matrixStatus.totalButtons) * 100)
                : 100}%
            </div>
          </div>
        </div>

        {/* 제어 버튼들 */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => handleMatrixPatternTest('sequential')}
            disabled={isMatrixTesting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            순차 테스트
          </button>
          <button
            onClick={() => handleMatrixPatternTest('checkerboard')}
            disabled={isMatrixTesting}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
          >
            체스보드 패턴
          </button>
          <button
            onClick={() => handleMatrixPatternTest('border')}
            disabled={isMatrixTesting}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:bg-gray-400"
          >
            테두리 패턴
          </button>
          <button
            onClick={() => handleMatrixPatternTest('cross')}
            disabled={isMatrixTesting}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors disabled:bg-gray-400"
          >
            십자 패턴
          </button>
          <button
            onClick={handleClearAllButtons}
            disabled={isMatrixTesting}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:bg-gray-400"
          >
            모두 끄기
          </button>
          <button
            onClick={testMatrixConnection}
            disabled={isMatrixTesting}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors disabled:bg-gray-400"
          >
            연결 테스트
          </button>
        </div>

        {/* 상태 메시지 */}
        {matrixMessage && (
          <div className={`p-3 rounded mb-6 ${
            matrixMessage.includes('✅') ? 'bg-green-100 text-green-800' : 
            matrixMessage.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {matrixMessage}
          </div>
        )}
      </div>

      {/* 5x8 매트릭스 버튼 그리드 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold mb-4">
          5x8 매트릭스 버튼 (40개) - 현재 로드된 버튼: {matrixStatus.buttons.length}개
        </h4>
        
        {/* 디버깅 정보 */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <p><strong>디버깅 정보:</strong></p>
          <p>• 매트릭스 연결: {matrixStatus.isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</p>
          <p>• 로드된 버튼 수: {matrixStatus.buttons.length}개</p>
          <p>• 활성 버튼 수: {matrixStatus.activeButtons}개</p>
          <p>• 에러 횟수: {matrixStatus.errorCount}회</p>
        </div>

        {/* 버튼이 없는 경우 강제 초기화 버튼 */}
        {matrixStatus.buttons.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded">
            <h5 className="font-semibold text-yellow-800 mb-2">⚠️ 매트릭스 버튼이 로드되지 않았습니다</h5>
            <p className="text-yellow-700 mb-3">버튼 데이터를 강제로 초기화하시겠습니까?</p>
            <button
              onClick={async () => {
                console.log('🔧 강제 매트릭스 초기화 시작');
                try {
                  // ControllerService 강제 재초기화
                  await controllerService.initialize();
                  const status = controllerService.getMatrixStatus();
                  console.log('🔧 강제 초기화 후 상태:', status);
                  setMatrixStatus(status);
                  setMatrixMessage('✅ 매트릭스 버튼이 강제 초기화되었습니다.');
                } catch (error: any) {
                  console.error('❌ 강제 초기화 실패:', error);
                  setMatrixMessage(`❌ 강제 초기화 실패: ${error.message}`);
                }
                setTimeout(() => setMatrixMessage(''), 3000);
              }}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
            >
              🔧 매트릭스 강제 초기화
            </button>
          </div>
        )}

        {/* 매트릭스 그리드 */}
        <div className="grid grid-cols-8 gap-2 max-w-4xl mx-auto">
          {matrixStatus.buttons.length > 0 ? (
            matrixStatus.buttons.map((button) => (
              <button
                key={button.id}
                onClick={() => handleMatrixButtonClick(button.id)}
                disabled={isMatrixTesting}
                className={`
                  relative w-12 h-12 rounded border-2 transition-all duration-200 text-xs font-bold
                  ${button.isOn 
                    ? 'bg-red-500 border-red-600 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                  }
                  ${isMatrixTesting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}
                `}
                title={`버튼 ${button.id} [${button.row},${button.col}] - ${button.isOn ? 'ON' : 'OFF'}`}
              >
                <span className="absolute top-0 left-0 text-xs">{button.id}</span>
                <div className="flex items-center justify-center h-full">
                  {button.isOn ? '●' : '○'}
                </div>
                <span className="absolute bottom-0 right-0 text-xs">
                  {button.row},{button.col}
                </span>
              </button>
            ))
          ) : (
            // 버튼이 없을 때 표시할 플레이스홀더
            Array.from({ length: 40 }, (_, i) => (
              <div
                key={i + 1}
                className="w-12 h-12 rounded border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400"
              >
                {i + 1}
              </div>
            ))
          )}
        </div>

        {/* 그리드 설명 */}
        <div className="mt-6 text-sm text-gray-600">
          <p><strong>사용법:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>각 버튼을 클릭하여 개별 제어</li>
            <li>버튼 번호: 1-40 (왼쪽 위부터 오른쪽으로 순서)</li>
            <li>좌표: [행,열] 형식 (1,1부터 5,8까지)</li>
            <li>● = 활성화, ○ = 비활성화</li>
            <li>상단 제어 버튼으로 패턴 테스트 가능</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSensorConfig = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6">센서 설정</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            감지 임계값: {sensorSettings.threshold}cm
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={sensorSettings.threshold}
            onChange={(e) => setSensorSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-500 mt-1">{sensorSettings.threshold}cm</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자동 트리거 지연시간 (초)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={sensorSettings.delayTime / 1000}
            onChange={(e) => setSensorSettings(prev => ({ ...prev, delayTime: parseInt(e.target.value) * 1000 }))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-500 mt-1">{sensorSettings.delayTime / 1000}초</div>
        </div>
        
        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={sensorSettings.autoTrigger}
              onChange={(e) => setSensorSettings(prev => ({ ...prev, autoTrigger: e.target.checked }))}
              className="mr-2"
            />
            자동 페이지 이동 활성화
          </label>
        </div>
      </div>
    </div>
  );

  const renderCameraConfig = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6">카메라 설정</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">해상도</label>
          <select
            value={cameraSettings.resolution}
            onChange={(e) => setCameraSettings(prev => ({ ...prev, resolution: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="1920x1080">1920x1080 (Full HD)</option>
            <option value="1280x720">1280x720 (HD)</option>
            <option value="640x480">640x480 (VGA)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            밝기: {cameraSettings.brightness}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={cameraSettings.brightness}
            onChange={(e) => setCameraSettings(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            대비: {cameraSettings.contrast}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={cameraSettings.contrast}
            onChange={(e) => setCameraSettings(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={cameraSettings.autoFocus}
              onChange={(e) => setCameraSettings(prev => ({ ...prev, autoFocus: e.target.checked }))}
              className="mr-2"
            />
            자동 초점
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrinterConfig = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6">프린터 설정</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">용지 크기</label>
          <select
            value={printerSettings.paperSize}
            onChange={(e) => setPrinterSettings(prev => ({ ...prev, paperSize: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="4x6">4x6 inch</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            인쇄 농도: {printerSettings.printDensity}%
          </label>
          <input
            type="range"
            min="50"
            max="150"
            value={printerSettings.printDensity}
            onChange={(e) => setPrinterSettings(prev => ({ ...prev, printDensity: parseInt(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">용지 절단</label>
          <select
            value={printerSettings.cutMode}
            onChange={(e) => setPrinterSettings(prev => ({ ...prev, cutMode: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="auto">자동 절단</option>
            <option value="manual">수동 절단</option>
            <option value="none">절단 안함</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🔧 하드웨어 설정</h1>
            <div className="flex space-x-4">
              <button
                onClick={applySettings}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                설정 적용
              </button>
              <button
                onClick={resetSettings}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                초기화
              </button>
              <button
                onClick={() => setCurrentStep('home')}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                나가기
              </button>
              <button
                onClick={handleAdminShutdown}
                data-shutdown-btn
                className="bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 transition-colors border-2 border-red-600"
              >
                🔌 키오스크 종료
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: '🏠 전체 현황', icon: '🏠' },
              { id: 'matrix', name: '🔘 매트릭스 제어', icon: '🔘' },
              { id: 'sensor', name: '📡 센서 설정', icon: '📡' },
              { id: 'camera', name: '📷 카메라 설정', icon: '📷' },
              { id: 'printer', name: '🖨️ 프린터 설정', icon: '🖨️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'matrix' && renderMatrixControl()}
        {activeTab === 'sensor' && renderSensorConfig()}
        {activeTab === 'camera' && renderCameraConfig()}
        {activeTab === 'printer' && renderPrinterConfig()}
      </div>
    </div>
  );
};

export default HardwareConfigScreen; 