'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import P180Logo from '@/components/P180Logo'
import { P180Button } from '@/components/P180Button'
import { P180Input } from '@/components/P180Input'
import { C, D } from '@/lib/design-tokens'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5

interface OnboardingProgress {
  step1_contract: boolean
  step2_questionnaire: boolean
  step3_whatsapp: boolean
  step4_skool: boolean
  step5_call: boolean
}

interface AppSettings {
  whatsapp_link: string
  skool_link: string
  iclosed_link: string
  contract_pdf_url: string
}

// ─── Questionnaire State ──────────────────────────────────────────────────────

const initialQuestionnaire = {
  // Section 1
  full_name: '', age: '', city: '', job: '', income: '', how_found: '', why_us: '',
  // Section 2
  score_body: 5, score_business: 5, score_mental: 5, score_social: 5,
  daily_routine: '', body_relationship: '', training: '', nutrition: '', sleep_hours: '', health_notes: '',
  // Section 3
  business_description: '', financial_goal: '', business_blocker: '', past_coaching: '',
  // Section 4
  frustration: '', procrastination: '', patterns: '', screen_time: '', substances: '',
  // Section 5
  relationship: '', social_circle: '', travel: '', hobbies: '',
  // Section 6
  success_vision: '', main_goal: '', tried_failed: '', why_now: '', weekly_hours: '', feedback_reaction: '', coachability: 5,
  // Final
  anything_else: ''
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [progress, setProgress] = useState<OnboardingProgress>({
    step1_contract: false,
    step2_questionnaire: false,
    step3_whatsapp: false,
    step4_skool: false,
    step5_call: false,
  })
  const [settings, setSettings] = useState<AppSettings>({
    whatsapp_link: 'https://chat.whatsapp.com/BqQlrH78LvlH5a7jEdepSG?mode=gi_t',
    skool_link: 'https://www.skool.com/projet180',
    iclosed_link: 'https://app.iclosed.io/e/projet180/onboarding',
    contract_pdf_url: '',
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [contractAccepted, setContractAccepted] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [questionnaire, setQuestionnaire] = useState(initialQuestionnaire)
  const [questionnaireSection, setQuestionnaireSection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  // ── Load data ──
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      // Pre-fill signature name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        setSignatureName([profile.first_name, profile.last_name].filter(Boolean).join(' '))
      }

      // Load onboarding progress
      const { data: prog } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (prog) {
        setProgress({
          step1_contract: prog.step1_contract || false,
          step2_questionnaire: prog.step2_questionnaire || false,
          step3_whatsapp: prog.step3_whatsapp || false,
          step4_skool: prog.step4_skool || false,
          step5_call: prog.step5_call || false,
        })
        // Set current step to first incomplete
        if (!prog.step1_contract) setCurrentStep(1)
        else if (!prog.step2_questionnaire) setCurrentStep(2)
        else if (!prog.step3_whatsapp) setCurrentStep(3)
        else if (!prog.step4_skool) setCurrentStep(4)
        else if (!prog.step5_call) setCurrentStep(5)
        else { router.push('/dashboard'); return }
      }

      // Load questionnaire responses if already completed
      if (prog?.step2_questionnaire) {
        const { data: qr } = await supabase
          .from('questionnaire_responses')
          .select('responses')
          .eq('user_id', user.id)
          .single()
        if (qr?.responses) {
          setQuestionnaire(prev => ({ ...prev, ...(qr.responses as typeof initialQuestionnaire) }))
        }
      }

      // Load app settings
      const { data: appSettings } = await supabase
        .from('app_settings')
        .select('key, value')
      
      if (appSettings) {
        const s: Partial<AppSettings> = {}
        appSettings.forEach((row: { key: string; value: string }) => {
          if (row.key === 'whatsapp_link') s.whatsapp_link = row.value
          if (row.key === 'skool_link') s.skool_link = row.value
          if (row.key === 'iclosed_link') s.iclosed_link = row.value
          if (row.key === 'contract_pdf_url') s.contract_pdf_url = row.value
        })
        setSettings(prev => ({ ...prev, ...s }))
      }

      setPageLoading(false)
    }
    load()
  }, [])

  const allPrev4Done = progress.step1_contract && progress.step2_questionnaire && progress.step3_whatsapp && progress.step4_skool

  // ── Mark step complete ──
  async function markStep(step: keyof OnboardingProgress) {
    if (!userId) return
    const update = { [step]: true }
    await supabase
      .from('onboarding_progress')
      .update(update)
      .eq('user_id', userId)
    setProgress(prev => ({ ...prev, [step]: true }))
  }

  // ── Step 1 — Contrat ──
  async function handleSignContract() {
    setLoading(true)
    await supabase.from('onboarding_progress').update({
      step1_contract: true,
      step1_signed_at: new Date().toISOString(),
      step1_signature_name: signatureName.trim(),
    }).eq('user_id', userId)
    // Email Robin — best-effort, non bloquant
    fetch('/api/onboarding/contract-signed', { method: 'POST' }).catch(() => {})
    setProgress(prev => ({ ...prev, step1_contract: true }))
    setCurrentStep(2)
    setLoading(false)
  }

  // ── Step 2 — Questionnaire ──
  async function handleSubmitQuestionnaire() {
    setLoading(true)
    await supabase.from('questionnaire_responses').upsert({
      user_id: userId,
      responses: questionnaire,
      submitted_at: new Date().toISOString()
    })
    await markStep('step2_questionnaire')
    setCurrentStep(3)
    setLoading(false)
  }

  // ── Step 3/4 — Links ──
  async function handleLinkClick(step: 'step3_whatsapp' | 'step4_skool', url: string, next: Step) {
    const safeUrl = url?.trim()
    // Open link only if configured — step is marked done either way
    if (safeUrl && safeUrl !== '#') {
      window.open(safeUrl, '_blank')
    }
    await markStep(step)
    setProgress(prev => ({ ...prev, [step]: true }))
    setTimeout(() => setCurrentStep(next), 600)
  }

  // ── Step 5 — Call ──
  async function handleBookCall() {
    const safeUrl = settings.iclosed_link?.trim()
    if (safeUrl && safeUrl !== '#') {
      window.open(safeUrl, '_blank')
    }
    await markStep('step5_call')
    // Set completed_at so middleware redirects to dashboard on next login
    if (userId) {
      await supabase
        .from('onboarding_progress')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
    setRedirecting(true)
  }

  const setQ = (key: string, value: string | number) => {
    setQuestionnaire(prev => ({ ...prev, [key]: value }))
  }

  if (pageLoading) return <LoadingScreen />
  if (redirecting) return <RedirectScreen onDone={() => router.push('/dashboard')} />

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F5] flex flex-col" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#060606]/95 backdrop-blur-sm border-b border-[#1E1E1E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <P180Logo size="lg" />
            <span className="bg-[#3A86FF] text-white text-lg font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg">Onboarding</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-[#0F0F0F] border-b border-[#1E1E1E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex gap-2">
            {([1,2,3,4,5] as Step[]).map(s => (
              <div
                key={s}
                className="h-2 flex-1 rounded-full transition-all duration-500"
                style={{
                  backgroundColor:
                    (s === 1 && progress.step1_contract) ||
                    (s === 2 && progress.step2_questionnaire) ||
                    (s === 3 && progress.step3_whatsapp) ||
                    (s === 4 && progress.step4_skool) ||
                    (s === 5 && progress.step5_call)
                      ? '#3A86FF'
                      : s === currentStep
                      ? '#2B75EE'
                      : '#1E1E1E'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content — centered vertically */}
      <div className="flex-1 flex flex-col justify-center">

      {/* Step Nav (read-only status) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
        <StepNav
          currentStep={currentStep}
          progress={progress}
          allPrev4Done={allPrev4Done}
          onStepClick={(s) => {
            const stepKey = `step${s}_${['contract','questionnaire','whatsapp','skool','call'][s-1]}` as keyof OnboardingProgress
            const accessible =
              s === 1 ||
              (s === 2 && progress.step1_contract) ||
              (s === 3 && progress.step2_questionnaire) ||
              (s === 4 && progress.step3_whatsapp) ||
              (s === 5 && allPrev4Done)
            if (progress[stepKey] || s === currentStep || accessible) setCurrentStep(s)
          }}
        />
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-24 w-full">
        {currentStep === 1 && (
          <Step1Contract
            pdfUrl={settings.contract_pdf_url}
            accepted={contractAccepted}
            onAccept={setContractAccepted}
            signatureName={signatureName}
            onSignatureNameChange={setSignatureName}
            onSign={handleSignContract}
            loading={loading}
            done={progress.step1_contract}
            onContinue={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Questionnaire
            questionnaire={questionnaire}
            section={questionnaireSection}
            setSection={setQuestionnaireSection}
            setQ={setQ}
            onSubmit={handleSubmitQuestionnaire}
            loading={loading}
            done={progress.step2_questionnaire}
            onContinue={() => setCurrentStep(3)}
          />
        )}
        {currentStep === 3 && (
          <Step3Link
            title="Rejoins le groupe WhatsApp"
            description="Le groupe privé des membres Projet180."
            details="Espace d'échanges quotidiens, accountability entre membres et annonces importantes de Robin."
            icon="💬"
            cta="Rejoindre le groupe"
            url={settings.whatsapp_link}
            done={progress.step3_whatsapp}
            onConfirm={() => handleLinkClick('step3_whatsapp', settings.whatsapp_link, 4)}
            onContinue={() => setCurrentStep(4)}
          />
        )}
        {currentStep === 4 && (
          <Step3Link
            title="Accède à la communauté Skool"
            description="La plateforme vidéo & communauté du programme."
            details="Masterclasses, replays, modules d'entraînement et espace communautaire centralisé."
            icon="🎓"
            cta="Accéder à Skool"
            url={settings.skool_link}
            done={progress.step4_skool}
            onConfirm={() => handleLinkClick('step4_skool', settings.skool_link, 5)}
            onContinue={() => setCurrentStep(5)}
          />
        )}
        {currentStep === 5 && (
          <Step5Call
            unlocked={allPrev4Done}
            url={settings.iclosed_link}
            done={progress.step5_call}
            onBook={handleBookCall}
          />
        )}
      </div>

      </div>{/* end flex-1 vertical center */}
    </div>
  )
}

// ─── Step Nav ────────────────────────────────────────────────────────────────

function StepNav({
  currentStep,
  progress,
  allPrev4Done,
  onStepClick
}: {
  currentStep: Step
  progress: OnboardingProgress
  allPrev4Done: boolean
  onStepClick: (s: Step) => void
}) {
  const steps = [
    { n: 1 as Step, label: 'Contrat', done: progress.step1_contract },
    { n: 2 as Step, label: 'Questionnaire', done: progress.step2_questionnaire },
    { n: 3 as Step, label: 'WhatsApp', done: progress.step3_whatsapp },
    { n: 4 as Step, label: 'Skool', done: progress.step4_skool },
    { n: 5 as Step, label: 'Premier call', done: progress.step5_call, locked: !allPrev4Done },
  ]

  return (
    <div className="flex gap-2">
      {steps.map(s => {
        const isActive = currentStep === s.n
        const isLocked = s.locked && !s.done

        return (
          <button
            key={s.n}
            onClick={() => !isLocked && onStepClick(s.n)}
            className={`
              flex-1 flex items-center justify-center gap-2.5 px-3 py-6 rounded-xl border font-medium uppercase tracking-wider transition-all
              ${isActive
                ? 'border-[#3A86FF] bg-[#3A86FF]/10 text-[#F5F5F5]'
                : s.done
                ? 'border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E] cursor-pointer'
                : isLocked
                ? 'border-[#1E1E1E] bg-[#0F0F0F] text-[#444444] cursor-not-allowed'
                : 'border-[#1E1E1E] bg-[#0F0F0F] text-[#484848]'
              }
            `}
            style={{ fontSize: 16, letterSpacing: '0.04em' }}
          >
            {isLocked ? (
              <span>🔒</span>
            ) : s.done ? (
              <span className="text-[#22C55E]">✓</span>
            ) : (
              <span className={isActive ? 'text-[#3A86FF]' : 'text-[#484848]'}>{s.n}</span>
            )}
            <span>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Step 1 — Contrat ────────────────────────────────────────────────────────

function Step1Contract({
  pdfUrl, accepted, onAccept, signatureName, onSignatureNameChange, onSign, loading, done, onContinue
}: {
  pdfUrl: string
  accepted: boolean
  onAccept: (v: boolean) => void
  signatureName: string
  onSignatureNameChange: (v: string) => void
  onSign: () => void
  loading: boolean
  done: boolean
  onContinue: () => void
}) {
  if (done) return <StepDone label="Contrat signé" onContinue={onContinue} />

  return (
    <div className="space-y-8">
      <StepHeader
        number="01"
        title="Signe ton contrat"
        subtitle="Prends le temps de lire l'intégralité du contrat avant de signer."
      />

      {/* PDF Viewer */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.surface }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full"
            style={{ height: '60vh', minHeight: 320 }}
            title="Contrat Projet180"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <span className="text-7xl mb-6">📄</span>
            <p className="text-base font-medium uppercase tracking-wider" style={{ ...D, color: C.muted }}>Le contrat n'a pas encore été uploadé par Robin.</p>
            <p className="text-base font-medium mt-2 uppercase tracking-wider" style={{ ...D, color: C.muted }}>Il sera disponible très prochainement.</p>
          </div>
        )}
      </div>

      {/* Bloc signature regroupé */}
      <div className="rounded-xl p-6 space-y-6 text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>

        {/* Texte légal */}
        <p className="text-base font-medium uppercase tracking-wider" style={{ ...D, color: C.text }}>
          En cochant la case ci-dessous et en mettant ton Prénom et Nom, tu acceptes le contrat.
        </p>

        {/* Acceptance checkbox */}
        <label className="flex items-center gap-3 cursor-pointer group justify-center">
          <div className="relative">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => onAccept(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all`} style={{
              background: accepted ? C.accent : 'transparent',
              borderColor: accepted ? C.accent : C.border,
            }}>
              {accepted && <span className="text-white text-xs">✓</span>}
            </div>
          </div>
          <span className="text-base font-medium leading-relaxed uppercase tracking-wider" style={{ ...D, color: C.text }}>
            J'ai lu et j'accepte les conditions générales du programme Projet180.
          </span>
        </label>

        {/* Signature input */}
        <div className="max-w-sm mx-auto space-y-2">
          <label className="block text-base font-medium uppercase tracking-wider text-center" style={{ ...D, color: C.muted }}>
            Signature
          </label>
          <input
            type="text"
            value={signatureName}
            onChange={e => onSignatureNameChange(e.target.value)}
            placeholder="PRÉNOM NOM"
            className="w-full px-4 py-3 rounded-xl text-center uppercase tracking-wider text-base font-medium focus:outline-none transition-all"
            style={{ ...D, background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          />
        </div>

        {/* Sign button */}
        <div className="flex justify-center">
          <P180Button
            onClick={onSign}
            disabled={!accepted || !signatureName.trim()}
            loading={loading}
            className="max-w-xs w-full"
          >
            {loading ? 'Signature en cours…' : 'Signer le contrat'}
          </P180Button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2 — Questionnaire ───────────────────────────────────────────────────

function Step2Questionnaire({
  questionnaire, section, setSection, setQ, onSubmit, loading, done, onContinue
}: {
  questionnaire: typeof initialQuestionnaire
  section: number
  setSection: (n: number) => void
  setQ: (k: string, v: string | number) => void
  onSubmit: () => void
  loading: boolean
  done: boolean
  onContinue: () => void
}) {
  if (done) return <StepDone label="Questionnaire complété" onContinue={onContinue} />

  const totalSections = 7

  return (
    <div className="space-y-6">
      <StepHeader
        number="02"
        title="Remplis ton questionnaire"
        subtitle="Réponds avec honnêteté. Plus tu es précis, plus Robin pourra t'aider dès le départ."
      />

      {/* Section progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSections }, (_, i) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full transition-all"
            style={{ backgroundColor: i < section ? '#3A86FF' : i === section - 1 ? '#2B75EE' : '#1E1E1E' }}
          />
        ))}
      </div>
      {/* Section content */}
      {section === 1 && <QSection1 q={questionnaire} setQ={setQ} sectionNum={1} totalSections={totalSections} />}
      {section === 2 && <QSection2 q={questionnaire} setQ={setQ} sectionNum={2} totalSections={totalSections} />}
      {section === 3 && <QSection3 q={questionnaire} setQ={setQ} sectionNum={3} totalSections={totalSections} />}
      {section === 4 && <QSection4 q={questionnaire} setQ={setQ} sectionNum={4} totalSections={totalSections} />}
      {section === 5 && <QSection5 q={questionnaire} setQ={setQ} sectionNum={5} totalSections={totalSections} />}
      {section === 6 && <QSection6 q={questionnaire} setQ={setQ} sectionNum={6} totalSections={totalSections} />}
      {section === 7 && <QSection7 q={questionnaire} setQ={setQ} sectionNum={7} totalSections={totalSections} />}

      {/* Navigation */}
      <div className="flex gap-3">
        {section > 1 && (
          <P180Button
            variant="ghost"
            size="md"
            onClick={() => setSection(section - 1)}
            className="flex-1"
          >
            ← Précédent
          </P180Button>
        )}
        {section < totalSections ? (
          <P180Button
            size="md"
            onClick={() => setSection(section + 1)}
            className="flex-1"
          >
            Suivant →
          </P180Button>
        ) : (
          <P180Button
            size="md"
            onClick={onSubmit}
            loading={loading}
            className="flex-1"
          >
            {loading ? 'Envoi…' : 'Envoyer'}
          </P180Button>
        )}
      </div>
    </div>
  )
}

// ─── Questionnaire Sections ────────────────────────────────────────────────────

function QSection1({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="👤" title="Identité" sectionNum={sectionNum} totalSections={totalSections} />
      <QInput label="Prénom et Nom" value={q.full_name} onChange={v => setQ('full_name', v)} placeholder="Ex : Thomas Martin" />
      <QInput label="Âge" type="number" value={q.age} onChange={v => setQ('age', v)} placeholder="Ex : 28" />
      <QInput label="Ville / Pays de résidence" value={q.city} onChange={v => setQ('city', v)} placeholder="Ex : Paris, France" />
      <QInput label="Métier / activité principale" value={q.job} onChange={v => setQ('job', v)} placeholder="Ex : Freelance copywriter" />
      <QSelect
        label="Revenu mensuel net approximatif"
        value={q.income}
        onChange={v => setQ('income', v)}
        options={['< 1 000€', '1 000€–3 000€', '3 000€–5 000€', '5 000€–10 000€', '10 000€+']}
      />
      <QSelect
        label="Comment tu nous as découverts ?"
        value={q.how_found}
        onChange={v => setQ('how_found', v)}
        options={['YouTube', 'Instagram', 'Substack', 'Bouche-à-oreille', 'Autre']}
      />
      <QTextarea label="Pourquoi nous avoir choisi nous ?" value={q.why_us} onChange={v => setQ('why_us', v)} />
    </div>
  )
}

function QSection2({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="📊" title="Situation actuelle" sectionNum={sectionNum} totalSections={totalSections} />
      <QSlider label="CORPS — Physique, énergie, santé" value={q.score_body} onChange={v => setQ('score_body', v)} />
      <QSlider label="BUSINESS — Revenus, carrière, projets" value={q.score_business} onChange={v => setQ('score_business', v)} />
      <QSlider label="MENTAL — Clarté, discipline, confiance" value={q.score_mental} onChange={v => setQ('score_mental', v)} />
      <QSlider label="SOCIAL / LIFESTYLE" value={q.score_social} onChange={v => setQ('score_social', v)} />
      <QTextarea label="Décris ta journée type, du réveil au coucher" value={q.daily_routine} onChange={v => setQ('daily_routine', v)} rows={4} />
      <QTextarea label="Ton rapport actuel avec ton corps ?" value={q.body_relationship} onChange={v => setQ('body_relationship', v)} />
      <QTextarea label="Tu t'entraînes actuellement ? Si oui, quoi, combien de fois ?" value={q.training} onChange={v => setQ('training', v)} />
      <QTextarea label="Nutrition : précise ou au feeling ?" value={q.nutrition} onChange={v => setQ('nutrition', v)} />
      <QInput label="Heures de sommeil par nuit (en moyenne)" type="number" value={q.sleep_hours} onChange={v => setQ('sleep_hours', v)} placeholder="Ex : 7" />
      <QTextarea label="Problèmes de santé, blessures, allergies, médicaments ?" value={q.health_notes} onChange={v => setQ('health_notes', v)} placeholder="Laisse vide si rien à signaler" />
    </div>
  )
}

function QSection3({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="💼" title="Business & Finances" sectionNum={sectionNum} totalSections={totalSections} />
      <QTextarea label="Décris ton activité professionnelle en 3 phrases" value={q.business_description} onChange={v => setQ('business_description', v)} rows={3} />
      <QInput label="Objectif financier dans les 6 prochains mois (chiffre précis)" value={q.financial_goal} onChange={v => setQ('financial_goal', v)} placeholder="Ex : 8 000€/mois" />
      <QTextarea label="Plus gros blocage business en ce moment ?" value={q.business_blocker} onChange={v => setQ('business_blocker', v)} />
      <QTextarea label="Déjà investi dans un coaching / formation ? Si oui, lequel et qu'est-ce que ça t'a apporté ?" value={q.past_coaching} onChange={v => setQ('past_coaching', v)} />
    </div>
  )
}

function QSection4({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="🧠" title="Mental & Mindset" sectionNum={sectionNum} totalSections={totalSections} />
      <QTextarea label="La chose qui te frustre le plus dans ta vie actuelle ?" value={q.frustration} onChange={v => setQ('frustration', v)} />
      <QTextarea label="Ce que tu remettrais toujours au lendemain si personne ne te tenait accountable ?" value={q.procrastination} onChange={v => setQ('procrastination', v)} />
      <QTextarea label="Quel schéma répétitif tu observes chez toi ?" value={q.patterns} onChange={v => setQ('patterns', v)} />
      <QTextarea label="Temps de consommation de contenu par jour (réseaux, YouTube, podcasts…)" value={q.screen_time} onChange={v => setQ('screen_time', v)} />
      <QTextarea label="Consommation d'alcool, cannabis ou autres substances régulièrement ?" value={q.substances} onChange={v => setQ('substances', v)} placeholder="Sois honnête — ça reste entre nous" />
    </div>
  )
}

function QSection5({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="🌍" title="Lifestyle & Social" sectionNum={sectionNum} totalSections={totalSections} />
      <QTextarea label="Es-tu en couple ? Si oui, depuis combien de temps ?" value={q.relationship} onChange={v => setQ('relationship', v)} />
      <QTextarea label="Ton cercle social actuel en 2 phrases" value={q.social_circle} onChange={v => setQ('social_circle', v)} />
      <QInput label="Tu voyages régulièrement ou ancré dans une ville ?" value={q.travel} onChange={v => setQ('travel', v)} />
      <QTextarea label="Hobbies / ce que tu fais pour te détendre" value={q.hobbies} onChange={v => setQ('hobbies', v)} />
    </div>
  )
}

function QSection6({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-5">
      <QSectionTitle icon="🎯" title="Objectifs & Engagement" sectionNum={sectionNum} totalSections={totalSections} />
      <QTextarea label="À quoi ressemble ta vie dans 6 mois si ce coaching est un succès total ?" value={q.success_vision} onChange={v => setQ('success_vision', v)} rows={4} />
      <QTextarea label="L'OBJECTIF N°1 à atteindre avec ce coaching (un seul)" value={q.main_goal} onChange={v => setQ('main_goal', v)} />
      <QTextarea label="Ce que tu as déjà essayé qui n'a pas marché ?" value={q.tried_failed} onChange={v => setQ('tried_failed', v)} />
      <QTextarea label="Ce qui t'a décidé à investir maintenant ?" value={q.why_now} onChange={v => setQ('why_now', v)} />
      <QSelect
        label="Heures par semaine dédiées à ta transformation"
        value={q.weekly_hours}
        onChange={v => setQ('weekly_hours', v)}
        options={['< 5h', '5–10h', '10–15h', '15h+']}
      />
      <QTextarea label="Comment tu réagis quand on te dit quelque chose que tu n'as pas envie d'entendre ?" value={q.feedback_reaction} onChange={v => setQ('feedback_reaction', v)} />
      <QSlider label="À quel point tu es coachable ? (1 = pas du tout / 10 = totalement)" value={q.coachability} onChange={v => setQ('coachability', v)} />
    </div>
  )
}

function QSection7({ q, setQ, sectionNum, totalSections }: { q: typeof initialQuestionnaire; setQ: (k: string, v: string | number) => void; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="space-y-6">
      <QSectionTitle icon="💬" title="Pour finir" sectionNum={sectionNum} totalSections={totalSections} />
      <QTextarea
        label="Y a-t-il quelque chose que je devrais savoir sur toi que ce questionnaire n'a pas couvert ?"
        value={q.anything_else}
        onChange={v => setQ('anything_else', v)}
        rows={5}
        placeholder="Libre à toi…"
      />
      <div className="rounded-xl border border-[#1E1E1E] bg-[#0F0F0F] p-5 space-y-3">
        <p className="text-base text-[#3A86FF] leading-relaxed uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Merci d'avoir pris le temps de remplir ce questionnaire. Ce que tu viens d'écrire, c'est déjà un acte de lucidité sur toi-même. La transformation commence ici.
        </p>
        <p className="text-base text-[#3A86FF] font-medium uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>— Robin</p>
      </div>
    </div>
  )
}

// ─── Step 3 & 4 — Link Steps ──────────────────────────────────────────────────

function Step3Link({
  title, description, details, icon, cta, url, done, onConfirm, onContinue
}: {
  title: string
  description: string
  details?: string
  icon: string
  cta: string
  url: string
  done: boolean
  onConfirm: () => void
  onContinue: () => void
}) {
  if (done) return <StepDone label={title} onContinue={onContinue} />

  const hasLink = !!url && url.trim() !== '' && url.trim() !== '#'

  return (
    <div className="space-y-6">
      <StepHeader
        number={icon}
        title={title}
        subtitle={description}
      />

      <div className="rounded-xl p-6 text-center space-y-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="text-7xl">{icon}</div>
        <p className="text-base leading-relaxed uppercase tracking-wider" style={{ ...D, color: C.muted }}>{details ?? description}</p>
        <p className="text-base leading-relaxed uppercase tracking-wider" style={{ ...D, color: C.muted }}>
          {hasLink
            ? "Le lien s'ouvre dans un nouvel onglet. Cette étape sera automatiquement validée."
            : "Le lien n'est pas encore configuré par Robin. Tu peux passer pour l'instant."}
        </p>
        <div className="max-w-md mx-auto">
          <P180Button onClick={onConfirm} fullWidth>
            {hasLink ? `${cta} →` : 'Passer cette étape →'}
          </P180Button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 5 — Réserver son call ───────────────────────────────────────────────

function Step5Call({
  unlocked, url, done, onBook
}: {
  unlocked: boolean
  url: string
  done: boolean
  onBook: () => void
}) {
  if (done) return (
    <div className="space-y-6 text-center py-4">
      <div className="w-14 h-px bg-[#3A86FF] mx-auto" />
      <h2
        className="text-4xl sm:text-5xl font-black uppercase text-[#F0F0F0]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
      >Mission accomplie</h2>
      <p className="text-base text-[#888888] leading-relaxed uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Ton premier call est réservé. Robin te contactera prochainement.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <StepHeader
        number={unlocked ? "📞" : "🔒"}
        title="Réserve ton premier call"
        subtitle={unlocked
          ? "Toutes tes étapes sont complétées. Tu peux maintenant réserver ton premier call avec Robin."
          : "Cette étape se débloque une fois les 4 étapes précédentes complétées."
        }
      />

      {!unlocked ? (
        <div className="rounded-xl p-8 text-center space-y-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-base uppercase tracking-wider" style={{ ...D, color: C.muted }}>Complete les étapes 1 à 4 pour débloquer la réservation.</p>
          <div className="space-y-2 text-left mt-4">
            {['Contrat signé', 'Questionnaire rempli', 'WhatsApp rejoint', 'Skool rejoint'].map((l, i) => (
              <p key={i} className="text-base flex items-center gap-2 uppercase tracking-wider" style={{ ...D, color: C.muted }}>
                <span style={{ color: C.accent }}>→</span> {l}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: 'rgba(58,134,255,0.05)', border: `1px solid rgba(58,134,255,0.3)` }}>
          <div className="text-6xl">📞</div>
          <p className="text-base font-medium uppercase tracking-wider" style={{ ...D, color: C.text }}>Tu y es. Robin t'attend.</p>
          <p className="text-base leading-relaxed uppercase tracking-wider" style={{ ...D, color: C.muted }}>
            Choisis le créneau qui te convient. Ce call de démarrage est le point de lancement de ta transformation.
          </p>
          <div className="max-w-md mx-auto">
            <P180Button onClick={onBook} fullWidth>
              Réserver mon call →
            </P180Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { number?: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-3 text-center">
      <h1
        className="text-5xl sm:text-6xl font-black text-[#F0F0F0] leading-none uppercase"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
      >{title}</h1>
      <p className="text-base font-medium text-[#888888] leading-relaxed uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{subtitle}</p>
    </div>
  )
}

function StepDone({ label, onContinue }: { label: string; onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#1E1E1E] bg-[#0F0F0F] p-10 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/5 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[#F2F2F5] text-base font-black uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</p>
      </div>
      <P180Button onClick={onContinue} fullWidth>
        Continuer →
      </P180Button>
    </div>
  )
}

function QSectionTitle({ icon, title, sectionNum, totalSections }: { icon?: string; title: string; sectionNum?: number; totalSections?: number }) {
  return (
    <div className="pb-2 border-b border-[#1E1E1E] text-center space-y-1">
      {sectionNum != null && totalSections != null && (
        <p className="text-sm text-[#484848] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Section {sectionNum}/{totalSections}
        </p>
      )}
      <span
        className="text-lg font-bold uppercase text-[#888888] tracking-wider"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >{icon && `${icon}  `}{title}</span>
    </div>
  )
}

function QInput({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-base font-medium text-[#888888] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl px-4 py-3 text-base text-[#F5F5F5] placeholder-[#444444] focus:outline-none focus:border-[#3A86FF] focus:shadow-[0_0_0_3px_rgba(58,134,255,0.12)] transition-all"
      />
    </div>
  )
}

function QTextarea({
  label, value, onChange, placeholder, rows = 2
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-base font-medium text-[#888888] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl px-4 py-3 text-base text-[#F5F5F5] placeholder-[#444444] focus:outline-none focus:border-[#3A86FF] focus:shadow-[0_0_0_3px_rgba(58,134,255,0.12)] transition-all resize-none"
      />
    </div>
  )
}

function QSelect({
  label, value, onChange, options
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-base font-medium text-[#888888] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl px-4 py-3 text-base text-[#F5F5F5] focus:outline-none focus:border-[#3A86FF] focus:shadow-[0_0_0_3px_rgba(58,134,255,0.12)] transition-all appearance-none"
      >
        <option value="">Choisir…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function QSlider({
  label, value, onChange
}: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-base font-medium text-[#888888] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</label>
        <span className="text-lg font-black text-[#3A86FF]">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#3A86FF]"
      />
      <div className="flex justify-between text-sm text-[#484848] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        <span>1 — Très mauvais</span>
        <span>10 — Excellent</span>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="space-y-3 text-center">
        <P180Logo size="md" />
        <div className="text-[#484848] text-sm animate-pulse uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Chargement…</div>
      </div>
    </div>
  )
}

function RedirectScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#060606] flex flex-col items-center justify-center gap-6"
    >
      <style>{`
        @keyframes fillBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>

      <P180Logo size="xl" />

      <div
        className="rounded-sm overflow-hidden"
        style={{ width: '260px', height: '2px', background: '#1E1E1E' }}
      >
        <div
          style={{
            height: '100%',
            background: '#3A86FF',
            animation: 'fillBar 1.8s linear forwards',
          }}
        />
      </div>

      <span
        className="text-[#484848] uppercase tracking-[0.12em]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px' }}
      >Accès au dashboard</span>
    </div>
  )
}
