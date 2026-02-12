"use client";

import { useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditorContenidoProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

const FONT_SIZES = [
  { label: "Pequeño", value: "12px" },
  { label: "Normal", value: "14px" },
  { label: "Grande", value: "18px" },
  { label: "Muy grande", value: "24px" },
];

/**
 * Editor de contenido enriquecido para el acta (hipertexto).
 * Permite títulos, subtítulos, negritas, cursivas, listas, tamaño de fuente, etc.
 * Almacena HTML en un input oculto para el envío del formulario.
 */
export function EditorContenido({
  name,
  defaultValue = "",
  placeholder = "Escribe el contenido del acta (títulos, negritas, listas, etc.)...",
  "aria-invalid": ariaInvalid,
}: EditorContenidoProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      FontSize.configure({ types: ["textStyle"] }),
    ],
    content: defaultValue?.trim() ? defaultValue : undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none",
        ...(ariaInvalid ? { "aria-invalid": "true" as const } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const el = hiddenInputRef.current;
      if (el) el.value = editor.getHTML();
    },
  });

  // Sincronizar valor inicial al montar y cuando cambie defaultValue (ej. al cargar acta para editar)
  useEffect(() => {
    if (!editor) return;
    const html = defaultValue?.trim() ?? "";
    if (html && editor.isEmpty) {
      editor.commands.setContent(html, { emitUpdate: false });
      const el = hiddenInputRef.current;
      if (el) el.value = editor.getHTML();
    }
  }, [defaultValue, editor]);

  // Escribir HTML en el input oculto al montar (por si el editor ya tiene contenido)
  useEffect(() => {
    if (editor && hiddenInputRef.current) {
      hiddenInputRef.current.value = editor.getHTML();
    }
  }, [editor]);

  const setFontSize = useCallback(
    (size: string) => {
      editor?.chain().focus().setFontSize(size).run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>Contenido</Label>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue=""
        readOnly
        aria-hidden
      />
      <div
        className={cn(
          "rounded-md border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring",
          ariaInvalid && "border-destructive ring-destructive/20"
        )}
      >
        {/* Barra de herramientas */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            ariaLabel="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            ariaLabel="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            ariaLabel="Título 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            ariaLabel="Negrita"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            ariaLabel="Cursiva"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            ariaLabel="Lista con viñetas"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            ariaLabel="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            ariaLabel="Cita"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            ariaLabel="Línea horizontal"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <div className="flex items-center gap-1 pl-1">
            <Type className="text-muted-foreground h-4 w-4" aria-hidden />
            <select
              className="border-input bg-background h-8 rounded border px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) setFontSize(v);
                e.target.value = "";
              }}
              aria-label="Tamaño de fuente"
            >
              <option value="">Tamaño</option>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div id={name} className="rounded-b-md">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-muted text-foreground"
      )}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      {children}
    </Button>
  );
}

function ToolbarSeparator() {
  return (
    <span
      className="bg-border mx-0.5 h-6 w-px"
      role="presentation"
      aria-hidden
    />
  );
}
