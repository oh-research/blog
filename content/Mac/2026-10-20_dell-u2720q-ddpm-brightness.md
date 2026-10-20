---
title: 맥북에서 Dell U2720Q 모니터 밝기를 소프트웨어로 조절하기
description: macOS에서 Dell U2720Q의 밝기를 조절하는 방법을 알게 되어 Dell 공식 앱 DDPM을 설치하고 밝기 조절이 되기까지의 과정과 DDPM으로 할 수 있는 기능들을 메뉴별로 정리한 기록.
tags:
  - macos
  - monitor
  - dell
  - ddc-ci
  - ddpm
  - firmware
created: 2026-10-20
updated: 2026-10-20
draft: false
---

> [!abstract] 한 줄 요약
> macOS에서 Dell U2720Q의 밝기를 소프트웨어로 조절하는 방법을 알게 되어 Dell 공식 앱 DDPM을 설치하고 밝기 조절이 되기까지의 과정(모니터 펌웨어 업데이트 포함)과 DDPM으로 할 수 있는 기능들을 메뉴별로 남긴 기록입니다.

## 개요

맥북에 Dell U2720Q를 연결해 씁니다. macOS는 Apple 디스플레이가 아닌 외장 모니터의 밝기를 기본 상태에서는 조절해 주지 않아서 밝기를 바꿀 때마다 모니터 오른쪽 하단의 버튼으로 OSD 메뉴를 열어야 했습니다.

U2720Q는 **DDC/CI**(Display Data Channel / Command Interface)를 지원합니다. 컴퓨터가 디스플레이 케이블로 모니터에 명령을 보내는 프로토콜입니다. 이 프로토콜을 쓰면 소프트웨어 디밍이 아니라 모니터의 하드웨어 밝기 자체를 컴퓨터에서 바꿀 수 있습니다. Dell 공식 앱인 **Dell Display and Peripheral Manager(DDPM)**가 이 프로토콜로 모니터를 제어합니다. DDPM을 설치하고 밝기 조절이 되기까지의 과정을 먼저 적고 그다음에 DDPM으로 할 수 있는 기능들을 메뉴별로 남겨 둡니다.

작업 당시 구성입니다.

| 항목 | 값 |
|---|---|
| 맥 | MacBook Pro (Apple Silicon, M5 Pro), macOS 27.0.1 |
| 모니터 | Dell U2720Q, USB-C로 직결 |
| DDPM | 2.3.0.2004 |
| 모니터 펌웨어 | M2T104에서 M2T105로 업데이트 |

## DDPM과 MonitorControl 중 고르기

맥에서 DDC/CI로 외장 모니터 밝기를 조절하는 앱은 크게 두 가지입니다.

| 앱 | 특징 |
|---|---|
| **Dell Display and Peripheral Manager(DDPM)** | Dell 공식 무료 앱. U2720Q를 정식 지원합니다. 밝기·대비 외에 색상 프리셋, 입력 전환, Easy Arrange 같은 Dell 전용 기능이 있습니다 |
| **MonitorControl** | 무료 오픈소스. DDC로 밝기·대비·볼륨을 조절하고 맥 키보드의 밝기 키로 바로 조작할 수 있습니다 |

고르기 전에 확인한 조건입니다.

- DDPM은 Apple Silicon 맥을 온전히 지원하고 인텔 맥은 macOS 14 이상에서 일부만 지원합니다. Dell은 지원을 Apple Silicon 전용으로 옮기는 중입니다.
- MonitorControl은 macOS Sequoia와 Tahoe에서 v4.3.3 이상을 써야 합니다. v4.2.0은 크래시가 날 수 있습니다.
- DisplayLink 독이나 동글을 거치면 DDC가 막혀서 어떤 앱을 써도 소프트웨어 디밍만 됩니다.

Dell 전용 기능도 써 보고 싶어서 DDPM을 골랐습니다.

## 1. DDPM 설치

