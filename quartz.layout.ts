import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import NavHeader from "./quartz/components/NavHeader"
import PostMeta from "./quartz/components/PostMeta"
import RecentPosts from "./quartz/components/RecentPosts"
import SiteFooter from "./quartz/components/SiteFooter"

// 디자인 결정: ~/Documents/blog/PLAN.md "디자인 결정" 섹션 참고.
// 2열(본문 + 오른쪽 TOC), 상단 헤더(사이트명·카테고리·검색), 왼쪽 열 없음, 다크 모드 없음.

const CATEGORIES = ["Claude", "LocalLLM", "Mac", "Web", "생활"]

type Page = { fileData: { slug?: string } }
const isHome = (page: Page) => page.fileData.slug === "index"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [NavHeader({ categories: CATEGORIES }), Component.Search()],
  afterBody: [
    // 홈: 소개 본문 뒤에 최근 글 목록
    Component.ConditionalRender({
      component: RecentPosts({ title: "최근 글", limit: 10 }),
      condition: isHome,
    }),
    // 글 페이지: 태그는 본문 끝 (목록 페이지는 tags가 비어 있어 자동으로 안 나옴)
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => !isHome(page),
    }),
  ],
  footer: SiteFooter({
    owner: "Oh-Research",
    links: { GitHub: "https://github.com/oh-research" },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isHome(page),
    }),
    Component.ConditionalRender({
      component: PostMeta(),
      condition: (page) => !isHome(page),
    }),
  ],
  left: [],
  right: [Component.DesktopOnly(Component.TableOfContents())],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle()],
  left: [],
  right: [],
}
