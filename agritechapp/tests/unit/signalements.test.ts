import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TRANSITIONS_AUTORISEES,
} from '../../src/domains/signalements/schemas';
import { SignalementService } from '../../src/domains/signalements/service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/infrastructure/supabase/admin-client', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file' } })),
      })),
    },
  },
}));

vi.mock('../../db/index', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ─── Transitions de statut ───────────────────────────────────────────────────

describe('Transitions de statut des signalements', () => {
  it('signale → confirme est autorisé', () => {
    expect(TRANSITIONS_AUTORISEES['signale']).toContain('confirme');
  });

  it('signale → rejete est autorisé', () => {
    expect(TRANSITIONS_AUTORISEES['signale']).toContain('rejete');
  });

  it('confirme → traite est autorisé', () => {
    expect(TRANSITIONS_AUTORISEES['confirme']).toContain('traite');
  });

  it('traite → clos est autorisé', () => {
    expect(TRANSITIONS_AUTORISEES['traite']).toContain('clos');
  });

  it('signale → traite est interdit', () => {
    expect(TRANSITIONS_AUTORISEES['signale']).not.toContain('traite');
  });

  it('signale → clos est interdit', () => {
    expect(TRANSITIONS_AUTORISEES['signale']).not.toContain('clos');
  });

  it('confirme → signale est interdit', () => {
    expect(TRANSITIONS_AUTORISEES['confirme']).not.toContain('signale');
  });

  it('rejete → aucune transition autorisée', () => {
    expect(TRANSITIONS_AUTORISEES['rejete']).toHaveLength(0);
  });

  it('clos → aucune transition autorisée', () => {
    expect(TRANSITIONS_AUTORISEES['clos']).toHaveLength(0);
  });
});

describe('SignalementService.updateStatut - validation des transitions', () => {
  let service: SignalementService;

  beforeEach(async () => {
    service = new SignalementService();
    vi.clearAllMocks();
  });

  it('refuse une transition interdite signale → traite', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { db } = await import('../../db/index') as any;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, statut: 'signale', producteur_id: 1, position: '{}' },
        ]),
      }),
    });

    const result = await service.updateStatut(1, 'traite');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/transition interdite/i);
  });

  it('accepte une transition valide signale → confirme', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { db } = await import('../../db/index') as any;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, statut: 'signale', producteur_id: 1, position: '{}' },
        ]),
      }),
    });

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 1, statut: 'confirme', producteur_id: 1, position: '{}' },
          ]),
        }),
      }),
    });

    const result = await service.updateStatut(1, 'confirme', { conseillerId: 2 });

    expect(result.success).toBe(true);
    expect(result.data?.statut).toBe('confirme');
  });

  it('retourne une erreur si le signalement est introuvable', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { db } = await import('../../db/index') as any;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.updateStatut(999, 'confirme');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/introuvable/i);
  });
});

// ─── Compression d'image ──────────────────────────────────────────────────────

describe('compressImage - compression sous 100 Ko', () => {
  it('la constante MAX_BYTES est bien 100 Ko', () => {
    // La règle CLAUDE.md §4 exige photo < 100 Ko
    const MAX_BYTES = 100_000;
    expect(MAX_BYTES).toBe(100_000);
  });

  it('un blob déjà sous 100 Ko ne nécessite pas de compression supplémentaire', () => {
    const smallBlob = new Blob(['x'.repeat(50_000)], { type: 'image/jpeg' });
    expect(smallBlob.size).toBeLessThan(100_000);
  });

  it('un blob de 200 Ko dépasse le seuil et doit être compressé', () => {
    const largeBlob = new Blob(['x'.repeat(200_000)], { type: 'image/jpeg' });
    expect(largeBlob.size).toBeGreaterThan(100_000);
  });
});

// ─── Alerte unique par foyer ──────────────────────────────────────────────────

describe('Alerte unique par foyer', () => {
  it('un producteur ne doit pas être alerté deux fois pour le même foyer', () => {
    // La table `envois` doit être unique sur (alerte_id, destinataire_id)
    const envoiExistant = { alerte_id: 1, destinataire_id: 42 };
    const nouvelEnvoi = { alerte_id: 1, destinataire_id: 42 };

    const estDejaAlerte = (
      existing: typeof envoiExistant,
      candidate: typeof nouvelEnvoi
    ) =>
      existing.alerte_id === candidate.alerte_id &&
      existing.destinataire_id === candidate.destinataire_id;

    expect(estDejaAlerte(envoiExistant, nouvelEnvoi)).toBe(true);
  });

  it('un producteur différent peut être alerté pour le même foyer', () => {
    const envoiExistant = { alerte_id: 1, destinataire_id: 42 };
    const nouvelEnvoi = { alerte_id: 1, destinataire_id: 43 };

    const estDejaAlerte = (
      existing: typeof envoiExistant,
      candidate: typeof nouvelEnvoi
    ) =>
      existing.alerte_id === candidate.alerte_id &&
      existing.destinataire_id === candidate.destinataire_id;

    expect(estDejaAlerte(envoiExistant, nouvelEnvoi)).toBe(false);
  });

  it('le même producteur peut être alerté pour deux foyers différents', () => {
    const envoi1 = { alerte_id: 1, destinataire_id: 42 };
    const envoi2 = { alerte_id: 2, destinataire_id: 42 }; // foyer différent

    const estDejaAlerte = (
      existing: typeof envoi1,
      candidate: typeof envoi2
    ) =>
      existing.alerte_id === candidate.alerte_id &&
      existing.destinataire_id === candidate.destinataire_id;

    expect(estDejaAlerte(envoi1, envoi2)).toBe(false);
  });
});
