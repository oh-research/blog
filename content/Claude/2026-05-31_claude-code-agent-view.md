---
title: Claude Code의 Agent View 제대로 이해하기
tags:
  - claude-code
  - agent-view
  - dev-workflow
  - cli
created: 2026-05-31 17:43
updated: 2026-05-31 20:12
---

> [!abstract] 한 줄 요약
> `claude agents`로 여는 Agent View로 이미 열린 세션을 관리하려다 만난 어려움을 정리한 기록입니다.

## 개요

Claude Code를 쓰다 보니 여러 터미널 창에 흩어진 작업을 한 곳에서 보고 싶어졌습니다. 찾아보니 Anthropic이 정식으로 내놓은 **Agent View**가 제가 원하던 기능이었습니다. `claude agents` 명령으로 여는 CLI 대시보드인데, 직접 써보면서 헷갈렸던 부분과 정리한 내용을 남깁니다. Agent View는 Claude Code v2.1.139 이상에서 쓸 수 있고, 아직 Research Preview 상태입니다.

`claude agents`는 모든 background 세션을 한 화면에서 관리하는 대시보드입니다. 어떤 세션이 돌고 있고, 어떤 게 내 입력을 기다리며, 어떤 게 끝났는지를 한눈에 보여줍니다. 세션은 상태별 묶음(`Needs input` / `Working` / `Completed`)으로 정렬돼 표시되고, 화면 상단 카운터(`awaiting input` / `working` / `completed`)로 전체 수가 잡힙니다.

![[01-agent-view-dashboard.png|720]]

## foreground 세션 vs background 세션

이미 띄워둔 터미널 창 3개의 세션이 대시보드에 안 나타나서 한참 헤맸습니다. 이유는 세션에 두 종류가 있기 때문입니다.

- **foreground 세션**: `claude`를 직접 실행해 시작한 세션입니다. 그 터미널에 묶여 있고 background로 보내지 않으면 터미널이 닫힐 때 종료됩니다.
- **background 세션**: 터미널과 별개인, 사용자당 하나짜리 supervisor 프로세스가 호스팅합니다. 터미널 없이도 계속 돌아갑니다.

**Agent View는 background 세션만 보여줍니다.** 다른 터미널에 열어둔 foreground 세션은 background로 보내기 전까지 목록에 안 뜹니다. 이게 핵심이었습니다.

아래가 한 터미널에서 `claude`를 직접 띄워 작업 중인 foreground 세션입니다. 화면만 보면 평범한 세션이지만 background로 보내기 전까지 Agent View 목록엔 잡히지 않습니다.

![[02-agent-view-foreground.png|720]]

## foreground 세션을 대시보드로 보내기

각 터미널 창에서 빈 프롬프트 상태로 아래 중 하나를 하면 됩니다.

- `/bg` — 현재 세션을 active 상태로 유지한 채 background로 전환합니다.
- `←` (왼쪽 화살표) — 세션을 background로 보내면서 그 세션이 선택된 상태로 Agent View를 열어줍니다.

**끄는 게 아니라 옮기는 것**이라는 점이 중요합니다. 진행 상태와 대화 맥락이 그대로 유지된 채 supervisor로 넘어갑니다. 실제로 detach해도 background 세션은 멈추지 않습니다. `←`, `Ctrl+C`, `Ctrl+D`, `Ctrl+Z`, `/exit` 모두 세션을 계속 돌게 둡니다. 세션을 진짜 끝내려면 세션 안에서 `/stop`을 실행해야 합니다.

![[03-agent-view-bg-command.png|720]]

## 화면에서 나가져도 멈추지 않습니다

`/bg`로 보내면 그 세션 화면에서 빠져나와 터미널이 셸 프롬프트로 돌아갑니다(대시보드로 바로 가려면 `←`를 쓰거나 `claude agents`를 다시 엽니다). 처음엔 작업이 끊긴 줄 알았는데 아니었습니다. 화면에서 안 보일 뿐 supervisor가 대신 돌리고 있습니다. background 세션은 여전히 Agent View에 나타나고, 입력이 필요하면 알려주며, 최종 출력도 만들어냅니다.

실제로 방금 `/bg`로 보낸 `Summarize terminal history in Korean` 세션이 아래 대시보드에 `Working`으로 그대로 떠서 계속 돌아가고 있습니다.

![[04-agent-view-after-bg.png|720]]

## 다시 작업 이어가기: attach

