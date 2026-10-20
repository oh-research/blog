// 커스텀: 글 목록 (날짜 · 카테고리 / 제목 / 요약 2줄). 기본 PageList 대체.
// FolderContent·TagContent가 `PostList as PageList`로 가져다 쓰고, 홈은 RecentPosts가 감싼다.
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { byDateAndAlphabetical, SortFn } from "./PageList"
import { categoryOf, formatDateDot } from "./PostMeta"
import { getDate } from "./Date"
import { unescapeHTML } from "../util/escape"

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

/** Description 플러그인이 본문 앞부분을 잘라 만든 요약에서 abstract 콜아웃 제목을 떼고,
 *  뒤따르는 "## 개요" 본문이 섞여 들어왔으면 그 앞에서 자른다 (BLOG.md 골격: abstract → ## 개요). */
function cleanDescription(page: QuartzPluginData): string | undefined {
  const raw = page.frontmatter?.description ?? page.description
  if (!raw) return undefined
  let s = unescapeHTML(raw)
    .replace(/^\s*한 줄 요약\s*/, "")
    .trim()
  const cut = s.search(/\s개요\s/)
  if (cut > 0) s = s.slice(0, cut).trim()
  return s
}

export const PostList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabetical(cfg)
  let list = [...allFiles].sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }
  // 카테고리 페이지 안에서는 같은 카테고리 라벨을 반복하지 않는다
  const hostCategory = fileData.slug?.endsWith("/index") ? categoryOf(fileData.slug) : undefined

  return (
    <ul class="post-list">
      {list.map((page) => {
        const title = page.frontmatter?.title
        const category = categoryOf(page.slug!)
        const showCategory = category && category !== hostCategory
        const date = page.dates ? getDate(cfg, page) : undefined
        const desc = cleanDescription(page)

        return (
          <li class="post-item">
            <p class="post-item-meta">
              {date && <time datetime={date.toISOString()}>{formatDateDot(date)}</time>}
              {showCategory && (
                <>
                  <span class="sep">·</span>
                  <a
                    class="post-category"
                    href={resolveRelative(fileData.slug!, `${category}/index` as FullSlug)}
                  >
                    {category}
                  </a>
                </>
              )}
            </p>
            <h3 class="post-item-title">
              <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                {title}
              </a>
            </h3>
            {desc && <p class="post-item-desc">{desc}</p>}
          </li>
        )
      })}
    </ul>
  )
}

PostList.css = `
ul.post-list {
  list-style: none;
  margin: 1.5rem 0 0 0;
  padding: 0;
}

li.post-item {
  margin: 0;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--lightgray);
}

li.post-item:first-child {
  padding-top: 0.25rem;
}

li.post-item:last-child {
  border-bottom: none;
}

.post-item-meta {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.5;
}

.post-item-meta .sep {
  margin: 0 0.45em;
}

.post-item-meta a.post-category {
  color: var(--muted);
  font-weight: 500;
}

.post-item-meta a.post-category:hover {
  color: var(--secondary);
}

h3.post-item-title {
  margin: 0.15rem 0 0 0;
  font-size: 1.12rem;
  line-height: 1.45;
}

h3.post-item-title a.internal {
  color: var(--dark);
  background: none;
  padding: 0;
  font-weight: 600;
  text-decoration: none;
}

h3.post-item-title a.internal:hover {
  color: var(--secondary);
}

.post-item-desc {
  margin: 0.35rem 0 0 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* popover 안에서는 요약 생략 */
.popover .post-item-desc {
  display: none;
}
`
