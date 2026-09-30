/**
 * The TRUSS Eight-Week Training Program, as the product runs it.
 *
 * Source: TRUSS_Sales_Intelligence_Repository/docs/06_training/eight_week_curriculum.md.
 * Each week's focus, pre-work, live session, field target, and measure are
 * carried over as written; the Spanish is a translation of intent, the same
 * rule the Coach follows for the knowledge base. The database stores only what
 * happens to people (cohorts, submissions, checks, credentials — migration
 * 0020); what the weeks *are* is versioned here with the knowledge base.
 *
 * Safe to import in the browser.
 */

import type { StageId } from './methodology';

export const PROGRAM_ID = 'truss-8wk' as const;
export const PROGRAM_WEEKS = 8;
/** "AI practice: 2 sessions of 10 minutes" per week, from the program's weekly cadence. */
export const PRACTICE_SESSIONS_PER_WEEK = 2;

type Localized = { en: string; es: string };
type LocalizedList = { en: string[]; es: string[] };

export interface ProgramWeek {
  week: number;
  title: Localized;
  focus: Localized;
  prework: LocalizedList;
  live: LocalizedList;
  fieldTarget: LocalizedList;
  measure: Localized;
  /** Beams to practice this week. Empty means all five. */
  beams: StageId[];
}

