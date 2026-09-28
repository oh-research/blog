---
title: 터미널에서 파일·폴더별 용량 확인하기
tags:
  - macos
  - terminal
  - du
  - df
  - disk-usage
created: 2026-09-28 10:40
updated: 2026-09-28 10:40
---

> [!abstract] 한 줄 요약
> 터미널의 `df`는 디스크가 99%라는데 설정 앱은 266GB가 남았다고 해서, `df`·`du`·`find`로 무거운 폴더를 찾는 순서를 다시 정리하고 두 숫자가 갈리는 이유(purgeable 공간, 시스템·데이터 볼륨 분리, Dropbox 클라우드 파일)를 Apple·Dropbox 문서로 확인한 기록입니다.

## 개요

터미널에서 `df`를 쳤더니 926GB 중 16GB만 남은 99%로 나왔습니다. 그런데 시스템 설정 → 일반 → 저장 공간에는 994.61GB 중 727.97GB 사용, **266.64GB 남음**으로 표시됩니다. 같은 디스크인데 한쪽은 거의 찼다고 하고 한쪽은 넉넉하다고 합니다.

설정 앱의 저장 공간 화면은 문서·응용 프로그램·시스템 데이터처럼 항목이 뭉뚱그려져 있어 어느 폴더가 무거운지 바로 보이지 않습니다. 터미널에서 폴더별로 내려가며 확인하는 편이 빨라서 이때 쓰는 명령을 순서대로 남겨 둡니다. 전체 → 홈 폴더 하위 → 특정 폴더 안 → 큰 파일 하나 순서로 좁혀 가는 흐름입니다. 두 숫자가 왜 다른지는 마지막에 따로 정리합니다.

## 1. 디스크 전체 여유 확인 — `df`

```bash
df -h ~
```

```
Filesystem      Size    Used   Avail Capacity  Mounted on
/dev/disk3s5   926Gi   887Gi    16Gi    99%    /System/Volumes/Data
```

`-h`는 사람이 읽기 좋은 단위(K·M·G)로 보여 줍니다.

습관대로 `df -h /`를 치면 사용량이 12GB로 나옵니다.

```
Filesystem        Size    Used   Avail Capacity  Mounted on
/dev/disk3s1s1   926Gi    12Gi    16Gi    43%    /
```

macOS Catalina부터 시스템은 읽기 전용 볼륨 `Macintosh HD`에, 사용자 파일은 별도 볼륨 `Macintosh HD - Data`에 저장됩니다. Finder에서는 둘이 하나의 `Macintosh HD`로 보이지만 터미널에서는 `/`와 `/System/Volumes/Data`로 갈립니다. 그래서 `df -h /`에는 OS 파일 12Gi만 잡힙니다. 두 볼륨이 같은 APFS 컨테이너를 공유해 `Avail`은 똑같이 16Gi로 나오지만 `Used`가 다릅니다. 인자를 `/` 대신 `~`로 주거나 `df -h` 전체 출력에서 `/System/Volumes/Data` 줄을 봅니다.

## 2. 폴더별 합계 — `du`

제일 자주 쓰는 형태입니다.

```bash
du -sh ~/Documents/blog/blog/* | sort -hr | head
```

```
352M	/Users/osmfirst/Documents/blog/blog/node_modules
 37M	/Users/osmfirst/Documents/blog/blog/quartz
3.8M	/Users/osmfirst/Documents/blog/blog/public
1.1M	/Users/osmfirst/Documents/blog/blog/content
280K	/Users/osmfirst/Documents/blog/blog/package-lock.json
```

- `-s`: 하위를 재귀로 나열하지 않고 항목당 합계 한 줄만
- `-h`: 읽기 좋은 단위
- `sort -hr`: 그 단위(K·M·G)를 이해하고 큰 순서로 정렬. `-n`으로 정렬하면 `352M`이 `1.1G`보다 크게 잡히니 `-h`를 씁니다.

`*`는 셸이 펼치기 때문에 `.git`처럼 점으로 시작하는 폴더는 빠집니다. 숨김 폴더까지 포함하려면 `-d 1`(깊이 1)로 폴더 자체를 넘깁니다.

```bash
du -d 1 -h ~/Documents/blog/blog | sort -hr | head -5
```

```
432M	/Users/osmfirst/Documents/blog/blog
352M	/Users/osmfirst/Documents/blog/blog/node_modules
 39M	/Users/osmfirst/Documents/blog/blog/.git
 37M	/Users/osmfirst/Documents/blog/blog/quartz
3.8M	/Users/osmfirst/Documents/blog/blog/public
```

`*` 방식에서는 보이지 않던 `.git` 39M이 잡혔습니다. 첫 줄은 폴더 자체의 합계입니다.

홈 폴더 전체를 훑을 때는 이 형태를 그대로 쓰되, 작은 항목을 걸러 내려면 `-t`로 하한을 둡니다.

