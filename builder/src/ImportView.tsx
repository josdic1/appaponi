import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

type SourceType =
  | "json"
  | "csv"
  | "tsv"
  | "text"
  | "excel"
  | "other";

type StagedFile = {
  file: File;
  preview: string | null;
  sourceType: SourceType;
};

type Batch = {
  id: string;
  source_name: string;
  source_type: string;
  status: string;
  mime_type: string | null;
  record_count: number;
  issue_count: number;
  created_at: string;
};

type ImportRecord = {
  id: string;
  source_index: number;
  raw_record:
    Record<string, unknown>;
  status: string;
};

type BatchDetail = {
  batch: Batch;
  records: ImportRecord[];
  issues: Array<
    Record<string, unknown>
  >;
};

async function readJson<T>(
  response: Response,
): Promise<T> {
  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Request failed",
    );
  }

  return data as T;
}

function inferSourceType(
  name: string,
): SourceType {
  const extension =
    name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (extension === "json") {
    return "json";
  }

  if (extension === "csv") {
    return "csv";
  }

  if (extension === "tsv") {
    return "tsv";
  }

  if (
    extension === "xlsx" ||
    extension === "xls"
  ) {
    return "excel";
  }

  if (extension === "txt") {
    return "text";
  }

  return "other";
}

function fileAsBase64(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        const value =
          String(
            reader.result ?? "",
          );

        const comma =
          value.indexOf(",");

        resolve(
          comma >= 0
            ? value.slice(
                comma + 1,
              )
            : value,
        );
      };

      reader.onerror = () =>
        reject(
          new Error(
            "Could not read file",
          ),
        );

      reader.readAsDataURL(file);
    },
  );
}

