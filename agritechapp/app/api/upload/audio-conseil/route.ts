import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/infrastructure/supabase/admin-client';

// POST /api/upload/audio-conseil
// Body : multipart/form-data  { audio: File, langue: string }
// Retourne : { success: true, url: string }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const langue = (formData.get('langue') as string | null) ?? 'fr';

    if (!audio || audio.size === 0) {
      return NextResponse.json({ success: false, error: 'Fichier audio manquant' }, { status: 400 });
    }

    const bytes = await audio.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = audio.type.includes('ogg') ? 'ogg' : 'webm';
    const filename = `conseiller/${Date.now()}-${langue}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('notes-vocales')
      .upload(filename, buffer, {
        contentType: audio.type || 'audio/webm',
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
