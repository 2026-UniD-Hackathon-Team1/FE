---
name: 갈아탈까
description: 두 방식을 같은 무게로 나란히 놓고, 근거를 보며 차분하게 고르는 웹앱
colors:
  dusty-rose: "#E38AA4"
  plum-ink: "#3A2530"
  plum-mist: "#6E5A64"
  blush-paper: "#FCF7F8"
  rose-veil: "#F7EDF0"
  glass-white: "#FFFFFF"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: "2.25rem"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  title:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.625rem"
  body:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.625rem"
  label:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  caption:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1.125rem"
  button:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: "1.375rem"
rounded:
  tag: "6px"
  control: "8px"
  option: "10px"
  panel: "12px"
  card: "16px"
  popup: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "#000000"
    textColor: "#FFFFFF"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.glass-white}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.rose-veil}"
  button-ghost:
    textColor: "{colors.plum-mist}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.glass-white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  tag-soft:
    backgroundColor: "{colors.rose-veil}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.tag}"
    padding: "0 8px"
    height: "24px"
  tag-solid:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.glass-white}"
    typography: "{typography.caption}"
    rounded: "{rounded.tag}"
    padding: "0 8px"
    height: "24px"
  chip-selected:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.glass-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  input:
    backgroundColor: "{colors.glass-white}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  card-glass:
    rounded: "{rounded.card}"
    padding: "24px"
  card-glass-sub:
    backgroundColor: "{colors.rose-veil}"
    rounded: "{rounded.card}"
    padding: "24px"
  popup:
    backgroundColor: "{colors.glass-white}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.popup}"
    padding: "24px 28px"
  nav-item-active:
    backgroundColor: "{colors.glass-white}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
---

# Design System: 갈아탈까

## Overview

**Creative North Star: "The Balanced Desk" (저울을 올려 둔 책상)**

갈아탈까의 모든 화면은 저울을 올려 둔 책상이에요. 기존 방식과 새 방식을 같은 무게로 나란히 놓고, 사용자가 근거를 보며 차분하게 고르게 해요. 화면은 판정을 대신 내려 주지 않아요. 판정은 "권고"로만 보여 주고, 어떤 선택이든 같은 손 닿는 거리에 둬요.

분위기는 **차분하고 다정해요.** 연핑크 종이 위에 흰 유리 카드가 살짝 떠 있고, 글자는 남색 대신 따뜻한 자두색이에요. 말투는 해요체이고, 단정하지 않고 범위를 밝혀요("이번 비교에서는", "각 방식 1회 실행 결과"). 화면마다 묻는 질문은 하나, 강조하는 버튼도 하나예요. 정보가 많으면 펼치지 않고 한 줄 요약으로 접은 뒤 팝업으로 열어요.

피해야 할 것은 네 가지예요. 네온·글로우·형광 핑크·무지개 그라데이션 같은 화려한 AI 스타트업 느낌, 회색 바탕에 표만 있는 밋밋한 관리자 화면, 모든 섹션을 같은 무게로 펼친 화면, 그리고 색이나 강조로 새 방식을 편드는 표현이에요.

**Key Characteristics:**
- 연핑크 종이(배경) + 흰 유리 카드(72%) + 자두색 글자, 5색과 그 투명도만 써요
- 판정과 결정은 어느 쪽에도 기울지 않게 같은 강조로 보여 줘요
- 정보가 많으면 "자세히 보기" 한 줄로 접고 팝업으로 열어요
- 같은 뜻은 항상 같은 아이콘(Heroicons Outline)과 같은 모양을 써요
- 숫자에는 항상 단위와 기준을 붙여요

## Colors

먼지 낀 로즈 핑크 하나와 자두색 잉크 두 단계, 그리고 핑크 기운이 도는 두 겹의 종이로 이루어진 차분한 팔레트예요.

### Primary
- **Dusty Rose (더스티 로즈)**: 형광기를 뺀 로즈 핑크. 현재 단계 표시, 비교 결과의 차이 배지, 배경 빛 번짐에만 써요. 주요 버튼은 검정이에요. 핑크 위 글자는 흰색이 아니라 Plum Ink예요(대비 약 5.8:1).

