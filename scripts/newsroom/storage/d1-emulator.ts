import { MemoryStorageAdapter } from "./memory-adapter";
import type { StorageAdapter } from "./contracts";

export class D1EmulatorStorageAdapter extends MemoryStorageAdapter {
  override readonly driver: StorageAdapter["driver"] = "d1";

  constructor(previous?: D1EmulatorStorageAdapter) {
    super();
    if (previous) {
      this.documents = previous.documents;
      this.audits = previous.audits;
      this.sessions = previous.sessions;
      this.limits = previous.limits;
      this.locks = previous.locks;
      this.objects = previous.objects;
    }
  }

  fork(): D1EmulatorStorageAdapter {
    return new D1EmulatorStorageAdapter(this);
  }

  override async healthCheck() {
    return {
      ok: true,
      driver: this.driver,
      detail: "Emulador determinístico do contrato D1; nenhuma conexão remota.",
    };
  }
}
