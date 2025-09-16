import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { cameraService } from '@/services/CameraService';

const PhotoScreen: React.FC = () => {
  const { 
    setCurrentStep,
    resetIdleTimer
  } = useAppStore();

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // CameraService를 통한 카메라 초기화
      const initialized = await cameraService.initialize();
      if (!initialized) {
        console.error('카메라 서비스 초기화 실패');
        return;
      }

      // CameraService를 통한 스트림 시작
      if (videoRef.current) {
        const streamStarted = await cameraService.startStream(videoRef.current);
        if (!streamStarted) {
          console.error('카메라 스트림 시작 실패');
        }
      }
    } catch (error) {
      console.error('카메라 접근 오류:', error);
    }
  };

  const stopCamera = () => {
    cameraService.stopStream();
  };

  const capturePhoto = async () => {
    if (!canvasRef.current) return;

    setIsCapturing(true);
    
    // 카운트다운 시작
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(0);
    
    // CameraService를 통한 사진 촬영
    try {
      const result = await cameraService.capturePhoto(canvasRef.current);
      
      if (result.success && result.imageData) {
        setCapturedPhoto(result.imageData);
        console.log('사진 촬영 성공:', result.metadata);
      } else {
        console.error('사진 촬영 실패:', result.error);
      }
    } catch (error) {
      console.error('사진 촬영 중 오류:', error);
    }
    
    setIsCapturing(false);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCountdown(0);
  };

  const confirmPhoto = () => {
    resetIdleTimer();
    // 사진 확인 후 완료 화면으로 이동
    setCurrentStep('complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-center text-purple-800">
              사진 촬영
            </h1>
            <p className="text-center text-gray-600 mt-2">
              포토카드에 사용할 사진을 촬영해주세요
            </p>
          </div>
          
          <div className="p-6">
            <div className="relative bg-black rounded-lg overflow-hidden mb-6">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-96 object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-white text-8xl font-bold animate-pulse">
                        {countdown}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="촬영된 사진"
                  className="w-full h-96 object-cover"
                />
              )}
            </div>

            <div className="flex justify-center space-x-4">
              {!capturedPhoto ? (
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                    isCapturing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isCapturing ? '촬영 중...' : '사진 촬영'}
                </button>
              ) : (
                <>
                  <button
                    onClick={retakePhoto}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    다시 촬영
                  </button>
                  <button
                    onClick={confirmPhoto}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    사진 확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoScreen; 