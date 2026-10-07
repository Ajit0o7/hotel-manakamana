'use client';

import { useEffect, useRef, useState } from 'react';
import type { Media } from '@/lib/cms/types';
import { uploadMedia } from './media';
import { useToast } from './Toaster';

/** A button (and optional drop target) that uploads files one by one. */
export function UploadButton(props: {
  onUploaded: (m: Media) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const notify = useToast();

  async function upload(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      setBusy(file.name);
      try {
        props.onUploaded(await uploadMedia(file));
      } catch (err) {
        notify(`${file.name}: ${(err as Error).message}`, 'error');
      }
    }
    setBusy(null);
    if (input.current) input.current.value = '';
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept={props.accept}
        multiple={props.multiple}
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <button type="button" className="cms-btn cms-btn--primary" disabled={!!busy} onClick={() => input.current?.click()}>
        {busy ? `Uploading ${busy}…` : (props.label ?? 'Upload')}
      </button>
      <DropZone disabled={!!busy} onFiles={upload} />
    </>
  );
}

/** Lets files be dropped anywhere on the window while an UploadButton is shown. */
function DropZone({ onFiles, disabled }: { onFiles: (f: File[]) => void; disabled: boolean }) {
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (disabled) return;
    const show = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) setOver(true);
    };
    window.addEventListener('dragenter', show);
    return () => window.removeEventListener('dragenter', show);
  }, [disabled]);
  if (!over || disabled) return null;
  return (
    <div
      className="cms-drop"
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <p>Drop files to upload</p>
    </div>
  );
}
