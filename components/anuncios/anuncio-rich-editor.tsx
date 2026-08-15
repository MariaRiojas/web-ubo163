"use client"

import { useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Heading3 as Heading3Icon,
  Link2 as LinkIcon,
  Unlink as UnlinkIcon,
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * True cuando el HTML del editor no contiene texto visible (solo párrafos/etiquetas vacías).
 * Usar esto en vez de `content.trim().length === 0` para validar el formulario,
 * porque un editor "vacío" produce HTML como "<p></p>" que no está vacío como string.
 */
export function isRichTextEmpty(html: string): boolean {
  if (!html) return true
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return text.length === 0
}

/**
 * Extensión mínima de placeholder implementada in-house (sin agregar el paquete
 * @tiptap/extension-placeholder) usando una decoración de ProseMirror sobre el
 * primer bloque de texto vacío del documento.
 */
function createPlaceholderExtension(placeholder: string) {
  return Extension.create({
    name: 'anuncioPlaceholder',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('anuncioPlaceholder'),
          props: {
            decorations: (state) => {
              if (!placeholder) return null
              const { doc } = state
              const isDocEmpty =
                doc.childCount <= 1 &&
                (doc.firstChild ? doc.firstChild.isTextblock && doc.firstChild.content.size === 0 : true)
              if (!isDocEmpty) return null

              const decorations: Decoration[] = []
              doc.descendants((node, pos) => {
                if (node.isTextblock && node.content.size === 0) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: 'anuncio-editor-empty',
                      'data-placeholder': placeholder,
                    }),
                  )
                  return false
                }
                return true
              })
              return DecorationSet.create(doc, decorations)
            },
          },
        }),
      ]
    },
  })
}

export function AnuncioRichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const [linkMenuOpen, setLinkMenuOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // Las extensiones solo se leen al crear el editor — no necesitan recalcularse en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: false,
        heading: { levels: [3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      createPlaceholderExtension(placeholder ?? ''),
    ],
    [],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class: 'anuncio-editor-content',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  // Mantiene el editor sincronizado cuando `value` cambia desde afuera
  // (reset del formulario al abrir "nuevo anuncio", carga de un borrador a editar).
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const same = current === value || (isRichTextEmpty(value) && editor.isEmpty)
    if (!same) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const openLinkMenu = () => {
    const prevUrl = (editor?.getAttributes('link').href as string | undefined) ?? ''
    setLinkUrl(prevUrl)
    setLinkMenuOpen(true)
  }

  const applyLink = () => {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkMenuOpen(false)
    setLinkUrl('')
  }

  const cancelLinkMenu = () => {
    setLinkMenuOpen(false)
    setLinkUrl('')
  }

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <div className="anuncio-editor-wrap">
      <div className="anuncio-editor-toolbar">
        <ToolbarButton
          label="Negrita"
          active={!!editor?.isActive('bold')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="w-3.5 h-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={!!editor?.isActive('italic')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="w-3.5 h-3.5" strokeWidth={2} />
        </ToolbarButton>

        <span className="anuncio-editor-toolbar-sep" />

        <ToolbarButton
          label="Lista con viñetas"
          active={!!editor?.isActive('bulletList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={!!editor?.isActive('orderedList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </ToolbarButton>

        <span className="anuncio-editor-toolbar-sep" />

        <ToolbarButton
          label="Subtítulo"
          active={!!editor?.isActive('heading', { level: 3 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </ToolbarButton>

        <span className="anuncio-editor-toolbar-sep" />

        <ToolbarButton
          label="Insertar enlace"
          active={!!editor?.isActive('link') || linkMenuOpen}
          disabled={!editor}
          onClick={openLinkMenu}
        >
          <LinkIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </ToolbarButton>
        {editor?.isActive('link') && (
          <ToolbarButton label="Quitar enlace" onClick={removeLink}>
            <UnlinkIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
          </ToolbarButton>
        )}
      </div>

      {linkMenuOpen && (
        <div className="anuncio-editor-linkbar">
          <input
            type="text"
            className="anuncio-editor-link-input"
            placeholder="https://…"
            value={linkUrl}
            autoFocus
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelLinkMenu()
              }
            }}
          />
          <button
            type="button"
            className="anuncio-editor-link-btn"
            onClick={applyLink}
            title="Aplicar enlace"
            aria-label="Aplicar enlace"
          >
            <CheckIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="anuncio-editor-link-btn"
            onClick={cancelLinkMenu}
            title="Cancelar"
            aria-label="Cancelar"
          >
            <XIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="anuncio-editor-content-wrap">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('anuncio-editor-btn', active && 'anuncio-editor-btn--active')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
    >
      {children}
    </button>
  )
}
