import { Test, TestingModule } from '@nestjs/testing';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('ExamController', () => {
  let controller: ExamController;
  let examServiceMock: {
    generate: jest.Mock;
    submitAnswers: jest.Mock;
    getResult: jest.Mock;
  };

  const user: JwtPayload = {
    userId: 'user-id-1',
    institutionId: 'inst-id-1',
    userType: 'student',
  };

  beforeEach(async () => {
    examServiceMock = {
      generate: jest.fn(),
      submitAnswers: jest.fn(),
      getResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamController],
      providers: [{ provide: ExamService, useValue: examServiceMock }],
    }).compile();

    controller = module.get<ExamController>(ExamController);
  });

  it('should delegate POST /exams to generate with userId and institutionId from the JWT', async () => {
    const dto = { topic_id: 'topic-id-1', type: 'main' as const };
    examServiceMock.generate.mockResolvedValue({
      exam_id: 'exam-id-1',
      questions: [],
    });

    const result = await controller.create(user, dto);

    // institution_id vem sempre do JWT, nunca do body (CLAUDE.md §5)
    expect(examServiceMock.generate).toHaveBeenCalledWith(
      'user-id-1',
      'inst-id-1',
      dto,
    );
    expect(result.exam_id).toBe('exam-id-1');
  });

  it('should delegate POST /exams/:id/answers to submitAnswers', async () => {
    const dto = {
      answers: [{ question_id: 'q1', selected_option_id: 'a' }],
    };
    examServiceMock.submitAnswers.mockResolvedValue({ final_score: 3 });

    await controller.submitAnswers(user, 'exam-id-1', dto);

    expect(examServiceMock.submitAnswers).toHaveBeenCalledWith(
      'user-id-1',
      'inst-id-1',
      'exam-id-1',
      dto,
    );
  });

  it('should delegate GET /exams/:id to getResult', async () => {
    examServiceMock.getResult.mockResolvedValue({ final_score: 5 });

    await controller.getResult(user, 'exam-id-1');

    expect(examServiceMock.getResult).toHaveBeenCalledWith(
      'user-id-1',
      'inst-id-1',
      'exam-id-1',
    );
  });
});
