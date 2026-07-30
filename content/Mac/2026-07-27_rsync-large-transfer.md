---
title: rsync로 대용량 폴더 안전하게 옮기기
tags:
  - macos
  - rsync
  - scp
  - ssh
  - byobu
  - file-transfer
created: 2026-07-27 01:06
updated: 2026-07-27 01:22
---

> [!abstract] 한 줄 요약
> 164GB짜리 폴더를 원격 맥에서 로컬로 받으면서 scp 대신 rsync를 택한 이유와, 끝 슬래시·이어받기·세션 유지처럼 중간에 걸린 함정들을 순서대로 정리한 기록입니다.

## 개요

원격 맥에 있는 164GB 폴더를 로컬로 통째로 받을 일이 생겼습니다. 처음에는 익숙한 scp로 시작했다가 중간에 rsync로 갈아탔습니다. 그 과정에서 슬래시 하나로 파일이 엉뚱한 곳에 쏟아질 뻔했고, 며칠 걸릴 작업을 SSH 세션 안에서 그냥 돌리면 안 된다는 것도 다시 확인했습니다.

접속 환경 자체를 잡는 이야기는 [[2026-07-23_macos-ssh-setup|SSH 접속 환경 구축하기]]에 따로 적어 뒀습니다. 이 글은 그 위에서 실제로 파일을 옮기는 단계입니다.

> [!note]
> 아래 나오는 호스트명·경로·계정명은 모두 예시입니다.

## 1. scp와 rsync 중 무엇을 쓸까

scp도 폴더를 받을 수 있습니다. `-r` 하나면 됩니다.

```bash
scp -r user@host:/remote/path/dir /local/path/
```

문제는 끊겼을 때입니다. scp에는 이어받기가 없습니다. 100GB를 받다가 95GB에서 연결이 끊기면 처음부터 다시입니다.

| 항목 | scp | rsync |
|---|---|---|
| 이어받기 | ❌ | ✅ `--partial` |
| 변경분만 전송 | ❌ | ✅ delta-transfer |
| 진행률 표시 | 제한적 | ✅ `--progress` |
| 제외 규칙 | ❌ | ✅ `--exclude` |
| 대역폭 제한 | `-l` | ✅ `--bwlimit` |
| 원격 설치 필요 | 불필요 | 양쪽 모두 필요 |

파일 한두 개면 scp, 그 외에는 rsync 쪽으로 갈랐습니다. 용량이 크거나 같은 경로를 반복해서 동기화할 일이면 특히 그렇습니다.

scp가 여전히 나은 경우가 하나 남습니다. 원격에 rsync가 없을 때입니다. scp는 OpenSSH만 있으면 돌아갑니다.

## 2. 가장 헷갈리는 것: 끝 슬래시

rsync를 처음 쓸 때 십중팔구 여기서 사고가 납니다.

- **소스 끝에 슬래시 있음** → 그 폴더의 **내용물**을 보냅니다
- **소스 끝에 슬래시 없음** → 그 폴더 **자체**를 보냅니다
- **목적지 슬래시** → 아무 의미가 없습니다

예시로 보면 명확합니다.

```bash
# case A: creates ~/Documents/dir/
rsync -av user@host:Documents/dir ~/Documents/

# case B: dumps contents directly into ~/Documents/
rsync -av user@host:Documents/dir/ ~/Documents/
```

| 소스 | 목적지 | 결과 |
|---|---|---|
| `Documents/dir` | `~/Documents/` | `~/Documents/dir/파일들` |
| `Documents/dir/` | `~/Documents/` | `~/Documents/파일들` |
| `Documents/dir/` | `~/Documents/dir/` | `~/Documents/dir/파일들` |

슬래시 하나 잘못 붙이면 164GB가 홈 디렉터리에 그대로 쏟아집니다. 정리하는 데만 한나절입니다.

## 3. 실행 전에 dry run

`-n`(= `--dry-run`)을 붙이면 실제로 전송하지 않고 목록만 보여 줍니다.

```bash
rsync -avn user@host:Documents/dir ~/Documents/ | head -20
```

