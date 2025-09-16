import React, { useState, useEffect, useRef } from 'react';
import { cameraService } from '@/services/CameraService';
import { useAppStore } from '@/store';

const CameraTestScreen: React.FC = () => {
  const { setCurrentStep } = useAppStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initializeCamera();
    return () => {
      cleanup();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setError(null);
      console.log('카메라 초기화 시작...');
      
      const initialized = await cameraService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const devices = await cameraService.getAvailableDevices();
        setDevices(devices);
        
        const status = cameraService.getStatus();
        setStatus(status);
        
        console.log('카메라 초기화 성공');
      } else {
        setError('카메라 초기화 실패');
      }
    } catch (err) {
      setError(`카메라 초기화 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const startStream = async () => {
    try {
      if (!videoRef.current) return;
      
      const streamStarted = await cameraService.startStream(videoRef.current);
      setIsStreaming(streamStarted);
      
      if (streamStarted) {
        console.log('카메라 스트림 시작 성공');
      } else {
        setError('카메라 스트림 시작 실패');
      }
    } catch (err) {
      setError(`스트림 시작 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const stopStream = () => {
    cameraService.stopStream();
    setIsStreaming(false);
    console.log('카메라 스트림 중지');
  };

  const capturePhoto = async () => {
    try {
      if (!canvasRef.current) return;
      
      const result = await cameraService.capturePhoto(canvasRef.current);
      
      if (result.success) {
        console.log('사진 촬영 성공:', result.metadata);
        alert(`사진 촬영 성공!\n해상도: ${result.metadata?.width}x${result.metadata?.height}\n크기: ${result.metadata?.size} bytes`);
      } else {
        setError(`사진 촬영 실패: ${result.error}`);
      }
    } catch (err) {
      setError(`사진 촬영 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const testCamera = async () => {
    try {
      setError(null);
      const result = await cameraService.testCamera();
      setTestResults(result);
      
      if (result.success) {
        console.log('카메라 테스트 성공:', result.message);
      } else {
        setError(`카메라 테스트 실패: ${result.message}`);
      }
    } catch (err) {
      setError(`카메라 테스트 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const toggleFlash = async () => {
    try {
      const success = await cameraService.toggleFlash(true);
      if (success) {
        console.log('LED 플래시 켜기 성공');
        setTimeout(() => cameraService.toggleFlash(false), 1000);
      } else {
        setError('LED 플래시 제어 실패');
      }
    } catch (err) {
      setError(`LED 플래시 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const cleanup = () => {
    cameraService.disconnect();
    console.log('카메라 연결 정리 완료');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              📷 카메라 하드웨어 테스트
            </h1>
            <button
              onClick={() => setCurrentStep('admin')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ← 관리자 화면으로
            </button>
          </div>

          {/* 상태 표시 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isInitialized ? 'bg-green-100' : 'bg-red-100'}`}>
              <h3 className="font-semibold">초기화 상태</h3>
              <p className={isInitialized ? 'text-green-600' : 'text-red-600'}>
                {isInitialized ? '✅ 성공' : '❌ 실패'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${isStreaming ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <h3 className="font-semibold">스트림 상태</h3>
              <p className={isStreaming ? 'text-green-600' : 'text-yellow-600'}>
                {isStreaming ? '✅ 실행 중' : '⏸️ 중지됨'}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-100">
              <h3 className="font-semibold">발견된 장치</h3>
              <p className="text-blue-600">{devices.length}개</p>
            </div>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>오류:</strong> {error}
            </div>
          )}

          {/* 카메라 화면 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">카메라 미리보기</h3>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">카메라 정보</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {status && (
                  <div className="space-y-2">
                    <p><strong>연결 상태:</strong> {status.isConnected ? '연결됨' : '연결 안됨'}</p>
                    <p><strong>스트리밍:</strong> {status.isStreaming ? '실행 중' : '중지됨'}</p>
                    <p><strong>해상도:</strong> {status.currentResolution}</p>
                    <p><strong>FPS:</strong> {status.fps}</p>
                  </div>
                )}
                
                {devices.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold">발견된 장치:</p>
                    <ul className="list-disc list-inside mt-2">
                      {devices.map((device, index) => (
                        <li key={device.deviceId} className="text-sm">
                          {device.label || `Camera ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 제어 버튼 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={initializeCamera}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              🔄 초기화
            </button>
            
            <button
              onClick={isStreaming ? stopStream : startStream}
              disabled={!isInitialized}
              className={`px-4 py-2 rounded transition-colors ${
                isStreaming 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              } ${!isInitialized ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isStreaming ? '⏹️ 중지' : '▶️ 시작'}
            </button>
            
            <button
              onClick={capturePhoto}
              disabled={!isStreaming}
              className={`px-4 py-2 rounded transition-colors ${
                isStreaming 
                  ? 'bg-purple-500 text-white hover:bg-purple-600' 
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              📸 촬영
            </button>
            
            <button
              onClick={toggleFlash}
              disabled={!isInitialized}
              className={`px-4 py-2 rounded transition-colors ${
                isInitialized 
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              💡 플래시
            </button>
          </div>

          {/* 테스트 버튼 */}
          <div className="text-center mb-6">
            <button
              onClick={testCamera}
              disabled={!isInitialized}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isInitialized 
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              🧪 종합 테스트 실행
            </button>
          </div>

          {/* 테스트 결과 */}
          {testResults && (
            <div className={`p-4 rounded-lg ${
              testResults.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <h3 className="font-semibold mb-2">테스트 결과</h3>
              <p className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                {testResults.success ? '✅ 성공' : '❌ 실패'}: {testResults.message}
              </p>
              {testResults.details && (
                <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(testResults.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraTestScreen; 