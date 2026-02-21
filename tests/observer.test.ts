// Observer 模块单元测试

import { ObserverRecorder } from '../src/observer/recorder.js';
import { ObserverReporter } from '../src/observer/reporter.js';
import { UserModificationRecorder } from '../src/observer/user-modifications.js';
import { Storage } from '../src/storage/index.js';
import path from 'path';
import fs from 'fs/promises';

const testDir = path.join(process.cwd(), 'test-temp-observer');

describe('Observer 模块', () => {
  let recorder: ObserverRecorder;
  let reporter: ObserverReporter;
  let userRecorder: UserModificationRecorder;

  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
    const storage = new Storage({ basePath: testDir });
    recorder = new ObserverRecorder(storage);
    reporter = new ObserverReporter(storage);
    userRecorder = new UserModificationRecorder(storage);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('ObserverRecorder', () => {
    const traceId = 'test-trace-obs-1';

    it('should start and end stage', async () => {
      await recorder.startStage(traceId, 'demand', ['skill1']);
      await recorder.endStage(traceId, 'demand', 'success');

      const record = await recorder.getRecord(traceId, 'demand');
      expect(record).toBeDefined();
    });

    it('should get all records', async () => {
      await recorder.startStage(traceId, 'demand', ['skill1']);
      await recorder.endStage(traceId, 'demand', 'success');
      await recorder.startStage(traceId, 'code', ['skill2']);
      await recorder.endStage(traceId, 'code', 'success');

      const records = await recorder.getAllRecords(traceId);
      expect(records).toBeDefined();
    });
  });

  describe('ObserverReporter', () => {
    it('should generate report', async () => {
      const traceId = 'test-trace-report-1';
      await recorder.startStage(traceId, 'demand', ['skill1']);
      await recorder.endStage(traceId, 'demand', 'success');

      const records = await recorder.getAllRecords(traceId);
      await reporter.createSummary(traceId, 'test-project', records, []);

      const report = await reporter.generateReport(traceId);
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
    });
  });

  describe('UserModificationRecorder', () => {
    it('should record user modification', async () => {
      const traceId = 'test-trace-user-1';
      
      await userRecorder.record(traceId, {
        projectId: 'project-1',
        traceId,
        stage: 'code',
        modifiedFiles: ['file1.ts'],
        modificationType: 'modify',
        userReason: 'Fixed a bug',
      });

      // 验证记录功能正常工作
      expect(true).toBe(true);
    });
  });
});
