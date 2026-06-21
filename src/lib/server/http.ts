import { NextResponse } from 'next/server';

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppConfigError';
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
}

export function getStatusFromError(error: unknown) {
  if (error instanceof AppConfigError) {
    return 503;
  }
  return 500;
}

export function getMessageFromError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected server error';
}
