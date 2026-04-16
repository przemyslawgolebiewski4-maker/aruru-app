/**
 * Web file input must open synchronously inside the browser user-activation stack
 * (directly from click/onPress). Do not await before openWebImageFilePicker().
 */

import { apiFetch } from '../services/api';

export function readImageFileAsBase64(
  file: File
): Promise<{ base64: string; mimeType: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) resolve(null);
      else resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function openWebImageFilePicker(onPick: (file: File | null) => void): void {
  if (typeof document === 'undefined') {
    onPick(null);
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = () => {
    const file = input.files?.[0] ?? null;
    if (file && file.size > 3_000_000) {
      onPick(null);
      return;
    }
    onPick(file);
  };
  input.onerror = () => onPick(null);
  input.click();
}

export async function uploadForumImage(
  tenantId: string,
  picked: { base64: string; mimeType: string }
): Promise<string | null> {
  try {
    const res = await apiFetch<{ imageUrl: string }>(
      '/uploads/forum-image',
      {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: picked.base64,
          mimeType: picked.mimeType,
        }),
      },
      tenantId
    );
    return res.imageUrl ?? null;
  } catch {
    return null;
  }
}