출력 첫 줄에 `dir/`이 찍히면 폴더째로 오는 것이 맞습니다. 파일 이름이 바로 나오면 슬래시를 잘못 붙인 것입니다.

대용량 작업일수록 이 30초가 아깝지 않습니다.

## 4. 기본 명령어

```bash
rsync -avP user@host:Documents/dir ~/Documents/
```

옵션 뜻은 이렇습니다.

- `-a` (archive) — 권한, 타임스탬프, 심볼릭 링크 보존 + 재귀
- `-v` (verbose) — 진행 상황 출력
- `-P` — `--partial` + `--progress`. 이어받기와 진행률을 한 번에

### 압축(`-z`)은 데이터에 따라

- 텍스트, 로그, 소스코드 → 켜면 이득입니다
- mp4, jpg, zip, 이미 압축된 백업 → 끄는 쪽이 낫습니다. CPU만 먹고 오히려 느려집니다

### 포트나 키 지정

```bash
rsync -avP -e "ssh -p 2222 -i ~/.ssh/id_rsa" \
  user@host:Documents/dir ~/Documents/
```

`~/.ssh/config`에 미리 등록해 두면 훨씬 편합니다.

```
Host remote
    HostName 192.168.0.10
    User 사용자명
    Port 22
```

`Host`는 내가 부를 별칭이고, `HostName`이 실제로 찾아가는 주소입니다. 여기 무엇을 넣을지는 접속 경로에 따라 갈립니다.

| `HostName` 값 | 쓰는 상황 |
|---|---|
| `192.168.0.10` — 내부 IP | 같은 공유기 아래 |
| `desktop.local` — mDNS 이름 | 같은 공유기 아래. IP가 바뀌어도 따라감 |
| `example.ddns.net` — DDNS 주소 | 외부망. 공유기 포트포워딩 필요 |

내부 IP는 원격 맥에서 `ipconfig getifaddr en0`으로 확인합니다. `Port`는 22면 기본값이라 적지 않아도 됩니다.

며칠 걸리는 전송이라면 내부 IP를 그대로 박아 두는 것은 권하지 않습니다. DHCP 임대가 만료되면서 다른 주소를 받으면 그 시점부터 재접속이 막힙니다. 공유기에서 MAC 주소 기반으로 고정 할당해 두거나, 위 표의 `.local` 호스트네임을 쓰는 쪽이 안전합니다.

이렇게 등록해 두면 명령이 짧아집니다.

```bash
rsync -avP remote:Documents/dir ~/Documents/
```

## 5. `--partial-dir`은 필요한가

`-P`에 이미 `--partial`이 들어 있어서 이어받기 자체는 그것만으로 됩니다. 차이는 미완성 파일을 어디에 두느냐입니다.

| 옵션 | 미완성 파일 위치 |
|---|---|
| `--partial` (`-P`에 포함) | 목적지에 최종 파일명 그대로 남음 |
| `--partial-dir=.rsync-partial` | 별도 숨김 디렉터리에 격리 |

`--partial`만 쓰면 잘린 파일이 완성본과 똑같은 이름으로 놓입니다. 다시 돌리면 rsync가 알아서 이어받지만, 그 사이 다른 스크립트나 사람이 보면 완성된 줄 착각할 수 있습니다.

```bash
rsync -avP --partial-dir=.rsync-partial \
  user@host:Documents/dir ~/Documents/
```

판단 기준은 이렇게 잡았습니다.

- 파일 하나하나가 수 GB → 쓰는 쪽을 권합니다
- 작은 파일 위주에 혼자 쓰는 디렉터리 → `-avP`만으로 충분합니다

알아 둘 점이 몇 가지 있습니다.

- `--partial-dir`은 `--partial`을 자동으로 포함합니다
- 상대 경로로 주면 그 디렉터리가 전송 대상에서 자동 제외됩니다. 절대 경로면 직접 `--exclude` 해야 합니다
- 정상 완료되면 지워지지만 중간에 죽으면 남습니다. 끝나고 한 번 확인합니다
- 매번 치기 귀찮으면 `export RSYNC_PARTIAL_DIR=.rsync-partial`

