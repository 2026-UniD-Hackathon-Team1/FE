import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * 배포용 빌드 안전장치. 문제가 있으면 빌드를 실패시켜, 고장 난 화면이 배포되지 않게 한다.
 * - 서버 주소(VITE_API_BASE_URL)가 없으면: 화면은 뜨지만 서버를 못 찾는 배포가 된다
 * - 공용 토큰(VITE_LOCAL_TOKEN)이 있으면: 화면 코드에 그대로 들어가 누구나 볼 수 있다
 * 개발 서버(npm run dev)와 목 서버로 만드는 빌드(VITE_USE_MOCK=true)는 검사하지 않는다.
 */
function deployGuard(mode: string) {
  return {
    name: 'galtalka-deploy-guard',
    apply: 'build' as const,
    configResolved() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      if (env.VITE_USE_MOCK === 'true') return
      const problems: string[] = []
      if (!env.VITE_API_BASE_URL) problems.push('VITE_API_BASE_URL(백엔드 주소)가 비어 있어요. 배포 서비스 변수에 넣고 다시 빌드해 주세요.')
      if (env.VITE_LOCAL_TOKEN) problems.push('VITE_LOCAL_TOKEN(공용 토큰)이 들어 있어요. 화면 코드에 노출되니 배포 서비스 변수에서 지워 주세요.')
      if (problems.length) throw new Error(`[배포 빌드 중단]\n- ${problems.join('\n- ')}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), deployGuard(mode)],
}))