export const PROGRAM: readonly ProgramWeek[] = [
  {
    week: 1,
    title: { en: 'Build the frame', es: 'Construye la base' },
    focus: {
      en: 'The TRUSS method, the sales-motion router, the evidence hierarchy, and your baseline.',
      es: 'El método TRUSS, el enrutador de tipos de venta, la jerarquía de evidencia y tu punto de partida.',
    },
    prework: {
      en: [
        'Self-assess yourself on each beam.',
        'Classify ten short customer situations by sales motion.',
        'Submit one recent win and one frustrating loss.',
      ],
      es: [
        'Evalúate en cada una de las cinco etapas.',
        'Clasifica diez situaciones cortas de clientes según el tipo de venta.',
        'Comparte una venta reciente que ganaste y una pérdida que te frustró.',
      ],
    },
    live: {
      en: [
        'Compare pressure selling with decision-quality selling.',
        'Route mixed scenarios.',
        'Find the earliest weak beam in sample calls.',
      ],
      es: [
        'Compara vender con presión contra ayudar al cliente a decidir bien.',
        'Clasifica escenarios mixtos.',
        'Encuentra la primera etapa débil en llamadas de ejemplo.',
      ],
    },
    fieldTarget: {
      en: [
        'Classify every meaningful opportunity by motion and stage.',
        'Record one assumption that became a verified fact — or stayed unknown.',
      ],
      es: [
        'Clasifica cada oportunidad importante por tipo de venta y etapa.',
        'Anota una suposición que se volvió un hecho verificado, o que siguió sin saberse.',
      ],
    },
    measure: { en: 'Routing accuracy and data completion.', es: 'Precisión al clasificar y datos completos.' },
    beams: [],
  },
  {
    week: 2,
    title: { en: 'Trust and Relate', es: 'Confianza y Conexión' },
    focus: {
      en: 'First impression, permission, buyer state, relevance, and matched proof.',
      es: 'Primera impresión, permiso, el estado del cliente, relevancia y pruebas que correspondan.',
    },
    prework: {
      en: [
        'Audit one opening, appointment message, or outreach touch.',
        'Collect three approved proof items and note what each one proves.',
      ],
      es: [
        'Revisa una apertura, un mensaje de cita o un contacto de prospección.',
        'Reúne tres pruebas aprobadas y anota qué demuestra cada una.',
      ],
    },
    live: {
      en: [
        'Practice urgent, skeptical, and commercial openings.',
        'Match proof to the buyer’s uncertainty.',
        'Remove fake rapport and unsupported claims.',
      ],
      es: [
        'Practica aperturas urgentes, con clientes escépticos y comerciales.',
        'Usa la prueba que responde a la duda del cliente.',
        'Quita la confianza fingida y las afirmaciones sin respaldo.',
      ],
    },
    fieldTarget: {
      en: [
        'Use an explicit visit or meeting roadmap.',
        'Record the buyer’s priority in their own words.',
      ],
      es: [
        'Explica al inicio cómo va a ser la visita o la reunión.',
        'Anota la prioridad del cliente con sus propias palabras.',
      ],
    },
    measure: {
      en: 'Trust and Relate rubric, booking or meeting progression, complaint signals.',
      es: 'Rúbrica de Confianza y Conexión, avance a cita o reunión, señales de queja.',
    },
    beams: ['trust', 'relate'],
  },
  {
    week: 3,
    title: { en: 'Understand', es: 'Entender' },
    focus: {
      en: 'Situation, problem, implication, outcome, decision, and constraint questions.',
      es: 'Preguntas de situación, problema, consecuencia, resultado, decisión y limitaciones.',
    },
    prework: {
      en: [
        'Annotate a call or opportunity for the discovery families it missed.',
        'Write six questions that would change your recommendation.',
      ],
      es: [
        'Marca en una llamada u oportunidad qué tipos de preguntas faltaron.',
        'Escribe seis preguntas que cambiarían tu recomendación.',
      ],
    },
    live: {
      en: [
        'Turn checklist questions into a natural conversation.',
        'Tell proportional implication apart from fear inflation.',
        'Practice summaries and correction.',
      ],
      es: [
        'Convierte una lista de preguntas en una conversación natural.',
        'Distingue una consecuencia real de exagerar para asustar.',
        'Practica resúmenes y correcciones.',
      ],
    },
    fieldTarget: {
      en: [
        'Deliver a customer-confirmed summary before you propose anything.',
        'Capture the decision process on qualified opportunities.',
      ],
      es: [
        'Da un resumen que el cliente confirme antes de proponer algo.',
        'Anota cómo se toma la decisión en las oportunidades calificadas.',
      ],
    },
    measure: {
      en: 'Discovery coverage, summary accuracy, unsupported assumption rate.',
      es: 'Cobertura del diagnóstico, precisión del resumen, suposiciones sin respaldo.',
    },
    beams: ['understand'],
  },
  {
    week: 4,
    title: { en: 'Solve', es: 'Resolver' },
    focus: {
      en: 'Technical fit, value translation, option integrity, and recommendation.',
      es: 'Que la solución sirva, traducir el valor, opciones honestas y una recomendación clara.',
    },
    prework: {
      en: [
        'Bring one real proposal with its scope, assumptions, and exclusions.',
        'Map each feature to a buyer outcome and its proof.',
      ],
      es: [
        'Trae una propuesta real con su alcance, supuestos y exclusiones.',
        'Conecta cada característica con un resultado para el cliente y su prueba.',
      ],
    },
    live: {
      en: [
        'Repair weak option menus.',
        'Compare a recommendation with a capability dump.',
        'Practice explaining residual risk and total cost.',
      ],
      es: [
        'Mejora menús de opciones débiles.',
        'Compara una recomendación con una lista de todo lo que ofreces.',
        'Practica explicar el riesgo que queda y el costo total.',
      ],
    },
    fieldTarget: {
      en: [
        'Connect each material recommendation to a verified priority.',
        'State at least one meaningful exclusion or limitation clearly.',
      ],
      es: [
        'Conecta cada recomendación importante con una prioridad verificada.',
        'Di con claridad al menos una exclusión o limitación importante.',
      ],
    },
    measure: {
      en: 'Option validity, recommendation alignment, revision and cancellation signals.',
      es: 'Opciones válidas, recomendación alineada, señales de cambios y cancelaciones.',
    },
    beams: ['solve'],
  },
  {
    week: 5,
    title: { en: 'Secure', es: 'Asegurar' },
    focus: {
      en: 'Objection diagnosis, decision clarity, direct next steps, and follow-up.',
      es: 'Diagnosticar objeciones, claridad en la decisión, próximos pasos directos y seguimiento.',
    },
    prework: {
      en: [
        'Submit three objections and what each one actually meant.',
        'Identify one opportunity that stalled without a buyer-owned next step.',
      ],
      es: [
        'Comparte tres objeciones y lo que cada una realmente significaba.',
        'Identifica una oportunidad que se estancó sin un próximo paso del cliente.',
      ],
    },
    live: {
      en: [
        'Practice price, comparison, stakeholder, timing, and incumbent objections.',
        'Tell commitment apart from pressure.',
        'Build follow-up that adds value.',
      ],
      es: [
        'Practica objeciones de precio, comparación, otras personas, tiempo y competidor actual.',
        'Distingue un compromiso real de la presión.',
        'Arma un seguimiento que aporte valor.',
      ],
    },
    fieldTarget: {
      en: [
        'Clarify before answering every material objection.',
        'Confirm owner, action, timing, and purpose for every next step.',
      ],
      es: [
        'Aclara antes de responder cada objeción importante.',
        'Confirma quién, qué, cuándo y para qué en cada próximo paso.',
      ],
    },
    measure: {
      en: 'Objection clarification, reciprocal next-step rate, stage progression.',
      es: 'Aclarar objeciones, próximos pasos acordados por ambos, avance de etapa.',
    },
    beams: ['secure'],
  },
  {
    week: 6,
    title: { en: 'Campaigns and prospecting', es: 'Campañas y prospección' },
    focus: {
      en: 'Audience, trigger, relevance, proof, channel, compliance, and call to action.',
      es: 'Audiencia, motivo, relevancia, prueba, canal, cumplimiento y llamado a la acción.',
    },
    prework: {
      en: [
        'Define one segment and one reason to reach them now.',
        'Bring an existing email, text, door pitch, or call opening.',
      ],
      es: [
        'Define un segmento y una razón para contactarlo ahora.',
        'Trae un correo, mensaje, presentación en la puerta o apertura de llamada que ya uses.',
      ],
    },
    live: {
      en: [
        'Map a sequence to TRUSS.',
        'Rewrite generic outreach.',
        'Define one-variable A/B tests and stop conditions.',
      ],
      es: [
        'Relaciona una secuencia con TRUSS.',
        'Reescribe un mensaje genérico.',
        'Define pruebas A/B de una sola variable y cuándo detenerlas.',
      ],
    },
    fieldTarget: {
      en: [
        'Launch or simulate one compliant micro-campaign.',
        'Tag responses by what actually happened.',
      ],
      es: [
        'Lanza o simula una micro-campaña que cumpla las reglas.',
        'Clasifica las respuestas según lo que realmente pasó.',
      ],
    },
    measure: {
      en: 'Contact, qualified response, appointment, opt-out, complaint, gross profit.',
      es: 'Contacto, respuesta calificada, cita, bajas, quejas, utilidad bruta.',
    },
    beams: ['trust', 'relate'],
  },
  {
    week: 7,
    title: { en: 'Accounts, commercial pursuits, and markets', es: 'Cuentas, proyectos comerciales y mercados' },
    focus: {
      en: 'Account facts, stakeholders, stage evidence, go/no-go, and market signals.',
      es: 'Datos de la cuenta, personas involucradas, evidencia de etapa, seguir o no, y señales del mercado.',
    },
    prework: {
      en: [
        'Build a one-page account brief.',
        'Score one opportunity’s evidence and one pursuit’s fit.',
      ],
      es: [
        'Arma un resumen de una cuenta en una página.',
        'Califica la evidencia de una oportunidad y si un proyecto te conviene.',
      ],
    },
    live: {
      en: [
        'Expose single-thread and optimism risk.',
        'Translate technical capability into business outcomes.',
        'Prioritize account actions by impact, confidence, and urgency.',
      ],
      es: [
        'Detecta el riesgo de depender de una sola persona o de ser demasiado optimista.',
        'Traduce la capacidad técnica en resultados para el negocio.',
        'Prioriza acciones por impacto, certeza y urgencia.',
      ],
    },
    fieldTarget: {
      en: [
        'Add one verified stakeholder and one buyer-owned next step.',
        'Deliberately disqualify or re-stage one unsupported opportunity.',
      ],
      es: [
        'Agrega una persona involucrada verificada y un próximo paso del cliente.',
        'Descarta o cambia de etapa a propósito una oportunidad sin respaldo.',
      ],
    },
    measure: {
      en: 'Stakeholder breadth, stage evidence, qualified pipeline, pursuit quality.',
      es: 'Amplitud de contactos, evidencia de etapa, oportunidades calificadas, calidad de proyectos.',
    },
    beams: ['understand', 'solve'],
  },
  {
    week: 8,
    title: { en: 'Capstone and operating rhythm', es: 'Proyecto final y ritmo de trabajo' },
    focus: {
      en: 'A full-cycle simulation, your metrics, and a personal coaching plan.',
      es: 'Una simulación completa, tus métricas y un plan personal de mejora.',
    },
    prework: {
      en: [
        'Repeat the Week 1 self-assessment.',
        'Prepare one field case with its outcome and quality data.',
      ],
      es: [
        'Repite la autoevaluación de la semana 1.',
        'Prepara un caso real con su resultado y datos de calidad.',
      ],
    },
    live: {
      en: [
        'Complete a context-specific capstone.',
        'Calibrate scores across peers and managers.',
        'Build a 30-day improvement plan.',
      ],
      es: [
        'Completa un proyecto final según tu tipo de venta.',
        'Calibra calificaciones entre compañeros y gerentes.',
        'Arma un plan de mejora de 30 días.',
      ],
    },
    fieldTarget: {
      en: ['Keep one behavior metric and one outcome metric going for 30 days.'],
      es: ['Sigue una métrica de comportamiento y una de resultados durante 30 días.'],
    },
    measure: {
      en: 'Before-and-after beam scores, critical-error rate, field adoption, quality-adjusted results.',
      es: 'Calificación antes y después, tasa de errores críticos, adopción en campo, resultados ajustados por calidad.',
    },
    beams: [],
  },
];

