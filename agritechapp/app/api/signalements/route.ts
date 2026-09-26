import { NextRequest, NextResponse } from 'next/server';
import { SignalementService } from '../../../src/domains/signalements/service';
import type { SignalementFilters } from '../../../src/domains/signalements/service';
import type { SignalementStatus } from '../../../src/domains/signalements/schemas';

const service = new SignalementService();

// GET /api/signalements?statut=signale&producteur_id=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get('statut') as SignalementStatus | null;
    const producteur_id = searchParams.get('producteur_id');

    const filters: SignalementFilters = {};
    if (statut) filters.statut = statut;
    if (producteur_id) filters.producteur_id = parseInt(producteur_id, 10);

    const data = await service.getSignalements(filters);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/signalements (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const producteur_id = formData.get('producteur_id');
    const lat = formData.get('lat');
    const lng = formData.get('lng');
    const canal_origine = formData.get('canal_origine') as 'app' | 'web' | 'appel' | null;
    const photo = formData.get('photo') as File | null;
    const audio = formData.get('audio') as File | null;

    if (!producteur_id || !lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants : producteur_id, lat, lng' },
        { status: 400 }
      );
    }

    const result = await service.createSignalement({
      producteur_id: parseInt(producteur_id.toString(), 10),
      lat: parseFloat(lat.toString()),
      lng: parseFloat(lng.toString()),
      canal_origine: canal_origine ?? 'app',
      photo,
      audio,
    });

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
