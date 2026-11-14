# 갈아탈까 프론트엔드 명세서

> 기준: 지금 구현된 화면(브랜치 `feat/fill-gaps`)과 Figma "간소화" 화면
> 대상: 백엔드 (박혜린, 권진환)
> 목적: **화면마다 어떤 API를 부르고, 응답의 어떤 필드를 어디에 쓰는지** 한곳에 정리
> 필드 이름은 백엔드 기준(`src/api/backend/types.ts`)으로 적었어요. FE 내부 이름으로 바꾸는 건 `src/api/backend/adapt.ts`가 해요.
> 표시: **[요청]** 설계서에 없어서 FE가 요청한 것 (`docs/backend-api-requests.md`), **[수정안]** 「설계서 수정 사항」(F08 사용자 선택) 반영으로 바뀔 부분

---

## 0. 한눈에 보기

### 화면 목록

| ID | 화면 | 주소 | 부르는 API |
|---|---|---|---|
| S-01 | 온보딩 (3단계) | `/onboarding?step=1~3` | profile, environment/scan, environment, work-methods |
| S-02 | 홈 | `/` | recommendations, environment, comparisons(진행 중) |
| S-03 | 변화 상세 | `/changes/{candidate_version_id}` | candidates/{id}, recommendations |
| S-04a | 비교 준비 | `/comparisons/new?candidate=&match=` | candidates/{id}, work-methods, inputs/suggestions, inputs, comparisons |
| S-04b | 비교 실행 중 | `/comparisons/{comparison_id}` (진행 중일 때) | comparisons/{id} (2초마다), cancel |
| S-05 | 비교 결과 | `/comparisons/{comparison_id}` (끝났을 때) | comparisons/{id}, candidates/{id}, findings, decision |
| S-06 | 교체 확인 | `/comparisons/{comparison_id}/switch` | apply/preview, apply |
| S-07 | 이력 | `/history` | history, apply/{id}/rollback |
| S-08 | 설정 | `/settings` | environment, work-methods, storage |
| 공통 | 사이드바 | 모든 화면 | health (15초마다) |

### 사용자 흐름

```
처음 실행
 → S-01 온보딩: 프로필·폴더 → 환경 확인 → 작업 방식 등록
 → S-02 홈: 내 환경에 영향 있는 변화 카드
 → S-03 변화 상세: 무엇이 바뀌었나, 비교 가능한가
 → S-04 비교 준비 → 실행 중
 → S-05 결과 → [후보 선택] → S-06 교체 확인 → 적용
 → S-07 이력: 언제든 되돌리기
```

### 공통 규칙

| 항목 | 내용 |
|---|---|
| 주소 | `http://127.0.0.1:8765` (`VITE_API_BASE_URL`) |
| 헤더 | 모든 요청에 `X-Local-Token`. 비교·적용 생성에는 `Idempotency-Key` |
| 오류 | `{ "error": { "code", "message" } }`. **`message`는 화면에 그대로 보여요.** 사용자가 읽을 한국어 문장으로 주세요 |
| 404 | "아직 없음"으로 처리해요. 예: 프로필 404면 온보딩으로 이동 |
| 서버 꺼짐 | 연결 자체가 실패하면 "로컬 서버에 연결할 수 없어요" 화면을 보여 줘요 |
| 폴링 | 비교 상태는 끝날 때까지 2초마다 조회해요 (`done`, `failed`, `cancelled`, `interrupted`에서 멈춤) |
| 시간 | ISO 8601 문자열. FE가 "오늘 14:02"처럼 바꿔요 |

---

## 공통: 사이드바

| 화면 요소 | 사용하는 값 |
|---|---|
| 로고, 메뉴(홈·이력·설정) | — |
| 프로젝트 이름 | `environment.scan_root`의 마지막 폴더 이름 |
| 로컬 서버 상태 (아래쪽) | **[요청]** `GET /api/health` → `runner_version`, `checked_at`. 실패하면 "꺼져 있음 · 비교와 바꾸기를 할 수 없어요" |

