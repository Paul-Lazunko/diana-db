export class ErrorFactory {

  protected static construct(message: string) {
    return new Error(message);
  }

  public static collectionError(message: string) {
    return ErrorFactory.construct(`101 Collection Error: ${message}`);
  }

  public static databaseError(message: string) {
    return ErrorFactory.construct(`100 Database Error: ${message}`);
  }

  public static configurationError(message: string) {
    return ErrorFactory.construct(`000 Configuration Error: ${message}`);
  }

  public static filtrationError(message: string) {
    return ErrorFactory.construct(`102 Filtration Error: ${message}`);
  }

  public static transformError(message: string) {
    return ErrorFactory.construct(`103 Transform Error: ${message}`);
  }

  public static restoreError(message: string) {
    return ErrorFactory.construct(`001 Restore Error: ${message}`);
  }


}
