import type { StageId } from './methodology';

interface Lesson {
  purpose: string;
  tips: string[];
  example: string;
  ready: string;
  reset: string;
  drill: string;
}

// Teaching notes keyed to the same stage IDs used by Coach and Practice.
export const LESSONS: Record<'en' | 'es', Record<StageId, Lesson>> = {
  en: {
    trust: {
      purpose: 'Help the customer feel safe enough to choose a conversation with you. Trust starts with a clear introduction and grows when your actions match your words.',
      tips: ['Introduce yourself, your company, and your actual reason for visiting before asking for anything.', 'Ask whether now is a good time. Give a realistic time estimate and respect a no.', 'Offer verifiable credentials or relevant work examples. Only mention neighbors or local work when it is true.'],
      example: '“Hi, I’m Alex with [company]. We help homeowners with roof repairs. Is now a good time for a quick question?”',
      ready: 'They give you permission to continue and understand who you are.',
      reset: 'They seem guarded or ask you to leave. Slow down, answer their question plainly, or thank them and leave.',
      drill: 'Say a 15-second introduction out loud. Remove any claim you cannot verify. End with a permission question.',
    },
    relate: {
      purpose: 'Learn what this experience is like for the person in front of you. Rapport comes from attention and listening, not a memorized compliment.',
      tips: ['Ask an open question about their experience and let them finish.', 'Reflect their concern in their words: “So the disruption is the hardest part?”', 'Ask who else should be involved in decisions without making assumptions about the household.'],
      example: '“What has been the most frustrating part of getting this taken care of?”',
      ready: 'They share a concern in their own words and confirm that you understood it.',
      reset: 'You are doing most of the talking or getting one-word answers. Ask one simple question, then pause.',
      drill: 'Practice listening for one minute without interrupting. Summarize the concern and ask whether you got it right.',
    },
    understand: {
      purpose: 'Find the actual problem, the constraints, and how the decision will be made before recommending work. Separate what you observed from what still needs checking.',
      tips: ['With permission, document the condition and review the evidence together. Do not infer property damage from an area storm report.', 'Ask about timing, budget, previous work, and who needs to agree. For insurance work, note the claim status and questions for the carrier.', 'Summarize the need and confirm it before proposing a solution. Leave unknowns as questions, not guesses.'],
      example: '“Before I suggest a plan, what needs to be true for this to work for you—timing, cost, and anyone else involved?”',
      ready: 'You can both describe the problem, priorities, decision makers, and remaining unknowns.',
      reset: 'You are pitching before you know their concern, or a new decision maker appears. Return to discovery.',
      drill: 'Write five discovery questions: condition, timing, cost, decision process, and unknowns. Practice a short recap.',
    },
    solve: {
      purpose: 'Connect a clear recommendation to the needs you confirmed. Help the customer compare options and understand what the work includes.',
      tips: ['Tie each recommendation to an observed condition or stated priority.', 'Explain scope, costs, responsibilities, and uncertainties in plain language. Use the actual agreement and verified company information.', 'Ask what is still unclear. For insurance questions, distinguish your scope of work from decisions the carrier must make.'],
      example: '“You said avoiding another leak matters most. Here is the proposed repair, what it includes, and the question we still need to resolve.”',
      ready: 'They can explain the plan back to you and understand the cost and open questions.',
      reset: 'They go quiet or keep returning to price. Ask what concerns them and revisit the need before defending the proposal.',
      drill: 'Explain one recommendation without product jargon. Ask a partner to repeat the scope and next step back to you.',
    },
    secure: {
      purpose: 'Agree on an informed next step. This may be an inspection, a follow-up, or a signed agreement; the goal is clarity and consent.',
      tips: ['Ask directly whether they are comfortable moving forward. Give them space to decline or ask questions.', 'Review the actual commitment, costs, and applicable cancellation terms. Do not substitute a sales script for the agreement.', 'Set the next action, the responsible person, and a date. Confirm the preferred contact method and send a recap.'],
      example: '“Would you like to move forward with this next step? If so, who should be involved, and what time works for you?”',
      ready: 'Both sides know what was agreed, who is responsible, and when the next contact will happen.',
      reset: 'There is no clear date or an unresolved concern. Clarify the concern instead of creating pressure.',
      drill: 'Turn “I’ll follow up” into a specific action, owner, date, and contact method. Practice confirming it aloud.',
    },
  },
  es: {
    trust: {
      purpose: 'Ayuda al cliente a sentirse seguro para conversar contigo. La confianza comienza con una presentación clara y crece cuando cumples tu palabra.',
      tips: ['Di tu nombre, empresa y motivo real de la visita antes de pedir algo.', 'Pregunta si es buen momento, da una duración realista y respeta un no.', 'Ofrece credenciales verificables. Menciona trabajos locales solo cuando sean reales.'],
      example: '“Hola, soy Alex de [empresa]. Ayudamos con reparaciones de techos. ¿Es buen momento para una pregunta rápida?”',
      ready: 'Te da permiso para continuar y entiende quién eres.',
      reset: 'Parece incómodo o te pide que te retires. Responde con claridad o agradece y retírate.',
      drill: 'Practica una presentación de 15 segundos. Elimina afirmaciones que no puedas verificar y termina pidiendo permiso.',
    },
    relate: {
      purpose: 'Comprende cómo vive esta situación la persona frente a ti. La conexión nace de escuchar con atención.',
      tips: ['Haz una pregunta abierta sobre su experiencia y deja que termine.', 'Resume su preocupación con sus palabras y confirma que entendiste.', 'Pregunta quién más participa en la decisión sin hacer suposiciones sobre la familia.'],
      example: '“¿Qué ha sido lo más frustrante de tratar de resolver esto?”',
      ready: 'Comparte una preocupación y confirma que la entendiste.',
      reset: 'Hablas casi todo el tiempo o recibes respuestas muy cortas. Haz una pregunta sencilla y espera.',
      drill: 'Escucha durante un minuto sin interrumpir. Resume la preocupación y pregunta si la entendiste bien.',
    },
    understand: {
      purpose: 'Identifica el problema, las limitaciones y cómo se tomará la decisión antes de recomendar trabajo. Separa lo observado de lo que falta verificar.',
      tips: ['Con permiso, documenta el estado de la propiedad y revisen la evidencia juntos. Un reporte de tormenta no confirma daños en esa propiedad.', 'Pregunta por plazos, presupuesto, trabajos anteriores y participantes. Si hay seguro, anota el estado del reclamo y las preguntas para la aseguradora.', 'Resume y confirma la necesidad. Deja las incógnitas como preguntas, sin adivinar.'],
      example: '“Antes de sugerir un plan, ¿qué necesita para que funcione: plazos, costo y otras personas involucradas?”',
      ready: 'Ambos pueden explicar el problema, las prioridades y las preguntas pendientes.',
      reset: 'Ya estás vendiendo sin entender la preocupación o aparece otra persona que decide. Vuelve a preguntar.',
      drill: 'Escribe cinco preguntas sobre estado, plazos, costo, decisión e incógnitas. Practica un resumen breve.',
    },
    solve: {
      purpose: 'Relaciona una recomendación clara con las necesidades confirmadas. Ayuda al cliente a comparar opciones y entender el trabajo.',
      tips: ['Vincula cada recomendación con una condición observada o prioridad del cliente.', 'Explica alcance, costos, responsabilidades e incertidumbres con palabras sencillas. Usa el acuerdo real y datos verificados.', 'Pregunta qué falta aclarar. Distingue tu trabajo de las decisiones que corresponden a la aseguradora.'],
      example: '“Dijo que evitar otra gotera es lo más importante. Esta es la reparación propuesta, lo que incluye y lo que falta resolver.”',
      ready: 'Puede explicar el plan, el costo y las preguntas pendientes con sus palabras.',
      reset: 'Se queda callado o vuelve al precio. Pregunta qué le preocupa antes de defender la propuesta.',
      drill: 'Explica una recomendación sin jerga. Pide a un compañero que repita el alcance y el siguiente paso.',
    },
    secure: {
      purpose: 'Acuerden un siguiente paso informado: una inspección, seguimiento o firma. El objetivo es claridad y consentimiento.',
      tips: ['Pregunta directamente si desea avanzar. Dale espacio para preguntar o rechazar.', 'Revisa el compromiso, costos y condiciones de cancelación aplicables en el acuerdo real.', 'Define la acción, responsable y fecha. Confirma el medio de contacto y envía un resumen.'],
      example: '“¿Le gustaría avanzar con este paso? Si es así, ¿quién debe participar y qué horario le funciona?”',
      ready: 'Ambos saben qué acordaron, quién se encarga y cuándo será el próximo contacto.',
      reset: 'No hay fecha clara o queda una preocupación sin resolver. Aclárala sin presionar.',
      drill: 'Convierte “le daré seguimiento” en una acción, responsable, fecha y medio de contacto. Confírmalo en voz alta.',
    },
  },
};
