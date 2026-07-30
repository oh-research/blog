---
title: 맥북에서 완전 로컬 LLM에 웹 검색 붙이기
tags:
  - local-llm
  - lm-studio
  - searxng
  - anythingllm
  - mlx
created: 2026-06-02 22:30
updated: 2026-06-02 23:21
---

> [!abstract] 한 줄 요약
> M5 Pro MacBook(64GB)에서 LM Studio·SearXNG·AnythingLLM을 묶어 모델도 검색도 전부 기기 안에서 돌렸고, GGUF→MLX 교체와 모델 크기에 따른 검색 품질 차이까지 확인한 기록입니다.

## 개요

클라우드 LLM은 입력과 검색 쿼리가 외부 서버로 나갑니다. 그게 걸려서, 모델 실행과 웹 검색을 전부 내 맥북 안에서만 돌리는 환경을 만들기로 했습니다. 쓰던 기기는 MacBook Pro 14(M5 Pro, 통합 메모리 64GB, macOS Tahoe 26.5)입니다.

선택지는 세 가지였습니다. 검색 없이 LLM만 쓰기, 클라우드 검색 API(Brave·Tavily 등)를 붙이기, 검색까지 자체 호스팅하기. 검색 쿼리마저 기기 밖으로 내보내지 않는 걸 우선해서, 손이 더 가더라도 세 번째 방식으로 갔습니다.

구성은 세 부분입니다. **LM Studio**가 모델을 실행하고 OpenAI 호환 API 서버를 열고, **SearXNG**가 검색을 담당하고, **AnythingLLM**이 둘을 묶는 채팅 화면입니다.

```
[AnythingLLM]  ← 채팅 화면
   ├─ 모델 요청 →  [LM Studio 서버]   (localhost:1234)
   └─ 검색 요청 →  [SearXNG]          (localhost:8080)
```

## LM Studio: 모델 실행 + 서버

