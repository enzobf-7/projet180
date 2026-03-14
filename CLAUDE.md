# PROJET180 APP — CLAUDE.md
> **Regle absolue** : mettre a jour ce fichier dans le MEME commit que toute
> modification significative. Format : `docs(claude): [ce qui a change]`
> Obligatoire si : composant ajoute/supprime, route modifiee, schema DB change,
> regle metier modifiee, variable d'env ajoutee. Ne jamais dire "CLAUDE.md est
> a jour" sans avoir verifie et modifie les sections concernees.

Plateforme de coaching 180j "Projet180" par Robin Duplouis.

---

## Stack
- **Next.js 16** App Router, React 19, TypeScript, Tailwind CSS 4, Turbopack
- **Supabase** : auth + DB (RLS active sur toutes les tables)
- **Stripe** : webhook -> creation automatique de compte client
- **Brevo** : emails transactionnels (SMTP API)
- **Anthropic Claude Haiku** : generation de rapports hebdo IA
- **Vercel** : deploiement + crons planifies

## Statut actuel
- **Phase** : pre-lancement (pas encore en production)
- **Domaine cible** : `app.projet180.fr`
- **Migrations** : 6 fichiers a executer dans Supabase avant go-live
- **En cours** : [a mettre a jour]
- **Bloquants connus** : [a mettre a jour]

---

## Dev
```bash
npm run dev   # port 3000 (depuis la racine projet180-app/)
```

## Structure des routes
```
/                -> login (email/password)
/onboarding      -> flow 5 etapes (nouveau client)
/dashboard       -> check-in habitudes/missions, XP, streaks, todos, wins, leaderboard
/profil          -> stats + reponses questionnaire (6 sections)
/programme       -> viewer programme 180j (3 phases, 26 semaines)
/messagerie      -> messagerie client <-> Robin
/admin           -> panel Robin (4 onglets : clients, missions/habits, todos, config)
/admin/client/[id] -> fiche detaillee d'un client
/admin/messagerie -> messagerie admin -> clients
```

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

