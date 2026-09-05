/**
 * The prompt library.
 *
 * The Coach answers a good question well and a vague question vaguely, and the
 * people using it are not going to learn prompt engineering — they are standing
 * on a lawn between doors. So the asking is done for them: they find the
 * situation they are actually in, in the words they would use for it, and the
 * question underneath is already written.
 *
 * Three rules held every entry to account:
 *
 *   The title is what a rep would say happened, not a category. "They said they
 *   already signed with someone" — never "Objection handling: competitor".
 *
 *   The prompt stands on its own. No blanks to fill in, no [bracketed
 *   placeholders]. Someone can tap it and send it without editing, and the
 *   Coach will ask for specifics if it needs them.
 *
 *   Nothing here asks the Coach to help do something it will refuse. The
 *   methodology holds a hard line on deductible waiving, damage exaggeration,
 *   and approval guarantees, so the deductible prompts ask how to *explain* the
 *   deductible, which is the thing reps actually get wrong.
 *
 * Both languages are first-class. A rep reading Spanish sends the Spanish
 * prompt and the Coach answers in Spanish, so the coverage has to match rather
 * than being an English library with a translate button.
 */

import type { StageId } from './methodology';

export type PromptGroupId =
  | 'door'
  | 'objections'
  | 'insurance'
  | 'money'
  | 'closing'
  | 'debrief'
  | 'method';

export interface PromptGroup {
  id: PromptGroupId;
  en: string;
  es: string;
}

/** Ordered the way a day goes: the door, then what goes wrong, then the close. */
export const PROMPT_GROUPS: PromptGroup[] = [
  { id: 'door', en: 'At the door', es: 'En la puerta' },
  { id: 'objections', en: 'Pushback', es: 'Objeciones' },
  { id: 'insurance', en: 'Claims & adjusters', es: 'Reclamos y ajustadores' },
  { id: 'money', en: 'Deductible & price', es: 'Deducible y precio' },
  { id: 'closing', en: 'Getting a yes', es: 'Cerrar el trato' },
  { id: 'debrief', en: 'After a bad door', es: 'Después de una mala puerta' },
  { id: 'method', en: 'Getting better', es: 'Mejorar' },
];

export interface LibraryPrompt {
  id: string;
  group: PromptGroupId;
  /** The TRUSS stage this belongs to. Selecting the prompt focuses that stage. */
  stage: StageId | null;
  /** Matched by search, in both languages, so either spelling finds the entry. */
  keywords: string[];
  en: { situation: string; prompt: string };
  es: { situation: string; prompt: string };
}

