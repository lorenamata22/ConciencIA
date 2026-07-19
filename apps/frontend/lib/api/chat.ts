// Fetchers client-side do Chat — chamam as rotas BFF internas (app/api/chat)
// com URL relativa; o cookie httpOnly de auth é enviado automaticamente.

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  student_id: string;
  subject_id: string;
  // NOT NULL no backend: o chat é por tópico (cada tópico = uma sessão)
  topic_id: string;
}

export async function getConversation(
  subjectId: string,
  topicId: string,
): Promise<{
  conversation: ChatConversation;
  messages: ChatMessageItem[];
} | null> {
  try {
    const res = await fetch(
      `/api/chat/conversation?subjectId=${encodeURIComponent(subjectId)}&topicId=${encodeURIComponent(topicId)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}
