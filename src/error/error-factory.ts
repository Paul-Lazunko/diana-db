export class ErrorFactory {
  protected static construct(message: string) {
    return new Error(message);
  }

  public static configurationError(message: string) {
    return ErrorFactory.construct(`000 Configuration Error: ${message}`);
  }

  public static restoreError(message: string) {
    return ErrorFactory.construct(`001 Restore Error: ${message}`);
  }

  public static storeError(message: string) {
    return ErrorFactory.construct(`002 Store Error: ${message}`);
  }

  public static backupError(message: string) {
    return ErrorFactory.construct(`003 Backup Error: ${message}`);
  }

  public static connectionError(message: string) {
    return ErrorFactory.construct(`005 Connection Error: ${message}`);
  }

  public static requestError(message: string) {
    return ErrorFactory.construct(`006 Request Error: ${message}`);
  }

  public static accessError(message: string) {
    return ErrorFactory.construct(`007 Access Error: ${message}`);
  }

  public static schemaError(message: string) {
    return ErrorFactory.construct(`101 Schema Error: ${message}`);
  }

  public static databaseError(message: string) {
    return ErrorFactory.construct(`100 Database Error: ${message}`);
  }

  public static transactionError(message: string) {
    return ErrorFactory.construct(`102 Transaction Error: ${message}`);
  }

  public static clientConfigurationError(message: string) {
    return ErrorFactory.construct(`000 Client Configuration Error: ${message}`);
  }

  public static filtrationError(message: string) {
    return ErrorFactory.construct(`102 Query Error: ${message}`);
  }

  public static transformError(message: string) {
    return ErrorFactory.construct(`103 Transform Error: ${message}`);
  }

  public static lockError(message: string) {
    return ErrorFactory.construct(`111 Lock Error: ${message}`);
  }
}
