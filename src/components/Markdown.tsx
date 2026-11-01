import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown domyślnie nie renderuje surowego HTML, więc treść wygenerowana przez AI
// nie może wstrzyknąć skryptów ani znaczników do strony.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: content }) => (
            <a href={href} rel="noopener noreferrer" target={href?.startsWith("http") ? "_blank" : undefined}>
              {content}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
