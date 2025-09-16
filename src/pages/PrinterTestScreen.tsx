import React, { useState, useEffect } from 'react';
import { printerService } from '@/services/PrinterService';
import { useAppStore } from '@/store';

interface PrinterTestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

const PrinterTestScreen: React.FC = () => {
  const { setCurrentStep } = useAppStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<PrinterTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializePrinter();
    loadPrinterStatus();
  }, []);

  const initializePrinter = async () => {
    setIsLoading(true);
    try {
      const result = await printerService.initialize();
      setIsInitialized(result);
      addTestResult(result, result ? 'DP-QW410 프린터 초기화 성공' : '프린터 초기화 실패');
    } catch (error) {
      addTestResult(false, `초기화 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrinterStatus = async () => {
    try {
      const status = await printerService.getStatus();
      setPrinterStatus(status);
    } catch (error) {
      console.error('프린터 상태 로드 실패:', error);
    }
  };

  const addTestResult = (success: boolean, message: string) => {
    const result: PrinterTestResult = {
      success,
      message,
      timestamp: new Date().toLocaleString('ko-KR')
    };
    setTestResults(prev => [result, ...prev]);
  };

  // 영수증 인쇄 테스트
  const testReceiptPrint = async () => {
    setIsLoading(true);
    try {
      const receiptContent = `
========================================
      🌟 BeautiBox CVM 키오스크 🌟
         화장품 자동판매기
========================================

📅 거래일시: ${new Date().toLocaleString('ko-KR')}
🆔 거래번호: #TXN${Date.now()}
🖨️ 프린터: DP-QW410

----------------------------------------
📦 구매 상품
----------------------------------------
💄 샤넬 루즈 코코 립스틱        45,000원
👁️ 랑콤 그랑디오즈 마스카라      38,000원  
🧴 에스티로더 더블웨어 파운데이션  55,000원

----------------------------------------
💰 결제 정보
----------------------------------------
소계                        138,000원
할인                             0원
부가세                      12,545원
총 결제금액                  150,545원

💳 결제방법: 신용카드 (****-1234)
승인번호: ${Math.random().toString().substr(2, 8)}

----------------------------------------
📍 매장 정보
----------------------------------------
BeautiBox CVM Store #001
서울특별시 강남구 테헤란로 123
📞 고객센터: 1588-0000

          🙏 감사합니다! 🙏
       다음에도 이용해 주세요!

========================================
`;

      const result = await printerService.printText(receiptContent, {
        copies: 1,
        priority: 'high'
      });

      addTestResult(result.success, result.success ? '영수증 인쇄 성공' : `영수증 인쇄 실패: ${result.message}`);
    } catch (error) {
      addTestResult(false, `영수증 인쇄 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 사진 확인서 인쇄 테스트
  const testPhotoReceiptPrint = async () => {
    setIsLoading(true);
    try {
      const photoReceiptContent = `
========================================
        📸 사진 촬영 확인서 📸
========================================

촬영일시: ${new Date().toLocaleString('ko-KR')}
촬영번호: #PHOTO${Date.now()}

고객 정보:
- 회원번호: MB${Math.random().toString().substr(2, 6)}
- 촬영 매장: BeautiBox CVM #001

촬영 설정:
- 해상도: 1920x1080 (Full HD)
- 품질: 최고화질
- 필터: 뷰티 모드 적용

사진 파일:
- 저장 위치: /photos/customer/
- 파일명: photo_${Date.now()}.jpg
- 파일 크기: 2.3MB

📝 주의사항:
- 촬영된 사진은 개인정보보호법에 따라
  안전하게 관리됩니다.
- 사진 삭제 요청은 고객센터로 연락하세요.

📞 고객센터: 1588-0000

========================================
`;

      const result = await printerService.printPhoto(photoReceiptContent, {
        quality: 'high',
        size: 'receipt'
      });

      addTestResult(result.success, result.success ? '사진 확인서 인쇄 성공' : `사진 확인서 인쇄 실패: ${result.message}`);
    } catch (error) {
      addTestResult(false, `사진 확인서 인쇄 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 프린터 상태 테스트
  const testPrinterStatus = async () => {
    setIsLoading(true);
    try {
      const testResult = await printerService.testPrinter();
      setPrinterStatus(await printerService.getStatus());
      addTestResult(testResult.success, `프린터 테스트: ${testResult.message}`);
    } catch (error) {
      addTestResult(false, `프린터 테스트 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 인쇄 큐 초기화
  const clearPrintQueue = async () => {
    setIsLoading(true);
    try {
      await printerService.clearQueue();
      addTestResult(true, '인쇄 큐 초기화 완료');
    } catch (error) {
      addTestResult(false, `큐 초기화 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              🖨️ DP-QW410 프린터 테스트
            </h1>
            <button
              onClick={() => setCurrentStep('admin')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ← 관리자 화면으로
            </button>
          </div>

          {/* 프린터 상태 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">프린터 상태</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>초기화:</span>
                  <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
                    {isInitialized ? '✅ 완료' : '❌ 실패'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>연결 상태:</span>
                  <span className={printerStatus?.isConnected ? 'text-green-600' : 'text-red-600'}>
                    {printerStatus?.isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>준비 상태:</span>
                  <span className={printerStatus?.isReady ? 'text-green-600' : 'text-orange-600'}>
                    {printerStatus?.isReady ? '✅ 준비됨' : '⏳ 대기 중'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>용지 상태:</span>
                  <span className={printerStatus?.hasPaper ? 'text-green-600' : 'text-red-600'}>
                    {printerStatus?.hasPaper ? '📄 충분' : '📭 부족'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>에러 상태:</span>
                  <span className={printerStatus?.hasError ? 'text-red-600' : 'text-green-600'}>
                    {printerStatus?.hasError ? '⚠️ 에러 있음' : '✅ 정상'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">인쇄 큐 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>대기 작업:</span>
                  <span className="text-green-600">{printerStatus?.queueLength || 0}개</span>
                </div>
                <div className="flex justify-between">
                  <span>현재 작업:</span>
                  <span className="text-green-600">
                    {printerStatus?.currentJob ? printerStatus.currentJob.type : '없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>인쇄 중:</span>
                  <span className={printerStatus?.isPrinting ? 'text-orange-600' : 'text-green-600'}>
                    {printerStatus?.isPrinting ? '🖨️ 인쇄 중' : '⏸️ 대기'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 테스트 버튼들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={initializePrinter}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 프린터 초기화
            </button>
            
            <button
              onClick={testReceiptPrint}
              disabled={isLoading || !isInitialized}
              className="bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧾 영수증 인쇄
            </button>
            
            <button
              onClick={testPhotoReceiptPrint}
              disabled={isLoading || !isInitialized}
              className="bg-purple-500 text-white px-4 py-3 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📸 사진 확인서
            </button>
            
            <button
              onClick={testPrinterStatus}
              disabled={isLoading}
              className="bg-orange-500 text-white px-4 py-3 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔍 상태 테스트
            </button>
            
            <button
              onClick={clearPrintQueue}
              disabled={isLoading}
              className="bg-red-500 text-white px-4 py-3 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ 큐 초기화
            </button>
            
            <button
              onClick={loadPrinterStatus}
              disabled={isLoading}
              className="bg-indigo-500 text-white px-4 py-3 rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 상태 새로고침
            </button>
          </div>

          {/* 로딩 표시 */}
          {isLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
                <span className="text-yellow-800">프린터 작업 진행 중...</span>
              </div>
            </div>
          )}

          {/* 테스트 결과 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">📋 테스트 결과 ({testResults.length}개)</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  아직 테스트 결과가 없습니다. 위의 버튼들을 클릭하여 테스트를 시작하세요.
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      result.success
                        ? 'bg-green-50 border-green-400'
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                          {result.success ? '✅' : '❌'} {result.message}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 도움말 */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">💡 사용 가이드</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 먼저 "프린터 초기화" 버튼을 클릭하여 DP-QW410 프린터와 연결하세요.</li>
              <li>• "영수증 인쇄"를 클릭하면 실제 화장품 구매 영수증이 출력됩니다.</li>
              <li>• "사진 확인서"를 클릭하면 고객 사진 촬영 확인서가 출력됩니다.</li>
              <li>• "상태 테스트"로 프린터의 연결 상태와 기능을 확인할 수 있습니다.</li>
              <li>• 문제 발생 시 "큐 초기화"로 대기 중인 인쇄 작업을 초기화하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterTestScreen; 