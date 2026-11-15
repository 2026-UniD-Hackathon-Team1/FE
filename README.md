# 갈아탈까 · 프론트엔드

> 묻기 전에 알려주고, 써 보고 갈아타게

새로 나온 AI 코딩 스킬이 **내 작업에서 정말 나은지** 내 파일로 직접 비교해 보고, 고른 뒤 바꾸고, 언제든 되돌리게 돕는 서비스의 웹 화면입니다.

- 배포 사이트: https://fe-production-4aa4dae4.up.railway.app
- 백엔드: [2026-UniD-Hackathon-Team1/BE](https://github.com/2026-UniD-Hackathon-Team1/BE) (배포 API: https://be-production-7a68d5e8.up.railway.app/docs)
- 연결 프로그램: `uv tool install galtalka-agent` ([PyPI](https://pypi.org/project/galtalka-agent/))

## 어떻게 동작하나요

```
웹 화면(이 저장소) ──API──▶ 서버(BE) ◀──작업 받아 가기── 연결 프로그램(내 PC) ──▶ Codex CLI(내 PC)
```

- **웹 화면**은 서버 API만 불러요. 사용자 파일을 직접 읽거나 바꾸지 않아요.
- **서버**는 새 스킬을 모아 내 환경에 맞는 것만 추천하고, 비교·선택·적용·되돌리기를 기록해요.
- **연결 프로그램**이 내 PC에서 환경을 읽고, 내 Codex로 기존 방식과 후보 스킬을 각각 실행하고, 백업 후 스킬을 설치·복원해요. 코드는 서버에 저장하지 않아요.

## 화면

| 화면 | 경로 | 하는 일 |
|---|---|---|
| 로그인·회원가입 | `/login` | 아이디·비밀번호 계정. 계정마다 데이터가 나뉘어요 |
| 온보딩 4단계 | `/onboarding` | 하는 일·목표 → 프로젝트 폴더와 연결 프로그램 연결 → 환경 확인 → 지금 쓰는 리뷰 방식 등록 |
| 홈 | `/` | 내 환경에 영향을 주는 변화만, 중요한 것 3개를 먼저 |
| 변화 상세 | `/changes/:id` | 무엇이 바뀌었는지, 내 환경과의 관계, 출처·권한 |
| 비교 준비·진행 | `/comparisons/new`, `/comparisons/:id` | 비교할 내 파일 고르기 → 외부 AI 전송 동의 → 실행 상태 |
| 비교 결과 | `/comparisons/:id` | 한눈에 비교(지적 수·심각도·시간·같은 문제를 찾았는지) + 결과물 나란히 보기 + **내 선택**(보류·기존 유지·후보 선택). 자동 판정은 하지 않아요 |
| 바꾸기 | `/comparisons/:id/switch` | 바뀔 파일 확인 → 백업 후 적용 |
| 이력 | `/history` | 교체·되돌리기·내 선택 기록, 이력에서 되돌리기 |
| 설정 | `/settings` | 환경 다시 확인, 작업 방식, 연결된 기기, 숨긴 변화 |
| 후보 둘러보기 | `/discover`, `/discover/admin` | 수집한 후보 목록, 수집 관리(운영자) |

## 지금 되는 것과 안 되는 것

- **코드 리뷰**는 처음부터 끝까지 실제로 동작해요. 연결 → 스캔 → 실제 Codex 비교 → 선택 → 적용 → 되돌리기.
- 테스트 작성, 리팩터링, 디버깅, 문서, 커밋 메시지는 온보딩에서 고를 수 있지만 "비교 준비 중"이에요. 관련 소식만 알려 줘요.
- 비교하려면 프로젝트에 `.codex/config.toml`(예: `model = "…"`)이 있어야 해요. 연결 프로그램이 여기서 모델을 읽어요.

## 개발

Node 22 이상.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 검사 + 빌드
npm run lint       # oxlint
```

### 목 서버로 (백엔드 없이)

`.env.local` 없이 `npm run dev`만 하면 MSW 목 서버로 동작해요. 로그인 없이 [시작하기]로 들어가요.

### 실제 백엔드에 붙여서

`.env.example`을 `.env.local`로 복사해 값을 채워요.

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 주소 (예: 배포 서버) |
| `VITE_USE_MOCK` | `false`면 목 서버를 끄고 실제 API 호출 |
| `VITE_LOCAL_TOKEN` | **로컬 개발용만.** 로그인 없이 공용 프로필로 붙을 때. 배포 변수에는 절대 넣지 않아요 |

`npm run dev`는 `/api` 요청을 개발 서버가 `VITE_API_BASE_URL`로 넘겨 줘요. 그래서 백엔드 CORS 목록에 localhost가 없어도 동작해요.

### 배포 빌드 안전장치

목 서버가 아닌 빌드에서 `VITE_API_BASE_URL`이 비었거나 `VITE_LOCAL_TOKEN`이 들어 있으면 빌드가 멈춰요(`vite.config.ts`). 로컬 `.env`에 토큰이 있는 상태로 `npm run build`가 실패하는 건 의도된 동작이에요.

## 배포 (Railway)

- `railway.json`: `npm run build`로 빌드하고 `npm start`(serve)로 띄워요. 모든 주소를 앱으로 돌려요.
- `main`에 머지하면 자동으로 다시 배포돼요.
- `VITE_*` 값은 빌드할 때 들어가요. 변수를 바꿨으면 **Redeploy가 아니라 Deploy Latest Commit**으로 다시 빌드해 주세요.

## 구조

```
src/
  api/          client(인증·오류), endpoints(API 호출·폴링), queries(TanStack Query), backend/(서버 타입과 변환)
  pages/        화면 단위
  features/     비교 결과·환경 등 화면 조각
  components/   공통 UI (Button, Modal, Field …)
  mocks/        MSW 목 서버
  lib/          라벨, 연결 프로그램 명령 등
docs/           frontend-spec.md(화면 명세), backend-api-requests.md, agent-design.md
```

기술: React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · TanStack Query · MSW · Pretendard