- 서버가 꺼져 있으면 [내 작업으로 비교하기], [확인하고 바꾸기]를 막아요.
- 화면에 들어오면 먼저 **[요청]** `GET /api/profile`을 불러요. 404면 온보딩으로 보내요.

---

## S-01 온보딩

### 1단계 "나와 프로젝트"

| 화면 요소 | API·필드 |
|---|---|
| 역할 (선택) | `role`: "백엔드 개발" 등 문자열 |
| 주로 쓰는 언어 | `primary_language`: `python` / `typescript` / `java` / `go` |
| AI에게 맡기는 작업 (복수 선택) | `task_types`: `code_review`, `test_generation` |
| 요즘 신경 쓰는 것 (복수, 선택 안 해도 됨) | `goals`: `input_validation`, `exception_handling`, `regression_test`, `test_coverage`, `documentation` |
| 프로젝트 폴더 | `root` (직접 입력, 예: `~/work/shop-api`) |
| 읽을 수 있는 범위 (체크) | **[요청]** `scopes`: `config`(필수), `skills`, `code` |
| 로컬 서버 상태 | `GET /api/health` (켜질 때까지 [다음] 비활성) |

**[다음] 누르면**
1. `PUT /api/profile` `{ role, primary_language, task_types, goals, preferences: {} }`
2. `POST /api/environment/scan` `{ root, scopes }`
3. 성공하면 2단계로 가요. 실패하면 `error.message`를 버튼 위에 보여 줘요.

### 2단계 "환경 확인"

**[요청]** `GET /api/environment`로 마지막 스캔 결과를 표로 보여 줘요.

| 열 | 필드 |
|---|---|
| 도구 | `runner` → "Codex CLI", 버전은 `runner_version` |
| 모델 | `model_id` |
| 스킬 (여러 줄) | `installed_skills[].name`, `.version`, `.source` |
| 설정 파일 (여러 줄) | **[요청]** `settings_files[].path`, `.summary` |
| 마지막 확인 | `scanned_at` |
| 비교 대상 체크 | **[요청]** `installed_skills[].excluded`, `settings_files[].excluded` |
| "읽을 수 없는 형식" 안내 | **[요청]** `settings_files[]` 중 `readable: false`인 것 |

- [수정]·[직접 입력]·[항목 직접 추가] → **[요청]** `POST`·`PATCH /api/environment/items`
- 403이면 "폴더를 읽을 권한이 필요해요" 화면을 보여 줘요.

### 3단계 "작업 방식 등록"

작업 유형(코드 리뷰 / 테스트 작성)마다 지금 쓰는 방식을 적어요. 이게 비교의 기준(baseline)이에요.

| 화면 요소 | 필드 (`POST /api/work-methods`) |
|---|---|
| 지금 쓰는 프롬프트 | `prompt_text` |
| 지금 쓰는 스킬 (선택) | `skill_name` (2단계 스킬 목록에서 고름) |
| 결과 형식 | **[요청]** `output_format` |
| 테스트 실행 명령 (테스트 작성만) | **[요청]** `test_command` (예: `pytest -q`) |
| 꼭 지켜야 할 조건 | `required_checks`: `known_regressions_not_missed`, `project_rules_followed`, `generated_tests_run` |
| 함께 볼 지표 | `scoring_preferences`: `{ time: "secondary", cost: "secondary", false_positives: "secondary" }` |

- 들어올 때 **[요청]** `GET /api/work-methods`로 이미 등록한 값을 채워 줘요.
- [등록하고 시작하기]를 누르면 작업 유형마다 `POST`하고 홈으로 가요.

---

## S-02 홈

| 화면 요소 | API·필드 |
|---|---|
| 내 환경 한 줄 | `GET /api/environment` → `runner_version`, 스킬 수, 제외 수, `scanned_at` |
| 진행 중인 비교 | **[요청]** `GET /api/comparisons?active=true` → `comparison_id`, `change_title`, `candidate_label`, `status`, `created_at` |
| 먼저 확인할 변화 (카드 최대 3개) | `GET /api/recommendations` 중 `score`가 높은 3개 |
| 전체 변화 (표) | 같은 목록 전체. 필터: 전체 / 코드 리뷰 / 테스트 작성 (`task_types`) |
| 숨긴 변화 (팝업) | **[요청]** `GET /api/recommendations?status=dismissed` |

