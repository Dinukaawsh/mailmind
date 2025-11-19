"use client";

import { useMemo, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
} from "lucide-react";
import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface TemplateEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  csvColumns?: string[];
  required?: boolean;
}

type FormatType =
  | "bold"
  | "italic"
  | "underline"
  | "bullet"
  | "number"
  | "quote"
  | "code"
  | "link";

export default function TemplateEditor({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  csvColumns = [],
  required = false,
}: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (type: FormatType) => {
    switch (type) {
      case "bold":
        wrapSelection("**", "**");
        break;
      case "italic":
        wrapSelection("*", "*");
        break;
      case "underline":
        wrapSelection("<u>", "</u>");
        break;
      case "bullet":
        prefixLines("- ");
        break;
      case "number":
        prefixLines("", true);
        break;
      case "quote":
        prefixLines("> ");
        break;
      case "code":
        wrapSelection("`", "`");
        break;
      case "link":
        insertLink();
        break;
      default:
        break;
    }
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.slice(start, end);
    const newValue =
      value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);

    onChange(newValue);

    const cursorPosition = start + prefix.length + selectedText.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const prefixLines = (prefix: string, ordered = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.slice(start, end) || value;

    const lines = selectedText.split("\n");
    const formatted = lines
      .map((line, index) => {
        if (ordered) {
          return `${index + 1}. ${line.trim()}`;
        }
        return `${prefix}${line.trim()}`;
      })
      .join("\n");

    const newValue =
      value.slice(0, start) + formatted + value.slice(end || value.length);
    onChange(newValue);

    const cursorPosition = start + formatted.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.slice(start, end) || "link text";
    const linkTemplate = `[${selectedText}](https://example.com)`;

    const newValue = value.slice(0, start) + linkTemplate + value.slice(end);
    onChange(newValue);

    const linkStart = start + linkTemplate.indexOf("https://example.com");
    const linkEnd = linkStart + "https://example.com".length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(linkStart, linkEnd);
    });
  };

  const insertPlaceholder = (column: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const token = `{{${column.toLowerCase()}}}`;

    const newValue = value.slice(0, start) + token + value.slice(end);
    onChange(newValue);

    const cursorPosition = start + token.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const previewHtml = useMemo(() => {
    if (!value.trim()) return "";
    const rawHtml = marked.parse(value);
    return DOMPurify.sanitize(rawHtml as unknown as string);
  }, [value]);

  const formattingButtons: {
    type: FormatType;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { type: "bold", icon: <Bold className="w-4 h-4" />, label: "Bold" },
    { type: "italic", icon: <Italic className="w-4 h-4" />, label: "Italic" },
    {
      type: "underline",
      icon: <Underline className="w-4 h-4" />,
      label: "Underline",
    },
    {
      type: "bullet",
      icon: <List className="w-4 h-4" />,
      label: "Bullet list",
    },
    {
      type: "number",
      icon: <ListOrdered className="w-4 h-4" />,
      label: "Numbered list",
    },
    { type: "quote", icon: <Quote className="w-4 h-4" />, label: "Quote" },
    { type: "code", icon: <Code className="w-4 h-4" />, label: "Code" },
    { type: "link", icon: <Link2 className="w-4 h-4" />, label: "Link" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {formattingButtons.map((button) => (
            <button
              key={button.type}
              type="button"
              onClick={() => applyFormatting(button.type)}
              className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        required={required}
        placeholder={
          placeholder ||
          "Hi {{name}},\n\nI noticed you work at {{company}}...\n\nBest,\n[Your Name]"
        }
        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 font-mono text-sm text-gray-900 placeholder-gray-400 outline-none transition-all ${
          error
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      )}

      <div className="mt-3 space-y-2">
        {csvColumns.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Available placeholders:
            </p>
            <div className="flex flex-wrap gap-2">
              {csvColumns.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertPlaceholder(col)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-mono transition-colors"
                  title={`Insert {{${col.toLowerCase()}}}`}
                >
                  {"{{"}
                  {col.toLowerCase()}
                  {"}}"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Upload a CSV to unlock dynamic placeholders like {"{{name}}"}.
          </p>
        )}
      </div>

      <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wide">
          <span>Live Preview</span>
          <span>Markdown Supported</span>
        </div>
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-4 text-sm text-gray-900 min-h-[120px] overflow-auto">
          {previewHtml ? (
            <div
              className="space-y-2"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-gray-400 italic">
              Start typing to see formatted preview (supports **bold**,
              *italic*,
              <u> underline</u>, lists, links, and more).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