[LM Studio](https://lmstudio.ai)를 설치하고 첫 모델로 `gemma-4-e4b`(약 6.3GB)를 받았습니다. 이미지 입력·추론·tool calling을 지원합니다. 웹 검색을 붙이려면 이 도구 호출 기능이 필요합니다.

서버는 Developer 탭에서 켭니다. 포트는 기본값 1234를 그대로 뒀고, 로컬에서만 쓰니 인증은 껐습니다. JIT 자동 로드와 안 쓰는 모델 자동 언로드(60분), 마지막 모델만 유지 옵션을 켜서 메모리 점유를 줄였습니다.

서버가 뜬 뒤 응답을 확인했습니다.

```bash
curl http://localhost:1234/v1/models
```

받아둔 채팅 모델과 함께 임베딩 모델(`text-embedding-nomic-embed-text-v1.5`)이 같이 잡혀 있었습니다. 문서 RAG를 붙일 때 AnythingLLM이 이 임베딩 모델을 씁니다.

## SearXNG: 자체 호스팅 검색

SearXNG는 Docker로 띄웁니다. Docker Desktop은 개인용이라 계정 생성은 건너뛰고 권장 설정으로 설치했습니다.

컨테이너는 자동 재시작 옵션을 붙여 실행했습니다. 다음부터 Docker만 켜면 SearXNG가 같이 떠서 매번 명령을 칠 필요가 없습니다.

```bash
docker run -d \
  --name searxng \
  --restart unless-stopped \
  -p 8080:8080 \
  -v "$HOME/searxng:/etc/searxng" \
  docker.io/searxng/searxng:latest
```

AnythingLLM이 결과를 읽으려면 JSON 출력을 켜야 합니다. 생성된 `settings.yml`의 `formats:`에 `json`을 추가하고 재시작했습니다.

```yaml
search:
  formats:
    - html
    - json
```

JSON이 나오는지 확인했습니다.

```bash
curl "http://localhost:8080/search?q=test&format=json"
```

google·duckduckgo·startpage·wikipedia 등에서 결과를 모아 JSON으로 돌려줬습니다. 결과 끝에는 일부 엔진(brave, wikidata)이 일시적으로 응답하지 않는다고 떴지만, 나머지 엔진이 결과를 채워줘서 검색에는 지장이 없었습니다.

## AnythingLLM: 둘을 묶기

[AnythingLLM](https://anythingllm.com) 데스크톱 앱을 설치했습니다. 첫 마법사가 내장 LLM(Ollama 기반)을 추천하는데, 그걸 받으면 LM Studio를 안 쓰고 모델을 또 받게 됩니다. 수동 설정으로 가서 LLM Provider를 LM Studio로 지정했습니다.

- Provider: LM Studio
- Base URL: `http://127.0.0.1:1234/v1`
- Model: `google/gemma-4-e4b`
- Context Window: 8192

임베딩은 AnythingLLM 내장 임베더, 벡터 DB는 LanceDB 기본값을 그대로 뒀습니다. 셋 다 기기 안에서 처리되는 구성입니다.

검색 연결은 설정의 에이전트 구성 → Configure Agent Skills → 실시간 웹 검색 및 탐색에서 합니다. 검색 엔진을 SearXNG로 고르고 API Base URL에 `http://localhost:8080`을 넣은 뒤 저장했습니다.

검색은 에이전트 모드로 동작합니다. 메시지 앞에 `@agent`를 붙이면 SearXNG로 검색하고 결과를 종합해 답합니다. `@agent`가 없으면 검색 없이 모델이 자기 기억만으로 답합니다.

```
@agent 오늘 한국 주요 뉴스 검색해서 알려줘
```

## GGUF에서 MLX로 바꾼 이유

처음 응답이 느렸습니다. 서버 로그에 Metal 관련 경고가 있었습니다.

```
ggml_metal_device_init: the tensor API is not supported in this environment - disabling
```

찾아보니 M5에서 GGUF(llama.cpp) 모델을 돌릴 때 흔히 뜨는 경고로, tensor API라는 가속 기능 하나가 꺼지는 것이고 GPU 추론 자체는 동작합니다. M5에서는 MLX가 GGUF보다 빠르다는 자료가 많아서, 같은 모델의 MLX 버전(`gemma-3n-e4b`, MLX 4bit)으로 바꿨습니다. 모델 크기는 그대로라 품질 손해 없이 속도만 챙기는 선택이었습니다.

바꾼 직후 검색에서 토큰 초과 에러가 났습니다.

```
The number of tokens to keep from the initial prompt is greater than the context length.
```

검색 결과 20개를 모델에 넣는데 컨텍스트(기본 4096)가 모자란 것이었습니다. LM Studio에서 모델을 다시 로드할 때 Context Length를 8192로 올려 해결했습니다. 같은 모델을 두 번 로드해 인스턴스가 겹친 적이 있었는데(`:2`가 붙음), 둘 다 내리고 8192 설정으로 하나만 다시 로드하니 깔끔해졌습니다.

MLX + 8192로 바꾼 뒤 검색이 눈에 띄게 빨라졌고 Metal 경고도 사라졌습니다.

## 작은 모델의 환각과 14B 도입

여기서 한 가지 문제를 만났습니다. gemma 4B로 돌리면 검색 자체는 정상으로 되는데(출처 17개 이상 수집), 정작 답에는 검색 결과를 무시하고 학습 시점(2024년경) 기억으로 지어낸 내용이 나왔습니다. 비트코인 가격을 물으면 2024년 5월의 약 $73,000를 현재가처럼 단정했고, 오늘 날짜도 2024년으로 적었습니다. 거짓을 자신 있게 말하는 쪽이라 더 다루기 까다로웠습니다.

작은 모델은 검색 결과를 받아도 그걸 우선하지 못하는 경향이 있다고 봤습니다. 그래서 받아둔 `Qwen3-14B-MLX-4bit`(약 8.3GB)로 바꿨습니다. Tool Use와 추론을 지원하고, 컨텍스트는 기본 32k에 YaRN으로 131k까지 갑니다. AnythingLLM에서 워크스페이스 LLM 제공자를 이 모델로 바꾼 뒤 같은 질문을 다시 했습니다.

14B로 바꾸니 행동이 달라졌습니다. 비트코인 현재가는 "검색 결과로는 확인할 수 없다"며 단정을 피했고, 최신 아이폰을 물으니 검색 결과를 종합해 **iPhone 17 시리즈**라고 정확히 답했습니다. iPhone 17은 모델 학습 시점 이후에 나온 정보라, 검색 결과를 제대로 반영했다는 신호로 봤습니다. 4B가 거짓을 지어내던 자리에서 14B는 모르는 건 모른다고 하고 검색 결과는 따랐습니다.

## 검색이 잘 되는 영역과 한계

테스트를 거치며 검색이 강한 부분과 약한 부분이 갈렸습니다.

- **잘 되는 것**: 최신 뉴스, 제품·인물·사건, 개념 설명처럼 검색 결과 스니펫(제목·요약)에 답이 담기는 텍스트형 질문. iPhone 17 같은 답이 정확히 나옵니다.
- **약한 것**: 비트코인 시세·환율·주가 같은 실시간 숫자. 검색 스니펫에는 실시간 숫자가 잘 담기지 않아, 부정확하거나 확인 불가로 나옵니다. 이건 셋업 문제가 아니라 일반 웹 검색의 한계라, 그런 값은 직접 사이트에서 봅니다.

오늘 날짜를 모델이 못 맞히는 것도 같은 맥락입니다. 검색 엔진은 오늘이 며칠인지 딱 떨어지게 알려주지 않고, 모델 자체도 현재 날짜를 모릅니다. AnythingLLM 시스템 프롬프트에 날짜 변수를 넣어 해결할 수 있습니다.

```
오늘 날짜는 {date} 입니다. 검색 결과의 최신 정보를 우선해서 답하세요.
```

`{date}`는 AnythingLLM이 실제 오늘 날짜로 치환합니다.

## 정리

검색 쿼리가 밖으로 나가지 않는 로컬 환경을 만들고 싶어서 LM Studio(모델)·SearXNG(검색)·AnythingLLM(통합)을 묶었습니다. M5에서는 GGUF보다 MLX가 빨라 모델을 MLX로 바꿨고, 검색 결과를 넣으려면 컨텍스트가 4096으로는 모자라 8192로 올렸습니다.

모델 크기에 따라 검색 활용도가 갈렸습니다. 4B는 빠르지만 검색 결과를 무시하고 옛 기억으로 지어내는 경우가 있었고, 14B는 검색 결과를 따르고 모르는 건 모른다고 했습니다. 그래서 일상 대화는 gemma 4B MLX로 빠르게, 검색과 정확도가 필요한 작업은 Qwen3 14B로 처리하기로 했습니다. AnythingLLM에서 모델 교체는 클릭 몇 번이라 병행이 어렵지 않습니다.

다음에 켤 때는 Docker 실행(SearXNG 자동 시작) → LM Studio 서버 ON → AnythingLLM 순서면 됩니다. 일반 질문은 그냥 입력하고, 검색이 필요할 때만 `@agent`를 붙입니다.

한계는 분명합니다. 웹 검색은 실시간 숫자나 오늘 날짜처럼 스니펫에 안 담기는 정보에는 약하므로, 그런 값은 따로 확인합니다. 컨텍스트를 키우거나 큰 모델을 쓰면 메모리·속도를 더 쓰므로 작업에 맞춰 모델을 고르게 됩니다.

## 참고

- [LM Studio](https://lmstudio.ai)
- [SearXNG 문서](https://docs.searxng.org)
- [AnythingLLM](https://anythingllm.com)
- [Docker Desktop](https://www.docker.com)
