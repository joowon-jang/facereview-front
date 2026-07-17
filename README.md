# FaceReview

**웹캠 표정 분석 기반 감정 데이터로 영상을 추천하는 서비스**

🔗 **Live: [https://facereview.net](https://facereview.net)**

## 📌 프로젝트 소개

FaceReview는 YouTube 영상을 시청하는 동안 웹캠으로 촬영한 사용자의 표정을 AI가 실시간으로 분석해 감정 데이터를 축적하고, 이를 영상 추천에 활용하는 서비스입니다.

- 시청 중 웹캠 프레임을 socket.io로 서버에 전송하고, 학습된 AI 모델이 감정을 분석합니다.
- 축적된 감정 데이터를 기반으로 **비슷한 감정 분포를 가진 영상**을 추천합니다.
- 영상 시청 화면에서는 **다른 시청자들이 구간별로 느낀 감정 타임라인 그래프**를 함께 보여주며, 그래프를 드래그해 해당 구간으로 바로 이동할 수 있습니다.
- 마이페이지에서는 최근 시청 영상에서 느낀 감정 분포 등 나의 감정 통계를 확인할 수 있습니다.

## 🗓️ 프로젝트 연혁

| 시기 | 내용 |
| --- | --- |
| 2023.10 ~ 2023.12 | 최초 개발 (4인 팀 프로젝트) |
| 2026.01 ~ 2026.04 | 1차 리팩토링 |
| 2026.07 | 2차 리팩토링 |

## 👥 팀원

### 최초 개발 (2023)

- 장주원 — _Frontend_
- 박찬진 — _Frontend_
- 김대선 — _Backend_
- 조경연 — _AI + Backend_

### 리팩토링 (2026)

- 장주원 — _Frontend_
- 김대선 — _Backend_

## 💻 기술 스택

> 이 저장소는 FaceReview의 **프론트엔드** 저장소입니다. 백엔드는 [별도 저장소](#-backend)에서 관리됩니다.

- **Core**: React 19, TypeScript 5.9
- **Build**: Vite 7, Yarn Berry 4
- **상태 관리 / 데이터**: Zustand, TanStack Query v5, Axios
- **실시간 통신**: socket.io-client
- **UI**: SCSS (7-1 패턴), nivo (차트), Swiper (캐러셀)
- **테스트 / 품질**: Vitest, Testing Library, ESLint 9, Prettier
- **배포**: Vercel (SSG 프리렌더링 + 동적 OG 이미지 생성)

## 🔧 2026 리팩토링 주요 개선 내역

> 각 항목의 배경과 상세 내용은 [docs/REFACTORING.md](./docs/REFACTORING.md)에 정리했습니다.

### 빌드·툴링 현대화

- CRA(react-scripts) → **Vite 7** 마이그레이션, Yarn Berry(v4) 전환
- React 18 → **19**, TypeScript 4.4 → **5.9** 업그레이드
- ESLint 9(flat config) + Prettier 정비, Vitest 기반 테스트 환경 구축

### 웹 접근성(a11y) 및 SEO 강화

- 시맨틱 마크업·`aria-*` 속성·`autocomplete` 보강, 단계별 자동 포커스 등 키보드 사용성 개선
- 공용 컴포넌트(Button, TextInput)를 표준 HTML 속성을 지원하도록 리팩토링
- 전 페이지 메타데이터 정비, 정적 라우트 SSG 프리렌더링, **영상별 동적 OG 이미지** 빌드 타임 생성
- sitemap·파비콘·웹 매니페스트 최적화

### 디자인 개편 및 반응형 대응

- 디자인 시스템 정립(디자인 토큰, 3단계 브레이크포인트, 레이아웃 셸) 및 전 페이지 플랫 디자인 리디자인
- 모바일·태블릿 반응형 레이아웃 전면 대응, 터치 디바이스 hover 이슈 해결
- 감정 타임라인 그래프 라인 차트 전환 및 커스텀 영상 컨트롤(재생 토글·시크·툴팁·전체화면) 구현

### 신규 기능

- 영상 검색(무한 스크롤), 즐겨찾기(북마크) 페이지, 404 페이지
- 이메일 인증, 비밀번호 변경, 회원 탈퇴
- 감정 타임라인 그래프 **드래그 시킹**, 시청 시간 초 단위 토글, 삭제·비공개 영상 자동 숨김

### 인증·보안 및 안정성

- 리프레시 토큰 기반 인증을 axios interceptor로 통합, 동시 요청 시 토큰 재발급 경합 문제 해결
- 루트 ErrorBoundary 도입으로 렌더 오류·청크 로드 실패 시 흰 화면 방지
- TanStack Query 도입, Suspense/lazy 코드 스플리팅 등 성능 최적화
- SASS 7-1 패턴 구조화, 중복 컴포넌트 추출, 유틸 단위 테스트 추가

## 🚀 배포 인프라 변천

| 시기 | 인프라 |
| --- | --- |
| 2023 | AWS 기반 CI/CD 무중단 배포 |
| 2026.01 | 온프레미스 서버 (Docker + nginx + GitHub Actions) |
| 2026.07 | 프론트엔드 Vercel 이전 (백엔드는 온프레미스 유지) |

## 🤖 AI 에이전트 활용 경험

2026년 리팩토링은 AI 에이전트를 적극적으로 활용해 진행했습니다.

2023년 최초 개발 이후 쌓아온 공부와 실무 경험 덕분에, 이번 리팩토링에서는 **어떤 부분을 왜 개선해야 하는지 방향을 스스로 설계**할 수 있었습니다. AI 에이전트에게 작업을 맡기고 방치하는 것이 아니라, 에이전트가 수행한 작업을 커밋 단위로 직접 검수하고 의도와 다른 부분은 수정을 지시하며 진행했습니다. "AI에 의존"하는 것이 아니라 **"AI를 활용"하는 개발 방식**을 체득한 값진 경험이었다고 생각합니다.

### 사용 도구 및 활용 방식

- **Claude Code**, **OpenAI Codex** 두 CLI 에이전트를 작업 성격에 따라 병행 사용했습니다.
- 어떤 에이전트를 쓰든 일관된 결과가 나오도록 **프로젝트 규칙을 문서화**했습니다 — 공통 규칙은 [AGENTS.md](./AGENTS.md), Claude Code 설정은 `CLAUDE.md`로 관리합니다.
- 디자인 작업의 기준이 되는 **디자인 시스템 명세([DESIGN.md](./DESIGN.md))** 를 작성해, 에이전트가 UI를 만들 때 브랜드 컬러·토큰·브레이크포인트를 준수하도록 했습니다.
- 백엔드 API 명세를 에이전트가 조회할 수 있는 **커스텀 skill**(`facereview-api-reference`)로 만들어, API 연동 작업 시 스펙을 추측하지 않고 정확한 레퍼런스를 참조하도록 했습니다.

## 🔌 Backend

백엔드는 별도 저장소에서 관리됩니다.

> 🔗 Repository: [winterholic/facereview-refactor-back](https://github.com/winterholic/facereview-refactor-back)

- **Core**: Python, Flask 3 (flask-smorest 기반 Swagger/OpenAPI 문서화)
- **AI / 영상 분석**: TensorFlow, OpenCV
- **실시간 통신**: Flask-SocketIO
- **Database**: MariaDB (SQLAlchemy), MongoDB, Redis
- **비동기 처리**: Celery, APScheduler
- **인증·보안**: JWT, bcrypt
- **배포**: Docker Compose + Gunicorn (온프레미스)
