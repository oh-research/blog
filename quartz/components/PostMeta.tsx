// 커스텀: 글 메타 줄 — "2026.09.28 · Mac (· 2026.10.02 수정)". 기본 ContentMeta 대체.
// 읽기 시간 없음. 대표 날짜는 created, 수정일은 날짜가 다를 때만 병기.
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

export function formatDateDot(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

/** slug의 첫 세그먼트가 카테고리. 루트/태그/폴더 index 페이지는 없음. */
export function categoryOf(slug: string): string | undefined {
  const parts = slug.split("/")
  if (parts.length < 2) return undefined
  if (parts[0] === "tags") return undefined
  return parts[0]
}

interface Options {
  showModified: boolean
}

const defaultOptions: Options = {
  showModified: true,
}

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const PostMeta: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const dates = fileData.dates
    if (!dates) return null

    const slug = fileData.slug!
    const created = formatDateDot(dates.created)
    const modified = formatDateDot(dates.modified)
    const category = categoryOf(slug)

    return (
      <p class={classNames(displayClass, "post-meta")}>
        <time datetime={dates.created.toISOString()}>{created}</time>
        {category && (
          <>
            <span class="sep">·</span>
            <a class="post-category" href={resolveRelative(slug, `${category}/index` as FullSlug)}>
              {category}
            </a>
          </>
        )}
        {opts.showModified && modified !== created && (
          <>
            <span class="sep">·</span>
            <span class="post-updated">
              <time datetime={dates.modified.toISOString()}>{modified}</time> 수정
            </span>
          </>
        )}
      </p>
    )
  }

  PostMeta.css = `
.post-meta {
  margin: 0.4rem 0 0 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.post-meta .sep {
  margin: 0 0.45em;
}

.post-meta a.post-category {
  color: var(--muted);
  font-weight: 500;
}

.post-meta a.post-category:hover {
  color: var(--secondary);
}
`
  return PostMeta
}) satisfies QuartzComponentConstructor
