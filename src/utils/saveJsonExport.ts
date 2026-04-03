import { Platform, Share } from 'react-native';

/**
 * Saves a JSON payload as `aruru-export-YYYY-MM-DD.json` on web;
 * on native opens the share sheet with the JSON text (save to Files / Notes, etc.).
 */
export async function saveAruruDataExport(data: unknown): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `aruru-export-${date}.json`;
  const text = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    message: text,
    title: filename,
  });
}
