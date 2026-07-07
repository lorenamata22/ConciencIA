import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { RagIngestionProcessor } from './rag-ingestion.processor';
import { RagService } from './rag.service';
import { RagIngestionJob } from './rag.types';

describe('RagIngestionProcessor', () => {
  let processor: RagIngestionProcessor;
  let ragServiceMock: { ingestFile: jest.Mock };

  const jobData: RagIngestionJob = {
    fileId: 'file-id-1',
    institutionId: 'inst-id-1',
    fileUrl: 'https://storage/aula-01.pdf',
    fileName: 'aula-01.pdf',
    replaceExisting: false,
  };

  beforeEach(async () => {
    ragServiceMock = { ingestFile: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagIngestionProcessor,
        { provide: RagService, useValue: ragServiceMock },
      ],
    }).compile();

    processor = module.get<RagIngestionProcessor>(RagIngestionProcessor);
  });

  it('should delegate job data to RagService.ingestFile', async () => {
    await processor.process({ data: jobData } as Job<RagIngestionJob>);

    expect(ragServiceMock.ingestFile).toHaveBeenCalledWith(jobData);
  });

  it('should propagate errors so BullMQ can retry the job', async () => {
    ragServiceMock.ingestFile.mockRejectedValue(new Error('transient'));

    await expect(
      processor.process({ data: jobData } as Job<RagIngestionJob>),
    ).rejects.toThrow('transient');
  });
});
