---
title: 맥 터미널에서 한글이 섞여도 표가 안 깨지게 만들기
tags:
  - macos
  - terminal
  - font
  - nerd-fonts
  - unicode
  - powerlevel10k
  - vscode
created: 2026-07-30 15:25
updated: 2026-07-30 15:41
---

> [!abstract] 한 줄 요약
> macOS 기본 터미널에서 박스 드로잉 선이 어긋나던 원인을 한글 글리프 부재와 East Asian Width까지 따라가 본 뒤 Monoplex KR Nerd 단일 폰트로 바꾼 기록입니다.

## 개요

macOS 기본 터미널에서 Claude Code를 쓰다가 화면이 어긋났습니다. Claude Code에서 주 언어를 한글로 쓰기 때문에 드러난 문제로, 영어만 쓰면 나타나지 않습니다. `tree`를 비롯한 다른 TUI 도구도 마찬가지였습니다. 폰트 하나 바꾸면 끝날 줄 알았는데 유니코드 문자 폭 규격까지 내려가야 했습니다.

작업 당시 환경입니다.

- 터미널: macOS 기본 터미널(Terminal.app)
- 셸: zsh + oh-my-zsh, 프롬프트는 powerlevel10k
- 폰트: MesloLGL Nerd Font

`┌ ─ │ └` 같은 박스 드로잉 문자로 그린 표에서 세로선이 위아래로 어긋났습니다. 한글이 들어간 줄부터 틀어집니다.

## 원인 1. 한글은 모노스페이스가 아니라 듀오스페이스입니다

한글은 라틴 문자의 두 배 폭을 차지합니다. 한영 혼용 환경에서 정렬이 맞으려면 **폭 비율이 정확히 2:1**이어야 합니다. 이 조건을 만족하는 글꼴을 모노스페이스와 구분해 듀오스페이스(duospace)라고 부르기도 합니다.

그런데 쓰고 있던 Meslo LG는 Menlo(Bitstream Vera / DejaVu 계열) 파생이라 **한글 글리프가 아예 없습니다**. Font Book에서 열어 보면 바로 확인됩니다. 한글은 macOS 폴백 폰트(애플 SD 산돌고딕 네오 등)가 대신 그리고 있었습니다. 그 폭이 Meslo와 맞을 이유가 없었습니다.

여기서 제약이 하나 걸립니다. iTerm2나 Ghostty는 ASCII 폰트와 non-ASCII 폰트를 따로 지정할 수 있지만 **macOS 기본 터미널에는 그 옵션이 없습니다**. 기본 터미널을 계속 쓸 생각이었으므로 한글과 라틴 문자를 한 폰트 안에서 해결해야 했습니다.

## 원인 2. East Asian Width의 Ambiguous 문제

박스 드로잉 문자(U+2500–U+257F)나 일부 그리스 문자는 ambiguous width 부류입니다. 유니코드가 폭을 1칸으로도 2칸으로도 확정하지 않은 글자들입니다. 한자처럼 확실히 두 칸인 글자, 라틴 문자처럼 확실히 한 칸인 글자와 달리 애플리케이션이 알아서 정하라고 열어 둔 영역입니다.

터미널은 1칸으로 계산하고 커서를 옮기는데 폰트가 2칸짜리 글리프를 그리면 선이 어긋납니다. 반대 경우도 마찬가지입니다. 대부분의 TUI 도구는 narrow(1칸)를 기준으로 화면을 그립니다.

## 폰트 후보 검토

한글, Nerd Fonts 아이콘, 2:1 폭을 동시에 만족해야 했습니다.

| 폰트 | 한글 | Nerd 아이콘 | 비고 |
|---|---|---|---|
| D2Coding | O | X | 국내 표준급. 한자 미포함, ambiguous 폭 제어 옵션 없음 |
| Sarasa Gothic | O | X | Iosevka + 본고딕 조합. Term/Fixed 변형이 반각 대시라 터미널에 적합 |
| Monoplex KR Nerd | O | O | IBM Plex Mono + IBM Plex Sans KR + Nerd Fonts |

Sarasa를 Nerd Fonts로 패치한 `howyay/Sarasa-NF` 저장소를 찾았지만 2022년 1월에 아카이브되어 릴리스도 없는 상태였습니다. 한 폰트로 전부 해결되는 Monoplex KR Nerd를 쓰기로 했습니다.

