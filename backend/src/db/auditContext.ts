import { AsyncLocalStorage } from "node:async_hooks";

type AuditContext = {
  actorAccountId: string;
};

const auditContext =
  new AsyncLocalStorage<AuditContext>();

export function runWithAuditActor(
  actorAccountId: string,
  fn: () => void,
): void {
  auditContext.run(
    { actorAccountId },
    fn,
  );
}

export function getAuditActorAccountId():
  | string
  | undefined {
  return auditContext.getStore()?.actorAccountId;
}
