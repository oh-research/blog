# Oh-Research Blog

개인 노트와 글을 모아두는 공간.

🔗 https://oh-research.github.io/blog

## 운영 방식

- 글은 옵시디언 볼트 `2ndSeminBrain/blog/`에서 관리
- 폴더 구조 = 사이트 카테고리
- `sync.py`로 옵시디언 → `content/` 동기화
- GitHub Actions가 `main` 브랜치 푸시 시 자동 빌드·배포

자세한 운영 가이드는 옵시디언의 `quartz-blog-guide.md` 참고.

## 작성·발행 명령어

```bash
blog-sync      # 옵시디언 blog/ → content/ 복사
blog-preview   # 로컬 미리보기 (http://localhost:8080)
blog-deploy    # 자동 커밋 + 푸시 → 배포
```

## 기술 스택

[Quartz v4](https://quartz.jzhao.xyz/) 기반 정적 사이트 생성기 + GitHub Pages.
