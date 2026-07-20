export const CHAT_TEXT = {
  topicStageTitle: (subjectName: string) => `¿Empezamos con ${subjectName}?`,
  topicPlaceholder: "Temario",
  confirm: "Confirmar",
  changeTopic: "Cambiar temario",
  loadingConversation: "Cargando conversación…",
  // Saudação do chat: "Buenos días, Lorena / Empezamos con «Matéria: Tópico»"
  greeting: (studentName: string) => `Buenos días, ${studentName}`,
  greetingTopic: (subjectName: string, topicTitle: string) =>
    `Empezamos con “${subjectName}: ${topicTitle}”`,
} as const;
