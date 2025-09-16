import React, { useState, useEffect } from 'react';
import { AppService, AppConfig } from '../services/AppService';
import { useAppStore } from '@/store';

const AdminScreen: React.FC = () => {
  const { setCurrentStep } = useAppStore();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('config');

  const appService = AppService.getInstance();
  const ADMIN_PASSWORD = 'admin123'; // 실제 운영에서는 더 안전한 방법 사용

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configData, statusData] = await Promise.all([
        appService.getConfig(),
        appService.getSystemStatus()
      ]);
      
      setConfig(configData);
      setSystemStatus(statusData);
      
      // 최근 로그 가져오기 (임시로 빈 배열 사용)
      const loggingService = appService.getLoggingService();
      // const recentLogs = loggingService.getRecentLogs(50);
      setLogs([]);
      
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('잘못된 비밀번호입니다.');
    }
  };

  const handleConfigUpdate = async (newConfig: Partial<AppConfig>) => {
    try {
      await appService.updateConfig(newConfig);
      setConfig(prev => prev ? { ...prev, ...newConfig } : null);
      alert('설정이 저장되었습니다.');
    } catch (error) {
      alert('설정 저장에 실패했습니다.');
    }
  };

  const handleRestart = () => {
    if (confirm('시스템을 재시작하시겠습니까?')) {
      window.location.reload();
    }
  };

  const handleExportLogs = () => {
    // 임시로 간단한 로그 내보내기 구현
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdminShutdown = async () => {
    const confirmed = window.confirm(
      '⚠️ 키오스크 시스템을 완전히 종료하시겠습니까?\n\n' +
      '• 모든 진행 중인 작업이 중단됩니다\n' +
      '• 하드웨어 연결이 해제됩니다\n' +
      '• 시스템을 다시 시작하려면 수동으로 실행해야 합니다\n\n' +
      '⚠️ 이 작업은 되돌릴 수 없습니다!\n\n' +
      '정말로 종료하시겠습니까?'
    );

    if (confirmed) {
      try {
        console.log('Admin shutdown requested from admin panel');
        
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
          // Show final message before shutdown
          alert('✅ 키오스크 종료가 시작되었습니다.\n\n시스템이 곧 종료됩니다.');
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
        
        // Reset button state on error
        const shutdownButton = document.querySelector('[data-shutdown-btn]') as HTMLButtonElement;
        if (shutdownButton) {
          shutdownButton.textContent = '🔌 키오스크 종료';
          shutdownButton.disabled = false;
        }
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h2>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">CVM 관리자 패널</h1>
            <div className="flex space-x-2">
              <button
                onClick={handleRestart}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                시스템 재시작
              </button>
              <button
                onClick={handleAdminShutdown}
                data-shutdown-btn
                className="bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 border-2 border-red-600"
              >
                🔌 키오스크 종료
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'config', name: '시스템 설정' },
              { id: 'status', name: '시스템 상태' },
              { id: 'logs', name: '로그' },
              { id: 'hardware', name: '하드웨어 테스트' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 시스템 설정 탭 */}
        {activeTab === 'config' && config && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">시스템 설정</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 설정 */}
              <div>
                <h3 className="text-lg font-medium mb-4">기본 설정</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.isKioskMode}
                      onChange={(e) => handleConfigUpdate({ isKioskMode: e.target.checked })}
                      className="mr-2"
                    />
                    키오스크 모드
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.autoStart}
                      onChange={(e) => handleConfigUpdate({ autoStart: e.target.checked })}
                      className="mr-2"
                    />
                    자동 시작
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.offlineMode}
                      onChange={(e) => handleConfigUpdate({ offlineMode: e.target.checked })}
                      className="mr-2"
                    />
                    오프라인 모드
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.debugMode}
                      onChange={(e) => handleConfigUpdate({ debugMode: e.target.checked })}
                      className="mr-2"
                    />
                    디버그 모드
                  </label>
                </div>
              </div>

              {/* 결제 설정 */}
              <div>
                <h3 className="text-lg font-medium mb-4">결제 설정</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.paymentConfig.cardEnabled}
                      onChange={(e) => handleConfigUpdate({
                        paymentConfig: { ...config.paymentConfig, cardEnabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    카드 결제
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.paymentConfig.qrEnabled}
                      onChange={(e) => handleConfigUpdate({
                        paymentConfig: { ...config.paymentConfig, qrEnabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    QR 결제
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.paymentConfig.cashEnabled}
                      onChange={(e) => handleConfigUpdate({
                        paymentConfig: { ...config.paymentConfig, cashEnabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    현금 결제
                  </label>
                </div>
              </div>

              {/* 디스플레이 설정 */}
              <div>
                <h3 className="text-lg font-medium mb-4">디스플레이 설정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">해상도 너비</label>
                    <input
                      type="number"
                      value={config.displayConfig.width}
                      onChange={(e) => handleConfigUpdate({
                        displayConfig: { ...config.displayConfig, width: parseInt(e.target.value) }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">해상도 높이</label>
                    <input
                      type="number"
                      value={config.displayConfig.height}
                      onChange={(e) => handleConfigUpdate({
                        displayConfig: { ...config.displayConfig, height: parseInt(e.target.value) }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.displayConfig.fullscreen}
                      onChange={(e) => handleConfigUpdate({
                        displayConfig: { ...config.displayConfig, fullscreen: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    전체화면
                  </label>
                </div>
              </div>

              {/* 로그 설정 */}
              <div>
                <h3 className="text-lg font-medium mb-4">로그 설정</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">로그 레벨</label>
                  <select
                    value={config.logLevel}
                    onChange={(e) => handleConfigUpdate({ logLevel: e.target.value as any })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 시스템 상태 탭 */}
        {activeTab === 'status' && systemStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">시스템 상태</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(systemStatus).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{key}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {value ? '정상' : '오류'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">시스템 로그</h2>
              <div className="flex space-x-2">
                <button
                  onClick={loadData}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  새로고침
                </button>
                <button
                  onClick={handleExportLogs}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  로그 내보내기
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      레벨
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메시지
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          log.level === 'error' ? 'bg-red-100 text-red-800' :
                          log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                          log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 하드웨어 테스트 탭 */}
        {activeTab === 'hardware' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">하드웨어 테스트</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">📷 카메라</h3>
                    <p className="text-sm text-blue-600 mb-3">카메라 하드웨어 연결 및 기능 테스트</p>
                    <button
                      onClick={() => setCurrentStep('camera-test')}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      테스트 실행
                    </button>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-2">🖨️ 프린터</h3>
                    <p className="text-sm text-purple-600 mb-3">DP-QW410 프린터 연결 및 인쇄 기능 테스트</p>
                    <button
                      onClick={() => setCurrentStep('printer-test')}
                      className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                    >
                      테스트 실행
                    </button>
                  </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">🔧 제어보드</h3>
                <p className="text-sm text-green-600 mb-3">모터, LED, 센서 제어 테스트</p>
                <button
                  onClick={() => alert('제어보드 테스트는 2단계에서 진행됩니다.')}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  테스트 실행
                </button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2">🖨️ 프린터</h3>
                <p className="text-sm text-purple-600 mb-3">영수증 및 사진 인쇄 테스트</p>
                <button
                  onClick={() => alert('프린터 테스트는 3단계에서 진행됩니다.')}
                  className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                >
                  테스트 실행
                </button>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-2">📡 라이더센서</h3>
                <p className="text-sm text-orange-600 mb-3">사용자 감지 센서 테스트</p>
                <button
                  onClick={() => alert('라이더센서 테스트는 4단계에서 진행됩니다.')}
                  className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                >
                  테스트 실행
                </button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">📋 테스트 진행 상황</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  <span>1단계: 카메라 연결 - 완료</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-gray-300 rounded-full mr-2"></span>
                  <span>2단계: 제어보드 연결 - 대기 중</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-gray-300 rounded-full mr-2"></span>
                  <span>3단계: 프린터 연결 - 대기 중</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-gray-300 rounded-full mr-2"></span>
                  <span>4단계: 라이더센서 연결 - 대기 중</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminScreen; 