### Gotcha #1 — `onboarding_progress` utilise `user_id`, pas `client_id`
```sql
-- CORRECT
.eq('user_id', user.id)
-- FAUX (toutes les autres tables utilisent client_id)
.eq('client_id', user.id)
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
| `profiles` | `id` = auth.users.id | `role` ('admin'/'client'), `email`, `first_name`, `last_name` |
| `app_settings` | — | 4 champs config (WhatsApp, Skool, iClosed, contrat PDF) |
| `onboarding_progress` | `user_id` | Etapes 1-5, `step1_signature_name`, `step1_signed_at`, `completed_at` |
| `questionnaire_responses` | `client_id` | 40+ champs reponses formulaire (7 sections) |
| `programs` | `client_id` | Donnees programme 180j |
| `habits` | `client_id` | `is_active`, `sort_order`, `category` ('habit'\|'mission'), `created_by` ('admin'\|'client') |
| `habit_logs` | `client_id` | Check-ins quotidiens, `date` (YYYY-MM-DD), `completed` |
| `weekly_reports` | `client_id` | Rapports hebdo auto IA, `week_number` (1-26) |
| `gamification` | `client_id` | `xp_total`, `current_streak`, `longest_streak`, `level` |
| `messages` | `sender_id`, `receiver_id` | Messagerie Robin <-> clients |
| `milestone_emails_sent` | `client_id` | Deduplique emails J30/J60/J90/J180 via `(client_id, milestone_day)` unique |
| `todos` | `client_id` | `title`, `is_system` (bool — 2 todos fixes), `completed_date` (date) |
| `wins` | `client_id` | `content` text, `week_number` int. Index sur `(client_id, week_number)` |

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
| `TopBar` | Header horizontal unifie — remplace Sidebar + StickyHeader + MobileBottomNav. Affiche JOUR X/180 centre |
| `DailyCard` | Fusion de l'ancien CheckInCard + TodoCard — check-in habits/missions + todos en une carte |
| `WinsCard` | Wins de la semaine — **affiche le dimanche uniquement** |
| `ProgressionPanel` | Badges avec descriptions + progression, streak avec paliers XP |
| `LeaderboardCard` | Top 100 clients par XP, highlight user actuel |
| `LevelUpOverlay` | Overlay plein ecran quand level up |
| `XPParticles` | Particules "+10 XP" animees, multiplicateurs (x1, x1.5, x2, x3) |
| `AnimatedCounter` | Transitions numeriques animees (XP, streaks) |

> Composants supprimes : `CheckInCard`, `TodoCard`, `Sidebar`, `StickyHeader`, `MobileBottomNav`

---

## API Routes
| Route | Methode | Role |
|-------|---------|------|
| `/api/webhooks/stripe` | POST | Webhook `checkout.session.completed` -> cree user + profiles + onboarding + programs + gamification + **2 system todos** + email Brevo |
| `/api/onboarding/contract-signed` | POST | Enregistre signature contrat |
| `/api/admin/clients` | GET/POST | Liste clients / Creer client manuellement |
| `/api/admin/habits` | GET/POST | Liste habits / Creer habit |
| `/api/admin/todos` | GET/POST/DELETE | Liste/Creer/Supprimer todos (impossible de supprimer `is_system=true`) |
| `/api/dev/create-test-user` | POST | Cree user test — desactive si `SEED=false` |
| `/api/dev/complete-onboarding` | POST | Skip onboarding pour tests |
| `/api/dev/seed-demo-data` | POST | Donnees de demo pour tests |

---

## Dashboard — Logique XP & Streaks
```
src/app/dashboard/actions.ts   -> Server action toggleHabitAction()
src/app/dashboard/utils.ts     -> getXpDelta(streak) : base 10 XP, x1.5 a 7j, x2 a 14j, x3 a 30j
```
- **Perfect day bonus** : tous les habits completes -> multiplicateur x1.5
- **Streak** : incremente au check-in quotidien, reset si jour saute
- **Optimistic UI** : mise a jour locale immediate, sync serveur en background

---

## Lib (src/lib/)
| Fichier | Role |
|---------|------|
| `levels.ts` | 6 niveaux de gamification — source unique |
| `design-tokens.ts` | Couleurs (C.*) et fonts (D=Barlow, M=JetBrains) — source unique |
| `types/dashboard.ts` | Interfaces TypeScript du dashboard |
| `hooks/useCountdown.ts` | Hook countdown timer |
| `hooks/useIsMobile.ts` | Hook media query responsive |

---

## Design system
- **Prefix CSS** : `p180-*`
- **Accent** : `#3A86FF` / hover `#2D6FE6`
- **Fond OLED** : `#0B0B0B` (bg) / Surface `#0F0F0F` / Sidebar `#0A0A0A` / Border `#1E1E1E`
- **Muted** : `#484848`
- **Vert** : `#15803D` (wins/todos), `#22C55E` (clair)
- **Fonts** : Barlow Condensed (display, labels, boutons), JetBrains Mono (XP, nombres)
- **Typo globale** : `uppercase tracking-wider font-medium`
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

---

## Onboarding — 5 etapes
1. **Signature contrat** — PDF iClosed, champ signature, enregistre `step1_signature_name` + `step1_signed_at`
2. **Questionnaire** — 7 sections, 40+ champs
3. **WhatsApp** — Lien groupe
4. **Skool** — Lien communaute
5. **Appel** — Planification premier appel coaching

## Crons Vercel (`vercel.json`)
| Route | Schedule | Role | maxDuration |
|-------|----------|------|-------------|
| `/api/cron/weekly-reports` | Lundi 8h UTC | Rapports IA Claude Haiku (semaines 1-26) | 60s |
| `/api/cron/habit-reminders` | Tous les jours 9h UTC | Email si aucun habit coche la veille | — |
| `/api/cron/milestone-emails` | Tous les jours 8h UTC | Emails J30/J60/J90/J180 dedupliques | — |

Tous les crons verifient `Authorization: Bearer <CRON_SECRET>`.

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
```

## Go-live checklist
- [ ] Toutes les migrations executees dans Supabase
- [ ] Variables d'env configurees dans Vercel
- [ ] Stripe webhook URL : `https://app.projet180.fr/api/webhooks/stripe`
- [ ] Robin a entre ses 4 liens dans `/admin`
- [ ] Compte admin Robin cree (`role = 'admin'` dans `profiles`)
- [ ] Domaine configure -> CNAME vers `cname.vercel-dns.com`
- [ ] Test E2E : paiement Stripe -> email -> login -> onboarding -> dashboard
