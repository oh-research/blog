---
title: macOS 터미널에서 byobu 단축키가 안 먹는 이유와 해결법
tags:
  - macos
  - terminal
  - byobu
  - tmux
  - keybindings
  - xterm
created: 2026-08-13 23:37
updated: 2026-08-13 23:44
---

> [!abstract] 한 줄 요약
> SSH로 붙은 맥에서 byobu의 `Ctrl-F2`, `Shift-F1`이 전부 무반응이던 원인을 macOS 기본 터미널이 수정자+F키를 아예 전송하지 않는 데까지 따라간 뒤, 키 시퀀스 등록·방향키 전환·prefix 교체 세 갈래로 정리한 기록입니다.

## 개요

SSH로 원격 맥에 접속해서 byobu를 쓰는데 공식 문서에 나온 `Ctrl-F2`(세로 분할)도, `Shift-F1`(도움말)도 아무 반응이 없었습니다. 원인을 추적해 보니 byobu 잘못이 아니라 **macOS 기본 터미널(Terminal.app)이 수정자+F키 조합을 아예 전송하지 않는 것**이 문제였습니다. 진단 과정과 해결법을 순서대로 남겨 둡니다.

증상은 이랬습니다.

- `Ctrl-F2`, `Shift-F2`, `Shift-F1` 등 byobu의 대표 단축키가 전부 무반응
- 순수 `F2`, `F3`, `F4`는 정상 동작
- `Ctrl-a`도 `Ctrl-b`도 prefix로 동작하지 않음

수정자가 붙은 키만 골라서 죽는 패턴이 핵심 단서였습니다.

## 1. prefix가 무엇인지부터 확인

`Ctrl-a`와 `Ctrl-b`가 둘 다 안 먹었다면 추측하지 말고 직접 조회하는 쪽이 빠릅니다.

```bash
tmux show-options -g prefix
```

제 환경에서는 이렇게 나왔습니다.

```
prefix F12
```

byobu의 emacs 모드 기본값이 `F12`였습니다. `Ctrl-a`가 안 먹은 게 당연했습니다.

**Mac 키보드에서 F12는 기본이 볼륨 올리기**라 시스템 설정에서 표준 기능 키를 켜 두지 않았다면 `Fn`을 같이 눌러야 tmux까지 도달합니다.

> [!note]
> byobu 세션 안인지 확인하려면 `echo $TMUX`를 씁니다. 값이 비어 있으면 세션 밖입니다. `$BYOBU_BACKEND`도 세션 안에서만 설정됩니다.

## 2. byobu가 실제로 바인딩한 키 확인

문서를 믿지 말고 실제 바인딩을 뽑아 봅니다.

```bash
tmux list-keys -T root | grep -i f2
```

```
bind-key -T root F2      new-window -c "#{pane_current_path}" \; rename-window -
bind-key -T root C-F2    display-panes \; split-window -h -c "#{pane_current_path}"
bind-key -T root S-F2    display-panes \; split-window -v -c "#{pane_current_path}"
bind-key -T root C-S-F2  new-session \; rename-window -
```

`-T root`가 붙어 있으니 **prefix 없이 바로** 동작합니다. 원래 `Ctrl-F2` 하나로 분할이 끝나야 하는 설계였습니다.

`-c "#{pane_current_path}"`도 눈에 띕니다. byobu는 새 pane이 현재 디렉터리를 물려받도록 기본 설정해 뒀습니다. 순정 tmux는 홈 디렉터리에서 시작하니 이건 byobu가 잘 챙긴 부분입니다.

## 3. 진짜 원인 — Terminal.app이 키를 안 보냅니다

byobu 밖에서 `cat -v`를 띄우고 키를 눌러 보면 터미널이 실제로 무엇을 전송하는지 그대로 보입니다.

```bash
cat -v
```

`Ctrl-F2`를 눌렀는데 아무것도 찍히지 않았습니다. 전송 자체가 없었습니다. tmux 쪽 설정을 아무리 만져도 달라질 일이 아니었습니다.

터미널 설정 → 프로파일 → **키보드** 탭을 열어 보니 확인 사살이었습니다. Control·Shift 조합 F키가 **단 하나도 없었습니다.** `Option` 조합만 있었습니다.

byobu의 F키 중심 설계는 리눅스 콘솔을 전제로 만들어졌습니다. 거기서는 `Shift-F2` 같은 조합이 정상 전송되니 F키만으로 모든 기능을 커버하는 쪽이 편했을 겁니다. macOS 기본 터미널에서는 그 전제가 깨져서 설계 의도의 절반만 남은 상태로 쓰게 됩니다.

## 해결법 A. 터미널에 키 시퀀스 직접 등록

터미널 → 설정 → 프로파일 → **키보드** 탭 → `+` 버튼으로 추가합니다.

