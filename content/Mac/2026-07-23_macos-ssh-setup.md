---
title: 맥북에서 맥 스튜디오로 SSH 접속 환경 구축하기
tags:
  - macos
  - ssh
  - ssh-config
  - keychain
  - known-hosts
created: 2026-07-23 19:21
updated: 2026-07-23 19:27
---

> [!abstract] 한 줄 요약
> 공유기를 바꾸면서 맥북에서 맥 스튜디오로 붙는 SSH 접속 설정을 키 생성부터 키체인 연동, known_hosts 정리, 공유기 재설정까지 다시 잡은 기록입니다.

## 개요

공유기를 교체하면서 SSH 접속 설정을 처음부터 다시 잡을 일이 생겼습니다. 내부 IP가 전부 재할당되어 포트포워딩이 어긋났습니다. 접속하자마자 호스트 키가 바뀌었다는 경고도 만났습니다. 하는 김에 키 생성부터 접속 확인까지 전 과정을 순서대로 남겨 둡니다.

집에 맥이 두 대 있고 노트북에서 데스크톱에 붙어 작업하는 구성입니다. 대상이 리눅스 서버나 NAS여도 원리는 같습니다. 다만 아래 4번의 키체인 연동은 macOS 클라이언트에서만 동작합니다.

## 목표 구성

| 역할 | 기기 | 하는 일 |
|---|---|---|
| 서버(호스트) | Mac Studio | 접속을 받습니다 |
| 클라이언트 | MacBook | 접속을 겁니다 |

접속 경로는 두 갈래로 만듭니다.

| 경로 | 주소 | 포트 |
|---|---|---|
| 내부망 | `desktop.local` | 22 |
| 외부망 | `example.ddns.net` | 2222 → 내부 22 |

> [!note]
> 아래 나오는 주소·포트·계정명은 모두 예시입니다.

## 1. 서버에서 원격 로그인 켜기

**시스템 설정 → 일반 → 공유 → 원격 로그인**을 켭니다. 접근 허용 목록에 쓰려는 계정이 들어 있는지도 함께 확인합니다.

이후 단계에서 쓸 정보를 미리 확인해 둡니다.

```bash
ipconfig getifaddr en0      # 내부 IP
scutil --get LocalHostName  # .local 호스트네임
whoami                      # 계정명
```

`en0`이 Wi-Fi가 아닐 수도 있습니다. 유선을 쓰거나 인터페이스가 여러 개면 `networksetup -listallhardwareports`로 어느 쪽인지 먼저 봅니다.

## 2. 클라이언트에서 키 만들기

```bash
ssh-keygen -t ed25519 -C "macbook"
```

`-t ed25519`를 골랐습니다. RSA보다 키가 짧고 요즘 서버는 대부분 지원합니다. `-C` 뒤 문자열은 공개키 끝에 붙는 메모입니다. 나중에 서버의 `authorized_keys`에서 어느 기기 키인지 구분하는 용도로 씁니다.

만들어지는 파일은 두 개입니다.

- `~/.ssh/id_ed25519` — 개인키. 밖으로 내보내지 않습니다.
- `~/.ssh/id_ed25519.pub` — 공개키. 서버에 등록할 파일입니다.

passphrase는 걸어 뒀습니다. 매번 입력하는 번거로움은 다음 단계에서 키체인으로 넘깁니다.

## 3. 공개키를 서버에 등록하기

```bash
ssh-copy-id 사용자명@desktop.local
```

비표준 포트로 붙는다면 이렇게 씁니다.

```bash
ssh-copy-id -p 2222 사용자명@example.ddns.net
```

`ssh-copy-id`는 macOS에 기본 포함돼 있습니다(`/usr/bin/ssh-copy-id`). 대상 서버 쪽 사정으로 쓸 수 없다면 수동으로도 됩니다.

```bash
cat ~/.ssh/id_ed25519.pub | ssh 사용자명@desktop.local \
  'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && \
   chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys'
```

sshd는 기본값(`StrictModes yes`)에서 홈이나 `~/.ssh` 권한이 느슨하면 키 인증을 거부합니다. 그래서 권한까지 같이 잡습니다. 수동으로 붙여넣을 때 이 부분을 빠뜨리면 키를 제대로 넣고도 비밀번호를 계속 묻게 됩니다.

이 단계에서 서버 계정 비밀번호를 한 번 입력하는데, 그게 마지막입니다. 이후로는 키로 인증됩니다.

## 4. passphrase를 매번 입력하지 않기

키에 passphrase를 걸었다면 접속할 때마다 이것을 묻습니다.

```
Enter passphrase for key '/Users/username/.ssh/id_ed25519':
```

번거롭다고 passphrase를 지워 버리면 개인키 파일 하나가 유출되는 순간 그대로 접속을 내주게 됩니다. 노트북은 분실 가능성이 있어 더 그렇습니다. macOS에서는 키체인에 맡기는 쪽을 택했습니다.

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

여기서 passphrase를 한 번 입력하면 키체인에 저장됩니다. 이어서 `~/.ssh/config`에 다음 블록을 둡니다.