### 추천 한 건에서 쓰는 필드

| 화면 | 필드 |
|---|---|
| 제목 | `title` |
| 설명 한 줄 | `related_reasons[0]` |
| 성격 태그 ("대응 필요" / "개선 후보") | **[요청]** `change_type`: `deprecated`이면 대응 필요, 나머지는 개선 후보 |
| 영향도 (높음 / 보통 / 낮음) | **[요청]** `score`: 70 이상 높음, 40 이상 보통, 그 아래 낮음 |
| 작업 유형 필터 | **[요청]** `task_types` |
| 상태 배지 | **[요청]** `status`: `new` 비교 전, `snoozed` 나중에(`snoozed_until`), `compared` 비교함, `kept` 기존 유지, `applied` 교체함 |
| 비교 가능 여부 | `support_level`: `information_only`이면 "정보만", 비교 버튼 없음 |
| 지난 비교 요약 (카드 아래) | **[요청]** `latest_comparison`: `verdict`, `highlights[]`(지표 2~3개 문장), `completed_at` |

### 버튼

| 버튼 | 동작 |
|---|---|
| [내 작업으로 비교하기] | S-04a로 이동 (`candidate_version_id`, `recommendation_id`) |
| [결과 다시 보기] | S-05로 이동 (`latest_comparison.comparison_id`) |
| [나중에] | **[요청]** `PATCH /api/recommendations/{id}` `{ status: "snoozed" }` |
| [관심 없음] | **[요청]** `PATCH /api/recommendations/{id}` `{ status: "dismissed" }` |
| 숨긴 변화 [다시 보기] | **[요청]** `PATCH /api/recommendations/{id}` `{ status: "new" }` |
| [환경 다시 확인] | `POST /api/environment/scan`. FE가 이전 결과와 비교해서 바뀐 항목을 팝업으로 보여 줘요 |

---

## S-03 변화 상세

`GET /api/candidates/{candidate_version_id}`와 추천 목록의 같은 항목을 합쳐서 보여 줘요.

| 화면 요소 | 필드 |
|---|---|
| 제목, 요약 | `title`, `summary` |
| 내 환경과의 관계 | `related_reasons[]` |
| 대신하는 것 | **[요청]** `replaces` (예: "리뷰 프롬프트 직접 붙여넣기") |
| 주장하는 개선점 | `claimed_benefit` |
| 출처·버전 | `source_url`, `revision`, `published_at`, `verified_source_at` |
| 만든 곳 | `maintainer.author`, `.license`, `.last_updated_at` |
| 출처 신뢰도 | **[요청]** `provenance`: `official` / `known_author` / `community` / `unverified` |
| 호환성 | `compatibility`: `confirmed` / `unknown` / `incompatible` |
| 필요한 권한 | `permissions.declared[]`: `kind`(file_read / file_write / network / command_exec), `description`, **[요청]** `additional` |
| 위험 신호 | **[요청]** `risk_signals[]` |
| 비교 가능 여부 | `support_level`: `information_only`이면 "비교할 수 없는 후보" 화면 |

버튼은 홈 카드와 같아요: [내 작업으로 비교하기], [나중에], [관심 없음].

---

## S-04a 비교 준비

| 화면 요소 | API·필드 |
|---|---|
| 기존 방식 이름 | `candidate.replaces`, 없으면 `work_method.skill_name`, 그것도 없으면 "등록한 프롬프트" |
| 후보 방식 이름 | `asset.display_name` + `revision` |
| 1. 비교할 작업 고르기 (1~3개, 탭: 내 PR / 파일 묶음 / 예제) | **[요청]** `GET /api/inputs/suggestions?task_type=` → `suggestion_id`, `kind`(diff / files / fixture), `label`, `meta` |
| 2. 외부 AI로 보낼 내용 (팝업) | 고른 작업들의 `relative_paths` 합집합. 체크를 풀어 뺄 수 있어요. 자동으로 뺀 파일은 `excluded_paths[]`(`path`, `reason`) |
| 3. 바뀌는 것은 하나뿐 | 기존 → 후보 이름. 고정 조건 목록은 FE 문구 |
| 4. 실행 한도와 예상 비용 | 각 방식 1회, 방식당 180초(`MAX_RUN_SECONDS`), 예상 비용은 `plan.max_estimated_cost_usd`가 오면 표시 |
| 동의 체크 | 체크해야 [비교 시작]이 켜져요 (= `confirmed_upload_scope: true`) |

