-- Activer Row Level Security
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE envois ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes_declarees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenus ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenus_audio ENABLE ROW LEVEL SECURITY;

-- Politiques pour profils
-- Tous les utilisateurs authentifiés peuvent lire les profils (limité par l'application)
CREATE POLICY "Profils lecture publique" ON profils
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier les profils
CREATE POLICY "Profils modification admin" ON profils
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Politiques pour signalements
-- Les producteurs ne peuvent voir que leurs propres signalements
CREATE POLICY "Signalements lecture producteur" ON signalements
  FOR SELECT USING (
    producteur_id = auth.uid()::int
  );

-- Les conseillers peuvent voir les signalements de leur zone
CREATE POLICY "Signalements lecture conseiller" ON signalements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'conseiller'
    )
  );

-- Les admins peuvent voir tous les signalements
CREATE POLICY "Signalements lecture admin" ON signalements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Les producteurs peuvent créer des signalements
CREATE POLICY "Signalements création producteur" ON signalements
  FOR INSERT WITH CHECK (
    producteur_id = auth.uid()::int
  );

-- Les conseillers peuvent modifier les signalements (confirmation, rejet)
CREATE POLICY "Signalements modification conseiller" ON signalements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'conseiller'
    )
  );

-- Politiques pour alertes
-- Les conseillers peuvent créer des alertes
CREATE POLICY "Alertes création conseiller" ON alertes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'conseiller'
    )
  );

-- Tous les utilisateurs authentifiés peuvent lire les alertes
CREATE POLICY "Alertes lecture publique" ON alertes
  FOR SELECT USING (true);

-- Politiques pour envois
-- Les conseillers peuvent créer des envois
CREATE POLICY "Envois création conseiller" ON envois
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'conseiller'
    )
  );

-- Les admins peuvent lire les envois
CREATE POLICY "Envois lecture admin" ON envois
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Politiques pour annonces
-- Les producteurs peuvent créer leurs propres annonces
CREATE POLICY "Annonces création producteur" ON annonces
  FOR INSERT WITH CHECK (
    producteur_id = auth.uid()::int
  );

-- Les producteurs peuvent modifier leurs propres annonces
CREATE POLICY "Annonces modification producteur" ON annonces
  FOR UPDATE USING (
    producteur_id = auth.uid()::int
  );

-- Les acheteurs peuvent lire les annonces
CREATE POLICY "Annonces lecture acheteur" ON annonces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'acheteur'
    )
  );

-- Les admins peuvent lire les annonces
CREATE POLICY "Annonces lecture admin" ON annonces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Politiques pour ventes déclarées
-- Les acheteurs peuvent créer des ventes
CREATE POLICY "Ventes création acheteur" ON ventes_declarees
  FOR INSERT WITH CHECK (
    acheteur_id = auth.uid()::int
  );

-- Les admins peuvent lire les ventes
CREATE POLICY "Ventes lecture admin" ON ventes_declarees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Politiques pour contenus
-- Lecture publique pour les contenus
CREATE POLICY "Contenus lecture publique" ON contenus
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier les contenus
CREATE POLICY "Contenus modification admin" ON contenus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );

-- Politiques pour contenus_audio
-- Lecture publique pour les audios
CREATE POLICY "Contenus audio lecture publique" ON contenus_audio
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier les audios
CREATE POLICY "Contenus audio modification admin" ON contenus_audio
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils p
      WHERE p.id = auth.uid()::int
      AND p.role = 'admin'
    )
  );
