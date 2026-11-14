# 백엔드에 요청하는 API 수정 사항

> 기준: 「갈아탈까 해커톤 MVP 구현 설계서」 12장 API
> FE는 설계서 경로를 그대로 써요. 아래는 **설계서대로는 화면을 만들 수 없는 부분**만 모았어요.
> 응답 예시는 FE 목 서버(`src/mocks/handlers.ts`)와 타입(`src/api/backend/types.ts`)에 있어요. 이름은 편하게 바꾸셔도 되고, 알려 주시면 FE가 맞출게요.

## 한눈에 보기

| 구분 | 항목 | 담당 |
|---|---|---|
| **꼭 필요** | ① `GET /api/profile` | 박혜린 |
| **꼭 필요** | ② `GET /api/work-methods` | 박혜린 |
| **꼭 필요** | ③ `PATCH /api/recommendations/{id}` | 박혜린 |
| **꼭 필요** | ④ `GET /api/inputs/suggestions` | 권진환 |
| **꼭 필요** | ⑤ `GET /api/comparisons/{id}` 응답 모양 합의 | 권진환 |
| 있으면 좋음 | ⑥~⑨ 기존 응답에 필드 추가 | 둘 다 |
| 선택 | 나머지 | 없어도 FE가 대신 처리 |

---

## 꼭 필요 (없으면 화면이 동작하지 않아요)

### ① `GET /api/profile` — 박혜린
- **왜:** 앱을 열 때 "온보딩을 끝낸 사람인지" 알아야 해요. 지금은 `PUT`만 있어서 저장은 되는데 읽을 방법이 없어요.
- **없으면:** 매번 온보딩부터 보이거나, 온보딩을 안 한 사람이 바로 홈으로 가요. 설정 화면에 내 프로필도 못 보여 줘요.
- **응답:** `PUT` 요청 본문 + `profile_id`, `profile_version`, `updated_at`. **아직 없으면 404**

### ② `GET /api/work-methods` — 박혜린
- **왜:** `POST /api/comparisons`에 `method_id`, `method_version`을 넣어야 하는데, 이 값은 등록할 때 응답으로 한 번만 나와요. 새로고침하거나 다음 날 다시 열면 FE가 알 방법이 없어요.
- **없으면:** 비교를 시작할 수 없어요. 설정에서 "지금 등록된 작업 방식"도 못 보여 줘요.
- **응답:** `[{ ...POST 본문, method_id, version, is_active, created_at }]` (활성인 것만 줘도 돼요)

### ③ `PATCH /api/recommendations/{id}` — 박혜린
- **왜:** 홈 카드의 [나중에]·[관심 없음] 버튼이 추천 상태를 바꿔요. 설계서에 `snoozed`·`dismissed` 상태는 있는데, 바꾸는 API가 없어요.
- **없으면:** 버튼을 눌러도 저장되지 않아서 새로고침하면 카드가 다시 떠요.
- **요청:** `{ status: "snoozed" | "dismissed" | "new" | "kept", reason?: string }` → 204
  - `new`: 숨긴 변화 [다시 보기]
  - `kept`: 비교 결과에서 [기존 방식 유지] (상태 값 `kept` 추가 부탁)

### ④ `GET /api/inputs/suggestions?task_type=` — 권진환
- **왜:** `POST /api/inputs`는 파일 경로를 받아요. 그런데 FE는 브라우저라서 사용자 컴퓨터 폴더를 볼 수 없어요. 백엔드가 "최근 diff·파일 묶음·예제"를 골라서 알려 줘야 사용자가 클릭으로 고를 수 있어요.
- **없으면:** 사용자가 `src/orders/cancel.py` 같은 경로를 손으로 타이핑해야 해요. 시연하기 어려워요.
- **응답:**
  ```json
  [{ "suggestion_id": "...", "kind": "diff | files | fixture",
     "label": "#128 주문 취소 API 추가", "meta": "파일 6개",
     "relative_paths": ["src/orders/cancel.py"],
     "excluded_paths": [{ "path": "config/secrets.json", "reason": "비밀값이 있을 수 있어요" }] }]
  ```
  `excluded_paths`는 비밀값 때문에 자동으로 뺀 파일이에요. 화면에 "자동으로 뺀 파일"로 보여 줘요. 없으면 빈 배열로 주세요.

