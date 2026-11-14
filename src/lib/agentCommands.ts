// 연결 프로그램(galtalka-agent) 터미널 명령. 백엔드 레포 agent/ 의 CLI 인자에 맞춘다.
//   galtalka connect <코드> --server <서버 주소> --root <프로젝트 폴더>
//   galtalka run
import { BASE_URL } from '../api/session'

/** PyPI 패키지 galtalka-agent. 서버가 install_command를 주면 그걸 우선 쓴다 */
export const DEFAULT_INSTALL = 'uv tool install galtalka-agent'
export const RUN = 'galtalka run'

/** 공백이 있으면 따옴표로 감싸고, 맨 앞 ~ 는 따옴표 안에서 안 풀리니 $HOME으로 바꾼다 */
function shellPath(path: string) {
  if (!/\s/.test(path)) return path
  return `"${path.replace(/^~(?=\/|$)/, '$HOME')}"`
}

export function connectCommand(code: string, root: string) {
  const server = BASE_URL || 'https://be-production-7a68d5e8.up.railway.app'
  const folder = root.trim() ? shellPath(root.trim()) : '<프로젝트 폴더>'
  return `galtalka connect ${code} --server ${server} --root ${folder}`
}