### Neutral
- **Plum Ink (자두 잉크)**: 제목, 본문, 아이콘, 진한 배지(대응 필요, 추가 권한), 선택된 칩, 되돌릴 수 없는 행동 버튼. 테두리와 구분선, 팝업 배경도 이 색의 투명도로 만들어요.
- **Plum Mist (자두 안개)**: 보조 설명, 날짜, 도움말, 표 머리, 꺼진 내비 항목.
- **Blush Paper (연핑크 종이)**: 화면 전체 바탕.
- **Rose Veil (장밋빛 베일)**: 사이드바, 안내 상자, 부드러운 배지, 판정 박스 같은 두 번째 층.
- **Glass White (유리 흰색)**: 카드(72%), 팝업(92%), 입력 칸, 보조 버튼의 바탕.

### Named Rules
**The Five Colors Rule.** 5색(흰색 포함 6개 토큰)과 그 투명도만 써요. 초록·빨강 같은 상태 색을 들이지 않아요. 상태는 아이콘과 글자로 구분해요.

**The Ink Opacity Rule.** 테두리와 구분선은 Plum Ink 12%, 버튼·칩 테두리는 55%, 팝업 뒤 배경은 50%예요. 다른 회색을 새로 만들지 않아요.

**The No Winner Color Rule.** 지표의 좋아짐·나빠짐, 판정의 유리·불리를 색으로 칠하지 않아요. "2건 많음", "23초 짧음"처럼 글자로만 말해요.

## Typography

**Display Font:** Pretendard (Apple SD Gothic Neo, system-ui로 대체)
**Body Font:** Pretendard
**Label Font:** Pretendard

**Character:** 한 가족(Pretendard)으로 제목부터 숫자까지 다 써요. 화려한 제목용 서체 없이 굵기와 크기 차이로만 위계를 만들어요. 한국어는 `word-break: keep-all`로 단어 단위로 줄을 바꿔요.

### Hierarchy
- **Display** (700, 26px, 36px): 화면 제목("비교 결과", "홈"). 화면당 하나.
- **Headline** (700, 20px, 28px): 판정 문장, 섹션 제목("지표 비교"), 팝업 제목.
- **Title** (600, 17px, 26px): 카드 안 소제목, 변화 카드 제목, "자세히 보기" 줄 제목.
- **Body** (400, 16px, 26px): 설명 문장, 판정 이유.
- **Label** (400, 14px, 22px): 보조 설명, 표 셀, 한 줄 요약. 화면에서 가장 많이 쓰는 크기예요.
- **Caption** (700, 12px, 18px): 배지와 태그, 표 머리(400), 작은 각주.
- **Button** (700, 15px, 22px): 모든 버튼 글자.

### Named Rules
**The One Family Rule.** Pretendard 하나로 끝내요. 고정폭(mono) 서체를 "기술 느낌"으로 쓰지 않아요. 명령어와 파일 경로도 Pretendard예요.

**The Unit Rule.** 숫자는 단위와 기준과 함께 써요("확인된 문제 4건 (작업 3개 합계)"). 표 숫자는 tabular-nums로 정렬해요.

## Layout

데스크톱 우선 앱 레이아웃이에요. 왼쪽에 고정 사이드바(248px, Rose Veil)가 있고, 오른쪽 본문은 최대 1112px로 가운데 정렬하며 좌우 여백은 40px이에요. 온보딩과 로그인은 사이드바 없이 가운데 880px 한 칸이에요.

간격은 4px 단위예요. 카드 안 여백 24px, 카드 사이 16px, 섹션 제목 아래 12px을 기본 리듬으로 써요. 두 칸 배치는 768px(md) 이상에서 1:1, 비교 준비는 1024px(lg) 이상에서 "본문 + 400px 사이드 칸"이에요.