**[비교 시작] 누르면**
1. 고른 작업마다 `POST /api/inputs` `{ relative_paths, label }` → `input_id`
   - 작업 하나 = 입력 하나 (파일 여러 개). 수정안의 "입력 스냅샷"과 같아요.
2. `POST /api/comparisons` (`Idempotency-Key` 포함)
   ```json
   { "method_id", "method_version", "candidate_version_id", "task_type",
     "input_ids": ["…", "…", "…"], "confirmed_upload_scope": true, "idempotency_key" }
   ```
3. 받은 `comparison_id`로 S-04b로 이동해요.

- `method_id`, `method_version`은 **[요청]** `GET /api/work-methods`에서 같은 `task_type`의 활성 방식을 찾아 넣어요.
- 방식이 없으면 "작업 방식을 먼저 등록해 주세요" + 설정 링크를 보여 줘요.

---

## S-04b 비교 실행 중

`GET /api/comparisons/{id}`를 2초마다 불러요.

| 화면 요소 | 필드 |
|---|---|
| 단계 표시: 대기 → 기존 실행 → 후보 실행 → 평가 → 완료 | `status`(queued / running / evaluating / done). `running`일 때는 `runs[arm=baseline].status`가 끝났는지로 기존/후보 단계를 구분해요 |
| 작업별 상태 표 (작업 × 기존/후보) | `inputs[].label`, `runs[].inputs[].status` (queued / running / completed / failed / timeout) |
| 경과 시간 · 한도 | `created_at`부터 계산, 한도는 `plan.timeout_seconds × 2` |
| [실행 취소] | `POST /api/comparisons/{id}/cancel` → `cancelled` |
| 에러 화면 | `status: failed` + `runs[].failure_message` |

끝나면(`done`) 같은 주소에서 결과 화면으로 바뀌어요.

---

## S-05 비교 결과

`GET /api/comparisons/{id}` + `GET /api/candidates/{candidate_version_id}`(안전 정보용)를 불러요.

### 위에서부터

| 화면 요소 | 필드 |
|---|---|
| 기존 · 후보 이름, 작업 수, 실행 시각 | `baseline_label`, `candidate_label`, `inputs.length`, `completed_at`, `is_prerecorded`("사전 실행" 표시) |
| 판정 카드 | 아래 "판정 카드" 참고 |
| 지표 비교 표 | 아래 "지표" 참고 |
| 후보 방식이 놓친 것 | 기존 쪽 `findings` 중 같은 `canonical_group`이 후보 쪽에 없는 것 |
| 안전 정보 (팝업) | candidate의 `provenance`, `compatibility`, `permissions.declared[]`, `risk_signals[]` |
| 원문 나란히 보기 (팝업) | **같은 `input_id`의** `runs[baseline].inputs[].output_text` ↔ `runs[candidate].inputs[].output_text` |
| 검증 의견 (팝업) | `findings[]` → 아래 "지적 항목" 참고 |
| AI 해설 | `llm_judgment.summary`, `.next_check`. 항상 "AI 의견" 표시 |
| 실패한 작업 | `runs[].inputs[].status`가 failed/timeout이면 해당 칸에 `failure_message` |

### 판정 카드

| 지금 화면 | **[수정안]** 바뀔 화면 |
|---|---|
| `verdict`(candidate / baseline / tradeoff / tie / abstain)와 `verdict_reason`을 "이번 비교에서는 새 방식이 유리"처럼 보여 줌. 판정 결과에 따라 화면 5종(A~E) | 선택 전(`verdict: null`)에는 "결과물을 보고 골라 주세요", 선택 후에는 "내 선택: 후보 방식"과 이유. 화면 2종으로 줄여요 |

