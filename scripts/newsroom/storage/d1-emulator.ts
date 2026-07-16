import { MemoryStorageAdapter } from "./memory-adapter";
import type { StorageAdapter } from "./contracts";

export class D1EmulatorStorageAdapter extends MemoryStorageAdapter {
  override readonly driver: StorageAdapter["driver"] = "d1";

  override async healthCheck() {
    return {
      ok: true,
      driver: this.driver,
      detail: "Emulador determinístico do contrato D1; nenhuma conexão remota.",
    };
  }
}
