import { buildStudyModeSystemPrompt } from './study-mode.prompt';

describe('buildStudyModeSystemPrompt', () => {
  const baseParams = {
    subjectName: 'Matemáticas',
    ragChunks: [] as string[],
    hasSufficientContext: false,
    cognitiveProfile: null as unknown,
    summary: null as string | null,
    isMinor: false,
  };

  it('should include the topic scope block (Topic.description) when provided', () => {
    const prompt = buildStudyModeSystemPrompt({
      ...baseParams,
      topicDescription: 'Lectura y escritura de números; comparación y orden.',
    });
    expect(prompt).toContain('Ámbito del tema');
    expect(prompt).toContain('Lectura y escritura de números');
  });

  it('should not break and omit the scope block when Topic.description is empty', () => {
    const emptyProm = buildStudyModeSystemPrompt({
      ...baseParams,
      topicDescription: '   ',
    });
    const nullProm = buildStudyModeSystemPrompt({
      ...baseParams,
      topicDescription: null,
    });
    expect(emptyProm).not.toContain('Ámbito del tema');
    expect(nullProm).not.toContain('Ámbito del tema');
    // Modo Estudo segue funcionando (bloco de rol sempre presente)
    expect(nullProm).toContain('# Rol');
  });

  it('should include numbered RAG chunks when context is sufficient', () => {
    const prompt = buildStudyModeSystemPrompt({
      ...baseParams,
      ragChunks: ['Las ecuaciones lineales...', 'Un ejemplo práctico...'],
      hasSufficientContext: true,
    });

    expect(prompt).toContain('Las ecuaciones lineales...');
    expect(prompt).toContain('Un ejemplo práctico...');
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('[2]');
  });

  it('should instruct fallback signaling when context is NOT sufficient (CLAUDE.md §7 rule 7)', () => {
    const prompt = buildStudyModeSystemPrompt(baseParams);

    // A IA deve avisar o aluno que a resposta não vem do material do professor
    expect(prompt).toContain('conocimiento general');
    expect(prompt).toContain('no proviene del material');
  });

  it('should include the subject name', () => {
    const prompt = buildStudyModeSystemPrompt(baseParams);
    expect(prompt).toContain('Matemáticas');
  });

  it('should include cognitive profile block when profile exists', () => {
    const prompt = buildStudyModeSystemPrompt({
      ...baseParams,
      cognitiveProfile: { style: 'visual' },
    });

    expect(prompt).toContain('visual');
    expect(prompt).toContain('Perfil cognitivo');
  });

  it('should omit cognitive profile block when profile is null', () => {
    const prompt = buildStudyModeSystemPrompt(baseParams);
    expect(prompt).not.toContain('Perfil cognitivo');
  });

  it('should include conversation summary block when summary exists', () => {
    const prompt = buildStudyModeSystemPrompt({
      ...baseParams,
      summary: 'El alumno estudió ecuaciones de primer grado.',
    });

    expect(prompt).toContain('El alumno estudió ecuaciones de primer grado.');
  });

  it('should always include the safety/distress block', () => {
    const prompt = buildStudyModeSystemPrompt(baseParams);
    expect(prompt).toContain('adulto de confianza');
  });

  it('should include stricter guardrails containing "menor" when isMinor is true', () => {
    const prompt = buildStudyModeSystemPrompt({ ...baseParams, isMinor: true });
    expect(prompt).toContain('menor');
  });

  it('should not include the minor guardrails block when isMinor is false', () => {
    const prompt = buildStudyModeSystemPrompt(baseParams);
    expect(prompt).not.toContain('menor de edad');
  });
});