### 지표 (`runs[].inputs[].metrics`, 작업 합계로 보여 줘요)

| 작업 유형 | 키 | 화면 이름 | 근거 표시 |
|---|---|---|---|
| code_review | `raised` | 제기한 문제 | 측정값 |
| | `confirmed` | 확인된 문제 | 사용자 확인 |
| | `false_positive` | 확인된 오탐 | 사용자 확인 |
| | `missed` | 놓친 문제 | 측정값 |
| test_generation | `runnable` | 실행 가능한 테스트 | 측정값 |
| | `normal` | 정상 통과 | 측정값 |
| | `defects` | 결함 탐지 (`value`/`total` → "3건 중 1건") | 측정값 |
| | `rules` | 규칙 준수 (`value`/`total`) | 사용자 확인 |
| 공통 | `seconds` | 실행 시간 | 측정값 |
| | `cost_usd` (`runs[]`) | 비용 | 측정값 (추정이면 `cost_kind: estimated`) |

> **[수정안]** 지표는 "자동 승자"를 정하는 데 쓰지 않고 **판단 근거로만** 보여 주면 돼요. 이 지표와 `findings`는 계속 응답에 넣어 주세요.

### 지적 항목 (`findings[]`)

| 화면 | 필드 |
|---|---|
| 위치 | `path`:`line_number` |
| 내용 | `description` |
| 어느 방식이 찾았나 | `run_id` → baseline / candidate |
| 같은 문제 묶음 | `canonical_group` (두 방식이 같은 걸 찾으면 한 줄로) |
| 확인 상태 | `verification`: `unverified` 확인 필요 / `reproduced` 재현 확인 / `user_confirmed` 사용자 확인 / `false_positive` 오탐 |
| [맞아요] [오탐이에요] + 메모 | `PATCH /api/findings/{id}` `{ verification, evidence: { note } }` → 다시 조회하면 지표에 반영 |

### 결정 버튼

| 지금 | **[수정안]** |
|---|---|
| [관심 없음] [나중에] [추가 비교] [기존 방식 유지] [바꿔보기] | [기존 유지] [후보 선택] [보류] → `PATCH /api/comparisons/{id}/decision` `{ verdict: "baseline" \| "candidate" \| "abstain", reason? }` |
| [바꿔보기] → 바로 S-06 | [후보 선택] 저장 뒤 별도 [바꾸기 진행] 버튼 → S-06. **선택 ≠ 적용** |
| [다시 실행] (실패·보류일 때) | 같은 값으로 `POST /api/comparisons`를 다시 보내요. 응답에 `method_id`, `method_version`, `inputs[].input_id`가 있어야 해요 |

`baseline`을 선택하면 추천 상태가 `kept`가 되면 좋겠어요 (홈 배지).

---

## S-06 교체 확인

들어올 때마다 `POST /api/apply/preview` `{ comparison_id }`를 불러요. 캐시하지 않아요.

| 화면 요소 | 필드 |
|---|---|
| 바뀌는 내용 (파일별) | `changes[]`: `path`, `action`(add / replace / delete), `note` |
| 대상 위치 | `target_path` (예: `.agents/skills/pr-review`) |
| 추가로 필요한 권한 | `additional_permissions[]` |
| 환경이 비교 때와 달라요 (경고) | **[요청]** `environment_changes[]`: `label`, `before`, `after`. 있으면 "그래도 진행" 체크를 따로 받아요 |
| 직접 적용이 필요해요 (`applicable`이 아닐 때) | **[요청]** `manual_steps[]`: `title`, `command` (복사 버튼) |
| 확인 체크 | 체크해야 [확인하고 바꾸기]가 켜져요 |

**[확인하고 바꾸기] 누르면**
- `POST /api/apply` `{ preview_id, confirmation_token: change_set_sha256 }`
- 결과에 따라 팝업이 달라요.