background로 보낸 세션도 언제든 다시 들어가 작업을 이어갈 수 있습니다. 대시보드 테이블에서 해당 row에 `Enter`(또는 `→`)를 누르면 **attach**됩니다. attach하면 `claude`를 직접 실행한 것과 똑같이 터미널을 차지하고, 모든 명령·단축키·기능이 일반 세션처럼 동작합니다. 들어갈 때 자리를 비운 동안의 짧은 recap도 올라옵니다.

## 키 동작 정리

| 동작 | 키 | 설명 |
|------|----|----|
| 대시보드 열기 | `claude agents` | 전체 세션 목록 |
| 세션 잠깐 보기 (peek) | `Space` | 마지막 출력/질문 확인, 인라인 답변 가능 |
| 세션 들어가기 (attach) | `Enter` / `→` | 전체 대화로 진입 |
| 나오기 (detach) | `←` (빈 프롬프트) | 테이블로 복귀, 세션은 계속 돌아감 |
| background 전환 | `/bg` | 현재 세션을 뒤로 보냄 |
| 세션 종료 | `/stop` | 세션 안에서 실행 |

![[05-agent-view-peek.png|720]]

## 권장 워크플로우

공식 가이드는 `claude` 대신 `claude agents`를 기본 진입점으로 쓰라고 제안합니다. 모든 작업을 대시보드에서 dispatch하고, 필요할 때만 attach하고, `←`로 테이블로 돌아오는 흐름입니다.

핵심은 **개입 최소화**입니다. 대부분은 대시보드에서 상태만 보고, 멈춰서 승인을 기다리는 세션은 `Space`로 짧게 답만 줍니다. 대화 전체를 읽거나 직접 손봐야 할 때만 `Enter`로 attach합니다.

흐름을 요약하면 이렇습니다.

1. 대시보드에서 전체 상태 보기
2. 급한 건 `Space`로 인라인 답변
3. 깊이 봐야 할 것만 `Enter`로 들어가기
4. `←`로 나오기

## 그래서 Agent View가 만능은 아닙니다

한동안 써보고 나니 이렇게 정리됩니다. Agent View는 **CLI 안의 세션 관리 화면**일 뿐입니다. 에디터, 파일 변경, 빌드 출력, 브라우저 같은 건 통합해주지 않습니다. 그건 여전히 각자의 창과 앱에 흩어져 있고 직접 가서 봐야 합니다.

게다가 background 세션은 파일을 건드리기 전에 `.claude/worktrees/<id>/` 아래 격리된 Git Worktree로 스스로 옮겨갑니다. 병렬 세션 간 파일 충돌은 막아주지만 평소 에디터에 열어둔 경로와 달라질 수 있어서 코드를 보면서 옆에서 Claude를 돌리던 밀착 작업과는 잘 안 맞습니다.

### 작업 성격에 따라 갈라 쓰기

- **밀착 작업** (코드 보면서, 파일 변경 따라가면서, 한 디렉터리에서 같이 손보는 작업): 예전처럼 foreground 세션을 해당 디렉터리에 띄워두고 옆에 에디터를 봅니다. 굳이 background로 안 보냅니다.
- **던져두고 잊는 작업** (PR 리뷰, 긴 자율 실행처럼 매 단계 안 봐도 되는 것): 이런 것만 background로 보내 Agent View로 모니터링합니다.

## 알아두면 좋은 점

- background 세션은 sleep/shutdown에서만 멈춥니다. 재부팅 후엔 `claude respawn --all`로 되살릴 수 있습니다.
- 목록에는 프로젝트 전체에 걸친 모든 background 세션이 표시됩니다. 어느 디렉터리에서 열었든 상관없습니다.

## 정리

Agent View는 지켜볼 필요 없는 병렬 작업을 한곳에 모아 상태를 살피는 대시보드입니다. foreground 세션과 background 세션을 나눠두고 background로 보낸 작업만 거기서 모니터링합니다. 수많은 터미널 탭과 반쯤 잊힌 세션을 정리하는 데는 잘 맞습니다. 다만 파일을 같이 보며 하는 밀착 작업은 여전히 foreground 세션으로 두는 게 좋습니다. 둘을 작업 성격에 맞게 구분해서 쓰면 되겠습니다.

## 참고

- [Agent View 공식 문서 (code.claude.com)](https://code.claude.com/docs/en/agent-view)
- [Agent View in Claude Code (Anthropic 블로그)](https://claude.com/blog/agent-view-in-claude-code)
- [Anthropic adds Agent View to Claude Code CLI interface (TestingCatalog)](https://www.testingcatalog.com/anthropic-adds-agent-view-for-claude-code-for-parralel-work/)
- [Claude Code Agent View (Sébastien Dubois)](https://www.dsebastien.net/claude-code-agent-view/)
