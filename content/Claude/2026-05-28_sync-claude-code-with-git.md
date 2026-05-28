---
title: 맥북과 아이맥에서 Claude Code 환경 동기화하기 (Git 방식)
tags:
  - claude-code
  - dotfiles
  - git
  - sync
created: 2026-05-28 08:53
updated: 2026-05-29 08:33
---

> [!abstract] 한 줄 요약
> 맥북과 아이맥에 흩어져 있던 Claude Code 설정·스킬·에이전트를 Git 저장소와 심볼릭 링크로 한 곳에 모은 기록입니다.

## 개요

맥북과 아이맥에서 Claude Code를 같이 쓰다 보니 양쪽 환경이 어긋나 있었습니다. 맥북에는 직접 만든 스킬이, 아이맥에는 직접 만든 에이전트가 따로 들어 있어 두 머신이 같은 환경이 아니었습니다. 한쪽에서 설정을 다듬어도 다른 쪽에 반영되지 않으니, 양쪽을 한 저장소로 모으기로 했습니다.

Claude Code는 아직 공식 동기화 기능이 없습니다 ([GitHub Issue #22648](https://github.com/anthropics/claude-code/issues/22648)). 그래서 **Git 저장소와 심볼릭 링크**로 두 머신을 직접 묶었습니다.

## 왜 Git인가

떠올린 선택지는 iCloud Drive, Git 저장소, 수동 복사 정도였습니다. 이 중 Git 저장소를 골랐습니다. 변경 이력이 남아 어느 머신에서 무엇이 바뀌었는지 따라갈 수 있고, 잘못 건드린 설정은 이전 커밋으로 되돌릴 수 있기 때문입니다. iCloud Drive나 수동 복사로도 동기화 자체는 가능하지만, 이번에는 이력이 남는 쪽을 우선했습니다.

## 동기화 대상과 제외 대상

`~/.claude/` 폴더 안에는 동기화하면 안 되는 파일이 섞여 있습니다.

**동기화할 것**

- `settings.json` — 글로벌 설정
- `skills/` — 커스텀 스킬
- `agents/` — 커스텀 에이전트
- `README.md` — 직접 작성한 에이전트·스킬 정리 메모

**절대 동기화하면 안 되는 것**

- `.credentials.json` — 인증 토큰 (macOS는 Keychain에 저장)
- `sessions/`, `session-env/`, `projects/`, `plans/`, `tasks/`, `paste-cache/`, `file-history/` — 세션·작업 상태
- `backups/`, `cache/`, `downloads/`, `plugins/`, `ide/`, `shell-snapshots/` — 캐시·로그
- `history.jsonl`, `mcp-needs-auth-cache.json`, `.last-cleanup`, `.last-update-result.json` — 메타 파일
- `settings.local.json` — 머신별 로컬 오버라이드 (아래 "머신별 차이 다루기" 참고)

인증 정보를 커밋하면 보안 사고로 직결되므로 `.gitignore`를 반드시 신경 써야 합니다.

## 왜 심볼릭 링크를 쓰는가

관건은 Git 저장소를 어디에 두느냐입니다. `~/.claude/` 자체를 Git 저장소로 만들면 캐시·로그·인증 파일이 모두 섞여 위험합니다. **별도 폴더(`~/dotfiles/`)에 Git 저장소를 두고, `~/.claude/`에서 심볼릭 링크로 연결**했습니다.

Claude Code는 `~/.claude/`만 바라보기 때문에 다른 경로에 파일을 둬도 인식하지 못합니다. 심볼릭 링크는 "바로가기" 역할을 합니다.

- 실제 파일은 `~/dotfiles/claude/` 한 곳에만 존재합니다.
- Claude Code는 `~/.claude/`에서 읽지만, OS가 알아서 진짜 파일을 찾아 줍니다.
- `git pull`로 받은 변경은 다음 세션부터 Claude Code에 반영됩니다.

복사 방식과 달리 원본 파일이 한 벌뿐이라 머신끼리 어긋날 일이 없습니다.

## 셋업 가이드

### 사전 준비

- 두 머신에 Git 설치 및 GitHub 인증 (`gh auth login` 또는 SSH 키)
- GitHub에 **private 저장소** `dotfiles` 생성 — `gh repo create dotfiles --private` 또는 https://github.com/new 에서 Private 선택 (README·.gitignore·license는 체크 해제)

### 1단계: 맥북에서 Git 저장소 만들기

맥북을 source 머신으로 삼습니다. 양쪽 머신을 먼저 합쳐야 하는데, 아이맥에만 있는 `agents/`와 일부 `skills/`, `README.md`를 SSH로 맥북에 가져옵니다. 겹치는 이름이 없으므로 `rsync`가 안전하게 머지합니다.

```bash
# 맥북에서 — 아이맥의 agents/, skills/, README.md 가져오기
rsync -avh <imac-host>:~/.claude/agents/ ~/.claude/agents/
rsync -avh <imac-host>:~/.claude/skills/ ~/.claude/skills/
rsync -avh <imac-host>:~/.claude/README.md ~/.claude/README.md
```

그 다음 양쪽에서 Claude Code를 종료하고, 맥북에서 dotfiles로 복사합니다.

```bash
# dotfiles 디렉토리 생성
mkdir -p ~/dotfiles/claude
cd ~/dotfiles

# 동기화 대상만 복사
cp ~/.claude/settings.json ./claude/
cp ~/.claude/README.md ./claude/
cp -r ~/.claude/skills ./claude/
cp -r ~/.claude/agents ./claude/
```

### 2단계: .gitignore 작성 (보안 핵심)

```bash
cat > ~/dotfiles/.gitignore << 'EOF'
# 인증 토큰
**/.credentials.json
**/credentials.json

# 세션·작업 상태
**/sessions/
**/session-env/
**/projects/
**/plans/
**/tasks/
**/todos/
**/paste-cache/
**/file-history/

# 캐시·로그
**/backups/
**/cache/
**/downloads/
**/plugins/
**/statsig/
**/telemetry/
**/ide/
**/shell-snapshots/
**/history.jsonl
**/.cache/

# 메타 파일
**/mcp-needs-auth-cache.json
**/.last-cleanup
**/.last-update-result.json

# 머신별 로컬 오버라이드 (settings.json 위에 머신별 키만 얹는 용도)
**/settings.local.json

# OS noise
.DS_Store
EOF
```

### 3단계: Git 초기화 후 푸시

```bash
cd ~/dotfiles
git init
git add .
git status   # .credentials.json이 staged에 없는지 확인
git commit -m "Initial Claude Code config"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/dotfiles.git
git push -u origin main
```

`git status`에서 `.credentials.json`이 보이면 절대 커밋하면 안 됩니다.

### 4단계: 심볼릭 링크로 교체

```bash
# 원본 제거 (1단계에서 ~/dotfiles/claude/로 이미 복사해 뒀으므로 그쪽이 백업)
rm ~/.claude/settings.json
rm ~/.claude/README.md
rm -rf ~/.claude/skills
rm -rf ~/.claude/agents

# 심볼릭 링크 생성
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/README.md ~/.claude/README.md
ln -s ~/dotfiles/claude/skills ~/.claude/skills
ln -s ~/dotfiles/claude/agents ~/.claude/agents

# 확인
ls -la ~/.claude/
```

`->` 화살표가 보이면 연결이 정상입니다.

### 5단계: 아이맥에 적용

아이맥의 `settings.json`은 맥북 것으로 덮어쓰입니다. 1단계에서 `rsync`로 이미 `agents/`와 `skills/`를 가져왔으니 아이맥 원본은 이 시점에서 안전하게 지워도 됩니다.

```bash
# 저장소 클론
cd ~
git clone git@github.com:YOUR_USERNAME/dotfiles.git

# 동기화 대상만 교체 (sessions/·projects/ 같은 머신별 데이터는 그대로 둔다)
mkdir -p ~/.claude
rm -rf ~/.claude/settings.json ~/.claude/README.md ~/.claude/skills ~/.claude/agents

# 심볼릭 링크 생성
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/README.md ~/.claude/README.md
ln -s ~/dotfiles/claude/skills ~/.claude/skills
ln -s ~/dotfiles/claude/agents ~/.claude/agents

# 재로그인 (인증 정보는 머신별)
claude
```

인증 정보는 머신별 macOS Keychain에 저장되므로 각각 따로 로그인합니다.

### 셋업 점검

다음 항목을 확인하고 셋업을 마무리합니다.

- [ ] `.gitignore`에 `.credentials.json` 포함
- [ ] GitHub 저장소가 private인지 확인
- [ ] 두 머신에서 각각 `claude` 로그인을 따로 했는지
- [ ] 심볼릭 링크가 정상 연결됐는지 (`ls -la ~/.claude/`)

## 일상 동기화 워크플로우

설정을 바꿨을 때는 이렇게 주고받습니다.

```bash
# 변경한 머신에서
cd ~/dotfiles
git add -A
git commit -m "Update skill X"
git push

# 다른 머신에서
cd ~/dotfiles
git pull
```

매번 명령어를 치기 번거로우면 alias를 만들어 둡니다.

```bash
# ~/.zshrc에 추가
alias claude-sync='cd ~/dotfiles && git pull && git add -A && git commit -m "sync $(date +%F)" && git push'
```

## 머신별 차이 다루기 (`settings.local.json`)

머신마다 다르게 두고 싶은 설정이 있을 때(예: 아이맥에서는 `skipDangerousModePermissionPrompt`를 켜두고 맥북에서는 꺼두기) `~/.claude/settings.local.json`에 그 키만 박아 두면 됩니다. Claude Code는 이 파일을 `settings.json` 위에 덮어씁니다. 공식 문서에는 user 레벨 `settings.local.json`이 명시돼 있지 않지만 실제로는 작동합니다.

```bash
# 아이맥에만 (맥북에는 만들지 않음)
cat > ~/.claude/settings.local.json << 'EOF'
{
  "skipDangerousModePermissionPrompt": true
}
EOF
```

`settings.local.json`은 `.gitignore`에 들어 있어 머신별로 유지됩니다. 한 가지 주의 — Claude Code가 권한 동의 시 같은 키를 `settings.json`에 자동으로 적기도 합니다. 그러면 양쪽 머신에 동기화되니, `settings.json`에서 그 키만 빼서 다시 commit·push해 둡니다.

## 정리

맥북에 있던 스킬과 아이맥에 있던 에이전트·README를 맥북 한 곳에 모은 뒤, `settings.json`과 함께 Git 저장소에 올리고 양쪽 `~/.claude/`에서 심볼릭 링크로 연결했습니다. 머신마다 달라야 하는 키는 `settings.local.json`에 따로 박아 두는 식으로 분리했습니다. 한쪽에서 바꾼 내용은 `git pull`로 다른 쪽에 가져옵니다. 단 `settings.json` 변경은 다음 세션부터 반영되고, 인증 정보는 머신별 macOS Keychain에 따로 두는 점을 기억해 둡니다. Claude Code 공식 동기화 기능이 나오기 전까지는 이 방식으로 씁니다.

## 참고

- [Claude Code Settings 공식 문서](https://docs.claude.com/en/docs/claude-code/settings)
- [GitHub Issue: Account-level settings sync](https://github.com/anthropics/claude-code/issues/22648)
- [Where Configuration Files are Stored (Inventive HQ)](https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored)
- [Brian Lovin: Syncing Claude Code settings between computers](https://brianlovin.com/writing/syncing-claude-code-settings-between-computers-am7lNQ8)