### Named Rules
**The One Question Rule.** 한 화면은 질문 하나에 답해요. 그 질문에 필요한 것만 먼저 보이고, 나머지는 "자세히 보기" 한 줄(제목 + 한 줄 요약 + 자세히 보기 ›)로 접은 뒤 팝업으로 열어요.

**The Decide-Then-Dig Rule.** 비교 결과는 판정 → 지표 → 놓친 것 → 안전 정보(요약) → 결정 → "더 확인하고 싶다면" 순서예요. 안전 정보 요약은 항상 결정 버튼보다 위에 있어요.

## Elevation & Depth

깊이는 그림자가 아니라 유리 층으로 만들어요. 배경에는 Dusty Rose와 Plum Ink의 큰 빛 번짐(흐림 120px)이 깔려 있고, 그 위의 카드는 흰색 72% 반투명에 뒤 흐림 20px, 흰 테두리 80%, 윗변 1px 흰 하이라이트를 가져요. 그림자는 아주 옅게(자두색 6%) 들어가서 카드가 살짝 떠 보이게만 해요.

### Shadow Vocabulary
- **Glass** (`0 8px 12px rgb(58 37 48 / 0.06), inset 0 1px 0 rgb(255 255 255 / 0.8)`): 모든 카드와 섹션. 테두리는 검정 30%, 모서리 12px.
- **Popup** (`0 20px 40px rgb(58 37 48 / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.8)`): 팝업, 토스트.

### Named Rules
**The Medium Glass Rule.** 유리는 중간 단계로만 써요. 흰색 72%, 흐림 20px, 광택·반짝임 그라데이션은 없어요. 사이드바는 유리로 만들지 않고 단색 Rose Veil이에요(유리를 넣으면 탁해져요).

**The No Gradient Fill Rule.** 면은 단색으로 채워요. 배경 빛 번짐은 그라데이션이 아니라 흐림 처리한 단색 원이에요.

## Shapes

부드럽지만 둥글둥글하지는 않은 모서리예요. 크기가 클수록 모서리도 커져요. 태그 6px, 버튼·입력 8px, 선택 카드 10px, 안내 상자 12px, 섹션 카드 16px, 팝업 20px. 칩과 상태 점은 완전한 원(pill)이에요. 테두리는 항상 1px이에요.

## Components

### Buttons
담백하고 단단해요. 높이 44px(작은 버튼 36px), 모서리 8px, 굵은 15px 글자, 아이콘은 18px Heroicons Outline.
- **Primary:** Dusty Rose 바탕 + Plum Ink 글자 + Rose Lift 그림자. 화면당 하나.
- **Secondary:** 흰 바탕 + Plum Ink 55% 테두리. 마우스를 올리면 Rose Veil 바탕.
- **Ghost:** 바탕 없이 Plum Mist 글자. 마우스를 올리면 Plum Ink 5% 바탕. "나중에", "관심 없음", "취소".
- **Danger:** Plum Ink 바탕 + 흰 글자. "연결 해제", "그래도 지우기", "비교 멈추기"처럼 되돌릴 수 없는 행동에만.
- **Disabled:** 투명도 45%, 누를 수 없음.
- **Focus:** 2px Plum Ink 외곽선, 2px 띄움.

### Tags & Chips
- **Tag (24px, 모서리 6px, 12px 굵은 글자):** soft(Rose Veil), outline(흰 70% + Ink 55% 테두리), solid(Plum Ink + 흰 글자). 성격(대응 필요=solid, 개선 후보=outline), 출처, 근거(측정값=soft, 사용자 확인·AI 해설=outline), 검증 상태에 써요.
- **Impact bars:** 막대 3개 중 채운 개수(높음 3, 보통 2, 낮음 1) + 글자. 색에만 기대지 않아요.
- **Choice chip (36px, pill):** 필터와 이유 고르기. 선택되면 Plum Ink 바탕 + 흰 글자, 아니면 흰 바탕 + Ink 30% 테두리.

