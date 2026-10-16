---
title: 가비아 도메인으로 Google Sites와 GitHub Pages 연결하기
description: ohsemin.com은 Google Sites 홈페이지로, blog.ohsemin.com은 Quartz 블로그로 연결하고 Cloudflare 무료 플랜으로 HTTPS 포워딩 문제를 해결한 기록.
tags:
  - domain
  - dns
  - cloudflare
  - github-pages
  - google-sites
  - quartz
created: 2026-10-16
updated: 2026-10-16
draft: false
---

> [!abstract] 한 줄 요약
> 가비아에서 구입한 `ohsemin.com`에 Google Sites 홈페이지와 GitHub Pages 블로그를 각각 연결했습니다. 블로그에는 CNAME과 GitHub Pages 설정을 썼고 루트 도메인의 HTTPS 인증서 오류는 가비아 포워딩을 Cloudflare 리디렉션으로 바꿔 해결했습니다.

## 연결하려던 주소

Google Sites로 만든 개인 홈페이지와 Quartz로 만든 블로그를 운영하고 있습니다. 홈페이지 주소는 `https://sites.google.com/view/seminoh`, 블로그의 기존 주소는 `https://oh-research.github.io/blog/`였습니다.

가비아에서 구입한 도메인을 다음과 같이 사용하려고 했습니다.

| 접속 주소 | 연결 대상 | 연결 방식 |
|---|---|---|
| `ohsemin.com` | Google Sites 홈페이지 | 홈페이지의 공개 URL로 이동 |
| `www.ohsemin.com` | 같은 Google Sites 홈페이지 | 홈페이지의 공개 URL로 이동 |
| `blog.ohsemin.com` | Quartz 블로그 | GitHub Pages의 맞춤 도메인 |

홈페이지는 이동 후 주소창에 `sites.google.com/view/seminoh`가 표시됩니다. 블로그는 주소창에 `blog.ohsemin.com`이 유지됩니다.

두 방식은 설정도 다릅니다. DNS의 CNAME은 호스트 이름을 다른 호스트 이름에 연결하는 레코드입니다. HTTP 리디렉션은 브라우저에 다른 URL로 이동하라고 응답합니다. `sites.google.com/view/seminoh`처럼 경로까지 포함된 URL로 보내려면 리디렉션을 설정해야 합니다.

## 1. 블로그를 blog.ohsemin.com에 연결하기

