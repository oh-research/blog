---
title: 맥북과 아이맥에서 Claude Code 환경 동기화하기 (Git 방식)
tags:
  - claude-code
  - dotfiles
  - git
  - sync
created: 2026-05-28 08:53
updated: 2026-05-28 15:29
---

> [!abstract] 한 줄 요약
> 여러 대의 맥에서 Claude Code를 쓸 때 설정·스킬·CLAUDE.md가 머신마다 따로 노는 문제를 Git 저장소와 심볼릭 링크로 동기화한 기록입니다.

## 개요

여러 대의 맥에서 Claude Code를 쓰다 보면 한 가지 불편함에 부딪힙니다. **각 머신마다 설정·스킬·CLAUDE.md가 따로 논다는 점**입니다. 한쪽에서 스킬을 추가하면 다른 쪽에서는 보이지 않고, 프롬프트를 다듬어도 동기화되지 않습니다.

Claude Code는 아직 공식 동기화 기능이 없습니다 ([GitHub Issue #22648](https://github.com/anthropics/claude-code/issues/22648)). 그래서 직접 셋업해야 합니다. **Git 저장소와 심볼릭 링크**로 두 머신을 묶은 방법을 적어 둡니다.

## 왜 Git인가

선택지는 크게 세 가지입니다.

| 방식 | 장점 | 단점 |
|---|---|---|
| iCloud Drive | 셋업 간단 | 충돌 해결 불투명, 애플 기기 한정 |
| Git 저장소 | 변경 이력, 충돌 해결 명확, 롤백 가능 | 초기 셋업 한 번 필요 |
| 수동 복사 | 가장 단순 | 어긋나기 쉬움 |

이 중에서 Git 방식을 골랐습니다. 실수로 설정을 망쳐도 되돌릴 수 있고, 어느 머신에서 어떤 변경이 있었는지 명확하기 때문입니다.

## 동기화 대상과 제외 대상

`~/.claude/` 폴더 안에는 동기화하면 안 되는 파일이 섞여 있습니다.

**동기화할 것**

- `settings.json` — 글로벌 설정
- `CLAUDE.md` — 전역 지침
- `skills/` — 커스텀 스킬
- `commands/` — 슬래시 커맨드
- `agents/` — 커스텀 에이전트

**절대 동기화하면 안 되는 것**

- `.credentials.json` — 인증 토큰 (macOS는 Keychain에 저장)
- `projects/`, `todos/` — 런타임 데이터
- `statsig/`, `ide/`, `shell-snapshots/` — 캐시·로그
- `history.jsonl` — 세션 히스토리

인증 정보를 커밋하면 보안 사고로 직결되므로 `.gitignore`를 반드시 신경 써야 합니다.

## 왜 심볼릭 링크를 쓰는가

Git 저장소를 어디에 둘지가 핵심 결정입니다. `~/.claude/` 자체를 Git 저장소로 만들면 캐시·로그·인증 파일이 모두 섞여서 위험합니다. 그래서 **별도 폴더(`~/dotfiles/`)에 Git 저장소를 두고, `~/.claude/`에서 심볼릭 링크로 연결**합니다.

Claude Code는 `~/.claude/`만 바라보기 때문에 다른 경로에 파일을 둬도 인식하지 못합니다. 심볼릭 링크는 "바로가기" 역할을 합니다.

- 실제 파일은 `~/dotfiles/claude/` 한 곳에만 존재합니다.
- Claude Code는 `~/.claude/`에서 읽지만, OS가 알아서 진짜 파일을 찾아 줍니다.
- `git pull`로 받은 변경이 즉시 Claude Code에 반영됩니다.

복사 방식과 달리 동기화가 저절로 되고, 원본 파일은 한 벌뿐입니다.

## 셋업 가이드

### 사전 준비

- 두 머신에 Git 설치 및 GitHub 인증 (`gh auth login` 또는 SSH 키)
- GitHub에 **private 저장소** 생성 (예: `claude-config`)

### 1단계: 맥북에서 Git 저장소 만들기

Claude Code를 먼저 종료한 뒤 진행합니다.

```bash
# Create dotfiles directory
mkdir -p ~/dotfiles/claude
cd ~/dotfiles

# Copy sync-worthy files only
cp ~/.claude/settings.json ./claude/cp ~/.claude/CLAUDE.md ./claude/cp -r ~/.claude/skills ./claude/cp -r ~/.claude/commands ./claude/cp -r ~/.claude/agents ./claude/```

### 2단계: .gitignore 작성 (보안 핵심)

```bash
cat > ~/dotfiles/.gitignore << 'EOF'
# Never sync credentials
**/.credentials.json
**/credentials.json

# Never sync cache/runtime data
**/projects/
**/todos/
**/statsig/
**/ide/
**/shell-snapshots/
**/history.jsonl
**/.cache/

# OS noise
.DS_Store
EOF
```

### 3단계: Git 초기화 후 푸시

```bash
cd ~/dotfiles
git init
git add .
git status   # Verify no credentials are staged
git commit -m "Initial Claude Code config"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/claude-config.git
git push -u origin main
```

`git status`에서 `.credentials.json`이 보이면 절대 커밋하면 안 됩니다.

### 4단계: 심볼릭 링크로 교체

```bash
# Remove originals (1단계에서 ~/dotfiles/claude/ 로 이미 복사해 뒀으므로 그쪽이 백업)
rm ~/.claude/settings.json
rm ~/.claude/CLAUDE.md
rm -rf ~/.claude/skills
rm -rf ~/.claude/commands
rm -rf ~/.claude/agents

# Create symlinks
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/dotfiles/claude/skills ~/.claude/skills
ln -s ~/dotfiles/claude/commands ~/.claude/commands
ln -s ~/dotfiles/claude/agents ~/.claude/agents

# Verify
ls -la ~/.claude/
```

`->` 화살표가 보이면 정상 연결된 것입니다.

### 5단계: 아이맥에 적용

```bash
# Clone the repo
cd ~
git clone git@github.com:YOUR_USERNAME/claude-config.git dotfiles

# Replace sync targets only (projects/·sessions/ 같은 머신별 데이터는 그대로 둔다)
mkdir -p ~/.claude
rm -rf ~/.claude/settings.json ~/.claude/CLAUDE.md ~/.claude/skills ~/.claude/commands ~/.claude/agents

# Create symlinks
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/dotfiles/claude/skills ~/.claude/skills
ln -s ~/dotfiles/claude/commands ~/.claude/commands
ln -s ~/dotfiles/claude/agents ~/.claude/agents

# Re-authenticate (credentials are per-machine)
claude
```

인증 정보는 머신별 macOS Keychain에 저장되므로 각각 따로 로그인합니다.

## 일상 동기화 워크플로우

설정을 바꿨을 때는 이렇게 주고받습니다.

```bash
# On the machine you edited
cd ~/dotfiles
git add -A
git commit -m "Update skill X"
git push

# On the other machine
cd ~/dotfiles
git pull
```

매번 명령어를 치기 번거로우면 alias를 만들어 둡니다.

```bash
# Add to ~/.zshrc
alias claude-sync='cd ~/dotfiles && git pull && git add -A && git commit -m "sync $(date +%F)" && git push'
```

## 정리

이제 한쪽 맥에서 스킬을 추가하거나 `CLAUDE.md`를 다듬으면, 다른 맥에서 `git pull` 한 번으로 같은 환경이 따라옵니다. 변경 이력도 남고, 잘못된 설정은 `git revert`로 되돌릴 수 있습니다.

핵심 체크리스트는 다음과 같습니다.

- [ ] `.gitignore`에 `.credentials.json` 포함됐는지
- [ ] private 저장소인지 확인
- [ ] 두 머신에서 각각 `claude` 로그인 따로 했는지
- [ ] 심볼릭 링크 정상 연결됐는지 (`ls -la ~/.claude/`)

Claude Code 공식 동기화 기능이 나오기 전까지는 일단 이 방식으로 쓰기로 했습니다.

## 참고

- [Claude Code Settings 공식 문서](https://docs.claude.com/en/docs/claude-code/settings)
- [GitHub Issue: Account-level settings sync](https://github.com/anthropics/claude-code/issues/22648)
- [Where Configuration Files are Stored (Inventive HQ)](https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored)
- [Brian Lovin: Syncing Claude Code settings between computers](https://brianlovin.com/writing/syncing-claude-code-settings-between-computers-am7lNQ8)
