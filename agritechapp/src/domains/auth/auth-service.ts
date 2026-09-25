import { db } from '@/db';
import { profils, tentatives_connexion } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { supabase } from '@/infrastructure/supabase/client';
import { supabaseAdmin } from '@/infrastructure/supabase/admin-client';

export type Role = 'producteur' | 'conseiller' | 'acheteur' | 'admin';

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  blocked?: boolean;
}

// Convertir un numéro de téléphone en identifiant technique pour Supabase
function phoneToEmail(phone: string): string {
  // Format: 22901XXXXXXXX@producteurs.local
  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  return `${cleanedPhone}@producteurs.local`;
}

export class AuthService {
  // Connexion producteur/acheteur par numéro + code
  async loginWithPhoneCode(phone: string, code: string): Promise<AuthResult> {
    // Vérifier si le numéro est bloqué
    const attempts = await db.select().from(tentatives_connexion).where(
      eq(tentatives_connexion.telephone, phone)
    );

    if (attempts.length > 0) {
      const attempt = attempts[0];
      if (attempt.bloque_jusqu_a && new Date(attempt.bloque_jusqu_a) > new Date()) {
        return {
          success: false,
          error: 'Ce numéro est temporairement bloqué. Réessayez plus tard.',
          blocked: true,
        };
      }
    }

    // Essayer de connecter avec Supabase
    const email = phoneToEmail(phone);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: code,
    });

    if (error) {
      // Incrémenter le compteur d'échecs
      await this.incrementFailedAttempts(phone);
      return {
        success: false,
        error: 'Numéro ou code incorrect',
      };
    }

    // Réinitialiser les tentatives en cas de succès
    await this.resetFailedAttempts(phone);

    // Récupérer le profil complet
    const userProfile = await db.select().from(profils).where(
      eq(profils.telephone, phone)
    );

    if (userProfile.length === 0) {
      return {
        success: false,
        error: 'Profil non trouvé',
      };
    }

    return {
      success: true,
      user: userProfile[0],
    };
  }

  // Connexion conseiller/admin par e-mail + mot de passe
  async loginWithEmailPassword(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: 'E-mail ou mot de passe incorrect',
      };
    }

    // Récupérer le profil complet
    const userProfile = await db.select().from(profils).where(
      eq(profils.telephone, email) // Pour conseiller/admin, on stocke l'email dans telephone
    );

    if (userProfile.length === 0) {
      return {
        success: false,
        error: 'Profil non trouvé',
      };
    }

    return {
      success: true,
      user: userProfile[0],
    };
  }

  // Incrémenter les tentatives échouées
  private async incrementFailedAttempts(phone: string): Promise<void> {
    const attempts = await db.select().from(tentatives_connexion).where(
      eq(tentatives_connexion.telephone, phone)
    );

    if (attempts.length === 0) {
      await db.insert(tentatives_connexion).values({
        telephone: phone,
        nb_echecs: 1,
      });
    } else {
      const attempt = attempts[0];
      const newNbEchecs = attempt.nb_echecs + 1;

      if (newNbEchecs >= 5) {
        // Bloquer pour 15 minutes
        const bloqueJusqua = new Date(Date.now() + 15 * 60 * 1000);
        await db.update(tentatives_connexion)
          .set({ nb_echecs: newNbEchecs, bloque_jusqu_a: bloqueJusqua })
          .where(eq(tentatives_connexion.id, attempt.id));
      } else {
        await db.update(tentatives_connexion)
          .set({ nb_echecs: newNbEchecs })
          .where(eq(tentatives_connexion.id, attempt.id));
      }
    }
  }

  // Réinitialiser les tentatives après succès
  private async resetFailedAttempts(phone: string): Promise<void> {
    await db.delete(tentatives_connexion).where(
      eq(tentatives_connexion.telephone, phone)
    );
  }

  // Créer un compte producteur côté serveur (inscription assistée)
  async createProducerAccount(
    phone: string,
    code: string,
    nom: string,
    langue: string,
    aSmartphone: boolean,
    communeId: number,
    position: string,
    inscritPar: number
  ): Promise<AuthResult> {
    // Vérifier si le numéro existe déjà
    const existing = await db.select().from(profils).where(
      eq(profils.telephone, phone)
    );

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Ce numéro est déjà utilisé',
      };
    }

    // Créer l'utilisateur Supabase avec service_role
    const email = phoneToEmail(phone);
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password: code,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Créer le profil dans la base de données
    const newProfile = await db.insert(profils).values({
      role: 'producteur',
      nom,
      telephone: phone,
      langue,
      a_smartphone: aSmartphone,
      commune_id: communeId,
      position,
      inscrit_par: inscritPar,
    }).returning();

    return {
      success: true,
      user: newProfile[0],
    };
  }

  // Auto-inscription acheteur
  async createBuyerAccount(
    phone: string,
    code: string,
    nom: string,
    langue: string
  ): Promise<AuthResult> {
    // Vérifier si le numéro existe déjà
    const existing = await db.select().from(profils).where(
      eq(profils.telephone, phone)
    );

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Ce numéro est déjà utilisé',
      };
    }

    // Créer l'utilisateur Supabase
    const email = phoneToEmail(phone);
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password: code,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Créer le profil dans la base de données
    const newProfile = await db.insert(profils).values({
      role: 'acheteur',
      nom,
      telephone: phone,
      langue,
      a_smartphone: true,
    }).returning();

    return {
      success: true,
      user: newProfile[0],
    };
  }

  // Réinitialiser le code d'un producteur (conseiller uniquement)
  async resetProducerCode(
    phone: string,
    newCode: string,
    conseillerId: number
  ): Promise<AuthResult> {
    // Vérifier que le conseiller existe
    const conseiller = await db.select().from(profils).where(
      eq(profils.id, conseillerId)
    );

    if (conseiller.length === 0 || conseiller[0].role !== 'conseiller') {
      return {
        success: false,
        error: 'Droits insuffisants',
      };
    }

    // Trouver l'utilisateur Supabase par email
    const email = phoneToEmail(phone);
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return {
        success: false,
        error: listError.message,
      };
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return {
        success: false,
        error: 'Utilisateur non trouvé',
      };
    }

    // Mettre à jour le mot de passe avec service_role
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newCode }
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  }

  // Déconnexion
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  // Obtenir l'utilisateur actuel
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Récupérer le profil complet
    const userProfile = await db.select().from(profils).where(
      eq(profils.telephone, user.email || '')
    );

    return userProfile.length > 0 ? userProfile[0] : null;
  }
}
