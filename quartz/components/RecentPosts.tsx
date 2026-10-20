// 커스텀: 홈 최근 글 목록. PostList를 감싸 제목 + 글 N개. 기본 RecentNotes 대체(목록 스타일 통일).
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { QuartzPluginData } from "../plugins/vfile"
import { PostList } from "./PostList"
import { byDateAndAlphabetical, SortFn } from "./PageList"
import { classNames } from "../util/lang"

interface Options {
  title: string
  limit: number
  filter: (f: QuartzPluginData) => boolean
  sort?: SortFn
}

/** 실제 글만: 루트 index, 태그 페이지, 카테고리 index 제외 */
export const isPost = (f: QuartzPluginData): boolean => {
  const slug = f.slug ?? ""
  if (slug === "index") return false
  if (slug.startsWith("tags/")) return false
  if (slug.endsWith("/index")) return false
  return true
}

const defaultOptions: Options = {
  title: "최근 글",
  limit: 10,
  filter: isPost,
}

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const RecentPosts: QuartzComponent = (props: QuartzComponentProps) => {
    const { allFiles, cfg, displayClass } = props
    const pages = allFiles.filter(opts.filter)
    const sort = opts.sort ?? byDateAndAlphabetical(cfg)
    return (
      <div class={classNames(displayClass, "recent-posts")}>
        <h2>{opts.title}</h2>
        <PostList {...props} allFiles={pages} sort={sort} limit={opts.limit} />
      </div>
    )
  }

  RecentPosts.css = `
.recent-posts > h2 {
  margin: 2.5rem 0 0 0;
  font-size: 1.1rem;
  color: var(--muted);
  font-weight: 600;
}

${PostList.css}
`
  return RecentPosts
}) satisfies QuartzComponentConstructor
