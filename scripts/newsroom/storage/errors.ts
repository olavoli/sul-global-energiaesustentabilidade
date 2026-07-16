export class StorageConflictError extends Error {
  constructor(message = "O registro foi alterado por outra operação.") {
    super(message);
    this.name = "StorageConflictError";
  }
}

export class StorageUnavailableError extends Error {
  constructor(message = "Armazenamento privado indisponível.") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}
