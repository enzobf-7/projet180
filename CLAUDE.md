# PROJET180 APP — CLAUDE.md
> **Regle absolue** : mettre a jour ce fichier dans le MEME commit que toute
> modification significative. Format : `docs(claude): [ce qui a change]`
> Obligatoire si : composant ajoute/supprime, route modifiee, schema DB change,
> regle metier modifiee, variable d'env ajoutee. Ne jamais dire "CLAUDE.md est
> a jour" sans avoir verifie et modifie les sections concernees.

Plateforme de coaching 180j "Projet180" par Robin Duplouis.
Le code source est dans `projet180-app/` (repo GitHub `enzobf-7/PROJET180`).

---

## Stack
- **Next.js 16** App Router, React 19, TypeScript, Tailwind CSS 4, Turbopack
- **Supabase** : auth + DB (RLS active sur toutes les tables)
- **Stripe** : webhook -> creation automatique de compte client
- **Brevo** : emails transactionnels (SMTP API, free tier 300/jour)
- **Anthropic Claude Haiku** : generation de rapports hebdo IA
- **Vercel** : deploiement + crons planifies
- **PWA** : manifest.ts + meta tags iOS, installable sur mobile

## Statut actuel
- **Phase** : post-demo (18 mars 2026 — Robin a valide). Pre-production.
- **URL Vercel** : `https://projet180-enzos-projects-b82cbd89.vercel.app/`
- **Domaine prod** : `https://app.projet180.fr` (CNAME + SSL actifs)
- **Migrations** : 9 executees (derniere: 20260321_last_login.sql)
- **En cours** : quasi pret pour go-live. Attente cle Stripe prod + email Robin
- **Bloquants connus** : `sk_live_` Stripe, email `robin@projet180.fr`, variables Vercel manquantes

---

## Dev
```bash
cd projet180-app && npm run dev   # port 3000
```

## Structure des routes
```
/                -> login (email/password)
/onboarding      -> flow 3 etapes (Contrat, Questionnaire, Premier call)
/set-password    -> choix mot de passe post-onboarding (avant dashboard)
/dashboard       -> check-in unifie (habits + todos obligatoires + taches perso), missions, contact Robin WhatsApp
/profil          -> niveau + bilan IA hebdo + compilation wins + questionnaire (6 sections)
/programme       -> timeline verticale 6 phases + bloc "cette semaine" (contenu personnalise par client, fallback template global)
/classement      -> podium top 3 + classement complet par XP
/admin           -> panel Robin (6 onglets : clients, habitudes & missions, todos, programme par client, classement, config)
/admin/client/[id] -> fiche detaillee d'un client + slider progression missions
/admin/messagerie -> messagerie admin -> clients
```

> Pages supprimees : `/messagerie` (remplacee par WhatsApp direct)

---