블로그 저장소는 [`oh-research/blog`](https://github.com/oh-research/blog)입니다. Quartz로 정적 사이트를 만들고, `main`에 푸시하면 GitHub Actions가 빌드 결과를 GitHub Pages로 배포하는 구조입니다.

먼저 저장소의 **Settings → Pages**에서 다음을 설정했습니다.

- **Source:** GitHub Actions
- **Custom domain:** `blog.ohsemin.com`

그다음 당시 사용하던 가비아 DNS에 CNAME을 추가했습니다.

| 타입 | 호스트 | 값 |
|---|---|---|
| CNAME | `blog` | `oh-research.github.io.` |

목적지에는 `https://`나 저장소 경로 `/blog`를 붙이지 않습니다. 가비아 입력 화면에서는 목적지 끝의 마침표까지 입력했습니다. GitHub는 요청받은 도메인을 저장소의 Custom domain 설정과 대조해 어느 사이트를 보여줄지 결정하므로 CNAME과 저장소의 도메인 설정이 모두 필요합니다.

처음에는 `There isn't a GitHub Pages site here.`라는 404 화면이 나왔습니다. 도메인 요청은 GitHub에 도달했지만 사이트 연결은 아직 끝나지 않았습니다. Custom domain을 저장한 뒤 DNS 검사 결과를 확인했습니다.

GitHub는 DNS를 변경하기 전에 저장소에 맞춤 도메인을 등록하도록 안내합니다. GitHub Actions로 배포하는 경우 별도의 `CNAME` 파일은 필요하지 않습니다. [GitHub 공식 안내](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain)

## 2. Quartz의 baseUrl 수정하기

DNS와 별개로 Quartz 설정도 새 주소에 맞춰 변경했습니다. `quartz.config.ts`의 기존 값은 다음과 같았습니다.

```ts
baseUrl: "oh-research.github.io/blog",
```

새 도메인으로 바꿨습니다.

```ts
baseUrl: "blog.ohsemin.com",
```

여기에도 `https://`와 `/blog`를 붙이지 않습니다. 새 도메인에서는 블로그가 루트 경로에 놓이기 때문입니다. `baseUrl`은 사이트맵과 RSS 등에서 사용할 사이트 주소를 지정합니다.

제 운영 환경에서는 `blog-deploy`가 콘텐츠 변경만 자동으로 커밋하므로 설정 파일은 저장소 루트에서 별도로 커밋하고 푸시해야 했습니다.

```bash
git add quartz.config.ts
git commit -m "Use blog.ohsemin.com as site URL"
git push
```

이후 GitHub Actions의 배포 성공을 확인합니다. Pages 설정에서 DNS 검사가 통과하고 인증서 준비가 끝나면 **Enforce HTTPS**도 켭니다.

## 3. 홈페이지는 열리는데 HTTPS에 빨간 줄이 표시됐다

블로그와 달리 `ohsemin.com`은 가비아의 포워딩 서비스로 Google Sites에 연결해 두었습니다. 그런데 접속할 때 주소창의 HTTPS에 빨간 줄이 표시됐습니다.

응답을 확인해 보니 인증서 오류가 나왔습니다.

```text
SSL: no alternative certificate subject name matches target host name 'ohsemin.com'
```

접속한 서버의 인증서에 `ohsemin.com`이 빠져 있었습니다. 가비아 공식 안내를 찾아보니 포워딩과 파킹 서비스는 HTTPS 연결을 지원하지 않았습니다. [가비아 안내](https://customer.gabia.com/faq/detail/959/6128)

목적지인 Google Sites가 HTTPS를 지원하는 것만으로는 해결되지 않습니다. 브라우저는 먼저 `https://ohsemin.com`과 안전한 연결을 맺어야 그 서버가 보내는 이동 응답을 받을 수 있기 때문입니다.

```text
브라우저
  → ohsemin.com과 HTTPS 연결
  → 홈페이지로 이동하라는 응답 수신
  → Google Sites 접속
```

첫 단계에서 문제가 생긴 터라 `ohsemin.com`의 HTTPS 연결과 리디렉션을 Cloudflare에서 처리하도록 바꿨습니다.

## 4. Cloudflare 무료 플랜에 도메인 추가하기

Cloudflare에 `ohsemin.com`을 추가하고 **Free** 플랜을 선택했습니다. 이 작업에 필요한 DNS 관리, Universal SSL 인증서, 리디렉션 기능은 무료 플랜에서 사용할 수 있습니다. [요금 안내](https://www.cloudflare.com/plans/), [리디렉션 지원 범위](https://developers.cloudflare.com/rules/url-forwarding/)

도메인 등록은 가비아에 그대로 두었습니다. 구입과 갱신도 계속 가비아에서 관리하고 DNS를 맡는 네임서버만 Cloudflare로 바꿨습니다.

Cloudflare가 기존 레코드를 검색해 가져오면 아래 세 레코드를 설정합니다.

| 타입 | 이름 | 값 | 프록시 상태 |
|---|---|---|---|
| A | `@` | `192.0.2.1` | Proxied, 주황 구름 |
| A | `www` | `192.0.2.1` | Proxied, 주황 구름 |
| CNAME | `blog` | `oh-research.github.io` | DNS only, 회색 구름 |

![Cloudflare에서 루트와 www는 Proxied, blog는 DNS only로 설정한 DNS 레코드](01-dns-records.jpg)

*Cloudflare의 실제 DNS 설정 화면. 맨 위 `*`는 기존 설정에서 가져온 레코드입니다. 홈페이지와 블로그 연결에는 아래 세 레코드를 사용했습니다.*

`192.0.2.1`은 Google Sites의 IP 주소가 아니라 Cloudflare가 원본 서버 없이 리디렉션을 처리할 때 안내하는 예시 주소입니다. Cloudflare는 루트와 `www` 요청을 받아 뒤에서 설정할 규칙에 따라 홈페이지로 보냅니다. A 레코드에 더해 리디렉션 규칙까지 설정해야 홈페이지가 연결됩니다. [Cloudflare 공식 예시](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/)

블로그는 GitHub Pages가 직접 HTTPS를 처리하도록 **DNS only**로 두었습니다. 메일이나 도메인 소유권 인증용 레코드가 있다면 네임서버 변경 전에 함께 옮겨야 합니다.

## 5. Google Sites로 보내는 리디렉션 규칙

Cloudflare의 **Rules → Overview → Create rule → Redirect Rule**에서 규칙을 만들었습니다.

| 항목 | 설정값 |
|---|---|
| Rule name | `Google Sites homepage` |
| 조건 방식 | Custom filter expression |
| 리디렉션 Type | Static |
| URL | `https://sites.google.com/view/seminoh` |
| Status code | 301 — Permanent Redirect |
| Preserve query string | 끔 |

**Edit expression**에서 조건식을 다음과 같이 입력합니다.

```text
(http.host eq "ohsemin.com") or (http.host eq "www.ohsemin.com")
```

이 조건에 해당하는 주소는 루트와 `www`뿐입니다. `blog.ohsemin.com`은 제외됩니다. 목적지 뒤에 경로를 이어 붙이지 않고 지정한 Google Sites 홈페이지 URL로 보냅니다.

![루트와 www를 Google Sites로 보내는 조건식과 Static 301 리디렉션 설정](02-redirect-settings.jpg)

*두 호스트 이름만 조건에 넣고, Google Sites의 공개 URL을 목적지로 지정했습니다.*

**Deploy**를 누른 뒤 목록에서 규칙의 **Active** 상태를 확인했습니다. 같은 작업을 한다면 이 규칙까지 준비해 두고 기존 포워딩 해지와 네임서버 변경을 진행하면 됩니다.

![Google Sites homepage 리디렉션 규칙이 1 active로 표시된 목록](03-redirect-active.jpg)

*규칙 목록에 등록된 `Google Sites homepage`. `1 active`로 활성화 상태를 확인했습니다.*

## 6. 가비아에서 네임서버를 바꾸다가 막힌 이유

가비아에서 네임서버를 변경하려고 하자 다음 메시지가 나왔습니다.

```text
네임서버 변경이 불가능한 도메인입니다. (사유: 포워딩 이용 도메인)
```

가비아 포워딩은 가비아 네임서버를 사용하는 서비스여서, 기존 포워딩을 먼저 해지해야 했습니다.

**My가비아 → 서비스 관리 → DNS 관리툴 → ohsemin.com → 포워딩 설정**에서 **해지**를 눌렀습니다. 해지 대상은 Google Sites로 보내던 포워딩 부가서비스이고 도메인 등록은 유지됩니다. [가비아 포워딩 해지 안내](https://customer.gabia.com/manual/31/287/1400)

그다음 도메인 관리의 **네임서버/DNS호스트/DNSSEC → 네임서버 설정**에서 기존 가비아 네임서버를 지우고 Cloudflare가 지정한 두 주소를 입력했습니다.

제 도메인에는 아래 두 주소가 배정됐습니다.

```text
love.ns.cloudflare.com
west.ns.cloudflare.com
```

다른 도메인을 설정할 때는 이 값을 복사하지 말고 **자신의 Cloudflare 화면에 배정된 네임서버**를 사용해야 합니다.

가비아의 도메인 안전잠금도 걸려 있어 잠금 해제에 동의하고 본인 인증을 거쳤습니다. 변경 후에는 두 Cloudflare 네임서버가 표시되는지 확인합니다. 안전잠금도 다시 확인합니다.

기존 포워딩을 해지한 시점부터 Cloudflare 활성화와 리디렉션 적용이 끝날 때까지는 홈페이지 이동이 잠시 중단될 수 있습니다.

## 7. Pending과 이메일 경고 구분하기

Cloudflare DNS 화면에 처음 뜬 노란 안내는 **Pending**이었습니다. Cloudflare가 아직 네임서버 변경을 확인하지 못한 상태로, 변경 후 Overview에서 확인을 요청하고 활성화될 때까지 기다립니다.

같은 화면에 나온 `Email cannot reach @ohsemin.com addresses…`는 도메인의 메일 수신·발신 인증 레코드를 안내하는 문구입니다. 홈페이지 리디렉션 오류와는 별개이며 이번에는 도메인 이메일을 설정하지 않았습니다.

Cloudflare가 활성화되면 **SSL/TLS → Edge Certificates**에서 Universal SSL 인증서 상태도 확인합니다. 도메인 활성화 여부와 인증서 발급이 끝났는지는 따로 살펴보는 편이 좋습니다.

![ohsemin.com과 하위 도메인을 포함하는 Universal SSL 인증서의 Active 상태](04-universal-ssl.jpg)

*`ohsemin.com`과 `*.ohsemin.com`을 포함한 Universal 인증서의 Active 상태. 블로그는 DNS only로 두었으므로 블로그의 HTTPS 연결은 GitHub Pages가 처리합니다.*

## 8. 최종 동작 확인

설정을 끝낸 뒤 인증서 검증을 끄지 않고 HTTPS 응답을 확인했습니다.

```bash
curl -I https://ohsemin.com
curl -I https://www.ohsemin.com
curl -I https://blog.ohsemin.com
```

루트와 `www`에서는 다음 응답을 받았습니다.

```text
HTTP/2 301
location: https://sites.google.com/view/seminoh
server: cloudflare
```

블로그에서는 GitHub Pages의 정상 응답을 받았습니다.

```text
HTTP/2 200
server: GitHub.com
```

처음에 발생했던 인증서 이름 불일치 오류도 더 이상 나오지 않았습니다.

![ohsemin.com 접속 후 이동한 Google Sites 홈페이지 상단](05-google-sites-homepage.jpg)

*`https://ohsemin.com`으로 접속한 뒤 도착한 Google Sites 홈페이지의 상단 화면입니다. 이동 후 주소는 Google Sites의 공개 URL로 바뀝니다.*

![blog.ohsemin.com에서 정상적으로 표시되는 Quartz 블로그](06-quartz-blog.jpg)

*`https://blog.ohsemin.com`에서는 Quartz 블로그가 표시됩니다. 홈페이지 리디렉션 규칙은 이 주소에 적용되지 않습니다.*

설정을 마치고 나니 가비아는 도메인 등록·갱신을 맡고 Cloudflare는 DNS와 홈페이지 HTTPS 리디렉션을 처리하게 됐습니다. 홈페이지는 Google Sites에, 블로그는 GitHub Pages에 두었습니다. 도메인 하나를 사용하더라도 홈페이지와 블로그는 연결 방식뿐 아니라 HTTPS를 처리할 곳도 각각 설정해야 한다는 걸 이번 작업에서 배웠습니다.