### Cards / Containers
- **Corner Style:** 16px
- **Background:** 흰색 72% 유리(기본) 또는 Rose Veil 75% 유리(판정 박스, 안내, 연결 끊김 배너)
- **Shadow Strategy:** Glass (Elevation 참고)
- **Border:** 흰색 80% 1px
- **Internal Padding:** 24px. 표가 들어가면 카드 여백 없이 표가 가장자리까지 가고 행 구분선은 Ink 12%.

### Inputs / Fields
- **Style:** 흰 바탕, Ink 20% 테두리, 모서리 8px, 높이 44px.
- **Hover / Focus:** 테두리가 Ink 40% → 100%로 진해져요. 빛나는 효과는 없어요.
- **Checkbox:** 18px, 모서리 4px, 켜지면 Plum Ink 바탕 + 흰 체크.
- **Radio card:** 큰 선택지. 선택되면 Rose Veil 바탕 + Ink 55% 테두리.

### Navigation
- **Sidebar:** Rose Veil 단색, 오른쪽 Ink 12% 경계. 위에서부터 로고, 프로젝트 선택 상자, 메뉴(홈·이력·설정), 아래쪽에 로컬 서버 상태(Codex CLI 버전).
- **Item:** 높이 40px, 아이콘 20px + 15px 글자. 현재 메뉴는 흰 바탕 + Ink 12% 테두리 + 굵은 글자, 나머지는 Plum Mist.

### Detail Row (signature)
"자세히 보기" 줄. 유리 카드 한 줄에 제목(Title) + 한 줄 요약(Label, Plum Mist) + "자세히 보기 ›". 누르면 같은 제목의 팝업이 열려요. 안전 정보, 원문 나란히 보기, 검증 의견, 외부로 보낼 내용처럼 정보가 많은 섹션은 전부 이 모양이에요.

### Verdict Box (signature)
Rose Veil 유리 박스에 저울 아이콘(흰 원 안), "판정 (권고)" 캡션, 판정 문장(Headline), 이유(Body), 적용 범위 각주(Caption). 어떤 판정이든 같은 모양과 같은 강조예요.

### Popup
흰색 92% + 흐림 20px, 모서리 20px, Popup 그림자, 뒤 배경 Plum Ink 50%. 제목(Headline) + 닫기(×) / 본문(스크롤) / 오른쪽 정렬 버튼. 0.18초 동안 살짝 떠오르며 나타나요.

## Do's and Don'ts

### Do:
- **Do** 주요 버튼(검정 배경 + 흰 글자)은 화면당 하나만 두세요.
- **Do** 비교 결과의 결정 상자에서는 "바꿔보기"만 주요 버튼, "기존 방식 유지"는 Secondary로 같은 크기로 나란히 두세요 (Figma 18:2570).
- **Do** 정보가 많은 섹션은 Detail Row로 접고 팝업으로 여세요.
- **Do** 테두리·구분선은 Plum Ink 12%, 버튼 테두리는 55%만 쓰세요.
- **Do** 근거는 측정값 / 사용자 확인 / AI 해설 태그로 항상 구분하세요.
- **Do** 상태 전환은 0.15초, 길어도 0.3초 미만으로 하세요.
- **Do** 아이콘은 Heroicons 24 Outline(선 굵기 1.5)만 쓰세요.

### Don't:
- **Don't** 네온, 글로우, 형광 핑크, 무지개 그라데이션처럼 화려한 AI 스타트업 느낌을 내지 마세요.
- **Don't** 회색 바탕에 표만 있는 밋밋한 관리자 화면으로 만들지 마세요. 바탕은 Blush Paper, 섹션은 유리 카드예요.
- **Don't** 한 화면에 모든 섹션을 같은 무게로 펼치지 마세요.
- **Don't** 초록·빨강이나 강조로 새 방식(또는 기존 방식)을 편들지 마세요.
- **Don't** "안전함"이라고 쓰지 마세요. "확인된 위험 신호 없음"까지만 써요.
- **Don't** UI 안에 이모지나 유니코드 기호를 아이콘 대신 쓰지 마세요.
- **Don't** 핑크(Dusty Rose) 바탕 위에 흰 글자를 쓰지 마세요.
