# Lotto Studio

물리 시뮬레이션으로 번호를 추출하는 다국어 정적 웹앱입니다. Three.js + Cannon-es + esbuild를 사용합니다.

## 실행

Node.js 22 이상이 필요합니다.

```sh
npm ci
npm run build
npm run dev
```

로컬 주소: http://127.0.0.1:4173/3d-lotto-number-generator/ko/
소스를 수정한 뒤 `npm run build`하고 브라우저를 새로고침합니다. `index.html`은 빌드 템플릿이므로 파일을 직접 열거나 저장소 루트를 그대로 배포하지 않습니다.

```sh
npm run check
```

물리·추첨·복사·번역·연속 추첨 테스트를 실행하고 6개 언어의 정적 HTML과 SEO 설정을 검증합니다.

## 기능

- 60Hz 고정 물리 스텝과 렌더 보간. 첫 출구 통과 공이 선택되며 번호를 미리 정하지 않습니다.
- 한국 로또 6/45, Powerball, Mega Millions, 일본 로토6, 중국 쌍색구, 러시아 스포츠로토 6/45.
- Powerball/Mega Ball/쌍색구 추가 번호는 별도의 공 세트로 물리 추첨합니다. 한국·일본의 당첨 등위용 보너스 공은 구매자의 선택 번호가 아니므로 생성하지 않습니다.
- 1~5세트 연속 추첨. 세트별/현재 배치/최근 기록 전체 복사, 실패 시 수동 복사.
- 최근 20세트 로컬 저장 및 삭제. 게임 이름과 추가 번호를 복사 문자열에 포함합니다.
- ko/en/zh-Hans/ja/ru/hi 정적 페이지. 루트 진입 시 저장된 언어 또는 브라우저 언어로 이동하며 명시적인 언어 URL은 유지합니다.
- 게임은 URL `?game=powerball` → 브라우저의 첫 번째 locale 지역 순으로 선택합니다. `/ko/` 등 경로는 화면 언어만 결정하며, 이전에 저장된 게임은 자동 선택에 사용하지 않습니다. 직접 선택하면 URL에 게임을 기록합니다. 영어가 곧 미국이라고 가정하지 않습니다. 인도·미지원 지역은 게임 선택을 안내합니다.
- 화면 품질/움직임 줄이기, 탭 비활성 시 정지, 일시정지, WebGL 오류 안내.

## 구조

- `src/physics.js`: 화면에 의존하지 않는 공 충돌·포획·이동 상태.
- `src/draw.js`: 기본/추가 번호군의 순차 추첨.
- `src/batch.js`: 1~5세트 연속 추첨 및 중지.
- `src/games.js`: 공식 출처와 게임별 번호 규칙. 검토일 2026-10-30.
- `src/view.js`: 장치·공·번호판·카메라 및 보간.
- `src/i18n.js`: 6개 언어의 화면/설명/메타데이터.
- `src/results.js`: 결과 검증, 기록 호환성, 복사 형식.
- `main.js`: 브라우저 UI·설정·기록·접근성 안내.
- `scripts/build.mjs`: 6개 언어 정적 HTML, sitemap, robots, 404 생성.

물리 시뮬레이션은 균등 추첨을 수학적으로 보장하지 않습니다. 테스트의 빈도 분포는 이상 탐지용이며 공정성 인증이 아닙니다. 각 게임의 규칙과 출처를 확인한 뒤 업데이트해야 합니다.

## GitHub Pages

`.github/workflows/pages.yml`이 `main` 푸시 시 테스트/빌드 후 `dist`를 배포합니다. PR에서는 검증만 합니다. 저장소 **Settings → Pages → Source → GitHub Actions**를 선택해야 합니다.

기본 공개 URL은 `https://raemerrr.github.io/3d-lotto-number-generator/`입니다. 다른 도메인을 쓰면 저장소 Actions 변수 `SITE_URL`에 마지막 `/`를 포함한 전체 URL을 지정합니다. 커스텀 도메인은 Pages 설정과 DNS에서도 연결해야 합니다.

프로젝트 Pages의 `.../3d-lotto-number-generator/robots.txt`는 호스트 루트 robots.txt를 대신하지 않습니다. 루트 설정은 `raemerrr.github.io` 사이트 또는 커스텀 도메인에서 별도로 관리합니다. sitemap은 Search Console에 직접 제출할 수 있습니다.

## Vercel

`vercel.json`에 정적 배포 설정이 준비되어 있습니다. 프로젝트 환경 변수 `SITE_URL`을 실제 루트 도메인으로 설정한 뒤 배포합니다. Vercel 환경에서는 SITE_URL 미설정 시 빌드가 실패하도록 하여 GitHub Pages canonical/경로가 잘못 배포되는 것을 방지합니다.

```sh
SITE_URL=https://your-domain.example/ npm run build
SITE_URL=https://your-domain.example/ npm run dev
```

새 도메인 적용 전 기존 URL 대응표·검색 도구 소유권·canonical·사이트맵을 확인합니다. 수익화 시 Vercel Hobby의 비상업적 사용 제한을 검토해야 합니다.

## 검색과 광고

[출시 체크리스트](LAUNCH_CHECKLIST.md)에서 운영자 작업과 구현 상태를 확인하세요. 광고/분석 스크립트, 계정 ID, ads.txt를 임의로 넣지 않았습니다. 다국어 페이지와 게임 선택만으로 검색 노출이나 AdSense 승인이 보장되지는 않습니다.

MIT License · RM

## 공개 사이트 재검증

`python3 scripts/check-live.py` (Python 3 및 curl 필요). 공개 HTTP/메타데이터를 검사하고 `artifacts/live-audit.json`에 결과를 저장합니다. 계정 내부 색인/광고 승인 상태는 확인하지 않습니다.

[AdSense 준비도 및 기존 블로그 비교](ADSENSE_READINESS_REVIEW.md)에서 구현, 운영 반영, 사용자 선행 항목을 구분합니다.
