import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseOffice } from 'officeparser';
import { ProgramParseService } from './program-parse.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { AIResponseTruncatedError } from '../ai-provider/ai-provider.interface';
import { PROGRAM_MAX_FILE_SIZE_BYTES } from './program.constants';

jest.mock('officeparser', () => ({ parseOffice: jest.fn() }));
const parseOfficeMock = parseOffice as jest.Mock;

// O parseOffice retorna um AST; o service usa ast.toText()
const astOf = (text: string) => ({ toText: () => text });

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const context = { userId: 'user-1', institutionId: 'inst-1' };

// Documento-exemplo (linhas 1-based):
// 1: Aritmética
// 2: (vazia)
// 3: Números naturales
// 4: • Lectura y escritura.
// 5: • Comparación y orden.
// 6: (vazia)
// 7: Divisibilidad
const sampleText = [
  'Aritmética',
  '',
  'Números naturales',
  '• Lectura y escritura.',
  '• Comparación y orden.',
  '',
  'Divisibilidad',
].join('\n');

// Ponteiros válidos para sampleText
const validPointers = {
  modules: [
    {
      name: 'Aritmética',
      title_line: 1,
      topics: [
        {
          title: 'Números naturales',
          title_line: 3,
          content_start_line: 4,
          content_end_line: 5,
        },
        {
          title: 'Divisibilidad',
          title_line: 7,
          content_start_line: null,
          content_end_line: null,
        },
      ],
    },
  ],
};

const fileOf = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'programa.pdf',
    mimetype: PDF_MIME,
    size: 1000,
    buffer: Buffer.from('binary'),
    ...overrides,
  }) as Express.Multer.File;