export function programWeek(week: number): ProgramWeek | undefined {
  return PROGRAM.find((w) => w.week === week);
}

/** The week a cohort is in on a date: 1 on its start day, capped at 8. 0 before it starts. */
export function currentWeek(startsOn: string, today: Date = new Date()): number {
  const start = new Date(`${startsOn}T00:00:00Z`).getTime();
  const days = Math.floor((today.getTime() - start) / 86_400_000);
  if (days < 0) return 0;
  return Math.min(PROGRAM_WEEKS, Math.floor(days / 7) + 1);
}

/** [start, end) of a program week, as ISO dates, for counting practice inside it. */
export function weekWindow(startsOn: string, week: number): { from: string; to: string } {
  const start = new Date(`${startsOn}T00:00:00Z`).getTime();
  const from = new Date(start + (week - 1) * 7 * 86_400_000);
  const to = new Date(start + week * 7 * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * The criteria the certification check reports on (certification_status in
 * migration 0020), in the order a rep should work through them. Two more are
 * manager attestations made at issue time, and are listed so nobody is
 * surprised by them.
 */
export const CERTIFICATION_CRITERIA = {
  en: {
    modules: 'Complete all eight weeks, each checked by your manager',
    rubric: 'Score at least 75 of 100 on your most recent simulation',
    finalTwo: 'No critical violation in your final two simulations',
    field: 'Show one successful field behavior change (Week 8 field target, or a passing field review)',
    routing: 'Your manager confirms at least 80% routing accuracy',
    evidence: 'Your manager confirms accurate use of evidence, limitations, and next steps',
  },
  es: {
    modules: 'Completa las ocho semanas, cada una revisada por tu gerente',
    rubric: 'Saca al menos 75 de 100 en tu simulación más reciente',
    finalTwo: 'Ninguna falta crítica en tus dos últimas simulaciones',
    field: 'Demuestra un cambio real en campo (meta de la semana 8, o una revisión de campo aprobada)',
    routing: 'Tu gerente confirma al menos 80% de precisión al clasificar',
    evidence: 'Tu gerente confirma que usas bien la evidencia, las limitaciones y los próximos pasos',
  },
} as const;

/** What the credential is not, verbatim from the program document. */
export const CERTIFICATION_DISCLAIMER = {
  en: 'Certification is a TRUSS learning credential, not proof of technical licensure, legal compliance, or job fitness.',
  es: 'La certificación es una credencial de aprendizaje de TRUSS, no prueba de licencia técnica, cumplimiento legal ni aptitud para un puesto.',
} as const;

/** Shape of certification_status() — see migration 0020. */
export interface CertificationStatus {
  modules_completed: number;
  modules_total: number;
  simulations: number;
  latest_weighted: number | null;
  rubric_met: boolean;
  final_two_clean: boolean;
  field_behavior_shown: boolean;
  field_review_passed: boolean;
  eligible: boolean;
  certified: boolean;
  credential_code: string | null;
  issued_at: string | null;
}
