# 연결 프로그램(galtalka agent) 설계

> 결정: 서비스는 **클라우드 서버(Railway) + 사용자 컴퓨터의 연결 프로그램**으로 나눈다. 연결 프로그램은 백엔드가 만든다.
> 이 문서는 FE가 화면을 만들기 위해 필요한 약속(API·상태·흐름)을 정리한 초안이다. 백엔드가 다르게 정하면 이 문서를 고친다.

## 1. 왜 나누나

| 일 | 어디서 | 이유 |
|---|---|---|
| 카탈로그 수집, 추천, 프로필, 작업 방식, 이력, 평가(OpenAI) | **클라우드 서버** | 사용자 컴퓨터가 꺼져 있어도 보여야 함 |
| 폴더 스캔, 입력 후보 찾기, Codex 실행, 스킬 백업·적용·복원 | **연결 프로그램** | 사용자 파일과 Codex CLI는 사용자 컴퓨터에만 있음 |
| 화면 | 웹 (FE) | 클라우드 서버만 호출한다. 연결 프로그램을 직접 부르지 않는다 |

```
웹 화면 ──HTTPS──▶ 클라우드 서버 ◀──HTTPS (2초 폴링)── 연결 프로그램 (사용자 PC)
                  (작업 큐)                            스캔 · codex exec · 적용 · 복원
```

- 연결 프로그램이 서버로 **나가는 연결만** 쓴다. 사용자 PC로 들어오는 포트를 열지 않는다.
- 웹이 `localhost`를 직접 부르지 않으니 브라우저 보안 제약(HTTPS → localhost)과도 무관하다.

## 2. 설치와 연결

```bash
uv tool install galtalka-agent    # 또는 pipx install galtalka-agent (한 번만)
galtalka connect 4F7K-92QD        # 웹 온보딩에서 받은 연결 코드
galtalka run                      # 대기 시작 (서비스 단계에서는 자동 실행)
```

1. 웹 온보딩에서 [연결 명령 받기] → 서버가 연결 코드를 발급한다 (8자, 10분 유효, 한 번만 사용).
2. `galtalka connect <코드>` → 서버가 이 컴퓨터용 **agent 토큰**을 돌려준다. `~/.galtalka/config.json`에 저장한다.
3. 연결 프로그램이 30초마다 heartbeat를 보낸다. 웹은 이걸 보고 "연결됨"을 표시한다 (60초 넘게 없으면 끊김).

## 3. API

### 웹(FE)이 부르는 것

| API | 용도 | 응답 |
|---|---|---|
| `POST /api/agent/pairing-code` | 온보딩 [연결 명령 받기] | `{ code, expires_at, command: "galtalka connect 4F7K-92QD", install_command: "uv tool install galtalka-agent" }` |
| `GET /api/agent` | 사이드바·온보딩의 연결 상태 (15초마다, 온보딩 대기 중엔 2초마다) | 아래 참고 |
| `DELETE /api/agent` | 설정 > 연결 해제 (토큰 무효화) | 204 |

```json
// GET /api/agent
{
  "status": "connected",          // connected | disconnected | never_connected
  "device_name": "MacBook-Pro",
  "agent_version": "0.1.0",
  "codex_version": "0.48.0",      // Codex CLI를 못 찾으면 null
  "codex_ready": true,            // codex 로그인까지 확인됐는지
  "last_seen_at": "2026-11-15T14:02:00Z"
}
```

### 연결 프로그램이 부르는 것 (`Authorization: Bearer <agent 토큰>`)

| API | 용도 |
|---|---|
| `POST /api/agent/pair` `{ code, device_name, agent_version }` | 연결 → `{ agent_token }` |
| `POST /api/agent/heartbeat` `{ codex_version, codex_ready }` | 살아 있음 |
| `GET /api/agent/jobs` | 할 일 하나 가져가기 (없으면 `null`). 가져가면 `running`으로 바꾼다 |
| `POST /api/agent/jobs/{id}/progress` `{ step, detail }` | (선택) 진행 상황. 비교 실행 중 화면의 단계 표시용 |
| `POST /api/agent/jobs/{id}/result` `{ status: "done"\|"failed", result?, message? }` | 결과 보고 |

## 4. 작업(job) 종류