Monoplex KR은 IBM Plex Mono에 IBM Plex Sans KR을 더해 만든 프로그래밍 글꼴입니다. 두 글꼴에 모두 글자가 있으면 IBM Plex Mono를 씁니다. 생성 스크립트는 일본어 폰트인 PlemolJP 프로젝트에서 가져왔습니다. 네 가족으로 나뉩니다.

- **Monoplex KR**: 넓은폭:좁은폭 = 2:1 고정폭
- **Monoplex KR Nerd**: 위에 Powerline 기호, 매테리얼 디자인 등 Nerd Fonts 추가
- **Monoplex KR Wide**: 5:3 비율
- **Monoplex KR Wide Nerd**: Wide + Nerd Fonts

터미널 정렬이 목적이라면 2:1인 기본형 계열, **Monoplex KR Nerd**입니다.

## 설치

[릴리스 페이지](https://github.com/y-kim/monoplex/releases)에서 `MonoplexKRNerd` 압축 파일을 받습니다.

```bash
cd ~/Downloads
unzip MonoplexKRNerd*.zip -d MonoplexKRNerd
cd MonoplexKRNerd
cp MonoplexKRNerd-{Regular,Bold,Italic,BoldItalic}.ttf ~/Library/Fonts/
chmod 644 ~/Library/Fonts/MonoplexKRNerd-*.ttf
```

압축에는 Thin부터 Bold까지 16개 웨이트가 들어 있지만 터미널이 실제로 호출하는 것은 Regular / Bold / Italic / BoldItalic 네 개뿐입니다. 나머지는 다른 앱의 폰트 목록만 길어지게 해서 네 개만 복사했습니다.

압축을 풀면 실행 비트(`755`)가 남아 있는 경우가 있습니다. 폰트 파일에는 불필요하므로 `644`로 맞췄습니다. 동작에 영향은 없습니다.

## 터미널 설정

### 1. 폰트 변경

터미널 → 설정 → 프로파일 → **텍스트** 탭 → 폰트 변경 → `Monoplex KR Nerd` / Regular를 고릅니다.

목록에 안 보이면 터미널을 `⌘Q`로 완전히 종료한 뒤 다시 실행합니다.

### 2. ambiguous 폭 설정 확인

같은 프로파일의 **고급** 탭 → 다국어 항목 → **유니코드 동아시아 모호한 문자 넓게 표시**를 체크 해제합니다. 영문 UI에서는 `Unicode East Asian Ambiguous characters are wide`입니다.

이 설정은 선택한 프로파일에만 적용됩니다. 프로파일이 여러 개면 설정도 그만큼 따로 있습니다. TUI 렌더링이 깨지는 흔한 원인입니다. Claude Code에도 이 설정 때문에 화면이 깨진다는 버그 리포트가 올라온 적이 있습니다.

제 환경에서는 이미 해제되어 있었습니다. 원인은 설정이 아니라 폰트 쪽이었습니다.

## 검증

```bash
printf '┌─────┬─────┐\n│한글 │ABCD │\n└─────┴─────┘\n'
printf '\ue0b0 \ue0b2 \uf07c \uf09b\n'
```

첫 줄은 세로선이 위아래로 일직선이어야 합니다. `한글`(2칸 × 2자)과 `ABCD`(1칸 × 4자)가 같은 폭의 칸에 들어가면 맞습니다. 둘째 줄은 Powerline 삼각형 두 개와 폴더·깃허브 아이콘이 `□`로 뜨면 실패입니다. 이 줄은 zsh 기준입니다. macOS 기본 bash 3.2의 `printf`는 `\u` 이스케이프를 처리하지 않아 `\ue0b0`이 글자 그대로 찍힙니다.

두 줄 모두 정상 출력되면 끝입니다.

## powerlevel10k 재설정

powerlevel10k는 권장 폰트인 MesloLGS NF의 글리프 폭을 기준으로 프롬프트 간격을 계산합니다. 폰트를 바꿨으니 다시 잡아 줘야 했습니다.

```bash
p10k configure
```

글리프 렌더링 확인 단계에서 실제로 보이는 대로 답하면 간격이 맞춰집니다.

Monoplex KR Nerd에 든 Nerd Fonts는 비교적 이전 빌드 기준입니다. 기본 프롬프트가 쓰는 Powerline 구분자와 주요 아이콘은 문제없지만 커스텀 세그먼트에 최신 아이콘을 넣었다면 위 검증 단계에서 걸러집니다.

## VS Code 설정

`⌘⇧P` → `Preferences: Open User Settings (JSON)`으로 열고 두 항목을 넣었습니다.

```json
{
  "editor.fontFamily": "'Monoplex KR Nerd', Menlo, Monaco, 'Courier New', monospace",
  "terminal.integrated.fontFamily": "'Monoplex KR Nerd', 'MesloLGL Nerd Font', monospace"
}
```

에디터와 통합 터미널은 설정이 별개입니다. `terminal.integrated.fontFamily`를 비워 두면 `editor.fontFamily` 값을 따라가지만 이미 다른 값이 들어 있으면 따로 덮어써야 합니다.

폴백도 남겨 뒀습니다. CSS처럼 앞에서부터 순서대로 탐색하므로 Monoplex에 없는 글자가 나와도 뒤의 폰트가 받아 줍니다.

VS Code 통합 터미널은 애초에 이 문제에 강합니다. GPU 가속이 켜져 있으면 박스 드로잉(U+2500–U+257F), 블록 요소(U+2580–U+259F), Powerline 기호 일부(U+E0B0–U+E0B7)를 폰트 대신 자체 렌더링합니다. 폰트가 해당 문자를 지원하지 않아도 픽셀 단위로 셀 크기에 맞춰 늘여서 그립니다. `terminal.integrated.customGlyphs`로 끌 수 있지만 기본값 `true`를 그대로 뒀습니다.

설정 변경은 보통 즉시 반영됩니다. 안 되면 `Developer: Reload Window`(`⌘R`)를 씁니다. 터미널은 리로드보다 인스턴스를 죽이고 `` ⌃` ``로 새로 여는 쪽이 확실했습니다.

## 정리

박스 드로잉이 어긋난 것은 ambiguous width 설정 탓이 아니라 Meslo LG에 한글 글리프가 없어서였습니다. 한글을 macOS 폴백 폰트가 대신 그리고 있었으니 폭이 맞을 수가 없었습니다.

그래서 폭 비율이 2:1인 단일 폰트로 갈았습니다. 기본 터미널은 non-ASCII 전용 폰트를 따로 지정할 수 없어서 영문 폰트에 한글 폴백을 붙이는 구성 자체가 선택지에서 빠졌습니다. 한글과 Nerd Fonts 아이콘을 한 파일에 함께 담은 것은 Monoplex KR Nerd뿐이라 이쪽으로 정했습니다. 16개 웨이트 중 터미널이 부르는 네 개만 설치했습니다.

폰트를 바꾼 뒤에는 `p10k configure`를 다시 돌려 간격을 맞췄습니다. Monoplex KR Nerd의 Nerd Fonts 빌드가 이전 기준이라는 조건은 남아 있습니다. 최신 아이콘을 쓸 일이 생기면 검증 단계에서 드러납니다.

ambiguous width 설정은 이미 narrow였지만 프로파일 단위라 새 프로파일을 만들면 다시 확인해야 합니다. non-ASCII 전용 폰트 지정이나 자체 글리프 렌더링이 필요해지면 iTerm2·Ghostty·WezTerm 쪽을 보게 될 것 같습니다.

## 참고

- [Monoplex KR](https://github.com/y-kim/monoplex) — 저장소 및 릴리스. 네 가족 구분과 폭 비율, PlemolJP 파생 관계
- [Sarasa Gothic](https://github.com/be5invis/Sarasa-Gothic) — Mono / Term / Fixed 변형 설명
- [VS Code: Terminal Appearance](https://code.visualstudio.com/docs/terminal/appearance) — `terminal.integrated.customGlyphs` 문서
- [D2Coding](https://github.com/naver/d2codingfont)
- 라이선스 — Monoplex 생성 스크립트는 MIT, 폰트 자체는 SIL Open Font License v1.1입니다. PlemolJP 생성 스크립트(MIT)에서 파생되었습니다
