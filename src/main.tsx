import ReactDOM from 'react-dom/client';
import App from './App';
import { AppService } from './services/AppService';
import './index.css';
import './locales';

// 애플리케이션 서비스 초기화
const appService = AppService.getInstance();

// 타임아웃이 있는 초기화 함수
const initializeWithTimeout = (timeoutMs: number = 5000): Promise<void> => {
  return Promise.race([
    appService.initialize(),
    new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('AppService 초기화 타임아웃')), timeoutMs)
    )
  ]);
};

// 즉시 React 앱 시작 (AppService 초기화와 분리)
console.log('React 앱 즉시 시작...');
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

// AppService는 백그라운드에서 초기화
async function initializeServicesInBackground() {
  try {
    console.log('AppService 백그라운드 초기화 시작...');
    await initializeWithTimeout(5000);
    console.log('AppService 백그라운드 초기화 완료');
  } catch (error) {
    console.warn('AppService 백그라운드 초기화 실패:', error);
    // 에러가 발생해도 앱은 계속 실행
  }
}

// 애플리케이션 종료 시 정리
window.addEventListener('beforeunload', () => {
  try {
    appService.shutdown();
  } catch (error) {
    console.warn('AppService 종료 중 오류:', error);
  }
});

// 백그라운드 초기화 시작
initializeServicesInBackground(); 