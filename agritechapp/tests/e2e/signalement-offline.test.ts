import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import path from 'path';

// ─── Scénario hors ligne ──────────────────────────────────────────────────────

test.describe('Signalement hors ligne → synchronisation', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers la page demo et choisir Bio
    await page.goto('/demo');
    await page.getByRole('button', { name: /Bio/i }).click();
    await page.waitForURL('/producteur');
  });

  test('peut signaler hors ligne et voir le badge en attente', async ({ page, context }) => {
    // Aller sur la page de signalement
    await page.getByRole('button', { name: /signaler/i }).click();
    await page.waitForURL('/producteur/signaler');

    // Passer hors ligne
    await context.setOffline(true);

    // Étape 1 : charger une photo de test
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    // Si le fichier n'existe pas, on saute cette étape
    const photoInput = page.locator('input[type="file"]');
    // Vérifier si le fichier de test existe avant de l'utiliser
    try {
      await photoInput.setInputFiles(testImagePath);
      await page.waitForTimeout(500);
    } catch {
      // Pas de fichier de test, on continue sans photo
    }

    // Passer à l'étape 2 (note vocale)
    await page.getByRole('button', { name: /suivant/i }).click();

    // Passer à l'étape 3 (GPS) sans note vocale
    await page.getByRole('button', { name: /suivant/i }).click();

    // Attendre la géolocalisation (ou l'erreur de fallback)
    await page.waitForTimeout(3000);

    // Passer à l'étape 4 (confirmation)
    await page.getByRole('button', { name: /suivant/i }).click();

    // Soumettre
    await page.getByRole('button', { name: /envoyer le signalement/i }).click();

    // Vérifier que l'indicateur "En attente de réseau" apparaît
    await expect(
      page.getByText(/en attente de réseau/i).or(page.getByText(/en attente d.*envoi/i))
    ).toBeVisible({ timeout: 10000 });

    // Repasser en ligne
    await context.setOffline(false);

    // Retourner à l'accueil producteur
    await page.getByRole('button', { name: /retour.*accueil/i }).click();
    await page.waitForURL('/producteur');

    // Le badge de sync devrait disparaître progressivement (ou indiquer la synchro)
    // On vérifie que la page s'affiche correctement
    await expect(page.getByRole('heading', { name: /espace producteur/i })).toBeVisible();
  });

  test('la page /producteur/signaler est accessible (axe)', async ({ page }) => {
    await page.goto('/producteur/signaler');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.error(
        'Violations axe critiques/sérieuses sur /producteur/signaler :',
        criticalOrSerious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.html),
        }))
      );
    }

    expect(criticalOrSerious).toHaveLength(0);
  });
});

// ─── Carte du conseiller ───────────────────────────────────────────────────────

test.describe('Carte des signalements conseiller', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('button', { name: /Serge/i }).click();
    await page.waitForURL('/conseiller');
  });

  test('peut accéder à la carte des signalements', async ({ page }) => {
    await page.getByRole('button', { name: /carte des signalements/i }).click();
    await page.waitForURL('/conseiller/carte');

    // Vérifier que la page se charge
    await expect(page.getByRole('heading', { name: /carte des signalements/i })).toBeVisible();

    // Vérifier que la liste accessible est présente
    await page.getByRole('tab', { name: /liste/i }).click();

    // La table ou un message vide doit être visible
    const tableOrEmpty = page
      .getByRole('table', { name: /liste des signalements/i })
      .or(page.getByText(/aucun signalement/i));

    await expect(tableOrEmpty).toBeVisible({ timeout: 10000 });
  });

  test('la page /conseiller/carte est accessible (axe)', async ({ page }) => {
    await page.goto('/conseiller/carte');
    await page.waitForLoadState('networkidle');

    // Attendre que la carte/liste soit chargée
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.leaflet-container') // La carte Leaflet peut avoir ses propres issues
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.error(
        'Violations axe critiques/sérieuses sur /conseiller/carte :',
        criticalOrSerious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.html),
        }))
      );
    }

    expect(criticalOrSerious).toHaveLength(0);
  });
});

// ─── Accessibilité page d'accueil producteur ──────────────────────────────────

test.describe('Accessibilité page accueil producteur', () => {
  test('la page /producteur est accessible (axe)', async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('button', { name: /Bio/i }).click();
    await page.waitForURL('/producteur');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious).toHaveLength(0);
  });
});
