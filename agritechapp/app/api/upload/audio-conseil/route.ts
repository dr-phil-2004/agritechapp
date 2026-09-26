import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/infrastructure/supabase/admin-client';

const LANGUES = ['fr', 'fon', 'bariba'] as const;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 Mo : une note vocale Opus de quelques minutes
const TYPES_AUTORISES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
};

function extensionPour(mimeType: string): string | null {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return TYPES_AUTORISES[base] ?? null;
}

// POST /api/upload/audio-conseil
// Body : multipart/form-data  { audio: File, langue: string }
// Retourne : { success: true, url: string }
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Note vocale trop volumineuse (5 Mo maximum)' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const langueBrute = (formData.get('langue') as string | null) ?? 'fr';
    const langue = (LANGUES as readonly string[]).includes(langueBrute) ? langueBrute : 'fr';

    if (!audio || audio.size === 0) {
      return NextResponse.json({ success: false, error: 'Fichier audio manquant' }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Note vocale trop volumineuse (5 Mo maximum)' },
        { status: 413 }
      );
    }

    const ext = extensionPour(audio.type);
    if (!ext) {
      return NextResponse.json(
        { success: false, error: 'Format audio non supporté' },
        { status: 415 }
      );
    }

    const bytes = await audio.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `conseiller/${Date.now()}-${langue}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('notes-vocales')
      .upload(filename, buffer, {
        contentType: audio.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('notes-vocales')
      .getPublicUrl(filename);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
