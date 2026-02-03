export class AuthUseCase {
  public IsValidEmail(email: string | undefined): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com)$/;
    return emailRegex.test(email ?? '');
  }
}