```
Host *
    IdentityFile ~/.ssh/id_ed25519
    UseKeychain yes
    AddKeysToAgent yes
```

`UseKeychain`은 키체인에 저장된 passphrase를 꺼내 씁니다. `AddKeysToAgent`는 처음 쓴 키를 ssh-agent에 올려 이후 재접속을 즉시 처리합니다. 두 옵션 모두 애플이 패치한 ssh에서 동작합니다. 특히 `UseKeychain`은 macOS 전용입니다. 재부팅해도 유지되고 키 파일 자체는 암호화된 상태로 남습니다.

제대로 올라갔는지 확인합니다.

```bash
ssh-add -l
```

목록에 키가 보이면 됩니다.

`Host *` 블록은 **파일 맨 아래**에 둡니다. ssh가 각 항목마다 처음 얻은 값을 쓰기 때문에, 구체적인 호스트 설정이 위에 오고 공통 기본값이 아래로 갑니다. 반대로 `Host *`를 맨 위에 올리면 나중에 다른 키를 쓰는 호스트를 추가했을 때 공통 키가 먼저 잡혀 원하는 키가 밀립니다.

## 5. config 파일로 접속 단축하기

`~/.ssh/config` 전체는 이렇게 구성했습니다.

```
Host desktop
    HostName desktop.local
    User 사용자명

Host desktop-ext
    HostName example.ddns.net
    Port 2222
    User 사용자명

Host *
    IdentityFile ~/.ssh/id_ed25519
    UseKeychain yes
    AddKeysToAgent yes
```

키가 하나뿐이라 개별 블록에는 `IdentityFile`을 적지 않고 맨 아래 `Host *`에 한 번만 뒀습니다. 이제 접속은 두 줄로 끝납니다.

```bash
ssh desktop       # 집 안에서
ssh desktop-ext   # 밖에서
```

권한이 느슨하면 ssh가 설정 파일과 키를 무시하거나 거부합니다. 한 번에 정리해 둡니다.

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

## 6. known_hosts와 호스트 키 경고

서버를 재설치하거나 공유기를 바꿔 IP가 재할당되면 이런 경고를 만납니다.

```
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
```

ssh는 처음 접속할 때 서버의 호스트 키 지문을 `~/.ssh/known_hosts`에 저장해 두고 이후 접속마다 대조합니다. 값이 달라지면 중간자 공격 가능성을 의심해 연결을 막습니다. 원인을 알고 있다면 기존 기록을 지우고 새로 등록받으면 됩니다.

### 조회

```bash
cat -n ~/.ssh/known_hosts                # 전체, 줄 번호 포함
ssh-keygen -F desktop.local              # 특정 호스트만
ssh-keygen -F "[example.ddns.net]:2222"  # 비표준 포트
```

macOS 기본값에서는 호스트명이 `|1|...` 형태의 해시로 저장되어 `cat`이나 `grep`으로는 주소를 찾을 수 없습니다. 호스트로 조회할 때는 `ssh-keygen -F`를 씁니다. 이 명령은 매칭된 줄 위에 `# Host ... found: line N` 주석을 함께 출력합니다.

### 삭제

```bash
ssh-keygen -R desktop.local
ssh-keygen -R "[example.ddns.net]:2222"
```

비표준 포트는 `[호스트]:포트` 형식으로 적습니다. 대괄호와 따옴표를 모두 붙여야 매칭됩니다. 이걸 빠뜨리면 아무것도 지워지지 않은 채 조용히 넘어갑니다. 원본은 `known_hosts.old`로 자동 백업됩니다.

### 한 호스트가 여러 줄인 것은 정상입니다

같은 서버 관련 줄이 두세 개 보여도 이상한 상황은 아닙니다. sshd는 보통 ed25519, RSA, ECDSA 호스트 키를 함께 운영하고 접속할 때 협상된 알고리즘에 따라 각각 저장됩니다. 여기에 같은 서버라도 `desktop.local`, 내부 IP, `[example.ddns.net]:2222`처럼 접속 주소가 다르면 별개 항목으로 쌓입니다.

```bash
ssh-keygen -F "[example.ddns.net]:2222" | grep -v '^#' | awk '{print $2}'
```

키 타입이 서로 다르게 나오면 정상입니다. 같은 타입이 중복돼 있다면 서버 키가 교체된 뒤 옛 줄이 남았을 수 있으니, `ssh-keygen -R`로 지우고 다시 등록받으면 정리됩니다.

## 7. 자주 쓰는 명령

```bash
ssh-add -l                      # 에이전트에 올라온 키 목록
ssh-add -D                      # 전부 내리기
ssh-add -d ~/.ssh/id_ed25519    # 특정 키만 내리기
ssh -v desktop                  # 접속 디버그 (-vv, -vvv로 더 자세히)
```

접속이 안 될 때 `-v`를 붙이면 어느 단계에서 막히는지 대개 바로 드러납니다. 서버 쪽에서 특정 클라이언트를 끊으려면 서버의 `~/.ssh/authorized_keys`에서 해당 공개키 줄을 지웁니다.

