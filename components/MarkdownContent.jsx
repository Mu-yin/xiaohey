import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const plainText = (children) => Array.isArray(children) ? children.map(plainText).join("") : String(children ?? "");
const headingId = (children) => `md-${plainText(children).toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "")}`;
const assetUrl = (value = "", basePath = "") => !value || /^(https?:|data:|blob:|#)/.test(value) ? value : `${basePath}/${value.replace(/^\.?\//, "")}`;

export function extractMarkdownHeadings(markdown = "") {
  return [...markdown.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match, index) => {
    const title = match[2].replace(/[*_`~\[\]]/g, "").trim();
    return { depth: match[1].length, title, id: headingId(title) || `md-section-${index + 1}` };
  });
}

export default function MarkdownContent({ children = "", className = "", basePath = "" }) {
  return <div className={`markdown-content ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children: value, ...props }) => <h1 id={headingId(value)} {...props}>{value}</h1>,
        h2: ({ children: value, ...props }) => <h2 id={headingId(value)} {...props}>{value}</h2>,
        h3: ({ children: value, ...props }) => <h3 id={headingId(value)} {...props}>{value}</h3>,
        a: ({ href = "", children: value, ...props }) => {
          const external = /^https?:\/\//.test(href);
          return <a href={assetUrl(href, basePath)} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} {...props}>{value}</a>;
        },
        img: ({ src = "", alt = "", ...props }) => <img src={assetUrl(src, basePath)} alt={alt} loading="lazy" {...props} />,
      }}
    >{children}</ReactMarkdown>
  </div>;
}
