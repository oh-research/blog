// 커스텀: 푸터 "© 2026 Oh-Research · GitHub · RSS". 기본 Footer(Quartz 홍보 문구) 대체.
import { joinSegments, pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface Options {
  owner: string
  links: Record<string, string>
  showRss: boolean
}

const defaultOptions: Options = {
  owner: "Oh-Research",
  links: {},
  showRss: true,
}

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const SiteFooter: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const rssHref = joinSegments(pathToRoot(fileData.slug!), "index.xml")
    return (
      <footer class={classNames(displayClass, "site-footer")}>
        <span>
          © {year} {opts.owner}
        </span>
        {Object.entries(opts.links).map(([text, href]) => (
          <>
            <span class="sep">·</span>
            <a href={href}>{text}</a>
          </>
        ))}
        {opts.showRss && (
          <>
            <span class="sep">·</span>
            <a href={rssHref}>RSS</a>
          </>
        )}
      </footer>
    )
  }

  SiteFooter.css = `
footer.site-footer {
  margin: 3rem 0 4rem 0;
  font-size: 0.85rem;
  color: var(--muted);
}

footer.site-footer .sep {
  margin: 0 0.5em;
}

footer.site-footer a {
  color: var(--muted);
  font-weight: 500;
}

footer.site-footer a:hover {
  color: var(--secondary);
}
`
  return SiteFooter
}) satisfies QuartzComponentConstructor