1. [Dell DDPM 다운로드 페이지](https://www.dell.com/support/ddpm)에서 받습니다. Dell 지원 사이트에서 U2720Q를 검색해 드라이버 및 다운로드 항목으로 들어가도 됩니다.
2. `.dmg`를 열어 응용 프로그램 폴더로 옮기고 실행합니다.
3. 메뉴 막대의 DDPM 아이콘을 우클릭하고 **열기 Dell Display and Peripheral Manager**로 설정 창을 엽니다. 단축키 Ctrl+Shift+M으로도 열립니다.

## 2. 밝기 메뉴가 회색으로 비활성화된 문제

설정 창을 열어 보니 **Easy Arrange만 활성화**되어 있고 밝기/대비, 색상, 디스플레이 메뉴는 전부 회색이었습니다.

앱이 모니터와 DDC/CI 통신을 못 한다는 신호입니다. Dell 문서에도 DDC/CI가 꺼져 있으면 Easy Arrange만 동작한다고 나와 있습니다. Dell이 안내하는 점검 항목입니다.

1. **모니터 OSD에서 DDC/CI 켜기**: 모니터 오른쪽 하단의 물리 메뉴 버튼(화면 속 버튼이 아니라 본체에 달린 버튼)으로 OSD에 들어가서 Others → DDC/CI → On
2. **직결하기**: 허브·어댑터·연장 장치를 빼고 맥과 모니터를 직접 연결합니다. Apple Silicon 맥은 USB 업스트림 연결이나 USB-C 연결이 필요합니다.
3. **확장 모드 사용**: 미러링 모드에서는 DDPM이 동작하지 않습니다.
4. **DDPM 재시작**
5. **모니터 펌웨어를 최신으로 업데이트**: Dell은 DDPM for Mac을 쓰려면 모니터 펌웨어가 최신이어야 한다고 안내합니다.

OSD에서 확인한 모니터의 펌웨어는 **M2T104**였고 최신은 **M2T105**였습니다.

## 3. 모니터 펌웨어 업데이트 (M2T104에서 M2T105로)

### 펌웨어 다운로드

1. [Dell 지원 사이트](https://www.dell.com/support/home/ko-kr?app=drivers)에서 U2720Q를 검색합니다.
2. 운영 체제를 **Apple Mac OS**로 선택합니다.
3. **Mac OS 펌웨어 업데이트 패키지(버전 M2T105): U2720Q 모니터용**을 내려받습니다.

### 설치했는데 버전이 그대로인 함정

설치 프로그램을 실행하니 오류 없이 몇 초 만에 끝났습니다. 그런데 OSD에서 확인해 보니 여전히 **M2T104**였습니다.

이 설치 프로그램은 펌웨어를 바로 적용하지 않고 **업데이트 유틸리티 파일만 설치**합니다. 실제 업데이트는 아래 앱을 직접 실행해야 진행됩니다.

```
/Applications/Dell/firmware/U2720Q/MonitorFirmwareUpdateUtility_U2720Q.app
```

설치 프로그램이 깔아 둔 폴더의 내용입니다.

```
/Applications/Dell/firmware/U2720Q/
    Firmware Update Instruction.pdf
    M2T105/U2720Q_M2T105_20210903.upg
    MonitorFirmwareUpdateUtility_U2720Q.app
    MonitorFirmwareUpdateUtility_U2720Q.cfg
    Third-Party Component Licenses.pdf
```

`.cfg` 파일에는 `.upg` 펌웨어 파일의 경로 한 줄만 적혀 있고 유틸리티를 실행하면 이 파일을 자동으로 불러옵니다.

### 업데이트 전에 확인한 것

- 다른 외장 모니터는 모두 빼고 **U2720Q만 USB-C로 직결**합니다. 같은 폴더의 `Firmware Update Instruction.pdf`는 모니터 전원을 연결한 채 USB 업스트림 케이블을 꽂아 두고 끝날 때까지 뽑지 말라고 안내합니다.
- 업데이트 중에 화면 보호기나 잠자기가 켜지면 중단될 수 있어서 미리 꺼 두고 끝날 때까지 지켜봅니다.
- 안내문 기준으로 5~6분이 걸립니다.

위 앱을 실행하자 업데이트가 진행됐고 OSD에서 **M2T105**로 바뀐 것을 확인했습니다.

Dell 커뮤니티 매니저 설명에 따르면 M2T105에서 바뀐 내용은 맥에서 Dell 관리 앱이 동작하게 한 부분뿐이라고 합니다. 업데이트 뒤에도 밝기가 회색이면 DDC/CI 설정이나 연결 방식을 다시 점검해야 합니다.

## 4. 밝기 조절 확인

펌웨어 업데이트 뒤 DDPM을 재시작하고(필요하면 맥을 재부팅하고) 설정 창을 엽니다.

![[01-ddpm-brightness-contrast.png|720]]

회색이던 밝기/대비 메뉴가 활성화되어 있고 슬라이더가 모니터의 현재 밝기와 대비를 보여 줍니다. 입력 소스, 색상, 디스플레이 메뉴도 함께 열렸습니다. 이제 슬라이더를 움직이면 모니터 오른쪽 하단의 버튼을 누르지 않고도 밝기가 바뀝니다.

## 5. DDPM으로 할 수 있는 것

메뉴 막대의 DDPM 아이콘을 클릭하면 **메뉴 런처**라는 작은 패널이 뜹니다. 밝기/대비와 색상 섹션을 접었다 펼치는 간이 창이라 밝기만 바꿀 때는 이 패널로 충분합니다. 기본 단축키는 Ctrl+Shift+D입니다.

![[02-ddpm-menu-launcher.png|400]]

메인 창의 메뉴는 밝기/대비, 입력 소스, 색상, 디스플레이, Easy Arrange, 개인화, 기타 일곱 개입니다.

### 밝기/대비

수동 탭에는 밝기와 대비 슬라이더, 재설정 링크, 핫키 설정 링크가 있습니다. 스케줄 탭에서는 Day와 Night 두 시간대(기본 오전 8:00, 오후 5:00)에 밝기·대비 값을 따로 정해 두면 시간에 따라 자동으로 바뀝니다. **시스템 화면 모드를 따름** 스위치는 그 아래에 달려 있습니다.

![[03-ddpm-brightness-schedule.png|720]]

### 입력 소스

현재 입력 소스를 HDMI, USB-C, DP 중에서 고르고 각 입력의 이름을 바꿉니다. 핫키는 별도 탭입니다.

![[04-ddpm-input-source.png|720]]

### 색상

색상 탭은 HDR 스위치와 색상 프리셋을 다룹니다. 수동은 프리셋 하나(기본값 표준)를 전체에 적용하고 자동은 목록에 앱을 추가해 앱마다 프리셋을 따로 지정합니다. 야간 조명 스위치와 고급 버튼도 있습니다.

![[05-ddpm-color.png|720]]

### 디스플레이

해상도와 재생 빈도(현재 1920 x 1080, 60 Hz, HiDPI), 방향을 고릅니다.

![[06-ddpm-display.png|720]]

### Easy Arrange

창 배치 기능입니다. 레이아웃 탭에서 2개 창, 3개 창 같은 분할 템플릿을 고르거나 사용자 지정 레이아웃을 만듭니다. 탭은 레이아웃 말고도 Easy Memory, 설정, 핫키로 나뉩니다. 메뉴 막대 아이콘의 우클릭 메뉴에도 현재 창 레이아웃 저장·복원, 응용 프로그램 창 스냅, 창을 왼쪽·오른쪽·모서리로 보내기가 들어 있습니다.

![[07-ddpm-easy-arrange.png|720]]

### 개인화

메뉴 런처의 구성을 바꾸고 단축키를 정합니다. 기본값은 메뉴 런처 Ctrl+Shift+D, 메인 메뉴 Ctrl+Shift+M입니다.

![[08-ddpm-personalize.png|720]]

### 기타

PowerNap은 화면 보호기가 켜질 때 밝기를 낮추거나 디스플레이를 끄는 기능입니다. 모니터 설정을 공장 기본값으로 되돌리는 재설정 버튼과 앱 설정 가져오기·내보내기 버튼도 여기 있습니다. 같은 모델을 감지하면 설정을 자동으로 적용하는 옵션은 그 아래에 붙어 있습니다.

![[09-ddpm-others.png|720]]

우클릭 메뉴에는 그 밖에 진단 보고서 저장, 모니터 화면 자산 보고서 저장, 새로 고침, 새 버전 검색, 설치 제거가 있습니다.

## 정리

macOS에서 U2720Q의 하드웨어 밝기는 DDC/CI로 조절하고 앱은 Dell 공식 DDPM을 골랐습니다. 설치 직후에는 Easy Arrange만 활성화되고 밝기 메뉴가 회색이었습니다. DDC/CI 통신이 안 될 때 나오는 상태라 Dell 안내대로 OSD의 DDC/CI 설정, 직결 여부, 확장 모드, 펌웨어 버전을 차례로 살펴보게 됩니다. 펌웨어는 설치 프로그램이 유틸리티만 깔아 두므로 `/Applications/Dell/firmware/U2720Q/` 안의 업데이트 유틸리티를 직접 실행해야 M2T105가 적용됩니다.

M2T105로 올린 뒤에는 밝기/대비 메뉴가 활성화되어 메뉴 막대 아이콘이나 Ctrl+Shift+D로 밝기를 바꿉니다. 밝기 말고도 시간대별 밝기 스케줄, 입력 전환, 앱별 색상 프리셋, 창 배치(Easy Arrange), PowerNap까지 DDPM 한 곳에서 다룹니다.

## 참고

- [How to Use Dell Display and Peripheral Manager for macOS](https://www.dell.com/support/kbdoc/en-cy/000201067/dell-display-and-peripheral-manager-for-macos) — Dell. DDC/CI가 꺼져 있으면 Easy Arrange만 동작한다는 설명과 점검 항목
- [Dell Display and Peripheral Manager for Windows](https://www.dell.com/support/kbdoc/000287285) — Dell
- [MonitorControl](https://github.com/MonitorControl/MonitorControl) — GitHub. 오픈소스 DDC 밝기 조절 앱
- `/Applications/Dell/firmware/U2720Q/Firmware Update Instruction.pdf` — 설치 프로그램이 함께 깔아 두는 안내문. 사전 조건(전원·USB 업스트림 케이블·소요 시간 5~6분)과 오류별 조치
- [U2720Q, MacBook Pro 2021, firmware M2T105 not applied](https://www.dell.com/community/Monitors/U2720Q-MacBook-Pro-2021-firmware-M2T105-not-applied/m-p/8360478) — Dell Community. 설치 후 버전이 그대로인 증상
- [U2720Q, MacBook Air M1, cannot update firmware M2T105, #2](https://www.dell.com/community/Monitors/U2720Q-MacBook-Air-M1-cannot-update-firmware-M2T105-2/m-p/8137188) — Dell Community
- [U2720Q, macOS, cannot update firmware M2T105, #2](https://www.dell.com/community/Monitors/U2720Q-MacBook-Air-M1-cannot-update-firmware-M2T105-2/m-p/8137110) — Dell Community