## Regles Claude Code
- Ne jamais bypasser le RLS sauf via `createAdminClient()` — jamais en client browser
- Toujours reutiliser `P180Button`, `P180Input`, `P180Logo` — pas de composants custom
- UI toujours en **francais** (labels, messages d'erreur, toasts)
- Ne jamais supprimer ni modifier les todos `is_system = true` (2 todos systeme)
- Toujours verifier le role (`profiles.role`) via le middleware, jamais cote client
- Les routes `/api/cron/*` doivent toujours verifier `Authorization: Bearer <CRON_SECRET>`
- Preferer les **Server Actions** aux API routes pour les mutations simples
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` dans du code client
- Ne jamais modifier le schema DB sans confirmation explicite
- Ne jamais changer les niveaux de gamification — source unique : `src/lib/levels.ts`
- Ne jamais toucher aux design tokens sans passer par `design-tokens.ts`
- Ne jamais creer de nouveaux clients Supabase — utiliser ceux de `src/lib/supabase/`

## Conventions
- **Branches Git** : `feat/nom`, `fix/nom`, `chore/nom`
- **Commits** : en francais, format `type: description`
- **Composants** : PascalCase, prefixe `P180` pour les composants UI reutilisables
- **Server Actions** : dans `actions.ts` au niveau de la page concernee
- Pas de `console.log` en production

---

## DB — Gotchas critiques

### Gotcha #1 — `onboarding_progress` utilise `client_id`
```sql
-- CORRECT
.eq('client_id', user.id)
-- La colonne s'appelle client_id (pas user_id)
```

### Gotcha #2 — `habits.created_by` est un enum texte, pas un UUID
```sql
created_by text not null check (created_by in ('admin', 'client'))
-- Toujours inserer 'admin' depuis les routes admin, jamais user.id
```

### Gotcha #3 — `habits.category` distingue habitudes et missions
```sql
category text check (category in ('habit', 'mission'))
-- 'habit' = quotidien recurrent, 'mission' = one-shot
```

## DB — Tables
| Table | FK principale | Notes |
|-------|-------------|-------|
| `profiles` | `id` = auth.users.id | `role` ('admin'/'client'), `email`, `first_name`, `last_name`, `last_login` (timestamptz) |
| `app_settings` | — | 4 champs config : contrat PDF, iClosed, Circle (ex-Skool), `robin_whatsapp`. WhatsApp groupe retiré |
| `onboarding_progress` | `client_id` | Etapes 1-5, `step1_signature_name`, `step1_signed_at`, `completed_at` |
| `questionnaire_responses` | `client_id` | 40+ champs reponses formulaire (7 sections) |
| `programs` | `client_id` | Donnees programme 180j |
| `habits` | `client_id` | `is_active`, `sort_order`, `category` ('habit'\|'mission'), `created_by` ('admin'\|'client'), `progress_percent`, `description`, `xp_reward`, `period` |
| `habit_logs` | `client_id` | Check-ins quotidiens, `date` (YYYY-MM-DD), `completed` |
| `weekly_reports` | `client_id` | Rapports hebdo auto IA, `week_number` (1-26) |
| `gamification` | `client_id` | `xp_total`, `current_streak`, `longest_streak`, `level` |
| `messages` | `sender_id`, `receiver_id` | Messagerie Robin <-> clients |
| `milestone_emails_sent` | `client_id` | Deduplique emails J30/J60/J90/J180 via `(client_id, milestone_day)` unique |
| `todos` | `client_id` | `title`, `is_system` (bool — 2 todos fixes), `completed_date` (date), `day_of_week` (null=quotidien, 0=dimanche) |
| `wins` | `client_id` | `content` text, `week_number` int. Index sur `(client_id, week_number)` |
| `personal_todos` | `client_id` | `title`, `target_date` (date), `completed` (bool). Taches perso ajoutees via "Preparer to-do de demain" |
| `program_content` | `client_id` (nullable) | `client_id` NULL = template global, sinon programme personnalise. Unique sur `(client_id, phase_number, week_number)`. `title`, `objectives`, `focus_text`, `robin_notes` |

---

## Clients Supabase
```typescript
import { createClient } from '@/lib/supabase/server'       // routes authentifiees (cookies)
import { createBrowserClient } from '@/lib/supabase/client' // composants client (browser)
import { createAdminClient } from '@/lib/supabase/admin'    // routes admin (bypass RLS)
import { updateSession } from '@/lib/supabase/middleware'   // middleware auth refresh
```

---

## Composants

### UI de base (src/components/)
| Composant | Props cles | Notes |
|-----------|-----------|-------|
| `P180Button` | `variant` (primary/ghost/danger), `size` (sm/md/lg), `loading`, `fullWidth` | uppercase tracking-wider, Barlow Condensed |
| `P180Input` | `label`, `error` | Focus accent blue |
| `P180Logo` | `size` | Logo PNG RGBA reel (unoptimized pour transparence) |

### Dashboard (src/app/dashboard/components/)
| Composant | Role |
|-----------|------|
| `TopBar` | Header sticky — logo + 4 onglets nav (tous bleus) + avatar. Ligne JOUR X + countdown live (j:h:m:s). Barre progression |
| `DailyCard` | Check-in unifie : habits + todos obligatoires (badge orange) + taches perso. Counter X/Y. Inline form "Preparer to-do de demain". Bouton WhatsApp verrouille jusqu'a 100% |
| `HeroCard` | Section hero avec niveau, XP, progression |
| `MissionsPanel` | Missions one-shot avec progression slider |
| `WinsCard` | Wins de la semaine — **affiche le dimanche uniquement** |
| `ProgressionPanel` | Streak avec paliers (7j/14j/21j/30j/60j/90j) + Badges avec descriptions et barres de progression |
| `LeaderboardCard` | Top 100 clients par XP, highlight user actuel |
| `MiniLeaderboard` | Classement compact dans le dashboard |
| `LevelUpOverlay` | Overlay plein ecran quand level up |
| `WelcomeOverlay` | Modal premiere connexion — explique niveaux, XP, streaks, guide installation PWA (iOS/Android). Affiche une seule fois (localStorage) |
| `XPParticles` | Particules "+10 XP" animees, multiplicateurs (x1, x1.5, x2, x3) |
| `AnimatedCounter` | Transitions numeriques animees (XP, streaks) |
| `TodoPrepForm` | Formulaire inline "Preparer to-do de demain" |
| `ContactRobinButton` | Bouton WhatsApp direct vers Robin |
| `WhatsAppButton` | Bouton lien groupe WhatsApp |
| `DashboardAnimations` | Utilitaires CSS animations partagees |

> Composants supprimes : `CheckInCard`, `TodoCard`, `Sidebar`, `StickyHeader`, `MobileBottomNav`

---

## API Routes
| Route | Methode | Role |
|-------|---------|------|
| `/api/webhooks/stripe` | POST | Webhook `checkout.session.completed` -> cree user + profiles + onboarding + programs + gamification + **2 system todos** + email Brevo |
| `/api/onboarding/contract-signed` | POST | Enregistre signature contrat |
| `/api/admin/clients` | GET/POST | Liste clients / Creer client manuellement (+ `jour_x` optionnel pour import clients existants) |
| `/api/admin/habits` | GET/POST | Liste habits / Creer habit. 2 habits systeme auto-crees par client (Preparer to-do demain + Poster wins dimanche) |
| `/api/admin/todos` | GET/POST/DELETE | Liste/Creer/Supprimer todos (impossible de supprimer `is_system=true`). Auth admin obligatoire |
| `/api/dev/create-test-user` | POST | Cree user test — desactive si `SEED=false` |
| `/api/dev/complete-onboarding` | POST | Skip onboarding pour tests |
| `/api/dev/seed-demo-data` | POST | Donnees de demo pour tests |
| `/api/dev/create-admin` | POST | Cree compte admin test (contact@alchim-ia.com) |
| `/api/dev/reset-password` | POST | Reset password admin test |
| `/api/dev/test-emails` | POST | Envoie les 10 emails de test. `?only=N` pour un seul |
| `/api/dev/seed-demo-data` | POST | Seed 3 clients test avec habits, todos, missions, logs, gamification, wins |

---

## Dashboard — Logique XP & Streaks
```
src/app/dashboard/actions.ts   -> Server action toggleHabitAction()
src/app/dashboard/utils.ts     -> getXpDelta(streak) : base 10 XP, x1.5 a 7j, x2 a 14j, x3 a 30j
```
- **Perfect day bonus** : tous les habits completes -> +50 XP bonus
- **Streak** : incremente au check-in quotidien, reset si jour saute
- **Optimistic UI** : mise a jour locale immediate, sync serveur en background

---

## Lib (src/lib/)
| Fichier | Role |
|---------|------|
| `levels.ts` | 6 niveaux de gamification — source unique |
| `email.ts` | `sendEmail()` + `p180EmailTemplate()` + `p180CtaButton()` — utilitaire email centralise (Brevo SMTP API, template dark #050505, CTA bleus table-centres) |
| `design-tokens.ts` | Couleurs (C.*) et fonts (D=Barlow, M=JetBrains) — source unique |
| `types/dashboard.ts` | Interfaces TypeScript du dashboard |
| `types/index.ts` | Types partages (LeaderboardEntry, etc.) |
| `hooks/useCountdown.ts` | Hook countdown timer (retourne {d, h, m, s}) |
| `hooks/useIsMobile.ts` | Hook media query responsive |

---

## Design system
- **Prefix CSS** : `p180-*`
- **Accent** : `#3A86FF` / hover `#2D6FE6`
- **Fond OLED** : `#0B0B0B` (bg) / Surface `#0F0F0F` / Sidebar `#0A0A0A` / Border `#1E1E1E`
- **Muted** : `#6B6B6B`
- **Vert** : `#15803D` (wins/todos), `#22C55E` (clair)
- **Orange** : `#FFA500` (badges obligatoires, todos systeme)
- **Gold** : `#C9A84C`
- **Fonts** : Barlow Condensed (`D`) pour display/labels/boutons, JetBrains Mono (`M`) pour XP/nombres
- **Typo globale** : `uppercase tracking-wider font-medium`
- **Usage** : toujours `...D` (spread), jamais `fontFamily: D` (D est un objet, pas un string)
- UI en francais

## Niveaux de gamification
| Niveau | XP min | Nom |
|--------|--------|-----|
| 1 | 0 | L'Endormi |
| 2 | 500 | L'Eveille |
| 3 | 1 500 | Le Batisseur |
| 4 | 3 000 | Le Souverain |
| 5 | 6 000 | Le Point de Bascule |
| 6 | 12 000 | Le 180 |

## 6 phases du programme
| Phase | Nom | Jours | Semaines |
|-------|-----|-------|----------|
| 1 | Destruction | 1-30 | 1-4 |
| 2 | Fondation | 31-60 | 5-9 |
| 3 | Ignition | 61-90 | 10-13 |
| 4 | Acceleration | 91-120 | 14-17 |
| 5 | Domination | 121-150 | 18-21 |
| 6 | Transcendance | 151-180 | 22-26 |

---

## Onboarding — 3 etapes + set-password
1. **Signature contrat** — PDF (lien Google Drive), champ signature, enregistre `step1_signature_name` + `step1_signed_at`
2. **Questionnaire** — 7 sections, 40+ champs. Auto-marque `step3_whatsapp` + `step4_skool` comme true (etapes retirees)
3. **Premier call** — Lien iClosed. Marque `step5_call` + `completed_at`

Flow apres onboarding : `/set-password` (choix mot de passe perso) → `/dashboard` (WelcomeOverlay)
Middleware bloque `/dashboard` tant que `user_metadata.password_changed` n'est pas `true`.

> WhatsApp et Skool retires de l'onboarding (colonnes DB conservees pour compatibilite)

## Crons Vercel (`vercel.json`)
| Route | Schedule | Role | maxDuration |
|-------|----------|------|-------------|
| `/api/cron/weekly-reports` | Lundi 8h UTC | Rapports IA Claude Haiku (semaines 1-26) + envoi email bilan au client | 60s |
| `/api/cron/habit-reminders` | Tous les jours 9h UTC | Email si aucun habit coche la veille | — |
| `/api/cron/milestone-emails` | Tous les jours 8h UTC | Emails J30/J60/J90/J180 dedupliques | — |

Tous les crons verifient `Authorization: Bearer <CRON_SECRET>`.

## Emails (src/lib/email.ts)
Utilitaire centralise `sendEmail()` utilise par toutes les routes :
- `sendEmail({ to, toName, subject, html, senderName? })` — wrapper Brevo API
- `p180EmailTemplate(body)` — dark theme (#050505), logo centré, gradient bleu, 40px padding unifié
- `p180CtaButton(href, text)` — CTA bleu #3A86FF, table-centré pour compatibilité email clients
- Sender : `Robin — PROJET180`
- Logo heberge sur imgur (TODO: remplacer par URL domaine prod)
- Utilise dans : webhooks/stripe, admin/clients, cron/*, dev/test-emails, dev/create-admin

### Templates par type
| Email | Design | CTA |
|-------|--------|-----|
| Bienvenue (admin/Stripe) | Dark, logo, accès en clair | "Entrer dans l'arene" (bleu) |
| Admin bienvenue | Dark, logo, texte perso Enzo pour Robin | "Ton espace admin" (bleu) |
| Milestone J30/60/90/180 | "JOUR X", barre progression, stats | "Voir ma progression" (bleu) |
| Rapport hebdo IA | Bordure bleue, texte IA, 3 cartes stats | "Voir mon dashboard" (bleu) |
| Rappel habitudes | Texte naturel | "Reprendre aujourd'hui" (bleu) |
| Contrat signe (notif Robin) | Format simple, infos client | — |
| 4 templates Supabase Auth | Reset PW, Confirm Signup, Magic Link, Change Email — mêmes templates dark | CTA bleu |

## Flux Stripe
1. Client paie -> Stripe envoie `checkout.session.completed`
2. `/api/webhooks/stripe` (maxDuration: 30s) -> cree user Supabase Auth + insere `profiles`, `onboarding_progress`, `programs`, `gamification` + **2 system todos**
3. Email de bienvenue Brevo envoye automatiquement

---

## Variables d'environnement
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BREVO_API_KEY=
NEXT_PUBLIC_APP_URL=https://app.projet180.fr
CRON_SECRET=
COACH_EMAIL=robin@projet180.fr
NEXT_PUBLIC_SEED_TEST_USER=false
ANTHROPIC_API_KEY=
```

## Migrations DB (dans cet ordre)
```
supabase/migrations/20260309_milestone_emails_sent.sql
supabase/migrations/20260310_contract_signature.sql
supabase/migrations/20260311_habits_category.sql
supabase/migrations/20260311_todos.sql
supabase/migrations/20260311_wins.sql
supabase/migrations/20260311_system_todos.sql
supabase/migrations/20260316_demo_prep.sql
supabase/migrations/20260319_program_content_per_client.sql
supabase/migrations/20260321_last_login.sql
```

## Go-live checklist
- [ ] Toutes les migrations executees dans Supabase (8 fichiers)
- [ ] Variables d'env configurees dans Vercel (prod)
- [ ] Stripe webhook URL prod : `https://app.projet180.fr/api/webhooks/stripe`
- [ ] Robin a entre ses liens dans `/admin` (iClosed, contrat PDF Google Drive)
- [ ] Robin WhatsApp perso configure dans app_settings
- [ ] Compte admin Robin cree (`role = 'admin'` dans `profiles`)
- [ ] Domaine `app.projet180.fr` -> CNAME vers `cname.vercel-dns.com`
- [ ] Test E2E : paiement Stripe -> email -> login -> onboarding 3 etapes -> set-password -> dashboard
- [ ] Import clients existants via admin (avec jour_x)
- [ ] Programme personnalise rempli pour chaque client
- [ ] Supprimer comptes de demo/test
- [ ] Supprimer routes `/api/dev/*` ou desactiver `SEED=false`
