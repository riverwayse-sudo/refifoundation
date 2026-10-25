import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the Markdown written in the CMS. react-markdown escapes raw HTML by
// default, so CMS-authored content cannot inject markup into the page.
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