## 8. 공유기를 바꿨을 때

이번 작업의 발단이 공유기 교체였습니다. 공유기를 갈면 SSH 설정만 손봐서는 끝나지 않습니다.

- [ ] 서버 내부 IP를 MAC 주소 기반으로 고정 할당
- [ ] 포트포워딩 `2222 → 내부IP:22` 등록
- [ ] DDNS 재등록(기존 계정을 그대로 쓰면 같은 주소를 유지할 수 있습니다)
- [ ] 클라이언트에서 구 호스트 키 삭제 후 재접속
- [ ] 내부와 외부 양쪽 접속 테스트

DHCP 풀이 초기화되면서 기기 내부 IP가 뒤바뀌는 일이 흔합니다. 포워딩 규칙을 그대로 복원해도 IP가 어긋나면 엉뚱한 기기로 연결됩니다. 그래서 고정 할당을 먼저 하고 포워딩을 걸었습니다.

집 안에서만 쓸 때는 `.local` 호스트네임으로 붙습니다. mDNS가 이름을 찾아가므로 내부 IP가 바뀌어도 영향이 없습니다.

## 9. 잘 안 될 때

| 증상 | 확인할 것 |
|---|---|
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | `ssh-keygen -R`로 구 호스트 키 삭제 |
| `Connection refused` | 서버의 원격 로그인이 꺼져 있거나 포트포워딩 미설정 |
| `Permission denied (publickey)` | 공개키 미등록 또는 `~/.ssh` 권한 문제 |
| 계속 passphrase를 물음 | `UseKeychain yes` 누락 또는 키체인 미등록 |
| `.local` 접속 실패 | 다른 서브넷이거나 mDNS 차단. IP로 직접 시도 |
| 외부에서만 실패 | 포트포워딩 규칙과 DDNS 갱신 상태 확인 |

## 10. 보안 설정

외부에 포트를 여는 이상 최소한은 챙겨 두기로 했습니다.

외부 노출 포트는 22 대신 2222를 씁니다. 방어 수단이라기보다 22번을 훑는 자동 스캔이 로그에 쌓이는 양을 줄이는 정도입니다.

키 인증이 확실히 동작하는 것을 확인한 뒤 서버에서 비밀번호 인증을 끕니다. macOS의 `/etc/ssh/sshd_config`는 `/etc/ssh/sshd_config.d/*`를 Include합니다. 원본을 고치는 대신 드롭인 파일을 뒀습니다. 시스템 업데이트가 원본을 되돌려도 설정이 남습니다.

```bash
sudo tee /etc/ssh/sshd_config.d/200-local.conf > /dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
```

`KbdInteractiveAuthentication`이 열려 있으면 PAM 구성에 따라 비밀번호 로그인이 남을 수 있어 함께 껐습니다. 적용은 시스템 설정에서 원격 로그인을 껐다 켜거나 데몬을 재시작합니다.

```bash
sudo launchctl kickstart -k system/com.openssh.sshd
```

> [!warning]
> 키 인증이 되는 것을 확인하기 전에 건드리면 스스로 잠깁니다. 접속 성공을 먼저 확인한 뒤 기존 세션을 열어 둔 채 새 창에서 재접속을 시험합니다.

개인키는 백업하더라도 암호화된 저장소에만 둡니다. 쓰지 않는 포워딩 규칙은 공유기에서 지웁니다. 열어 두고 잊은 포트가 제일 위험합니다.

## 정리

공유기 교체로 내부 IP와 포워딩이 어긋난 김에 키 생성부터 키체인 연동과 config 별칭까지 한 번에 다시 잡았습니다. passphrase는 지우지 않고 `--apple-use-keychain`으로 키체인에 맡겼습니다. 키 파일은 암호화된 채로 두면서 입력만 생략하는 방식입니다. `Host *` 블록은 파일 맨 아래에 뒀습니다. 나중에 다른 키를 쓰는 호스트를 추가해도 밀리지 않습니다. 호스트 키 경고는 공유기나 서버가 바뀌면 따라옵니다. `ssh-keygen -R`로 옛 줄을 지우고 다시 등록받으면 되는데, 비표준 포트는 `[호스트]:포트` 형식을 빠뜨리면 아무 일도 일어나지 않으니 그것만 기억해 둡니다. 한 번 잡아 두니 이후로는 `ssh desktop` 한 줄로 붙습니다.

## 참고

- [ssh_config(5) — OpenBSD manual](https://man.openbsd.org/ssh_config)
- [sshd_config(5) — OpenBSD manual](https://man.openbsd.org/sshd_config)
- [ssh-keygen(1) — OpenBSD manual](https://man.openbsd.org/ssh-keygen)
- [ssh-copy-id(1) — OpenBSD manual](https://man.openbsd.org/ssh-copy-id)
- `UseKeychain`, `--apple-use-keychain`은 애플이 추가한 옵션이라 위 문서에 없습니다. 로컬에서 `man ssh_config`, `man ssh-add`로 확인합니다.