| 키 | 수정자 | 내용 | byobu 동작 |
|---|---|---|---|
| F2 | Control | `\033[1;5Q` | 좌우 분할 |
| F2 | Shift | `\033[1;2Q` | 위아래 분할 |
| F3 | Shift | `\033[1;2R` | 이전 pane |
| F4 | Shift | `\033[1;2S` | 다음 pane |
| F1 | Shift | `\033[1;2P` | 도움말 |
| F6 | Control | `\033[17;5~` | detach |

주의할 점이 두 가지 있습니다.

첫째, `\033`은 타이핑하면 안 됩니다. 입력란에서 **Esc 키를 눌러야** 제대로 들어갑니다.

둘째, 순수 `F2`(`\033OQ`) 항목은 건드리지 말고 그대로 둬야 합니다. 새 창 만들기 기능이 거기 걸려 있습니다. 수정이 아니라 **추가**입니다.

### 시퀀스 규칙

xterm 표준을 따릅니다.

- **F1~F4**: `\033[1;{수정자}{P|Q|R|S}`
- **F5 이상**: `\033[{번호};{수정자}~`
- **수정자 숫자**: Shift=2, Option=3, Control=5, Control+Shift=6

이 규칙만 알면 필요한 조합을 직접 만들 수 있습니다.

## 해결법 B. 방향키 기반으로 전환

F키를 스무 개씩 등록하는 건 현실적이지 않습니다. 다행히 byobu는 방향키 바인딩도 이미 다 해 뒀습니다.

```bash
tmux list-keys -T root | grep -i 'S-'
```

```
bind-key -T root S-Up     display-panes \; select-pane -U
bind-key -T root S-Down   display-panes \; select-pane -D
bind-key -T root S-Left   display-panes \; select-pane -L
bind-key -T root S-Right  display-panes \; select-pane -R
bind-key -T root M-S-Up   resize-pane -U
bind-key -T root M-S-Left resize-pane -L
```

`Shift + 방향키`로 pane 이동, `Shift + Option + 방향키`로 크기 조절입니다. 방향 이동은 순환 방식보다 직관적이라 pane이 세 개 이상일 때 차이가 큽니다.

다만 터미널에서 `Shift + 상하`는 기본적으로 **스크롤백 이동**에 배정돼 있습니다. 설정 화면 하단의 "보조 화면 스크롤" 설명에 명시돼 있고 실제로 `cat -v`로 확인하면 수정자가 벗겨진 `^[[A`만 전달됩니다. 이것도 키 목록에 추가해서 우회할 수 있습니다.

| 키 | 수정자 | 내용 |
|---|---|---|
| ↑ | Shift | `\033[1;2A` |
| ↓ | Shift | `\033[1;2B` |
| ← | Shift | `\033[1;2D` |
| → | Shift | `\033[1;2C` |

좌우는 기본으로 등록돼 있는 경우가 많으니 목록을 먼저 확인합니다.

## 해결법 C. 애초에 다른 길로

지금까지가 번거롭게 느껴진다면 그 감각이 맞습니다. 환경 불일치를 억지로 메우는 작업이기 때문입니다. 대안이 셋 있습니다.

### prefix를 Ctrl-a로 바꾸기

```bash
byobu-ctrl-a
```

Screen mode(1번)를 고르면 prefix가 `Ctrl-a`가 됩니다. F키를 전혀 안 건드려도 되고 SSH 어디서든 동일하게 동작합니다.

```
Ctrl-a %     좌우 분할
Ctrl-a "     위아래 분할
Ctrl-a z     pane 확대/복귀
```

대신 셸에서 줄 맨 앞으로 가는 `Ctrl-a`는 두 번 눌러야 합니다.

### iTerm2로 교체

iTerm2는 xterm 스타일 modified function key를 정상 전송합니다. 설정 없이 byobu 문서를 그대로 따라갈 수 있습니다. byobu의 F키 설계를 원래 의도대로 쓰고 싶다면 이쪽이 가장 빠릅니다.

### 순정 tmux로 이전

`~/.byobu/.tmux.conf`를 손대기 시작한 시점에서 이미 byobu 기본값을 그대로 쓰고 있지 않습니다. 그렇다면 레이어를 하나 걷어내는 것도 방법입니다.

```bash
tmux ls          # byobu가 만든 세션 확인
tmux attach -t 0 # 그대로 붙을 수 있습니다
```

byobu 세션은 결국 tmux 세션이라 데이터 손실 없이 넘어갈 수 있습니다.

## 곁가지: `%`와 `"`는 왜 이렇게 이상한가

tmux 기본 분할 키는 `%`(좌우)와 `"`(위아래)인데, 기호와 동작 사이에 아무 논리가 없습니다. GNU screen 시절의 키 배치를 물려받은 흔적에 가깝습니다.