```bash
du -h -d 1 -t 100M ~ | sort -hr
```

```
785G	/Users/osmfirst
320G	/Users/osmfirst/Library
228G	/Users/osmfirst/Documents
 89G	/Users/osmfirst/Desktop
 62G	/Users/osmfirst/Parallels
 21G	/Users/osmfirst/.lmstudio
 19G	/Users/osmfirst/Downloads
 16G	/Users/osmfirst/.Trash
```

`~/Library`가 320G로 가장 컸고, 그 안의 `CloudStorage/Dropbox`가 224G였습니다. `.Trash`가 16G인 것도 여기서 알았습니다. 휴지통은 비우기 전까지 그대로 디스크를 점유합니다.

특정 폴더를 합계에서 빼려면 `-I`를 씁니다.

```bash
du -sh -I node_modules ~/Documents/blog/blog   # 81M
```

> [!note]
> `ls -lh`로 폴더를 보면 크기가 `11744` 같은 작은 숫자로 나옵니다. 폴더 안 내용물이 아니라 폴더 항목 자체의 크기입니다. 폴더 용량은 `du`로 봅니다.

## 3. 큰 파일 하나를 찾기 — `find`

폴더 합계로 범위를 좁힌 뒤에는 그 안에서 큰 파일을 직접 찾습니다.

```bash
find ~/Documents/blog/blog -type f -size +1M -not -path '*/node_modules/*' -exec ls -lh {} + | awk '{print $5, $9}'
```

```
37M /Users/osmfirst/Documents/blog/blog/.git/objects/pack/pack-7801091c….pack
16M /Users/osmfirst/Documents/blog/blog/quartz/.quartz-cache/transpiled-build.mjs
15M /Users/osmfirst/Documents/blog/blog/quartz/util/emojimap.json
2.7M /Users/osmfirst/Documents/blog/blog/quartz/.quartz-cache/fonts/IBM+Plex+Sans+KR-400
```

- `-size +1M`: 1MB 초과. 단위는 `k`·`M`·`G`
- `-not -path '*/node_modules/*'`: 뻔히 큰 곳은 제외
- `-exec ls -lh {} +`: 찾은 파일을 `ls`에 한꺼번에 넘겨 크기를 붙임

홈 폴더 전체를 대상으로 `find ~ -size +2G`를 돌렸더니 3분이 지나도 끝나지 않았습니다. Dropbox 폴더를 제외해도 Library 아래 파일 수가 많아 오래 걸립니다. 홈 전체보다는 `du`로 좁힌 폴더에만 `find`를 거는 쪽이 낫습니다.

## 4. Dropbox 폴더는 왜 명령마다 다르게 나오는가

Dropbox 폴더를 `du`로 잰 값과 옵션을 하나 바꾼 값이 달랐습니다.

```bash
du -sh ~/Library/CloudStorage/Dropbox      # 224G
du -sh -A ~/Library/CloudStorage/Dropbox   # 243G
```

`du`는 기본적으로 파일이 디스크에서 실제로 차지하는 블록 수를 셉니다. `-A`는 apparent size, 즉 파일 시스템이 보고하는 파일 길이를 씁니다. `man du`는 압축 볼륨이나 희소 파일에서 이 옵션이 유용하다고 적고 있습니다. 클라우드에서 아직 내려받지 않은 파일도 같은 경우입니다.

Dropbox는 macOS 12.5부터 Apple의 File Provider API 위에서 동작하고 폴더가 `~/Library/CloudStorage/`로 옮겨졌습니다. Dropbox 문서에 따르면 **오프라인 사용으로 지정한 파일만 디스크를 점유하는 것으로 표시되고**, 지정하지 않은 파일은 디스크가 부족해지면 자동으로 online-only로 바뀝니다. 그래서 로컬 점유량은 `-A` 없는 224G 쪽이고, 243G는 클라우드에만 있는 분량까지 더한 값입니다. 디스크를 비우는 게 목적이면 기본값을 봅니다.

## 5. `du` 종류 확인

이 맥에는 Homebrew로 설치한 `gdu`가 있어서 처음엔 TUI 도구 gdu인 줄 알았습니다.

```bash
gdu --version
```

```
du (GNU coreutils) 9.11
```

coreutils 패키지가 GNU `du`를 `gdu`라는 이름으로 넣어 둔 것이었습니다. macOS 기본 `du`는 BSD 계열이라 `--max-depth` 대신 `-d`, `--apparent-size` 대신 `-A`를 씁니다. 위에 적은 명령은 전부 BSD `du` 기준입니다. 리눅스 문서를 보고 `--max-depth=1`을 치면 macOS 기본 `du`는 `unrecognized option`으로 거부합니다.

## 6. 설정 앱은 왜 266GB가 남았다고 하는가

`df`는 99%인데 설정 앱은 266.64GB가 남았다고 합니다. 이 차이는 Apple이 문서에 정의해 둔 두 용어에서 옵니다.