| kind | 만드는 곳 | 연결 프로그램이 하는 일 | result |
|---|---|---|---|
| `scan` | `POST /api/environment/scan` | 허용 폴더의 `.codex/`, `.agents/skills/` 읽기 | environment (FE `BEnvironment` 모양) |
| `suggest_inputs` | `GET /api/inputs/suggestions` | `git log`·`git diff`로 최근 변경 묶음 찾기 | `[BInputSuggestion]` |
| `snapshot_inputs` | `POST /api/inputs` | 고른 파일을 읽어 해시와 함께 스냅샷 (비밀값 파일 제외) | `{ input_id, manifest_sha256, files }` |
| `run_comparison` | `POST /api/comparisons` | 입력마다 기존·후보 방식으로 `codex exec`, 테스트면 `test_command` 실행 | 입력별 `output_text`, `seconds`, 측정값 |
| `apply` | `POST /api/apply` | 백업 → 후보 스킬 복사 → 설정 수정 (해시 확인) | `{ apply_id, status, backup_id }` |
| `rollback` | `POST /api/apply/{id}/rollback` | 해시 확인 → 백업 복원. 사용자가 고친 파일이 있으면 충돌 반환 | `{ status, conflict_paths? }` |

### FE에서 보는 방식은 그대로

- 웹 API 경로와 응답 모양은 `docs/frontend-spec.md`와 같다. 서버가 안에서 job을 만들고 결과를 기다릴 뿐이다.
- 바로 끝나는 일(`scan`, `suggest_inputs`, `snapshot_inputs`, `apply`, `rollback`)은 서버가 job 완료를 **최대 30초** 기다렸다가 응답한다.
  - 연결 프로그램이 꺼져 있으면 즉시 `409 { code: "AGENT_OFFLINE", message: "연결 프로그램이 꺼져 있어요" }`
  - 30초를 넘기면 `504 { code: "AGENT_TIMEOUT" }`
- 오래 걸리는 `run_comparison`은 지금처럼 `202` + `comparison_id`. FE가 `GET /api/comparisons/{id}`를 2초마다 조회한다.

## 5. 안전장치 (연결 프로그램 쪽에서 꼭 지킬 것)

- **허용 폴더:** 연결할 때 정한 폴더 밖은 읽지도 쓰지도 않는다. 모든 경로를 `resolve()`한 뒤 확인한다.
- **명령 허용 목록:** `codex exec`, `git`(읽기 명령), 사용자가 등록한 `test_command`만 실행한다. 서버가 보낸 임의 명령은 실행하지 않는다.
- **비밀값:** `.env*`, `*secret*`, `*.pem`, `*.key` 등은 스냅샷·업로드에서 뺀다. 뺀 목록은 `excluded_paths`로 알린다.
- **쓰기 범위:** `apply`·`rollback`은 `.agents/skills/`와 `.codex/`만 쓴다. 쓰기 전 항상 백업한다.
- **토큰:** 컴퓨터마다 발급한다. 웹 [연결 해제] 시 즉시 무효화한다.
- **코드 보관:** 입력 코드 원문은 서버에 영구 저장하지 않는다. 해시와 결과만 남긴다.

## 6. 해커톤 범위

| 넣기 | 빼기 (서비스 단계) |
|---|---|
| 연결 코드, 토큰, 2초 폴링, heartbeat | 웹소켓 |
| 위 job 6종 | 자동 실행(launchd), 자동 업데이트 |
| 맥 기준 | 윈도우 |
| `galtalka run` 터미널 실행 | 메뉴바 앱 |

## 7. FE 쪽 변경 (김이준)

- 온보딩 1단계에 "연결 프로그램" 블록: 설치 명령 → [연결 명령 받기] → 연결 대기(2초마다 `GET /api/agent`) → "연결됐어요 · MacBook-Pro · Codex 0.48.0"
- 사이드바 상태: `GET /api/agent`
- 꺼져 있을 때: 추천·이력은 보이고 비교·적용·환경 다시 확인만 막는다. 홈 배너에 `galtalka run` 복사 버튼
- 설정: [연결 해제] → `DELETE /api/agent`
- 오류 `AGENT_OFFLINE`이 오면 "연결 프로그램이 꺼져 있어요" 안내
