// Jest 测试设置

// 全局 mock
global.console = {
  ...console,
  // 在测试时可以保留 console 用于调试
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置超时
jest.setTimeout(30000);