| 응답 | 팝업 |
|---|---|
| `status: applied` | "바꿨어요": 백업 → 설치 → 설정 변경 단계 |
| `status: rolled_back` | "바꾸지 못해서 원래대로 되돌렸어요" + [다시 시도] |
| 409 `ENVIRONMENT_CHANGED` | 미리보기를 다시 불러서 바뀐 내용을 다시 확인시켜요 |

---

## S-07 이력

`GET /api/history` → `items[]`를 최신순으로 보여 줘요.

| 화면 요소 | 필드 |
|---|---|
| 무엇을 | **[요청]** `payload.change_title` |
| 어떤 결정 | `event_type`: snoozed 나중에 / dismissed 관심 없음 / comparison_completed 비교 / decision_keep 기존 유지 / apply_completed 교체 / rollback_completed 되돌림 |
| 요약, 이유 | **[요청]** `payload.summary`, `payload.reason` |
| 언제 | `created_at` |
| 결과 보기 링크 | **[요청]** `payload.comparison_id` |
| "지금 환경과 달라요" 표시 | **[요청]** `payload.stale_environment` |
| 필터 | 전체 / 교체 / 되돌리기 / 비교 실행 / 기존 유지 (FE가 `event_type`으로 나눠요) |

### 되돌리기 (교체 기록에서)

| 단계 | API |
|---|---|
| 이유 고르기 (결과가 나빠짐 / 쓰기 불편함 / 기타) | — |
| [이전 방식으로 되돌리기] | `POST /api/apply/{apply_id}/rollback` `{ confirmed: true, reason }` |
| 충돌 | `{ status: "conflict", reason, conflict_paths[] }` → "직접 고친 파일이 있어요" 팝업 |
| 충돌 후 선택 | **[요청]** 같은 요청에 `conflict_strategy: "skip" \| "overwrite"`를 붙여 다시 보내요 |
| 완료 | `{ status: "rolled_back" }` → 이력에 "되돌림" 추가 |

---

## S-08 설정

| 화면 요소 | API |
|---|---|
| 내 환경 (도구·모델·스킬) + [환경 다시 확인] | `GET /api/environment`, `POST /api/environment/scan` |
| 작업 방식 + [수정] (팝업) | **[요청]** `GET /api/work-methods`, 저장은 `POST /api/work-methods` (버전이 올라가요) |
| 폴더와 접근 범위 + [바꾸기] | `POST /api/environment/scan` `{ root, scopes }`. `scopes`에 `write`가 없으면 교체를 못 해요 |
| 연결 해제 | **[요청]** `DELETE /api/environment` |
| 데이터 관리 (비교 기록 수, 백업 목록, 삭제) | **[요청]** `GET /api/storage`, `DELETE /api/storage?kind=comparisons\|backups`. 적용 중인 백업(`applied: true`)을 지우려 하면 경고 팝업 |

---

## 부록 A. 값 매핑 (BE → 화면 문구)

| BE 값 | 화면 |
|---|---|
| `task_type: test_generation` | 테스트 작성 |
| `task_type: code_review` | 코드 리뷰 |
| `support_level: information_only` / `comparable` / `applicable` | 정보만 / 비교 가능 / 바로 교체 가능 |
| `verdict: candidate` / `baseline` / `abstain` | 후보 방식 / 기존 방식 / 보류 (**[수정안]** 사용자 선택) |
| `verification: unverified` | 확인 필요 |
| `recommendation status: applied` | 교체함 |

## 부록 B. FE 목 서버로 미리 보기

- 실행: `npm run dev`. 목 서버가 이 문서의 모든 API를 백엔드 모양 그대로 흉내 내요 (`src/mocks/handlers.ts`).
- 브라우저 콘솔에서 상태를 바꿔 볼 수 있어요:
  - `localStorage.setItem('mock:fresh','1')`: 처음 사용자 (온보딩)
  - `localStorage.setItem('mock:server','down')`: 서버 꺼짐
  - `localStorage.setItem('mock:empty','1')`: 추천 없음
- 실제 응답 JSON(완료·실패 사례)이 나오면 `src/mocks/backendDb.ts`와 대조해 주세요. 다른 부분은 FE가 맞출게요.
