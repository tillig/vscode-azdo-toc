import type MarkdownIt from "markdown-it";
import Renderer from "markdown-it/lib/renderer";
import StateCore from "markdown-it/lib/rules_core/state_core";

/**
 * Activates the extension and attaches the Azure DevOps TOC preview to the Markdown preview.
 * @param {vscode.ExtensionContext} context The extension context with which commands may be registered.
 */
export function activate() {
  return {
    extendMarkdownIt(md: MarkdownIt) {
      return md.use(tocPreviewer);
    },
  };
}

/**
 * Registers the TOC preview renderer.
 * @param {MarkdownIt} md The MarkdownIt instance to decorate with TOC rendering support.
 */
function tocPreviewer(md: MarkdownIt) {
  let documentState: StateCore;

  // Register a rule to grab the entire document so we can parse out headings.
  md.core.ruler.push("vscode-azdo-toc-state", (state) => {
    documentState = state;
  });

  // Register a rule to kick off the TOC renderer when the [[_TOC_]] block is hit.
  md.core.ruler.push("vscode_azdo_toc", (state) => {
    const blockTokens = state.tokens;
    for (let j = 0, l = blockTokens.length; j < l; j++) {
      const blockToken = blockTokens[j];
      if (
        blockToken.type !== "inline" ||
        blockToken.content !== "[[_TOC_]]"
      ) {
        continue;
      }

      // Our renderer gets invoked when this token is rendered.
      blockToken.children = [new state.Token("vscode_azdo_toc", "", 0)];
    }
  });

  // Render tokens named "vscode_azdo_toc" (as added by our rule above).
  md.renderer.rules.vscode_azdo_toc = (
    _1,
    _2,
    options: MarkdownIt.Options,
    env: any,
    self: Renderer
  ) => {
    const tokens = documentState.tokens;
    let tocBody = "";
    let currentLevel = 0;
    for (let i = 0; i < tokens.length; ++i) {
      const token = tokens[i];
      if (token.type === "heading_open") {
        // Tag is h1 - h6. Parse the current indent level based on the tag number.
        const level = parseInt(token.tag.substring(1));
        if (level > currentLevel) {
          // Indent from current level to target level. If it jumps from H1 to H3, it'll get two indents.
          tocBody += '<ul>'.repeat(level - currentLevel);
        } else if (level == currentLevel) {
          // Heading at the same level. End the previous heading so we can start the next one.
          tocBody += "</li>";
        } else {
          // Heading at a previous level. End the previous heading and unindent. If it jumps from H3 to H1, it'll get two unindents.
          tocBody += "</li>" + "</ul>".repeat(currentLevel - level);
        }

        // Start the list item for the header.
        tocBody += '<li>';
        currentLevel = level;
      } else if (
        token.type === "inline" &&
        tokens[i - 1].type === "heading_open"
      ) {
        // This is the tag content.
        tocBody += `<a href="#${slugify(token.content)}">${self.renderInline(
          token.children!,
          options,
          env
        )}</a>`;
      }
    }
    for (; currentLevel > 0; --currentLevel) {
      // Close any unclosed headers.
      tocBody += "</li></ul>";
    }
    return (
      '<div style="border:1px solid;border-color:rgba(var(--palette-neutral-8,234, 234, 234),1);border-radius:4px;display:inline-block;padding:10px 16px 0px 0px;min-width:250px;margin-bottom:14px;">' +
      '<div style="font-weight:600;margin:0 16px 5px 16px;">Contents</div>' +
      tocBody +
      "</div>"
    );
  };
}

/**
 * Converts header text into an anchor link.
 * @param {string} s The header content to convert.
 * @returns The anchor link associated with the header.
 */
function slugify(s: string) {
  return encodeURIComponent(
    String(s).trim().toLowerCase().replace(/\s+/g, "-")
  );
}