## 6. 세션이 끊겨도 살아남게

SSH 연결이 끊기면 rsync 프로세스도 같이 죽습니다. 며칠 걸릴 작업이라면 터미널 멀티플렉서 안에서 돌립니다.

### byobu 기준

```bash
byobu new -s transfer

# inside session
rsync -avP user@host:Documents/dir ~/Documents/
```

- 분리: `F6` (또는 `Ctrl+a` 후 `d`)
- 목록: `byobu list-sessions`
- 재접속: `byobu attach -t transfer`
- 새 창: `F2` — 다른 창에서 `df -h`나 `iftop`으로 모니터링
- 스크롤백: `F7` (`q`로 나옴)

byobu는 tmux 위에 얹힌 래퍼라 명령이 그대로 백엔드로 전달됩니다. tmux를 쓴다면 `tmux new -s transfer` / `Ctrl+b, d` / `tmux a -t transfer`로 대응됩니다.

> [!warning]
> `Ctrl+a`를 처음 누르면 Emacs 모드와 Screen 모드 중 무엇을 쓸지 물어봅니다. 셸에서 `Ctrl+a`(줄 맨 앞으로)를 자주 쓴다면 Emacs 모드를 고르고 F-키 위주로 조작하는 쪽이 편합니다.

### 자동 재시도

```bash
until rsync -avP --partial-dir=.rsync-partial \
  user@host:Documents/dir ~/Documents/; do
  echo "retrying in 10s..."
  sleep 10
done
```

## 7. 시작 전 체크리스트

```bash
# 1. actual source size and file count
ssh user@host "du -sh Documents/dir; find Documents/dir -type f | wc -l"

# 2. local free space
df -h ~/Documents
```

164GB인데 여유가 170GB면 빠듯합니다. 최소 10% 여유는 두는 편이 좋습니다.

파일 개수도 중요합니다. 수십만 개 작은 파일이면 rsync가 파일 리스트를 만드는 단계에서만 수십 분이 걸리고 메모리도 꽤 씁니다. 이런 경우엔 tar 스트리밍이 더 빠를 수 있습니다.

```bash
ssh user@host "tar czf - -C /remote/parent dir" | tar xzf - -C /local/parent
```

다만 이어받기가 안 됩니다. 회선이 안정적일 때만 쓸 수 있는 방법입니다.

## 8. 원격이 macOS라면

원격이 맥이면 챙길 것이 몇 가지 더 있습니다.

### rsync 버전 확인

애플은 오랫동안 rsync 2.6.9(2006년판)를 번들해 왔고, macOS 15 Sequoia부터는 openrsync로 대체됐습니다. 둘 다 GNU rsync 3.x보다 옵션 지원이 부족해서 `--info=progress2` 같은 것은 안 먹힐 수 있습니다.

```bash
ssh user@host "rsync --version | head -1"
```

구버전이면 Homebrew로 최신 rsync를 깔고 경로를 지정하면 됩니다.

```bash
rsync -avP --rsync-path=/opt/homebrew/bin/rsync \
  user@host:Documents/dir ~/Documents/
```

### 절전 모드 막기

전송 도중 원격 맥이 잠들면 연결이 끊깁니다.

```bash
caffeinate -dims
```

이건 전송이 도는 byobu 세션 안에서 같이 띄우는 쪽이 안전합니다. `ssh user@host "caffeinate -dims &"`처럼 일회성 명령으로 백그라운드에 던지면 ssh가 빠져나갈 때 함께 정리되어 버리는 경우가 있습니다. 아예 시스템 설정 → 에너지 절약에서 자동 잠자기를 꺼 두는 방법도 있습니다.

### 잡파일 제외

```bash
--exclude='.DS_Store' --exclude='._*' --exclude='.Spotlight-V100'
```

## 9. 전송 후 검증

전송이 끝나면 한 번 더 rsync를 돌려 봅니다. 차이 나는 파일만 잡아 줍니다.

