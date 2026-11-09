---
title: Claude Code 상태 표시줄 띄우기
tags:
  - claude-code
  - statusline
  - cli
created: 2026-11-09 20:07
updated: 2026-11-09 20:07
---

> [!abstract] 한 줄 요약
> Claude Code 터미널 아래쪽에 모델, 컨텍스트 사용률, 사용량 한도를 막대로 띄우는 상태 표시줄 설정과 스크립트 전문입니다.

## 개요

Claude Code를 오래 쓰다 보면 지금 컨텍스트가 얼마나 찼는지, 사용량 한도가 언제 풀리는지 자주 궁금해집니다. 매번 명령으로 확인하기 번거로워서 터미널 아래쪽에 상태 표시줄을 하나 띄워두었습니다. 설정 블록 하나와 셸 스크립트 하나면 됩니다.

![[01-statusline.png|720]]

캡처할 때는 5시간 사용량 값이 아직 없어서 `Usage` 바로 뒤에 `—`가 찍혔습니다.

## 무엇이 보이나

상태 표시줄은 두 줄입니다.

- **첫째 줄**: `[모델 이름] 사용자 | 세션 경과 시간`. 컨텍스트 창이 100만 토큰인데 모델 이름에 1M 표시가 없으면 `(1M context)`를 붙여줍니다.
- **둘째 줄**: `Context` 막대, `Usage` 막대 두 개. Usage 앞쪽은 5시간 한도, 뒤쪽은 7일 한도이고 각각 `resets in` 뒤에 한도가 풀리기까지 남은 시간이 나옵니다.

막대 색은 사용률에 따라 바뀝니다. 50% 미만은 초록, 50% 이상은 노랑, 80% 이상은 빨강입니다. 채워진 칸에만 색을 입히고 빈 칸은 회색으로 둡니다. 값이 아직 없으면 막대 대신 `—`가 찍힙니다.

## 작동 방식

`~/.claude/settings.json`에 아래 블록이 들어 있습니다.

```json
"statusLine": {
  "type": "command",
  "command": "~/.claude/statusline.sh",
  "padding": 0,
  "refreshInterval": 30
}
```

Claude Code는 상태 표시줄을 그릴 때마다 현재 세션 정보를 JSON으로 만들어 이 스크립트의 표준 입력으로 넘깁니다. 스크립트는 그 JSON에서 `jq`로 필요한 값(모델 이름, 컨텍스트 사용률, 5시간·7일 사용률과 리셋 시각, 세션 경과 시간)을 꺼내 출력합니다. 이 출력이 그대로 터미널 아래쪽에 뜹니다. `refreshInterval: 30`이라 30초마다 새로 그립니다.

## 다른 컴퓨터에 똑같이 만들기

두 가지만 하면 됩니다.

1. 아래 스크립트를 `~/.claude/statusline.sh`로 저장하고 실행 권한을 줍니다.
   ```bash
   chmod +x ~/.claude/statusline.sh
   ```
2. `~/.claude/settings.json`에 위의 `statusLine` 블록을 넣습니다.

스크립트가 `jq`를 쓰니 설치돼 있어야 합니다. `which jq`로 확인해 보고, 없으면 `brew install jq`로 설치합니다. 이 Mac(macOS 27)에는 `/usr/bin/jq`가 이미 있어서 따로 설치하지 않았습니다.

처음부터 새로 만들 때는 Claude Code에서 `/statusline 컨텍스트랑 사용량 막대 보여줘`처럼 원하는 모양을 적어 요청합니다. 그러면 스크립트와 설정을 만들어줍니다.

## statusline.sh 전문

```bash
#!/bin/bash
# Claude Code status line: model, context, 5-hour usage, 7-day usage.
input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name // "Claude"')
CTX_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
FIVE=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
FIVE_AT=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
WEEK=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
WEEK_AT=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

bar() {
  local pct="${1:-0}"
  pct="${pct%%.*}"
  [[ "$pct" =~ ^[0-9]+$ ]] || pct=0
  (( pct > 100 )) && pct=100
  local width=10
  local filled=$(( pct * width / 100 ))
  local empty=$(( width - filled ))
  local color="$2"
  printf '%b' "$color"
  printf '%*s' "$filled" '' | tr ' ' '▓'
  printf '\033[0m\033[90m'
  printf '%*s' "$empty" '' | tr ' ' '░'
  printf '\033[0m %s%%' "$pct"
}

color_for() {
  local pct="${1%%.*}"
  [[ "$pct" =~ ^[0-9]+$ ]] || pct=0
  if (( pct >= 80 )); then printf '\033[31m'
  elif (( pct >= 50 )); then printf '\033[33m'
  else printf '\033[32m'
  fi
}

resets_in() {
  local at="$1"
  [[ "$at" =~ ^[0-9]+$ ]] || { printf '—'; return; }
  local now delta
  now=$(date +%s)
  delta=$(( at - now ))
  if (( delta <= 0 )); then
    printf 'soon'
    return
  fi
  local days=$(( delta / 86400 ))
  local hours=$(( (delta % 86400) / 3600 ))
  local mins=$(( (delta % 3600) / 60 ))
  if (( days > 0 )); then
    printf '%dd %dh' "$days" "$hours"
  elif (( hours > 0 )); then
    printf '%dh %dm' "$hours" "$mins"
  else
    printf '%dm' "$mins"
  fi
}

session_age() {
  local sec=$(( ${1:-0} / 1000 ))
  if (( sec < 60 )); then
    printf '<1m'
  elif (( sec < 3600 )); then
    printf '%dm' $(( sec / 60 ))
  else
    printf '%dh %dm' $(( sec / 3600 )) $(( (sec % 3600) / 60 ))
  fi
}

if [[ "$CTX_SIZE" -ge 1000000 && "$MODEL" != *1M* ]]; then
  MODEL="$MODEL (1M context)"
fi

printf '[%s] %s | %s\n' "$MODEL" "$(whoami)" "$(session_age "$DUR_MS")"

printf 'Context '
if [[ -n "$PCT" ]]; then
  bar "$PCT" "$(color_for "$PCT")"
else
  printf '—'
fi

printf '    Usage '
if [[ -n "$FIVE" ]]; then
  bar "$FIVE" "$(color_for "$FIVE")"
  printf ' (resets in %s)' "$(resets_in "$FIVE_AT")"
else
  printf '—'
fi

printf ' | '
if [[ -n "$WEEK" ]]; then
  bar "$WEEK" "$(color_for "$WEEK")"
  printf ' (resets in %s)' "$(resets_in "$WEEK_AT")"
else
  printf '—'
fi
printf '\n'
```

## 정리

컨텍스트와 사용량 한도를 매번 명령으로 확인하는 대신 터미널 아래쪽에 늘 띄워두기로 했습니다. 필요한 건 `settings.json`의 `statusLine` 블록과 `statusline.sh` 두 가지라서 다른 컴퓨터로 옮길 때도 이 둘만 챙기면 됩니다. 스크립트가 `jq`로 JSON을 읽기 때문에 jq가 없는 환경에서는 먼저 설치해야 합니다.

## 참고

- [Customize your status line (Claude Code 공식 문서)](https://code.claude.com/docs/en/statusline)