- **Free(빈 공간)** — 디스크에서 물리적으로 비어 있는 공간
- **Available(사용 가능)** — 빈 공간 + **purgeable(삭제 가능) 공간**. macOS가 필요할 때 스스로 지울 수 있는 캐시 등입니다. 사용자가 직접 지울 수는 없고 공간이 필요해지면 OS가 지웁니다.

Apple 문서는 "디스크 공간이 사용 중이면서 동시에 사용 가능일 수 있다"고 적고 있습니다. 설정 앱의 266GB는 Available이고 `df`의 16Gi는 Free입니다.

이 맥에서 숫자를 맞춰 봤습니다.

```bash
diskutil info /System/Volumes/Data | grep 'Container Free'
```

```
   Container Free Space:      17.0 GB (16992944128 Bytes)
```

Finder의 Get Info가 보고하는 Available은 266.4GB였습니다. 차이 **249.4GB가 purgeable**입니다. 디스크 유틸리티 앱에서 Data 볼륨을 고르면 "사용 가능" 옆 괄호 안에 이 값이 직접 표시됩니다.

purgeable에 무엇이 들어 있는지는 macOS가 파일 단위로 보여 주지 않습니다. 위 Dropbox 문서대로라면 오프라인 지정을 안 한 Dropbox 파일 224G가 디스크 부족 시 online-only로 전환되는 후보이고, 휴지통 16G도 설정 앱이 자동 비우기 대상으로 다루니 여기 포함될 것으로 봅니다. 다만 이 구성은 두 숫자가 비슷하다는 데서 나온 추정이고 확인할 방법은 없었습니다. 로컬 Time Machine 스냅샷은 `tmutil listlocalsnapshots /`로 확인하니 없었습니다.

정리하면, 큰 파일을 복사하거나 설치할 때 실패 여부를 가르는 건 Free 쪽입니다. 다만 OS가 purgeable을 지워 가며 공간을 만들기 때문에 17GB보다 큰 작업도 성공할 수 있습니다. 어느 쪽이든 지금 디스크에 진짜 비어 있는 공간은 17GB입니다.

## 정리

`df -h ~`로 여유를 보고 `du -h -d 1 -t 100M <폴더> | sort -hr`로 한 단계씩 내려가며 무거운 폴더를 찾은 뒤 마지막에 `find -size`로 파일을 짚는 순서로 쓰기로 했습니다. macOS에서는 `df -h /`가 시스템 볼륨만 보여 줘서 `~`를 인자로 주는 쪽을 씁니다. Dropbox 같은 클라우드 폴더는 `du` 기본값이 로컬 점유량이고 `-A`는 클라우드 쪽 크기까지 더한 값입니다.

`df`의 99%와 설정 앱의 266GB는 둘 다 맞는 숫자였습니다. `df`는 물리적으로 빈 공간(Free)이고 설정 앱은 거기에 OS가 알아서 지울 수 있는 purgeable 249GB를 더한 값(Available)입니다. 이번에 진짜 원인은 `~/Documents` 안 연구 데이터 169G와 휴지통 16G였습니다. 정리는 따로 합니다.

## 참고

- `man du`, `man df`, `man find` — macOS 기본(BSD) 버전 기준. `-A`, `-d`, `-I`, `-t` 옵션과 "`-A`는 압축 볼륨·희소 파일에서 유용하다"는 설명은 여기 나옵니다
- [About the read-only system volume in macOS Catalina or later](https://support.apple.com/en-us/HT210650) — Apple. 시스템 볼륨 `Macintosh HD`와 데이터 볼륨 `Macintosh HD - Data`의 분리
- [See used and available storage space on your Mac](https://support.apple.com/guide/system-information/see-available-storage-space-syspf9b375b9/11.0/mac/12.0) — Apple. "Free storage space is physically open space on a disk. Available storage space includes free storage space and purgeable disk caches (disk space might be both available and used at the same time)."
- [Get detailed information about a disk in Disk Utility on Mac](https://support.apple.com/guide/disk-utility/dskutl1005/mac) — Apple. purgeable 정의: "space that macOS can free up when needed by removing files from your computer (you can't manually remove the files that are designated purgeable, but macOS removes them as space is required)"
- [Expected changes with Dropbox on File Provider](https://help.dropbox.com/installs/macos-support-for-expected-changes) — Dropbox. 폴더가 `~/Library/CloudStorage/`로 이동, "Only files that are marked available offline will display as occupying disk space", 디스크 부족 시 online-only 자동 전환
- [Dropbox support for macOS on File Provider](https://help.dropbox.com/installs/dropbox-for-macos-support) — Dropbox. macOS 12.5 이상에서 File Provider API 사용
- Homebrew `coreutils` 패키지 — GNU 도구를 `g` 접두사로 설치하는 방식은 `brew info coreutils`에서 확인