export const PROMPT_LIBRARY: LibraryPrompt[] = [
  // ── At the door ───────────────────────────────────────────────────────────
  {
    id: 'door-opener',
    group: 'door',
    stage: 'trust',
    keywords: ['opener', 'first', 'knock', 'introduction', 'abrir', 'tocar', 'presentar'],
    en: {
      situation: 'Give me a better way to open at the door',
      prompt:
        'Give me three different ways to open a conversation at the door after a hailstorm. I want openers that make it obvious in the first ten seconds who I am, what company I am with, and why I am on this street — without sounding like a script. Tell me why each one works and what kind of homeowner it fits.',
    },
    es: {
      situation: 'Dame una mejor forma de abrir en la puerta',
      prompt:
        'Dame tres formas distintas de abrir una conversación en la puerta después de una granizada. Quiero aperturas que dejen claro en los primeros diez segundos quién soy, con qué compañía vengo y por qué estoy en esta calle — sin sonar a guion. Explícame por qué funciona cada una y para qué tipo de dueño sirve.',
    },
  },
  {
    id: 'door-storm-chaser',
    group: 'door',
    stage: 'trust',
    keywords: ['storm chaser', 'scam', 'trust', 'legit', 'estafa', 'confianza', 'cazador'],
    en: {
      situation: 'They asked if I am a storm chaser',
      prompt:
        'A homeowner asked me point blank if I am a storm chaser. How do I answer that honestly in a way that builds trust instead of sounding defensive? Give me the actual words, and tell me what not to do.',
    },
    es: {
      situation: 'Me preguntaron si soy un cazador de tormentas',
      prompt:
        'Un dueño me preguntó directamente si soy un cazador de tormentas. ¿Cómo respondo con honestidad de una forma que genere confianza en vez de sonar a la defensiva? Dame las palabras exactas y dime qué no hacer.',
    },
  },
  {
    id: 'door-suspicious',
    group: 'door',
    stage: 'trust',
    keywords: ['suspicious', 'guarded', 'cold', 'warned', 'desconfiado', 'frío'],
    en: {
      situation: 'They opened the door already suspicious of me',
      prompt:
        'The homeowner opened the door and was cold and guarded from the first second — arms crossed, one word answers. Their neighborhood has probably been hit by a lot of door knockers already. How do I slow down and earn the right to keep talking without being pushy?',
    },
    es: {
      situation: 'Abrieron la puerta ya desconfiando de mí',
      prompt:
        'El dueño abrió la puerta frío y cerrado desde el primer segundo — brazos cruzados, respuestas de una palabra. Seguro ya pasaron muchos vendedores por su vecindario. ¿Cómo bajo el ritmo y me gano el derecho a seguir hablando sin presionar?',
    },
  },
  {
    id: 'door-not-decision-maker',
    group: 'door',
    stage: 'relate',
    keywords: ['spouse', 'wife', 'husband', 'decision maker', 'esposo', 'esposa', 'decide'],
    en: {
      situation: 'The person at the door is not the one who decides',
      prompt:
        'I am talking to someone at the door who clearly is not the decision maker — they keep saying they need to ask their spouse. How do I handle this without brushing them off or wasting the conversation? I do not want to have to start over when the other person gets home.',
    },
    es: {
      situation: 'La persona en la puerta no es quien decide',
      prompt:
        'Estoy hablando con alguien en la puerta que claramente no toma la decisión — sigue diciendo que tiene que preguntarle a su pareja. ¿Cómo manejo esto sin ignorarlo ni desperdiciar la conversación? No quiero tener que empezar de cero cuando llegue la otra persona.',
    },
  },
  {
    id: 'door-elderly',
    group: 'door',
    stage: 'relate',
    keywords: ['elderly', 'senior', 'older', 'family', 'mayor', 'anciano', 'familia'],
    en: {
      situation: 'The homeowner is elderly and seems nervous',
      prompt:
        'The homeowner is elderly, lives alone, and seems nervous about the whole thing. I want to help them, not pressure them. How do I handle this conversation ethically, and what should I do differently than with a younger homeowner?',
    },
    es: {
      situation: 'El dueño es mayor y se ve nervioso',
      prompt:
        'El dueño es una persona mayor, vive solo y se ve nervioso con todo esto. Quiero ayudarlo, no presionarlo. ¿Cómo manejo esta conversación de forma ética y qué debo hacer distinto que con un dueño más joven?',
    },
  },
  {
    id: 'door-inspection-ask',
    group: 'door',
    stage: 'understand',
    keywords: ['inspection', 'roof', 'ladder', 'look', 'inspección', 'techo', 'escalera'],
    en: {
      situation: 'How do I ask to get on the roof without it feeling like a sales move',
      prompt:
        'How do I ask a homeowner for permission to inspect their roof in a way that feels like a service and not a sales tactic? Give me the words, and tell me what I should have established before I ask.',
    },
    es: {
      situation: '¿Cómo pido subir al techo sin que parezca una táctica de venta?',
      prompt:
        '¿Cómo le pido permiso a un dueño para inspeccionar su techo de una forma que se sienta como un servicio y no como una táctica de venta? Dame las palabras y dime qué debo haber establecido antes de pedirlo.',
    },
  },

  // ── Pushback ──────────────────────────────────────────────────────────────
  {
    id: 'obj-already-signed',
    group: 'objections',
    stage: 'understand',
    keywords: ['already signed', 'competitor', 'contract', 'ya firmé', 'competencia', 'contrato'],
    en: {
      situation: 'They said they already signed with someone else',
      prompt:
        'The homeowner told me they already signed with another contractor. Walk me through how to handle this respectfully — what I should ask to find out whether they are actually committed or just want me gone, and where the line is between competing fairly and badmouthing another company.',
    },
    es: {
      situation: 'Dicen que ya firmaron con otra compañía',
      prompt:
        'El dueño me dijo que ya firmó con otro contratista. Explícame cómo manejar esto con respeto — qué preguntar para saber si de verdad están comprometidos o solo quieren que me vaya, y dónde está la línea entre competir bien y hablar mal de otra compañía.',
    },
  },
  {
    id: 'obj-not-interested',
    group: 'objections',
    stage: 'trust',
    keywords: ['not interested', 'no thanks', 'busy', 'no me interesa', 'ocupado'],
    en: {
      situation: '"Not interested" before I finish my first sentence',
      prompt:
        'Homeowners are saying "not interested" before I even finish my first sentence. What is that actually telling me, and how should I change my opening? Give me a few ways to respond in the moment that do not sound like I am ignoring what they just said.',
    },
    es: {
      situation: '"No me interesa" antes de terminar mi primera frase',
      prompt:
        'Los dueños me dicen "no me interesa" antes de que termine mi primera frase. ¿Qué me está diciendo eso en realidad y cómo debo cambiar mi apertura? Dame algunas formas de responder en el momento que no suenen a que estoy ignorando lo que acaban de decir.',
    },
  },
  {
    id: 'obj-no-damage',
    group: 'objections',
    stage: 'understand',
    keywords: ['no damage', 'roof is fine', 'new roof', 'sin daño', 'techo nuevo'],
    en: {
      situation: '"My roof is fine, there is no damage"',
      prompt:
        'The homeowner insists their roof is fine and there is no damage. They may be right. How do I respond in a way that respects that, without giving up on a legitimate inspection — and how do I tell the difference between a roof that genuinely has no damage and one where the damage is not visible from the ground?',
    },
    es: {
      situation: '"Mi techo está bien, no hay daño"',
      prompt:
        'El dueño insiste en que su techo está bien y no hay daño. Puede que tenga razón. ¿Cómo respondo respetando eso, sin renunciar a una inspección legítima — y cómo distingo entre un techo que de verdad no tiene daño y uno donde el daño no se ve desde el suelo?',
    },
  },
  {
    id: 'obj-think-about-it',
    group: 'objections',
    stage: 'secure',
    keywords: ['think about it', 'stall', 'later', 'pensarlo', 'después'],
    en: {
      situation: '"Let me think about it"',
      prompt:
        'I keep hearing "let me think about it" at the end of good conversations. How do I find out what they are actually thinking about without pressuring them, and what should I have done earlier in the conversation so this comes up less?',
    },
    es: {
      situation: '"Déjame pensarlo"',
      prompt:
        'Sigo escuchando "déjame pensarlo" al final de buenas conversaciones. ¿Cómo averiguo en qué están pensando realmente sin presionarlos, y qué debí hacer antes en la conversación para que esto pase menos?',
    },
  },
  {
    id: 'obj-three-bids',
    group: 'objections',
    stage: 'solve',
    keywords: ['three bids', 'shopping', 'compare', 'quotes', 'cotizaciones', 'comparar'],
    en: {
      situation: 'They want to get three bids',
      prompt:
        'The homeowner wants to collect three bids before deciding. On an insurance claim that is a different situation than a retail job. Help me explain the difference clearly and honestly, and tell me how to make sure I am being compared on the same scope rather than just price.',
    },
    es: {
      situation: 'Quieren pedir tres cotizaciones',
      prompt:
        'El dueño quiere juntar tres cotizaciones antes de decidir. En un reclamo de seguro eso es distinto que en un trabajo particular. Ayúdame a explicar la diferencia con claridad y honestidad, y dime cómo asegurarme de que me comparen con el mismo alcance de trabajo y no solo por precio.',
    },
  },
  {
    id: 'obj-real-objection',
    group: 'objections',
    stage: 'understand',
    keywords: ['real objection', 'hidden', 'stalling', 'objeción real', 'verdadera razón'],
    en: {
      situation: 'I think the objection they gave me is not the real one',
      prompt:
        'I answered the objection the homeowner gave me and it did not move anything, which usually means the real objection is something else. How do I find the actual concern without making them feel interrogated?',
    },
    es: {
      situation: 'Creo que la objeción que me dieron no es la real',
      prompt:
        'Respondí la objeción que me dio el dueño y no cambió nada, lo que normalmente significa que la objeción real es otra. ¿Cómo encuentro la preocupación verdadera sin que se sientan interrogados?',
    },
  },

  // ── Claims & adjusters ────────────────────────────────────────────────────
  {
    id: 'ins-denied',
    group: 'insurance',
    stage: 'solve',
    keywords: ['denied', 'denial', 'rejected', 'negado', 'rechazado', 'reclamo'],
    en: {
      situation: 'The adjuster denied the claim',
      prompt:
        'The adjuster denied my customer\'s claim. Walk me through what to do next, in order — what to review first, what a reinspection actually requires, and how to explain the situation to the homeowner without promising an outcome I cannot control.',
    },
    es: {
      situation: 'El ajustador negó el reclamo',
      prompt:
        'El ajustador negó el reclamo de mi cliente. Explícame qué hacer después, en orden — qué revisar primero, qué requiere realmente una reinspección, y cómo explicarle la situación al dueño sin prometer un resultado que no controlo.',
    },
  },
  {
    id: 'ins-adjuster-meeting',
    group: 'insurance',
    stage: 'solve',
    keywords: ['adjuster meeting', 'prepare', 'inspection', 'cita', 'ajustador', 'preparar'],
    en: {
      situation: 'How do I prepare for the adjuster meeting',
      prompt:
        'I have an adjuster meeting coming up. Give me a checklist of what to have ready, what to document beforehand, how to conduct myself during the inspection, and what I should tell the homeowner to expect so the meeting does not surprise them.',
    },
    es: {
      situation: '¿Cómo me preparo para la cita con el ajustador?',
      prompt:
        'Tengo una cita con el ajustador. Dame una lista de qué tener listo, qué documentar antes, cómo comportarme durante la inspección, y qué decirle al dueño para que la cita no lo tome por sorpresa.',
    },
  },
  {
    id: 'ins-prior-claim',
    group: 'insurance',
    stage: 'understand',
    keywords: ['prior claim', 'history', 'previous', 'reclamo anterior', 'historial'],
    en: {
      situation: 'They filed a claim before and it went badly',
      prompt:
        'This homeowner filed a claim after a previous storm and it was denied or went badly. They are hostile to the whole process now. How do I work with someone who has already been burned, and what do I need to know about their claim history before we go any further?',
    },
    es: {
      situation: 'Ya hicieron un reclamo antes y les fue mal',
      prompt:
        'Este dueño hizo un reclamo después de una tormenta anterior y se lo negaron o le fue mal. Ahora está en contra de todo el proceso. ¿Cómo trabajo con alguien que ya se quemó, y qué necesito saber de su historial de reclamos antes de seguir?',
    },
  },
  {
    id: 'ins-supplement',
    group: 'insurance',
    stage: 'solve',
    keywords: ['supplement', 'scope', 'underpaid', 'suplemento', 'alcance'],
    en: {
      situation: 'The scope came back short and I need a supplement',
      prompt:
        'The carrier\'s scope came back missing items that the job actually requires. Explain how supplements work, what documentation makes one succeed, and how to explain to the homeowner why the first number was not the final number without making it sound like I am adding charges.',
    },
    es: {
      situation: 'El alcance quedó corto y necesito un suplemento',
      prompt:
        'El alcance de la aseguradora llegó sin partidas que el trabajo sí requiere. Explícame cómo funcionan los suplementos, qué documentación hace que uno se apruebe, y cómo explicarle al dueño por qué el primer número no era el final sin que suene a que estoy agregando cargos.',
    },
  },
  {
    id: 'ins-explain-process',
    group: 'insurance',
    stage: 'solve',
    keywords: ['process', 'how it works', 'explain', 'proceso', 'explicar', 'cómo funciona'],
    en: {
      situation: 'Explain the whole claim process in plain language',
      prompt:
        'Give me a way to explain the entire insurance claim process to a homeowner who has never filed one — from filing to adjuster to scope to depreciation to final payment — in plain language, in about a minute, with no jargon. I want to be able to say this at a kitchen table.',
    },
    es: {
      situation: 'Explica todo el proceso del reclamo en palabras simples',
      prompt:
        'Dame una forma de explicarle todo el proceso de un reclamo de seguro a un dueño que nunca ha hecho uno — desde presentarlo hasta el ajustador, el alcance, la depreciación y el pago final — en palabras simples, en como un minuto, sin tecnicismos. Quiero poder decir esto en una mesa de cocina.',
    },
  },
  {
    id: 'ins-acv-rcv',
    group: 'insurance',
    stage: 'solve',
    keywords: ['acv', 'rcv', 'depreciation', 'recoverable', 'depreciación'],
    en: {
      situation: 'They do not understand why the first check is so small',
      prompt:
        'The homeowner got their first insurance check and it is much smaller than the total, and they think something is wrong. Explain ACV, RCV, and recoverable depreciation in language a homeowner will actually follow, and tell me how to walk them through their own paperwork.',
    },
    es: {
      situation: 'No entienden por qué el primer cheque es tan pequeño',
      prompt:
        'El dueño recibió su primer cheque del seguro y es mucho menor que el total, y cree que algo está mal. Explícame el ACV, el RCV y la depreciación recuperable en palabras que un dueño sí entienda, y dime cómo llevarlo paso a paso por su propio papeleo.',
    },
  },

  // ── Deductible & price ────────────────────────────────────────────────────
  {
    id: 'money-deductible',
    group: 'money',
    stage: 'solve',
    keywords: ['deductible', 'out of pocket', 'deducible', 'de mi bolsillo'],
    en: {
      situation: 'How do I handle the deductible conversation',
      prompt:
        'Walk me through the deductible conversation. When in the process should it come up, exactly how do I explain it so it does not land like a surprise bill, and what do I say when a homeowner asks me to waive it or work around it?',
    },
    es: {
      situation: '¿Cómo manejo la conversación del deducible?',
      prompt:
        'Explícame la conversación del deducible. ¿En qué momento del proceso debe salir, cómo lo explico exactamente para que no caiga como una factura sorpresa, y qué digo cuando un dueño me pide que se lo perdone o que le busque la vuelta?',
    },
  },
  {
    id: 'money-cannot-afford',
    group: 'money',
    stage: 'relate',
    keywords: ['afford', 'cannot pay', 'hardship', 'no puedo pagar', 'dinero'],
    en: {
      situation: 'They genuinely cannot afford the deductible',
      prompt:
        'The homeowner wants the work done but genuinely cannot come up with the deductible right now. What are the legitimate options I can offer, what is absolutely off the table, and how do I have this conversation with dignity?',
    },
    es: {
      situation: 'De verdad no pueden pagar el deducible',
      prompt:
        'El dueño quiere que se haga el trabajo pero de verdad no puede juntar el deducible ahora. ¿Qué opciones legítimas puedo ofrecer, qué está totalmente prohibido, y cómo tengo esta conversación con dignidad?',
    },
  },
  {
    id: 'money-cheaper-bid',
    group: 'money',
    stage: 'solve',
    keywords: ['cheaper', 'price', 'lower bid', 'más barato', 'precio'],
    en: {
      situation: 'Another company came in cheaper',
      prompt:
        'A competitor gave the homeowner a lower number. Help me figure out whether we are even being compared on the same scope, and give me a way to talk about the difference that is about the work and the warranty rather than about running down the other company.',
    },
    es: {
      situation: 'Otra compañía dio un precio más barato',
      prompt:
        'Un competidor le dio al dueño un número más bajo. Ayúdame a entender si siquiera nos están comparando con el mismo alcance, y dame una forma de hablar de la diferencia que sea sobre el trabajo y la garantía, no sobre hablar mal de la otra compañía.',
    },
  },
  {
    id: 'money-free-roof',
    group: 'money',
    stage: 'trust',
    keywords: ['free roof', 'no cost', 'techo gratis', 'sin costo'],
    en: {
      situation: 'They think insurance means a free roof',
      prompt:
        'The homeowner believes an insurance claim means a completely free roof. How do I correct that expectation early, clearly, and without killing the conversation — and why does letting that belief stand cause problems later?',
    },
    es: {
      situation: 'Creen que el seguro significa un techo gratis',
      prompt:
        'El dueño cree que un reclamo de seguro significa un techo totalmente gratis. ¿Cómo corrijo esa expectativa temprano, con claridad, sin matar la conversación — y por qué dejar esa idea en pie causa problemas después?',
    },
  },
  {
    id: 'money-value',
    group: 'money',
    stage: 'solve',
    keywords: ['value', 'why us', 'warranty', 'valor', 'garantía'],
    en: {
      situation: 'Why should they pick us instead of anyone else',
      prompt:
        'Help me build a short, honest answer to "why should I go with you" that is about workmanship, warranty, and how we handle the claim — not about being the cheapest and not about badmouthing anyone. Keep it to something I can actually say out loud in thirty seconds.',
    },
    es: {
      situation: '¿Por qué deberían elegirnos a nosotros?',
      prompt:
        'Ayúdame a armar una respuesta corta y honesta a "¿por qué debería irme con ustedes?" que hable de la calidad del trabajo, la garantía y cómo manejamos el reclamo — no de ser los más baratos ni de hablar mal de nadie. Que sea algo que pueda decir en treinta segundos.',
    },
  },

  // ── Getting a yes ─────────────────────────────────────────────────────────
  {
    id: 'close-ask',
    group: 'closing',
    stage: 'secure',
    keywords: ['ask', 'close', 'commitment', 'pedir', 'cerrar', 'compromiso'],
    en: {
      situation: 'I never actually ask for the commitment',
      prompt:
        'I get through good conversations and then leave without actually asking for anything. Give me a few ways to ask for the commitment that fit naturally at the end of a real conversation, and help me understand why I keep avoiding it.',
    },
    es: {
      situation: 'Nunca termino de pedir el compromiso',
      prompt:
        'Tengo buenas conversaciones y luego me voy sin pedir nada en concreto. Dame algunas formas de pedir el compromiso que encajen naturalmente al final de una conversación real, y ayúdame a entender por qué lo sigo evitando.',
    },
  },
  {
    id: 'close-contingency',
    group: 'closing',
    stage: 'secure',
    keywords: ['contingency', 'agreement', 'sign', 'contingencia', 'acuerdo', 'firmar'],
    en: {
      situation: 'How do I explain the contingency agreement',
      prompt:
        'Give me a clear, honest way to explain what a contingency agreement is and is not, so the homeowner actually understands what they are signing. Glossing over this is what creates cancellations later, so I would rather over-explain it.',
    },
    es: {
      situation: '¿Cómo explico el acuerdo de contingencia?',
      prompt:
        'Dame una forma clara y honesta de explicar qué es y qué no es un acuerdo de contingencia, para que el dueño entienda de verdad lo que está firmando. Pasar esto por encima es lo que causa cancelaciones después, así que prefiero explicarlo de más.',
    },
  },
  {
    id: 'close-next-step',
    group: 'closing',
    stage: 'secure',
    keywords: ['next step', 'follow up', 'date', 'siguiente paso', 'seguimiento', 'fecha'],
    en: {
      situation: 'I left with "I will follow up next week" and no date',
      prompt:
        'I keep leaving conversations with a vague "I will follow up" and no actual date, and then they go cold. Help me set a real next step at the door that the homeowner agrees to, and give me the words for it.',
    },
    es: {
      situation: 'Me fui con "te busco la próxima semana" y sin fecha',
      prompt:
        'Sigo saliendo de conversaciones con un "te doy seguimiento" vago y sin fecha, y luego se enfrían. Ayúdame a fijar un siguiente paso real en la puerta que el dueño acepte, y dame las palabras para hacerlo.',
    },
  },
  {
    id: 'close-went-cold',
    group: 'closing',
    stage: 'secure',
    keywords: ['cold', 'ghosted', 'no answer', 'frío', 'no contesta'],
    en: {
      situation: 'A homeowner went cold on me',
      prompt:
        'A homeowner I had a good conversation with has stopped answering. How many times should I reach out, through what channels, over what period — and what do I actually say so it does not read as pestering?',
    },
    es: {
      situation: 'Un dueño se enfrió conmigo',
      prompt:
        'Un dueño con el que tuve una buena conversación dejó de contestar. ¿Cuántas veces debo buscarlo, por qué medios, en cuánto tiempo — y qué digo exactamente para que no se lea como estar fastidiando?',
    },
  },
  {
    id: 'close-cancel',
    group: 'closing',
    stage: 'secure',
    keywords: ['cancel', 'rescind', 'backing out', 'cancelar', 'arrepentir'],
    en: {
      situation: 'They signed and now they want to cancel',
      prompt:
        'A homeowner signed and now wants to cancel. How do I handle this — what do I need to respect legally and ethically, what is worth asking, and what does this usually tell me about what I missed earlier in the process?',
    },
    es: {
      situation: 'Firmaron y ahora quieren cancelar',
      prompt:
        'Un dueño firmó y ahora quiere cancelar. ¿Cómo manejo esto — qué debo respetar legal y éticamente, qué vale la pena preguntar, y qué me dice esto normalmente sobre lo que se me pasó antes en el proceso?',
    },
  },

  // ── After a bad door ──────────────────────────────────────────────────────
  {
    id: 'debrief-sideways',
    group: 'debrief',
    stage: null,
    keywords: ['bad door', 'went wrong', 'debrief', 'mala puerta', 'salió mal'],
    en: {
      situation: 'Help me figure out what went wrong at that door',
      prompt:
        'I just had a door go sideways and I am not sure where I lost it. Ask me questions about what happened, one at a time, and then tell me which TRUSS stage broke down and what I should do differently at the next door.',
    },
    es: {
      situation: 'Ayúdame a entender qué salió mal en esa puerta',
      prompt:
        'Acabo de tener una puerta que salió mal y no sé bien dónde la perdí. Hazme preguntas sobre lo que pasó, una a la vez, y luego dime qué etapa de TRUSS falló y qué debo hacer distinto en la siguiente puerta.',
    },
  },
  {
    id: 'debrief-rejection',
    group: 'debrief',
    stage: null,
    keywords: ['rejection', 'discouraged', 'slump', 'rechazo', 'desanimado'],
    en: {
      situation: 'I am getting worn down by the rejection',
      prompt:
        'I have knocked all day and gotten nothing but doors closed in my face. I am worn down. Give me something useful — not a pep talk. What should I actually check about my approach, and how do I keep the next door from getting the version of me that is tired of being told no?',
    },
    es: {
      situation: 'El rechazo me está desgastando',
      prompt:
        'Toqué puertas todo el día y solo me cerraron la puerta en la cara. Estoy desgastado. Dame algo útil — no una charla motivacional. ¿Qué debo revisar de mi enfoque, y cómo evito que la siguiente puerta reciba la versión de mí que está cansada de que le digan que no?',
    },
  },
  {
    id: 'debrief-talked-too-much',
    group: 'debrief',
    stage: 'relate',
    keywords: ['talked too much', 'listening', 'hablé mucho', 'escuchar'],
    en: {
      situation: 'I think I talked too much',
      prompt:
        'Looking back at my last few conversations, I think I did most of the talking. Help me see where I should have stopped and asked something instead, and give me questions I can use at each stage of TRUSS to keep the homeowner doing more of the talking than me.',
    },
    es: {
      situation: 'Creo que hablé demasiado',
      prompt:
        'Viendo mis últimas conversaciones, creo que hablé yo casi todo el tiempo. Ayúdame a ver dónde debí parar y preguntar algo, y dame preguntas que pueda usar en cada etapa de TRUSS para que el dueño hable más que yo.',
    },
  },
  {
    id: 'debrief-rushed',
    group: 'debrief',
    stage: 'trust',
    keywords: ['rushed', 'too fast', 'pushy', 'apurado', 'presioné'],
    en: {
      situation: 'I rushed it and lost them',
      prompt:
        'I think I moved too fast — I was talking about the inspection and the claim before they had any reason to trust me, and I lost them. Help me understand the cost of skipping ahead, and how to tell in the moment that I have not earned the next step yet.',
    },
    es: {
      situation: 'Me apuré y los perdí',
      prompt:
        'Creo que fui muy rápido — hablé de la inspección y del reclamo antes de que tuvieran razón para confiar en mí, y los perdí. Ayúdame a entender el costo de adelantarme, y cómo notar en el momento que todavía no me he ganado el siguiente paso.',
    },
  },

  // ── Getting better ────────────────────────────────────────────────────────
  {
    id: 'method-explain',
    group: 'method',
    stage: null,
    keywords: ['truss', 'method', 'stages', 'método', 'etapas'],
    en: {
      situation: 'Explain the TRUSS method to me like I am new',
      prompt:
        'Explain the TRUSS method to me like it is my first week. Go through all five stages, what each one is actually for, and how I would know in a real conversation that I have finished one and can move to the next.',
    },
    es: {
      situation: 'Explícame el método TRUSS como si fuera nuevo',
      prompt:
        'Explícame el método TRUSS como si fuera mi primera semana. Repasa las cinco etapas, para qué sirve cada una de verdad, y cómo sabría en una conversación real que ya terminé una y puedo pasar a la siguiente.',
    },
  },
  {
    id: 'method-weakest',
    group: 'method',
    stage: null,
    keywords: ['weakest', 'improve', 'practice', 'débil', 'mejorar', 'practicar'],
    en: {
      situation: 'Which stage should I work on first',
      prompt:
        'Ask me a few questions about how my conversations usually go, then tell me which TRUSS stage is my weakest and give me one specific thing to practice at the next ten doors. Be direct with me.',
    },
    es: {
      situation: '¿Qué etapa debo trabajar primero?',
      prompt:
        'Hazme algunas preguntas sobre cómo van normalmente mis conversaciones, y luego dime cuál etapa de TRUSS es mi más débil y dame una cosa específica para practicar en las próximas diez puertas. Sé directo conmigo.',
    },
  },
  {
    id: 'method-after-practice',
    group: 'method',
    stage: null,
    keywords: ['practice', 'scorecard', 'roleplay', 'práctica', 'evaluación'],
    en: {
      situation: 'Help me work on what my practice scorecard flagged',
      prompt:
        'My last practice session scored me low and I want to actually fix it rather than just knowing the number. Ask me which stage it flagged, then give me a drill I can do on real doors this week and tell me what "better" would look like.',
    },
    es: {
      situation: 'Ayúdame con lo que marcó mi evaluación de práctica',
      prompt:
        'Mi última sesión de práctica me calificó bajo y quiero arreglarlo de verdad, no solo saber el número. Pregúntame qué etapa marcó, y luego dame un ejercicio que pueda hacer en puertas reales esta semana y dime cómo se vería "mejor".',
    },
  },
  {
    id: 'method-questions',
    group: 'method',
    stage: 'understand',
    keywords: ['questions', 'discovery', 'preguntas', 'descubrir'],
    en: {
      situation: 'Give me better questions to ask homeowners',
      prompt:
        'Give me a set of questions I can use to actually understand a homeowner\'s situation — the property, the claim, and who really makes the decision. For each one, tell me what I am listening for in the answer.',
    },
    es: {
      situation: 'Dame mejores preguntas para hacerle a los dueños',
      prompt:
        'Dame un conjunto de preguntas que pueda usar para entender de verdad la situación de un dueño — la propiedad, el reclamo y quién decide realmente. Para cada una, dime qué debo escuchar en la respuesta.',
    },
  },
  {
    id: 'method-ethics',
    group: 'method',
    stage: null,
    keywords: ['ethics', 'legal', 'fraud', 'ética', 'legal', 'fraude'],
    en: {
      situation: 'What am I not allowed to say or do',
      prompt:
        'Give me a straight list of the things I must never say or do in this business — deductible waiving, exaggerating damage, guaranteeing approvals, and anything else — and explain the actual consequence of each one, for me and for the customer.',
    },
    es: {
      situation: '¿Qué no puedo decir ni hacer?',
      prompt:
        'Dame una lista directa de las cosas que nunca debo decir ni hacer en este negocio — perdonar el deducible, exagerar el daño, garantizar aprobaciones, y cualquier otra — y explícame la consecuencia real de cada una, para mí y para el cliente.',
    },
  },
  {
    id: 'method-spanish',
    group: 'method',
    stage: null,
    keywords: ['spanish', 'bilingual', 'language', 'español', 'bilingüe', 'idioma'],
    en: {
      situation: 'Help me have this conversation in Spanish',
      prompt:
        'I need to have a door conversation in Spanish and I want it to sound natural, not translated. Give me the opening, the questions I should ask, and how to explain the claim process — in Spanish, the way someone would actually say it.',
    },
    es: {
      situation: 'Ayúdame a tener esta conversación en inglés',
      prompt:
        'Necesito tener una conversación de puerta en inglés y quiero que suene natural, no traducida. Dame la apertura, las preguntas que debo hacer, y cómo explicar el proceso del reclamo — en inglés, como lo diría alguien de verdad.',
    },
  },
];

/**
 * Search across situation text and keywords in both languages.
 *
 * Both languages always, deliberately: a bilingual rep reading the interface in
 * Spanish still thinks "deductible" half the time, and a search that finds
 * nothing reads as a broken app rather than a vocabulary mismatch.
 */
export function searchPrompts(
  query: string,
  locale: 'en' | 'es',
  group: PromptGroupId | null,
): LibraryPrompt[] {
  const needle = query.trim().toLowerCase();

  return PROMPT_LIBRARY.filter((entry) => {
    if (group && entry.group !== group) return false;
    if (!needle) return true;

    const haystack = [
      entry.en.situation,
      entry.es.situation,
      entry[locale].prompt,
      ...entry.keywords,
    ]
      .join(' ')
      .toLowerCase();

    // Every word has to appear somewhere, so "adjuster denied" narrows rather
    // than widening the way an OR match would.
    return needle.split(/\s+/).every((word) => haystack.includes(word));
  });
}
