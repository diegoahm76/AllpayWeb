export interface IExceptionHandler {
  setNext(handler: IExceptionHandler): IExceptionHandler;
  handle(exception: Exception, description?: string): void;
}

export class Exception extends Error {
  constructor(public readonly message: string, exception?: Error) {
    super(message);

    this.name = this.constructor.name;

    if (exception) {
      this.message = `${this.message}: ${exception.message}`;
      this.stack = exception.stack;
      this.cause = exception.cause;
    }
    
    Object.setPrototypeOf(this, Exception.prototype);
  }
}

export class ExceptionHandler implements IExceptionHandler {
  private nextHandler: IExceptionHandler | null = null;

  public setNext(handler: IExceptionHandler): IExceptionHandler {
    this.nextHandler = handler;
    return handler;
  }

  public handle(exception: Exception, description?: string): void {
    if (this.nextHandler) {
      this.nextHandler.handle(exception, description);
    }
  }
}

export class MessageHandler extends ExceptionHandler {
  public async handle(exception: Exception, description?: string): Promise<void> {
    const message = description ? `${description}: ${exception.message}` : exception.message;
    super.handle(exception, message);
  }
}

export class LogHandler extends ExceptionHandler {
  public handle(exception: Exception, description?: string): void {
    const message = description ? `${description}: ${exception.message}` : exception.message;
    super.handle(exception, message);
  }
}

const exceptionHandler = new MessageHandler();
exceptionHandler.setNext(new LogHandler());

export function handleException(exception: Exception, description?: string): void {
  exceptionHandler.handle(exception, description);
}