### ⑤ `GET /api/comparisons/{id}` 응답 모양 — 권진환
- **왜:** 경로는 설계서에 있는데 응답 필드가 정해져 있지 않아요. 진행 화면과 결과 화면 전체가 이 응답 하나로 그려져요.
- **FE가 정한 안:** `src/api/backend/types.ts`의 `BComparison`이에요. 다른 모양이 편하면 알려 주세요.
  - 진행: `status`, `runs[].status`, `runs[].inputs[].status` (어느 단계인지 표시)
  - 판정: `verdict`, `verdict_reason`, `rubric_version`, `runs_per_arm`, `limits[]`
  - 표시용 이름: `baseline_label`, `candidate_label`, `change_title`
  - 실행 조건: `plan { model_id, runner_version, timeout_seconds }`
  - 결과
    - `runs[].inputs[].metrics`: `{ "raised": { "value": 9 }, "rules": { "value": 2, "total": 4 } }`처럼 지표 키 → 값
    - `output_text`: 원문
    - `seconds`
  - 검증: `findings[]` (`canonical_group`으로 두 방식의 같은 지적을 묶음), `llm_judgment`
  - 다시 실행용: `method_id`, `method_version`, `inputs[].input_id`
    - 이 값이 있으면 [다시 실행]을 `POST /api/comparisons`로 그대로 보낼 수 있어서, rerun API가 따로 필요 없어요.
  - 시연용: `is_prerecorded`

---

## 있으면 좋음 (기존 응답에 필드만 추가)

| # | 어디에 | 추가 필드 | 없으면 |
|---|---|---|---|
| ⑥ | `GET /api/recommendations` (박혜린) | `change_type`, `task_types`, `score`, `status`, `latest_comparison` | 홈 카드가 다 같은 모양이 되고 영향도 순 정렬, 작업 유형 필터, "지난 비교 결과" 요약이 빠져요 |
| ⑦ | `GET /api/candidates/{id}` (권진환) | `provenance`, `permissions.declared[].additional`, `risk_signals`, `replaces` | 결과 화면의 "안전 정보"(출처·추가 권한·위험 신호)가 비어요 |
| ⑧ | `POST /api/apply/preview` (권진환) | `manual_steps`, `environment_changes` | 자동 적용이 안 되는 후보의 수동 안내, "비교 때와 환경이 달라요" 경고가 빠져요 |
| ⑨ | `GET /api/history` (권진환) | `payload`에 `change_title`, `summary`, `reason`, `comparison_id`, `apply_id` | 이력 목록에 제목, 요약, 결정 이유가 안 보여요 |

---

## 선택 (없어도 FE가 대신 처리할게요)

| 처음 요청했던 것 | FE가 대신하는 방법 |
|---|---|
| `GET /api/health` | 다른 요청이 실패하면 "로컬 서버 꺼짐"으로 표시 |
| `GET /api/environment` | 마지막 `POST /scan` 결과를 FE가 기억 |
| `POST`·`PATCH /api/environment/items` | 환경 항목을 직접 고치는 기능을 뺌 |
| `DELETE /api/environment` | 설정의 "연결 해제"를 뺌 |
| `GET /api/comparisons?active=true` | FE가 시작한 비교 ID를 기억해 두고 각각 조회 |
| `POST /api/comparisons/{id}/rerun` | ⑤의 값으로 `POST /api/comparisons` 다시 호출 |
| `POST /api/comparisons/{id}/decision` | ③의 `status: "kept"`로 합침 |
| `GET`·`DELETE /api/storage` | 설정의 "데이터 관리"를 뺌 |

---

## 공통 확인 부탁

- 모든 요청에 `X-Local-Token` 헤더를 보내요. 서버의 `APP_LOCAL_TOKEN`과 같은 값이에요.
- CORS 허용 출처에 `http://localhost:5173`를 넣어 주세요.
- 오류 응답 모양: `{ "error": { "code": "...", "message": "사용자에게 보여 줄 한국어 문장" } }`
- FE 연결: `.env.local`에 `VITE_API_BASE_URL=http://127.0.0.1:8765`, `VITE_LOCAL_TOKEN=...`