```bash
rsync -avn user@host:Documents/dir ~/Documents/
```

출력이 비어 있으면 완료입니다. 더 확실히 하려면 체크섬 비교를 씁니다.

```bash
rsync -avn -c user@host:Documents/dir ~/Documents/
```

`-c`는 양쪽 전체를 읽어야 해서 164GB면 시간이 꽤 걸립니다. 급하지 않을 때만 돌립니다.

## 10. 최종 명령어

```bash
# 1. check size and space
ssh remote "du -sh Documents/dir"
df -h ~/Documents

# 2. dry run
rsync -avn remote:Documents/dir ~/Documents/ | head -20

# 3. start in a detachable session
byobu new -s transfer
rsync -avP --partial-dir=.rsync-partial remote:Documents/dir ~/Documents/

# 4. detach with F6, reattach with: byobu attach -t transfer

# 5. verify
rsync -avn remote:Documents/dir ~/Documents/
```

## 자주 쓰는 옵션 요약

| 옵션 | 설명 |
|---|---|
| `-a` | archive 모드 (재귀 + 속성 보존) |
| `-v` | 상세 출력 |
| `-P` | `--partial` + `--progress` |
| `-z` | 전송 중 압축 (이미 압축된 파일엔 비권장) |
| `-n` | dry run |
| `-c` | 체크섬으로 비교 |
| `-e` | 원격 셸 지정 (`-e "ssh -p 2222"`) |
| `--partial-dir` | 미완성 파일 격리 |
| `--exclude` | 패턴 제외 |
| `--delete` | 소스에 없는 파일을 목적지에서 삭제 (⚠️ 주의) |
| `--bwlimit` | 대역폭 제한 (KB/s) |
| `--rsync-path` | 원격 rsync 실행 파일 경로 지정 |

`--delete`는 특히 조심합니다. 슬래시 실수와 겹치면 엉뚱한 디렉터리를 비워 버릴 수 있습니다. 반드시 `-n`으로 먼저 확인합니다.

## 정리

scp로 시작했다가 이어받기가 없다는 이유 하나로 rsync로 넘어왔습니다. 실제로 쓰는 명령은 `rsync -avP` 한 줄이고, 여기에 대용량이라 `--partial-dir`을 얹었습니다. 미완성 파일이 완성본과 같은 이름으로 놓이는 게 신경 쓰였습니다.

가장 조심한 것은 끝 슬래시였습니다. 소스 끝 슬래시 하나가 "폴더째"와 "내용물만"을 가르고, 여기에 `--delete`가 겹치면 손쓸 방법이 없습니다. 그래서 매번 `-n`으로 첫 20줄만 확인하고 시작하는 습관을 들였습니다.

며칠 걸리는 작업은 byobu 안에서 돌렸습니다. 터미널 창을 닫아도, 회선이 한 번 끊겨도 세션은 그대로 남습니다. 다만 세션이 도는 쪽 기기가 잠들면 전송도 같이 멈추니, 절전만 양쪽 다 막아 두면 됐습니다.

## 참고

- [rsync(1) — 공식 매뉴얼](https://download.samba.org/pub/rsync/rsync.1) — USAGE 절의 trailing slash 동작, OPTIONS SUMMARY, `--partial-dir` / `-c` / `-z` 항목
- [scp(1) — OpenBSD manual](https://man.openbsd.org/scp) — `-r`, `-P`(포트), `-p`(속성 보존) 구분
- [OpenSSH 9.0 릴리스 노트](https://www.openssh.com/txt/release-9.0) — scp가 내부적으로 SFTP 프로토콜을 쓰도록 변경된 내용
- [byobu 공식 문서](https://www.byobu.org/documentation) — F-키 바인딩, `byobu-select-backend`
- `man caffeinate` — macOS 절전 억제. 로컬에서 확인합니다
- 옵션 설명은 위 매뉴얼 기준입니다. 환경마다 rsync 버전이 다를 수 있으니 낯선 옵션은 `man rsync`로 직접 확인하는 쪽을 권합니다
