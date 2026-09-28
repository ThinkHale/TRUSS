import type { StageId } from './methodology';

interface Lesson {
  purpose: string;
  tips: string[];
  example: string;
  ready: string;
  reset: string;
  drill: string;
}

// The field manual the Method page renders, keyed to the same stage IDs used by
// Coach and Practice. It is a plain-language rendering of the TRUSS Method in
// the TRUSS AI Knowledge Base (docs/01_method/truss_method.md); when the method
// changes there, change it here so reps read what the AI teaches.
export const LESSONS: Record<'en' | 'es', Record<StageId, Lesson>> = {
  en: {
    trust: {
      purpose: 'Earn credibility before you ask for any commitment. Trust starts with a clear introduction and grows when your actions match your words and your claims match your evidence.',
      tips: ['Introduce yourself, your company, and your actual reason for visiting before asking for anything.', 'Ask whether now is a good time. Give a realistic time estimate and respect a no.', 'Keep what you have verified separate from what you think. Use proof that fits the claim: measurements for a diagnosis, credentials for capability, a written scope for a promise. Admit what you do not know yet.'],
      example: '“Hi, I’m Alex with [company]. I’m here about [the reason you are actually there]. Is now a good time for a quick question?”',
      ready: 'They give you permission to continue and understand who you are.',
      reset: 'They seem guarded or ask you to leave. Slow down, answer their question plainly, or thank them and leave.',
      drill: 'Say a 15-second introduction out loud. Remove any claim you cannot verify. End with a permission question.',
    },
    relate: {
      purpose: 'Understand the person, their situation, and what is at stake for them. Relate is not small talk. It is paying attention and adjusting to what matters to this buyer.',
      tips: ['Ask an open question about their experience and let them finish.', 'Reflect their concern in their words: “So the disruption is the hardest part?”', 'Find out what they are protecting — comfort, schedule, cash flow, family, tenants, uptime — and match your pace to how urgent this is for them. Never use their stress as leverage.'],
      example: '“What has been the most frustrating part of getting this taken care of?”',
      ready: 'They share a concern in their own words and confirm that you understood it.',
      reset: 'You are doing most of the talking or getting one-word answers. Ask one simple question, then pause.',
      drill: 'Practice listening for one minute without interrupting. Summarize the concern and ask whether you got it right.',
    },
    understand: {
      purpose: 'Find the actual problem, the constraints, and how the decision will be made before recommending work. Separate what you observed from what still needs checking.',
      tips: ['With permission, document the condition and review the evidence together. Do not infer property damage from an area storm report.', 'Ask about timing, budget, previous work, and who needs to agree. For insurance work, note the claim status and questions for the carrier.', 'Before proposing anything, recap five things: what is verified, what is still unknown, their priority, what happens if nothing is done (stated honestly, not inflated), and how the decision gets made.'],
      example: '“Before I suggest a plan, what needs to be true for this to work for you—timing, cost, and anyone else involved?”',
      ready: 'You can both describe the problem, priorities, decision makers, and remaining unknowns.',
      reset: 'You are pitching before you know their concern, or a new decision maker appears. Return to discovery.',
      drill: 'Write one question for each family: situation, problem, consequence, the outcome they want, the decision, and their biggest constraint. Practice the five-part recap out loud.',
    },
    solve: {
      purpose: 'Connect a clear recommendation to the needs you confirmed. Help the customer compare options and understand what the work includes.',
      tips: ['Tie each recommendation to an observed condition or stated priority.', 'Explain scope, costs, responsibilities, and uncertainties in plain language. Use the actual agreement and verified company information.', 'When it helps, offer genuinely different options: what each one solves, does not solve, costs, and leaves as risk. Then recommend one and say why. Never present a repair as equal to replacement, or push replacement when a safe repair fits their goal. For insurance, separate your scope from what the carrier decides.'],
      example: '“You said avoiding another leak matters most. Here is the proposed repair, what it includes, and the question we still need to resolve.”',
      ready: 'They can explain the plan back to you and understand the cost and open questions.',
      reset: 'They go quiet or keep returning to price. Ask what concerns them and revisit the need before defending the proposal.',
      drill: 'Explain one recommendation without product jargon. Ask a partner to repeat the scope and next step back to you.',
    },
    secure: {
      purpose: 'Agree on an informed next step. This may be an inspection, a follow-up, or a signed agreement; the goal is clarity and consent.',
      tips: ['Ask directly whether they are comfortable moving forward. Treat a hesitation as something to understand, not a fight to win, and respect a clear no.', 'Review the actual commitment, costs, and applicable cancellation terms. Do not substitute a sales script for the agreement.', 'Set the next action, the responsible person, and a date. Confirm the preferred contact method and send a recap.'],
      example: '“Would you like to move forward with this next step? If so, who should be involved, and what time works for you?”',
      ready: 'Both sides know what was agreed, who is responsible, and when the next contact will happen.',
      reset: 'There is no clear date or an unresolved concern. Clarify the concern instead of creating pressure.',
      drill: 'Turn “I’ll follow up” into a specific action, owner, date, and contact method. Practice confirming it aloud.',
    },
  },
  es: {
    trust: {
      purpose: 'Gánate la credibilidad antes de pedir cualquier compromiso. La confianza comienza con una presentación clara y crece cuando cumples tu palabra y tus afirmaciones tienen evidencia.',
      tips: ['Di tu nombre, empresa y motivo real de la visita antes de pedir algo.', 'Pregunta si es buen momento, da una duración realista y respeta un no.', 'Separa lo que verificaste de lo que supones. Usa pruebas que correspondan: mediciones para un diagnóstico, credenciales para tu capacidad, un alcance por escrito para una promesa. Reconoce lo que aún no sabes.'],
      example: '“Hola, soy Alex de [empresa]. Vengo por [el motivo real de tu visita]. ¿Es buen momento para una pregunta rápida?”',
      ready: 'Te da permiso para continuar y entiende quién eres.',
      reset: 'Parece incómodo o te pide que te retires. Responde con claridad o agradece y retírate.',
      drill: 'Practica una presentación de 15 segundos. Elimina afirmaciones que no puedas verificar y termina pidiendo permiso.',
    },
    relate: {
      purpose: 'Comprende a la persona, su situación y lo que está en juego para ella. Conectar no es platicar por platicar: es prestar atención y adaptarte a lo que le importa.',
      tips: ['Haz una pregunta abierta sobre su experiencia y deja que termine.', 'Resume su preocupación con sus palabras y confirma que entendiste.', 'Descubre qué quiere proteger — comodidad, horarios, dinero, familia, inquilinos, operación — y ajusta tu ritmo a su urgencia. Nunca uses su estrés para presionar.'],
      example: '“¿Qué ha sido lo más frustrante de tratar de resolver esto?”',
      ready: 'Comparte una preocupación y confirma que la entendiste.',
      reset: 'Hablas casi todo el tiempo o recibes respuestas muy cortas. Haz una pregunta sencilla y espera.',
      drill: 'Escucha durante un minuto sin interrumpir. Resume la preocupación y pregunta si la entendiste bien.',
    },
    understand: {
      purpose: 'Identifica el problema, las limitaciones y cómo se tomará la decisión antes de recomendar trabajo. Separa lo observado de lo que falta verificar.',
      tips: ['Con permiso, documenta el estado de la propiedad y revisen la evidencia juntos. Un reporte de tormenta no confirma daños en esa propiedad.', 'Pregunta por plazos, presupuesto, trabajos anteriores y participantes. Si hay seguro, anota el estado del reclamo y las preguntas para la aseguradora.', 'Antes de proponer, resume cinco cosas: lo verificado, lo que falta saber, su prioridad, qué pasa si no se hace nada (sin exagerar) y cómo se tomará la decisión.'],
      example: '“Antes de sugerir un plan, ¿qué necesita para que funcione: plazos, costo y otras personas involucradas?”',
      ready: 'Ambos pueden explicar el problema, las prioridades y las preguntas pendientes.',
      reset: 'Ya estás vendiendo sin entender la preocupación o aparece otra persona que decide. Vuelve a preguntar.',
      drill: 'Escribe una pregunta de cada tipo: situación, problema, consecuencia, resultado deseado, decisión y su mayor limitación. Practica el resumen de cinco puntos en voz alta.',
    },
    solve: {
      purpose: 'Relaciona una recomendación clara con las necesidades confirmadas. Ayuda al cliente a comparar opciones y entender el trabajo.',
      tips: ['Vincula cada recomendación con una condición observada o prioridad del cliente.', 'Explica alcance, costos, responsabilidades e incertidumbres con palabras sencillas. Usa el acuerdo real y datos verificados.', 'Cuando ayude, ofrece opciones realmente distintas: qué resuelve cada una, qué no, cuánto cuesta y qué riesgo deja. Luego recomienda una y explica por qué. Nunca presentes una reparación como igual a un reemplazo, ni empujes un reemplazo si una reparación segura cumple su objetivo. Si hay seguro, separa tu trabajo de lo que decide la aseguradora.'],
      example: '“Dijo que evitar otra gotera es lo más importante. Esta es la reparación propuesta, lo que incluye y lo que falta resolver.”',
      ready: 'Puede explicar el plan, el costo y las preguntas pendientes con sus palabras.',
      reset: 'Se queda callado o vuelve al precio. Pregunta qué le preocupa antes de defender la propuesta.',
      drill: 'Explica una recomendación sin jerga. Pide a un compañero que repita el alcance y el siguiente paso.',
    },
    secure: {
      purpose: 'Acuerden un siguiente paso informado: una inspección, seguimiento o firma. El objetivo es claridad y consentimiento.',
      tips: ['Pregunta directamente si desea avanzar. Trata una duda como algo que entender, no como una pelea, y respeta un no claro.', 'Revisa el compromiso, costos y condiciones de cancelación aplicables en el acuerdo real.', 'Define la acción, responsable y fecha. Confirma el medio de contacto y envía un resumen.'],
      example: '“¿Le gustaría avanzar con este paso? Si es así, ¿quién debe participar y qué horario le funciona?”',
      ready: 'Ambos saben qué acordaron, quién se encarga y cuándo será el próximo contacto.',
      reset: 'No hay fecha clara o queda una preocupación sin resolver. Aclárala sin presionar.',
      drill: 'Convierte “le daré seguimiento” en una acción, responsable, fecha y medio de contacto. Confírmalo en voz alta.',
    },
  },
};