용어도 뒤집혀 있습니다. tmux 내부 명령에서 `split-window -h`가 **좌우** 분할입니다. "horizontal"이 "가로로 나란히 놓는다"는 뜻이라 그런데, 대부분은 "가로 분할 = 위아래"로 받아들입니다. 문서를 봐도 헷갈리는 이유입니다.

바꾸는 쪽을 택했습니다. `~/.byobu/.tmux.conf`에 이렇게 넣습니다.

```
unbind %
unbind '"'
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
```

기호 모양이 곧 분할선 모양이라 헷갈릴 여지가 없습니다.

```bash
tmux source-file ~/.byobu/.tmux.conf
```

## 최종 키맵

등록을 마친 뒤 정착한 설정입니다.

| 키 | 동작 |
|---|---|
| `Ctrl-F2` | 좌우 분할 |
| `Shift-F2` | 위아래 분할 |
| `Shift + 방향키` | pane 이동 |
| `Shift + Option + 방향키` | pane 크기 조절 |
| `Shift-F11` | pane 확대 / 복귀 |
| `F2` | 새 창 |
| `F3` / `F4` | 이전 / 다음 창 |
| `Shift-F6` | detach |
| `Shift-F8` | 레이아웃 순환 |
| `Shift-F9` | 모든 pane에 명령 동시 입력 |

`Shift-F11`(확대)이 특히 유용합니다. 분할 상태에서 한 pane만 잠깐 크게 보고 같은 키로 되돌립니다.

> [!warning]
> `Shift-F12`는 F키 바인딩 전체를 끄는 토글입니다. 실수로 누르면 방금 등록한 것들이 통째로 안 먹는 것처럼 보입니다. 한 번 더 누르면 복구됩니다.

## 디버깅 체크리스트

같은 문제를 만났을 때 순서대로 확인하면 됩니다.

1. **세션 안인가** — `echo $TMUX`
2. **prefix가 무엇인가** — `tmux show-options -g prefix`
3. **실제 바인딩은** — `tmux list-keys -T root | grep -i f2`
4. **터미널이 키를 보내는가** — `cat -v` 후 키 입력
5. **macOS가 가로채는가** — 시스템 설정 → 키보드 → 키보드 단축키
6. **pane이 두 개 이상인가** — `select-pane`은 pane이 하나면 아무 일도 하지 않습니다

특히 4번이 중요합니다. 이 한 줄로 "터미널 문제냐 tmux 문제냐"가 즉시 갈립니다.

함정이 하나 있습니다. `cat -v` 없이 그냥 zsh 프롬프트에서 키를 누르면 zsh가 모르는 시퀀스의 앞부분을 버리고 마지막 문자만 남깁니다. `Shift-←`를 눌렀는데 `D`만 찍히는 식입니다. 이걸 "터미널이 키를 안 보낸다"고 오해하기 쉬우니 반드시 `cat -v`를 실행한 상태에서 확인합니다.

## 정리

byobu 단축키가 안 먹은 건 설정을 잘못 잡아서가 아니었습니다. 리눅스 콘솔을 전제로 한 F키 설계와 기본 터미널의 키 전송 정책이 어긋난 탓입니다. `cat -v`로 전송 자체가 없다는 것을 확인한 뒤부터는 tmux 쪽을 더 뒤질 이유가 사라졌습니다.

기본 터미널을 유지해야 해서 A의 시퀀스 등록으로 갔습니다. 자주 쓰는 pane 이동은 B의 `Shift + 방향키`로 넘겼습니다. F키를 전부 등록하는 대신 필요한 여섯 개만 넣은 구성입니다. `%`와 `"`는 `|`와 `-`로 바꿔 뒀습니다.

터미널을 옮길 수 있는 상황이라면 iTerm2 쪽이 설정 없이 끝나고 F키를 아예 안 쓰겠다면 `byobu-ctrl-a`가 가장 적은 손으로 해결됩니다. 이 글의 시퀀스 등록은 기본 터미널을 계속 쓰기로 한 뒤의 선택지입니다.

## 참고

- `man byobu` — 키바인딩 목록, FILES 섹션의 설정 파일 경로, ENVIRONMENT 섹션의 `BYOBU_BACKEND`
- `man byobu-ctrl-a` — escape 키 모드 전환
- `man tmux` — DEFAULT KEY BINDINGS, `split-window`, `select-pane`, `bind-key`, FORMATS 섹션
- `/usr/share/byobu/keybindings/` — F키 바인딩 원본. Homebrew로 설치했다면 `/opt/homebrew/Cellar/byobu/*/share/byobu/keybindings/`
- [XTerm Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html) — PC-Style Function Keys 항목의 수정자 시퀀스 규칙
- [byobu 공식 사이트](https://www.byobu.org)
- 기본 터미널이 수정자+F키를 전송하지 않는 동작은 애플이 공식 문서화한 내용이 아니라 위 `cat -v` 검증과 키보드 설정 목록으로 확인한 사항입니다