describe('ProgramParseService', () => {
  let service: ProgramParseService;
  let aiProviderServiceMock: {
    completeStructured: jest.Mock;
    getProvider: jest.Mock;
  };
  let aiUsageServiceMock: {
    register: jest.Mock;
    hasAvailableTokens: jest.Mock;
  };

  beforeEach(async () => {
    parseOfficeMock.mockReset();
    parseOfficeMock.mockResolvedValue(astOf(sampleText));

    aiProviderServiceMock = {
      completeStructured: jest.fn().mockResolvedValue({
        data: validPointers,
        promptTokens: 100,
        responseTokens: 50,
      }),
      getProvider: jest.fn().mockReturnValue({
        getProviderName: () => 'mock',
        getModelName: () => 'mock-model',
      }),
    };
    aiUsageServiceMock = {
      register: jest.fn().mockResolvedValue({}),
      hasAvailableTokens: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramParseService,
        { provide: AIProviderService, useValue: aiProviderServiceMock },
        { provide: AIUsageService, useValue: aiUsageServiceMock },
      ],
    }).compile();

    service = module.get<ProgramParseService>(ProgramParseService);
  });

  // ─── Validação de arquivo ──────────────────────────────────────────────────

  it('should throw BadRequestException when file exceeds 1MB', async () => {
    const file = fileOf({ size: PROGRAM_MAX_FILE_SIZE_BYTES + 1 });
    await expect(service.parse(file, context)).rejects.toThrow(
      BadRequestException,
    );
    expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when mime type is not supported', async () => {
    const file = fileOf({ mimetype: 'text/plain' });
    await expect(service.parse(file, context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should accept both PDF and DOCX', async () => {
    await expect(
      service.parse(fileOf({ mimetype: PDF_MIME }), context),
    ).resolves.toBeDefined();
    await expect(
      service.parse(fileOf({ mimetype: DOCX_MIME }), context),
    ).resolves.toBeDefined();
  });

  // ─── Fatiamento verbatim ───────────────────────────────────────────────────

  it('should slice description verbatim from the original text (not paraphrase)', async () => {
    const result = await service.parse(fileOf(), context);

    const topic = result.modules[0].topics[0];
    expect(topic.title).toBe('Números naturales');
    expect(topic.description).toBe(
      '• Lectura y escritura.\n• Comparación y orden.',
    );
  });

  it('should return empty description when content_start_line is null (title-only topic)', async () => {
    const result = await service.parse(fileOf(), context);

    const titleOnly = result.modules[0].topics[1];
    expect(titleOnly.title).toBe('Divisibilidad');
    expect(titleOnly.description).toBe('');
  });

  // ─── max_tokens ────────────────────────────────────────────────────────────

  it('should handle AIResponseTruncatedError as a failed attempt and register usage', async () => {
    aiProviderServiceMock.completeStructured
      .mockRejectedValueOnce(new AIResponseTruncatedError(80, 0))
      .mockResolvedValueOnce({
        data: validPointers,
        promptTokens: 100,
        responseTokens: 50,
      });

    const result = await service.parse(fileOf(), context);

    expect(result.modules).toHaveLength(1);
    // Registra AI_Usage nas duas chamadas (truncada + válida)
    expect(aiUsageServiceMock.register).toHaveBeenCalledTimes(2);
  });

  it('should throw 422 when both attempts are truncated', async () => {
    aiProviderServiceMock.completeStructured.mockRejectedValue(
      new AIResponseTruncatedError(80, 0),
    );

    await expect(service.parse(fileOf(), context)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  // ─── Validação de ranges → 1 retry → 422 ───────────────────────────────────

  const invalidCases: Record<string, unknown> = {
    'overlapping ranges': {
      modules: [
        {
          name: 'M',
          title_line: 1,
          topics: [
            { title: 'T1', title_line: 3, content_start_line: 4, content_end_line: 5 },
            { title: 'T2', title_line: 4, content_start_line: 5, content_end_line: 6 },
          ],
        },
      ],
    },
    'start greater than end': {
      modules: [
        {
          name: 'M',
          title_line: 1,
          topics: [
            { title: 'T1', title_line: 3, content_start_line: 5, content_end_line: 4 },
          ],
        },
      ],
    },
    'range out of document bounds': {
      modules: [
        {
          name: 'M',
          title_line: 1,
          topics: [
            { title: 'T1', title_line: 3, content_start_line: 4, content_end_line: 999 },
          ],
        },
      ],
    },
  };

  for (const [label, payload] of Object.entries(invalidCases)) {
    it(`should retry once then throw 422 on ${label}`, async () => {
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: payload,
        promptTokens: 100,
        responseTokens: 50,
      });

      await expect(service.parse(fileOf(), context)).rejects.toThrow(
        UnprocessableEntityException,
      );
      // 1 retry da chamada = 2 tentativas
      expect(aiProviderServiceMock.completeStructured).toHaveBeenCalledTimes(2);
    });
  }

  it('should recover on retry when the first response is invalid', async () => {
    aiProviderServiceMock.completeStructured
      .mockResolvedValueOnce({
        data: invalidCases['start greater than end'],
        promptTokens: 100,
        responseTokens: 50,
      })
      .mockResolvedValueOnce({
        data: validPointers,
        promptTokens: 100,
        responseTokens: 50,
      });

    const result = await service.parse(fileOf(), context);
    expect(result.modules).toHaveLength(1);
  });

  // ─── Cobertura e órfãs ─────────────────────────────────────────────────────

  it('should not block on gaps between ranges (advisory coverage)', async () => {
    // Linha 4 fica órfã (gap), mas o parse conclui normalmente
    aiProviderServiceMock.completeStructured.mockResolvedValue({
      data: {
        modules: [
          {
            name: 'Aritmética',
            title_line: 1,
            topics: [
              {
                title: 'Números naturales',
                title_line: 3,
                content_start_line: 5,
                content_end_line: 5,
              },
            ],
          },
        ],
      },
      promptTokens: 100,
      responseTokens: 50,
    });

    const result = await service.parse(fileOf(), context);
    expect(result.modules).toHaveLength(1);
    // Linha 4 ("• Lectura...") é não-vazia e não atribuída → órfã
    expect(result.orphan_lines.map((o) => o.line)).toContain(4);
  });

  it('should compute coverage over non-empty lines', async () => {
    const result = await service.parse(fileOf(), context);

    // Não-vazias: 1,3,4,5,7 → 5 linhas.
    // Atribuídas: titles 1,3,7 + conteúdo 4,5 → 5. Cobertura 100%.
    expect(result.coverage.total_lines).toBe(5);
    expect(result.coverage.assigned_lines).toBe(5);
    expect(result.coverage.percentage).toBe(100);
    expect(result.orphan_lines).toHaveLength(0);
  });

  it('should identify orphan lines correctly', async () => {
    // "Divisibilidad" (linha 7) não é referenciada por nenhum módulo/tópico
    aiProviderServiceMock.completeStructured.mockResolvedValue({
      data: {
        modules: [
          {
            name: 'Aritmética',
            title_line: 1,
            topics: [
              {
                title: 'Números naturales',
                title_line: 3,
                content_start_line: 4,
                content_end_line: 5,
              },
            ],
          },
        ],
      },
      promptTokens: 100,
      responseTokens: 50,
    });

    const result = await service.parse(fileOf(), context);
    const orphanTexts = result.orphan_lines.map((o) => o.text);
    expect(orphanTexts).toContain('Divisibilidad');
  });

  // ─── Token budget e AI_Usage ───────────────────────────────────────────────

  it('should block the AI call when token limit is reached', async () => {
    aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

    await expect(service.parse(fileOf(), context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
  });

  it('should register AI_Usage after the parse call', async () => {
    await service.parse(fileOf(), context);

    expect(aiUsageServiceMock.register).toHaveBeenCalledTimes(1);
    expect(aiUsageServiceMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_id: context.institutionId,
        user_id: context.userId,
      }),
    );
  });
});
