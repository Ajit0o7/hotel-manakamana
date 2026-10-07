'use client';

import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';
import { largeUrl } from '@/lib/cms/format';
import { MediaPicker } from './MediaPicker';

/** A WYSIWYG editor that produces HTML. The CMS sanitizes it again on save. */
export function RichTextEditor(props: { value: string; onChange: (html: string) => void; label: string; minimal?: boolean }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image,
    ],
    content: props.value,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'cms-prose', 'aria-label': props.label, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => props.onChange(e.isEmpty ? '' : e.getHTML()),
  });

  return (
    <div className="cms-editor">
      {editor && <Toolbar editor={editor} minimal={props.minimal} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, minimal }: { editor: Editor; minimal?: boolean }) {
  const [picking, setPicking] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      link: e.isActive('link'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const btn = (label: string, title: string, active: boolean, run: () => void, disabled = false) => (
    <button
      type="button"
      className={`cms-tool${active ? ' is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link address (leave empty to remove the link)', prev ?? 'https://');
    if (url === null) return;
    if (url.trim() === '' || url === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const c = () => editor.chain().focus();
  return (
    <div className="cms-toolbar-rt" role="toolbar" aria-label="Formatting">
      {!minimal && btn('H2', 'Heading', s.h2, () => c().toggleHeading({ level: 2 }).run())}
      {!minimal && btn('H3', 'Subheading', s.h3, () => c().toggleHeading({ level: 3 }).run())}
      {btn('B', 'Bold', s.bold, () => c().toggleBold().run())}
      {btn('I', 'Italic', s.italic, () => c().toggleItalic().run())}
      {btn('🔗', 'Link', s.link, setLink)}
      {btn('•', 'Bulleted list', s.bullet, () => c().toggleBulletList().run())}
      {btn('1.', 'Numbered list', s.ordered, () => c().toggleOrderedList().run())}
      {!minimal && btn('❝', 'Quote', s.quote, () => c().toggleBlockquote().run())}
      {!minimal && btn('🖼', 'Insert image', false, () => setPicking(true))}
      {btn('↶', 'Undo', false, () => c().undo().run(), !s.canUndo)}
      {btn('↷', 'Redo', false, () => c().redo().run(), !s.canRedo)}
      {picking && (
        <MediaPicker
          title="Insert an image"
          onClose={() => setPicking(false)}
          onSelect={(m) => {
            setPicking(false);
            c().setImage({ src: largeUrl(m), alt: m.alt_text || m.title || '' }).run();
          }}
        />
      )}
    </div>
  );
}
