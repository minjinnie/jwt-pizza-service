const { StatusCodeError, asyncHandler } = require("./endpointHelper");

describe("StatusCodeError", () => {
  it("should create an error with message and statusCode", () => {
    const error = new StatusCodeError("Not Found", 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Not Found");
    expect(error.statusCode).toBe(404);
  });

  it("should handle missing statusCode and default to undefined", () => {
    const error = new StatusCodeError("Error without status");
    expect(error.message).toBe("Error without status");
    expect(error.statusCode).toBeUndefined();
  });

  it("should maintain prototype chain", () => {
    const error = new StatusCodeError("Unauthorized", 401);
    expect(error instanceof StatusCodeError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe("asyncHandler", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
  });

  it("should execute function successfully without errors", async () => {
    const mockFn = jest.fn().mockResolvedValue("Success");
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  it("should pass error to next if function throws synchronously", async () => {
    const error = new Error("Sync Error");
    const mockFn = jest.fn(async () => {
      throw error; // 동기 예외 대신 비동기 예외로 처리
    });
    const mockNext = jest.fn();
    const handler = asyncHandler(mockFn);
  
    await handler({}, {}, mockNext);
  
    expect(mockNext).toHaveBeenCalledWith(error);
  });
  

  it("should pass error to next if function rejects asynchronously", async () => {
    const error = new Error("Async Error");
    const mockFn = jest.fn().mockRejectedValue(error);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("should correctly handle async function resolving normally", async () => {
    const mockFn = jest.fn(async () => "Async Success");
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
