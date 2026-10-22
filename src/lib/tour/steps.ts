import {
  EXERCISES_PATH,
  MY_PLAN_PATH,
  MY_SKILLS_PATH,
  PLANS_PATH,
  PRACTICE_PATH,
  REVIEWS_PATH,
  SKILLS_PATH,
  STUDENTS_PATH,
  SUBJECTS_PATH,
} from "@/lib/auth/constants";
import type { Role } from "@/lib/profile/roles";

export type TourStep = {
  target?: string;
  title: string;
  body: string;
};

export const ACCOUNT_TOUR_TARGET = "account";

export function navTourTarget(href: string) {
  return `nav:${href}`;
}

const accountStep: TourStep = {
  target: ACCOUNT_TOUR_TARGET,
  title: "Sua conta",
  body: "Aqui você abre seu perfil, sai da conta e pode rever este tour quando quiser.",
};

export const TOUR_STEPS: Record<Role, TourStep[]> = {
  teacher: [
    {
      title: "Boas-vindas ao Project Study!",
      body: "Em menos de um minuto vamos te mostrar onde fica cada coisa. Você pode pular quando quiser.",
    },
    {
      target: navTourTarget(STUDENTS_PATH),
      title: "Seus alunos",
      body: "Gere um link de convite para seus alunos entrarem. Depois, acompanhe o perfil, o plano e as habilidades de cada um.",
    },
    {
      target: navTourTarget(PLANS_PATH),
      title: "Planos de estudo",
      body: "Monte planos com metas semanais de horas por assunto, atribua aos alunos e veja o progresso semana a semana.",
    },
    {
      target: navTourTarget(REVIEWS_PATH),
      title: "Correções",
      body: "As respostas abertas dos alunos chegam aqui. Aprove ou rejeite e deixe um comentário para cada uma.",
    },
    {
      target: navTourTarget(EXERCISES_PATH),
      title: "Exercícios",
      body: "Crie questões de múltipla escolha ou de resposta aberta, com imagens, assuntos e habilidades.",
    },
    {
      target: navTourTarget(SKILLS_PATH),
      title: "Habilidades",
      body: "Organize habilidades em grupos com níveis, como Inglês → Listening, e registre a evolução de cada aluno.",
    },
    {
      target: navTourTarget(SUBJECTS_PATH),
      title: "Assuntos",
      body: "Os temas que seus alunos estudam. Eles ligam planos e exercícios: o aluno pratica todo exercício dos assuntos do plano.",
    },
    accountStep,
    {
      title: "Por onde começar?",
      body: "Sugestão: cadastre alguns assuntos, crie exercícios, monte um plano e convide seus alunos.",
    },
  ],
  student: [
    {
      title: "Boas-vindas ao Project Study!",
      body: "Em menos de um minuto vamos te mostrar onde fica cada coisa. Você pode pular quando quiser.",
    },
    {
      target: navTourTarget(MY_PLAN_PATH),
      title: "Meu plano",
      body: "Veja o plano que seu professor montou, as metas de horas da semana e o seu progresso em cada assunto.",
    },
    {
      target: navTourTarget(PRACTICE_PATH),
      title: "Exercícios",
      body: "Pratique os exercícios do seu plano, veja o que falta fazer e leia o retorno do professor nas suas respostas.",
    },
    {
      target: navTourTarget(MY_SKILLS_PATH),
      title: "Habilidades",
      body: "Acompanhe o nível de cada habilidade que seu professor avaliou e como você evoluiu.",
    },
    accountStep,
    {
      title: "Tudo pronto!",
      body: "Abra seu plano e pratique um pouco todos os dias. Se ainda não tem professor, peça a ele o link de convite.",
    },
  ],
};

export const START_TOUR_EVENT = "project-study:start-tour";

function storageKey(accountId: string) {
  return `project-study:tour-seen:${accountId}`;
}

export function hasSeenTour(accountId: string) {
  try {
    return window.localStorage.getItem(storageKey(accountId)) !== null;
  } catch {
    return true;
  }
}

export function markTourSeen(accountId: string) {
  try {
    window.localStorage.setItem(storageKey(accountId), new Date().toISOString());
  } catch {}
}

export function startTour() {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}
