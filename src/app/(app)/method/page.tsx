import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { STAGES } from '@/lib/truss/methodology';
import { LESSONS } from '@/lib/truss/handbook';

export const metadata: Metadata = { title: 'TRUSS Method' };

export default async function MethodPage() {
  const [locale, stageName] = await Promise.all([getLocale(), getTranslations('stages')]);
  const es = locale === 'es';
  const lessons = LESSONS[es ? 'es' : 'en'];
  const copy = es ? {
    eyebrow: 'APRENDE / PRACTICA / APLICA', title: 'El método TRUSS',
    intro: 'Tu manual de campo para conversaciones de ventas. Cinco pasos para escuchar mejor, explicar con claridad y acordar el siguiente paso.',
    start: 'Empieza donde estás', paths: [
      ['Soy nuevo en ventas', 'Lee los cinco pasos en orden. Practica una presentación y una pregunta antes de tu primera conversación.'],
      ['Necesito un repaso', 'Recuerda una conversación reciente. Busca el paso en el que faltó claridad y practica el ejercicio.'],
      ['Quiero mejorar', 'Elige un paso, practica un escenario y revisa la evidencia en tu evaluación. Repite cambiando una conducta.'],
    ],
    reminder: 'Es una guía, no un guion rígido. Si aparece una duda, vuelve al paso que necesita atención. Usa los ejemplos con tus propias palabras y solo con hechos reales.',
    jump: 'Ir a un paso', tips: 'Cómo usarlo', example: 'Una forma de decirlo', ready: 'Puedes avanzar cuando…', reset: 'Haz una pausa cuando…', drill: 'Ejercicio breve',
    coach: 'Trabaja este paso con Coach', practice: 'Elige un escenario de práctica',
    routine: 'Una rutina para cada visita', before: 'Antes: elige una conducta para practicar y revisa lo que sabes del cliente.', during: 'Durante: escucha, confirma lo que entendiste y anota las preguntas pendientes.', after: 'Después: registra el paso actual y la próxima acción en Cuentas. Lleva una dificultad a Coach y ensaya de nuevo.', accounts: 'Abrir Cuentas',
  } : {
    eyebrow: 'LEARN / REHEARSE / APPLY', title: 'The TRUSS method',
    intro: 'Your field manual for sales conversations. Five steps to listen well, explain the work clearly, and agree on what happens next.',
    start: 'Start where you are', paths: [
      ['New to sales', 'Read the five steps in order. Practice an introduction and one question before your first conversation.'],
      ['Here for a refresher', 'Think of a recent conversation. Find the stage where clarity was missing and try its short exercise.'],
      ['Building your expertise', 'Choose a stage, practice a scenario, and review the evidence in your scorecard. Repeat with one behavior changed.'],
    ],
    reminder: 'Use this as a guide, not a rigid script. When a concern comes up, return to the stage that needs attention. Adapt the examples to your own voice and actual facts.',
    jump: 'Jump to a stage', tips: 'How to use it', example: 'One way to say it', ready: 'Ready to move on when…', reset: 'Pause and rebuild when…', drill: 'A short practice drill',
    coach: 'Work on this stage with Coach', practice: 'Choose a practice scenario',
    routine: 'A routine for every visit', before: 'Before: choose one behavior to practice and review what you know about the customer.', during: 'During: listen, confirm your understanding, and note the questions you still need to resolve.', after: 'After: write down the current stage and next action in your working notes. Take one difficult moment to Coach and rehearse it again.', accounts: 'Open Accounts',
  };

  return (
    <div className="app-page method-page">
      <header className="app-page-head"><div><p className="method-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.intro}</p></div></header>
      <section className="method-start" aria-labelledby="method-start-title">
        <h2 id="method-start-title">{copy.start}</h2>
        <div className="method-paths">{copy.paths.map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
        <p className="method-reminder">{copy.reminder}</p>
      </section>
      <nav className="method-jump" aria-label={copy.jump}>{STAGES.map((stage, i) => <a key={stage.id} href={`#${stage.id}`}><span>{i + 1} / {stage.letter}</span>{stageName(stage.id)}</a>)}</nav>
      <div className="method-lessons">{STAGES.map((stage, i) => {
        const lesson = lessons[stage.id];
        return <section key={stage.id} id={stage.id} className="method-lesson" aria-labelledby={`${stage.id}-title`}>
          <header><span className="method-letter" aria-hidden>{stage.letter}</span><div><p className="method-eyebrow">0{i + 1} / TRUSS</p><h2 id={`${stage.id}-title`}>{stageName(stage.id)}</h2></div></header>
          <p className="method-purpose">{lesson.purpose}</p>
          <div className="method-lesson-grid"><div><h3>{copy.tips}</h3><ol>{lesson.tips.map(tip => <li key={tip}>{tip}</li>)}</ol></div><div className="method-example"><h3>{copy.example}</h3><blockquote>{lesson.example}</blockquote></div></div>
          <details><summary>{copy.ready}</summary><p>{lesson.ready}</p></details>
          <details><summary>{copy.reset}</summary><p>{lesson.reset}</p></details>
          <div className="method-drill"><h3>{copy.drill}</h3><p>{lesson.drill}</p></div>
          <Link className="method-coach-link" href={`/coach?stage=${stage.id}`}>{copy.coach} <span aria-hidden>→</span></Link>
        </section>;
      })}</div>
      <section className="method-start"><h2>{copy.routine}</h2><ul className="method-routine"><li>{copy.before}</li><li>{copy.during}</li><li>{copy.after}</li></ul><div className="flex flex-wrap gap-3"><Link href="/practice" className="btn-primary">{copy.practice}</Link><Link href="/accounts" className="btn-ghost">{copy.accounts}</Link></div></section>
    </div>
  );
}
