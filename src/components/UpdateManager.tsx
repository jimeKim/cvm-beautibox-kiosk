import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface UpdateStatus {
  isUpdateAvailable: boolean;
  currentVersion: string;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  error: string | null;
}

interface UpdateManagerProps {
  isAdminMode?: boolean;
  className?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => Promise<void>;
      getUpdateStatus: () => Promise<any>;
    };
  }
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({ 
  isAdminMode = false, 
  className = "" 
}) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    isUpdateAvailable: false,
    currentVersion: '1.0.0',
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    error: null,
  });

  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    // 초기 상태 로드
    loadUpdateStatus();
    
    // 주기적 상태 확인 (관리자 모드에서만)
    if (isAdminMode) {
      const interval = setInterval(loadUpdateStatus, 30000); // 30초마다
      return () => clearInterval(interval);
    }
  }, [isAdminMode]);

  const loadUpdateStatus = async () => {
    try {
      if (window.electronAPI?.getUpdateStatus) {
        const status = await window.electronAPI.getUpdateStatus();
        setUpdateStatus(prev => ({
          ...prev,
          currentVersion: status.currentVersion || prev.currentVersion,
          isUpdateAvailable: status.isUpdateAvailable || false,
        }));
      }
    } catch (error) {
      console.error('업데이트 상태 로드 실패:', error);
      setUpdateStatus(prev => ({
        ...prev,
        error: '업데이트 상태를 확인할 수 없습니다.',
      }));
    }
  };

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setUpdateStatus(prev => ({
        ...prev,
        error: 'Electron API를 사용할 수 없습니다.',
      }));
      return;
    }

    setUpdateStatus(prev => ({
      ...prev,
      isChecking: true,
      error: null,
    }));

    try {
      await window.electronAPI.checkForUpdates();
      setLastChecked(new Date());
      
      // 상태 업데이트를 위해 잠시 대기 후 다시 로드
      setTimeout(loadUpdateStatus, 2000);
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
      setUpdateStatus(prev => ({
        ...prev,
        error: '업데이트 확인에 실패했습니다.',
      }));
    } finally {
      setUpdateStatus(prev => ({
        ...prev,
        isChecking: false,
      }));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 키오스크 모드에서는 UI를 숨김
  if (!isAdminMode) {
    return null;
  }

  return (
    <div className={`update-manager bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          시스템 업데이트
        </h3>
        
        <div className="text-sm text-gray-500">
          v{updateStatus.currentVersion}
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="space-y-3">
        {/* 현재 상태 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {updateStatus.isChecking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-500" />
            ) : updateStatus.isUpdateAvailable ? (
              <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            )}
            
            <span className="text-sm font-medium">
              {updateStatus.isChecking 
                ? '업데이트 확인 중...'
                : updateStatus.isUpdateAvailable
                ? '업데이트 사용 가능'
                : '최신 버전 사용 중'
              }
            </span>
          </div>
          
          <button
            onClick={handleCheckForUpdates}
            disabled={updateStatus.isChecking}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateStatus.isChecking ? '확인 중...' : '업데이트 확인'}
          </button>
        </div>

        {/* 다운로드 진행률 */}
        {updateStatus.isDownloading && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                업데이트 다운로드 중...
              </span>
              <span className="text-sm text-blue-600">
                {updateStatus.downloadProgress.toFixed(1)}%
              </span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateStatus.downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 오류 메시지 */}
        {updateStatus.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              <span className="text-sm text-red-700">{updateStatus.error}</span>
            </div>
          </div>
        )}

        {/* 마지막 확인 시간 */}
        {lastChecked && (
          <div className="text-xs text-gray-500 text-center">
            마지막 확인: {formatDate(lastChecked)}
          </div>
        )}

        {/* 자동 업데이트 정보 */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <div className="font-medium mb-1">자동 업데이트 정보:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>시스템이 6시간마다 자동으로 업데이트를 확인합니다</li>
            <li>다운로드는 백그라운드에서 자동으로 진행됩니다</li>
            <li>설치는 심야 시간(오전 2-5시)에 자동으로 실행됩니다</li>
            <li>강제 설치: 환경변수 CVM_INSTALL_NOW=1 설정</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UpdateManager;