export default function ImportView() {
  const [
    stagedFile,
    setStagedFile,
  ] =
    useState<StagedFile | null>(
      null,
    );

  const [pasted, setPasted] =
    useState("");

  const [
    pasteType,
    setPasteType,
  ] =
    useState<SourceType>(
      "text",
    );

  const [batches, setBatches] =
    useState<Batch[]>([]);

  const [
    selectedBatchId,
    setSelectedBatchId,
  ] = useState("");

  const [detail, setDetail] =
    useState<BatchDetail | null>(
      null,
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadBatches() {
    const response =
      await fetch(
        "/__appoponi/import/batches",
        {
          credentials: "include",
        },
      );

    const data =
      await readJson<{
        batches: Batch[];
      }>(response);

    setBatches(data.batches);

    setSelectedBatchId(
      (current) =>
        current ||
        data.batches[0]?.id ||
        "",
    );
  }

  async function loadBatch(
    id: string,
  ) {
    if (!id) {
      setDetail(null);
      return;
    }

    const response =
      await fetch(
        `/__appoponi/import/batches/${id}`,
        {
          credentials: "include",
        },
      );

    setDetail(
      await readJson<BatchDetail>(
        response,
      ),
    );
  }

  useEffect(() => {
    void loadBatches().catch(
      (err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load imports",
        ),
    );
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      return;
    }

    void loadBatch(
      selectedBatchId,
    ).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load batch",
      ),
    );
  }, [selectedBatchId]);

  async function stageFile(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const sourceType =
      inferSourceType(
        file.name,
      );

    const preview =
      sourceType === "excel"
        ? null
        : (
            await file.text()
          ).slice(0, 6000);

    setStagedFile({
      file,
      preview,
      sourceType,
    });

    setPasted("");
  }

  async function stageSource() {
    setBusy(true);
    setError("");

    try {
      let body:
        Record<string, unknown>;

      if (stagedFile) {
        if (
          stagedFile.sourceType ===
          "excel"
        ) {
          body = {
            source_name:
              stagedFile.file.name,
            source_type:
              stagedFile.sourceType,
            mime_type:
              stagedFile.file.type ||
              null,
            raw_base64:
              await fileAsBase64(
                stagedFile.file,
              ),
          };
        } else {
          body = {
            source_name:
              stagedFile.file.name,
            source_type:
              stagedFile.sourceType,
            mime_type:
              stagedFile.file.type ||
              null,
            raw_text:
              await stagedFile.file.text(),
          };
        }
      } else if (
        pasted.trim()
      ) {
        body = {
          source_name:
            `pasted-${new Date()
              .toISOString()
              .replace(
                /[:.]/g,
                "-",
              )}`,
          source_type:
            pasteType,
          mime_type:
            "text/plain",
          raw_text: pasted,
        };
      } else {
        throw new Error(
          "Choose a file or paste source data first",
        );
      }

      const response =
        await fetch(
          "/__appoponi/import/stage",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(body),
          },
        );

      const result =
        await readJson<{
          batch_id: string;
        }>(response);

      setStagedFile(null);
      setPasted("");

      await loadBatches();

      setSelectedBatchId(
        String(
          result.batch_id,
        ),
      );

      await loadBatch(
        String(
          result.batch_id,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not stage source",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Raw intake
          </div>

          <h1>Import</h1>

          <p className="subtitle">
            Stage the original source
            and parse it into raw
            records before any
            Appoponi data changes.
          </p>
        </div>

        <button
          type="button"
          className="builder-primary"
          disabled={
            busy ||
            (!stagedFile &&
              !pasted.trim())
          }
          onClick={() =>
            void stageSource()
          }
        >
          {busy
            ? "Staging…"
            : "Stage source"}
        </button>
      </div>

      {error && (
        <div className="builder-error">
          {error}
        </div>
      )}

      <div className="import-grid">
        <article className="card">
          <div className="card-head">
            <div>
              <div className="card-title">
                File
              </div>

              <div className="card-kicker">
                JSON, CSV, TSV, text,
                Excel.
              </div>
            </div>
          </div>

          <div className="card-body">
            <label className="file-drop">
              <strong>
                Choose source file
              </strong>

              <span>
                Written only to Builder
                staging.
              </span>

              <input
                type="file"
                accept=".json,.csv,.tsv,.txt,.xlsx,.xls,application/json,text/csv,text/plain"
                onChange={stageFile}
              />
            </label>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <div>
              <div className="card-title">
                Paste
              </div>

              <div className="card-kicker">
                Choose the pasted
                format.
              </div>
            </div>
          </div>

          <div className="card-body import-paste-body">
            <select
              value={pasteType}
              onChange={(event) =>
                setPasteType(
                  event.target
                    .value as
                    SourceType,
                )
              }
            >
              <option value="text">
                Plain text
              </option>

              <option value="json">
                JSON
              </option>

              <option value="csv">
                CSV
              </option>

              <option value="tsv">
                TSV
              </option>

              <option value="other">
                Other text
              </option>
            </select>

            <textarea
              value={pasted}
              onChange={(event) => {
                setPasted(
                  event.target.value,
                );

                if (
                  event.target.value
                ) {
                  setStagedFile(null);
                }
              }}
              placeholder="Paste source data here…"
            />
          </div>
        </article>
      </div>

      <article className="card staged-card">
        <div className="card-head">
          <div>
            <div className="card-title">
              Staging preview
            </div>

            <div className="card-kicker">
              Original source only.
            </div>
          </div>
        </div>

        <div className="card-body">
          {stagedFile ? (
            <>
              <div className="file-meta">
                <strong>
                  {
                    stagedFile.file
                      .name
                  }
                </strong>

                <span>
                  {stagedFile.file
                    .size.toLocaleString()}
                  {" bytes · "}
                  {
                    stagedFile
                      .sourceType
                  }
                </span>
              </div>

              <pre>
                {stagedFile.preview ??
                  "Binary Excel source ready to stage."}
              </pre>
            </>
          ) : pasted.trim() ? (
            <pre>
              {pasted.slice(
                0,
                6000,
              )}
            </pre>
          ) : (
            <div className="empty">
              Choose a file or paste
              source data.
            </div>
          )}
        </div>
      </article>

      <div className="import-history-layout">
        <aside className="card import-batches">
          <div className="card-head">
            <div>
              <div className="card-title">
                Import batches
              </div>

              <div className="card-kicker">
                {batches.length} recent
              </div>
            </div>
          </div>

          <div className="import-batch-list">
            {batches.map(
              (batch) => (
                <button
                  type="button"
                  key={batch.id}
                  className={
                    selectedBatchId ===
                    String(batch.id)
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedBatchId(
                      String(
                        batch.id,
                      ),
                    )
                  }
                >
                  <span>
                    <strong>
                      {
                        batch.source_name
                      }
                    </strong>

                    <small>
                      {
                        batch.source_type
                      }{" "}
                      ·{" "}
                      {
                        batch.record_count
                      }{" "}
                      records
                    </small>
                  </span>

                  <b>
                    {batch.status}
                  </b>
                </button>
              ),
            )}
          </div>
        </aside>

        <article className="card">
          <div className="card-head">
            <div>
              <div className="card-title">
                Parsed records
              </div>

              <div className="card-kicker">
                {detail
                  ? `${detail.records.length} records · ${detail.issues.length} issues`
                  : "Choose a batch"}
              </div>
            </div>
          </div>

          {detail ? (
            <div className="import-record-list">
              {detail.records.length ? (
                detail.records.map(
                  (record) => (
                    <div
                      className="import-record"
                      key={record.id}
                    >
                      <div className="import-record-head">
                        <strong>
                          Record{" "}
                          {record.source_index +
                            1}
                        </strong>

                        <span>
                          {
                            record.status
                          }
                        </span>
                      </div>

                      <pre>
                        {JSON.stringify(
                          record.raw_record,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  ),
                )
              ) : (
                <div className="empty">
                  No parsed records.
                </div>
              )}
            </div>
          ) : (
            <div className="card-body empty">
              No import selected.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
