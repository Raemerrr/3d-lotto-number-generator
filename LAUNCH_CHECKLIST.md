# 공개 및 수익화 체크리스트

검토일: 2026-10-30. 기존 개선 PR 병합/공개 배포 완료. 루트 Search Console·AdSense 메타 제공 확인(계정 내부 인증 결과는 별도). 광고 게재·도메인 이전은 수행하지 않았다.

최신 상세 상태와 역할 분담: [종합 검토](ADSENSE_READINESS_REVIEW.md). 아래 장기 체크리스트는 광고 도입까지 포함한다.

- [x] 실제 운영 루트/로또 6개 언어 HTTP 200, 루트 robots 및 두 사이트맵 확인.
- [x] 문의 정보 RM / tempid1127@gmail.com 사용자 확인 및 코드 반영.
- [x] 루트 ads.txt·문의 페이지, 로또 다국어 사용법 보완 코드 준비.
- [ ] 이번 두 보완 브랜치 병합·배포 및 새 운영 URL 검증.
- [ ] Search Console 사이트맵 처리·색인 결과 및 AdSense 심사 결과(계정 화면).

## 구현된 기반

- [x] 고정 물리 스텝, 상태 분리, 끼임 재시도와 오류 처리.
- [x] 연속 1~5세트, 개별/배치/기록 전체 복사, 브라우저 기록.
- [x] 6개 언어별 정적 HTML, self-canonical, 상호 hreflang, x-default.
- [x] 절대 OG 이미지, WebApplication JSON-LD, sitemap, robots, 404.
- [x] 실제 작동 원리·FAQ·확률 설명·운영자 소개·저장 안내.
- [x] GitHub Actions 배포 설정과 Vercel 정적 배포 설정.
- [x] 지역과 언어를 분리한 게임 선택, 공식 규칙 링크.

## 사용자가 준비할 항목 / 내가 연결할 항목

| 상태 | 항목                                   | 사용자                               | 구현 지원                                         |
| ---- | -------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| [ ]  | 최종 도메인                            | 구매·소유권·DNS 권한                 | SITE_URL, DNS 안내, canonical/사이트맵 재생성     |
| [ ]  | Pages 공개                             | Actions 소스 설정 및 공개 시점 결정  | 워크플로 상태 점검, 경로 회귀 검사                |
| [ ]  | Google Search Console                  | 계정 로그인·소유권 인증              | 인증 태그/파일, sitemap 제출 안내, 색인 오류 분석 |
| [ ]  | Bing Webmaster / 네이버 서치어드바이저 | 계정과 사이트 인증                   | 사이트맵·진단 대응, 필요 시 IndexNow              |
| [ ]  | robots.txt 루트                        | 사용자 Pages 루트/커스텀 도메인 접근 | 실제 호스트 루트에서 크롤링 규칙 확인             |
| [ ]  | 콘텐츠 품질                            | 번역과 운영자 정보 확인              | 언어별 문구와 고유 콘텐츠 보강                    |
| [ ]  | 실제 유입 측정                         | 분석 도구·수집 범위 선택             | 동의 조건과 이벤트 연동; 현재 추적 없음           |
| [ ]  | AdSense                                | 신청·본인·지급·세금 정보             | 사이트 코드·심사 오류 대응                        |
| [ ]  | 게시자 정책                            | 정책센터 결과와 운영 책임            | 게임/링크/문구 정책 검토 지원                     |
| [ ]  | ads.txt                                | 실제 publisher ID                    | 도메인 루트 ads.txt 생성·검증                     |
| [ ]  | 지역별 동의                            | 대상 지역·CMP 공급자                 | 인증 CMP와 광고 초기화 순서                       |
| [ ]  | 개인정보 문서                          | 운영 주체·문의 정보·최종 내용 확인   | 실제 수집/광고 구성에 맞춰 고지 변경              |
| [ ]  | 광고 레이아웃                          | 게재 위치 결정                       | 추첨·복사와 분리된 슬롯, CLS/오클릭 점검          |
| [ ]  | 성능                                   | 실제 모바일 기기 피드백              | FPS·LCP·INP·CLS 측정 및 최적화                    |

## 공개 전 검증

- [ ] iOS Safari/Android Chrome 실제 기기에서 터치, 발열, 복사 권한, 세로/가로 화면 확인.
- [ ] 각 언어의 원어민 검수. 중국어 간체와 힌디어가 1차 지원 범위임을 확인.
- [ ] 5세트 종료, 중지, 재시작, 탭 복귀, WebGL 손실 시나리오 확인.
- [ ] 광고 도입 전에 호스팅 수익화 조건 확인. Vercel Hobby는 비상업적 개인 용도.
- [ ] 기존 URL 유지/이전 매핑, 404와 정적 자산 경로 점검.
- [ ] 물리 추첨의 빈도 편향을 더 큰 표본과 여러 환경에서 조사. 균등성 인증으로 홍보하지 않기.
- [ ] 검색 노출/클릭/CTR, 게임·언어별 완료·복사율로 개선 효과 측정. 특정 순위나 승인 보장 없음.

## 공식 참고

- [Google AI 검색과 SEO](https://developers.google.com/search/docs/appearance/ai-features): 별도 AI 전용 파일이 필수는 아님. 접근 가능한 유용한 HTML 콘텐츠 우선.
- [Google 다국어 사이트](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [AdSense 자격 요건](https://support.google.com/adsense/answer/9724)
- [게시자 온라인 도박 제한](https://support.google.com/publisherpolicies/answer/10437963): 무료 생성기라는 사실만으로 승인 여부를 단정하지 않기.
- [ads.txt](https://support.google.com/adsense/answer/12171612)
- [인증 CMP 요구사항](https://support.google.com/adsense/answer/13554020)
- [GitHub Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)

국가별 공식 번호 규칙은 `src/games.js`에 출처를 함께 기록했다. 인도는 전국 대표 숫자 선택형 게임으로 임의 매핑하지 않았다. 주별 복권·티켓 일련번호형 상품은 별도 요구사항 확인 후 추가한다.

## GitHub Pages 주소와 AdSense 등록

- 저장소 공개 링크는 사이트 화면에서 제거했다. 라이선스 링크는 자체 `license.txt`로 제공한다.
- Google의 사이트 관리 안내는 Public Suffix List에 있는 플랫폼의 하위 도메인을 사이트로 추가할 수 있다고 설명하며, github.io는 이 목록에 포함된다. 따라서 github.io 주소만으로 불가하다고 단정하지 않는다. 계정의 실제 사이트 등록 및 심사는 별도 확인한다.
- 현재 프로젝트 경로 `/3d-lotto-number-generator/`를 독립 도메인처럼 등록하지 않는다. 경로 없이 `raemerrr.github.io` 단위의 등록·소유권 확인과 루트 관리가 필요하다.
- ads.txt는 `/3d-lotto-number-generator/ads.txt`가 아닌 `https://raemerrr.github.io/ads.txt` 등 인식되는 사이트 루트에 제공해야 한다.
- 수익화 목표라면 검색 등록 전 전용 도메인으로 정리하는 것을 권장한다. 도메인은 GitHub Pages에도 연결할 수 있으므로 도메인 도입과 호스팅 이전을 분리해 결정한다.
- 광고 중심 사업으로 운영하려는 경우 GitHub Pages의 상업적 사이트 사용 제한도 별도로 검토한다. 커스텀 도메인 연결이 호스팅 약관을 바꾸지는 않는다.

자료: [AdSense 사이트 등록 범위](https://support.google.com/adsense/answer/12170421), [신청 URL 형식](https://support.google.com/adsense/answer/2784438), [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat).
