type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
};

export class FirebaseRestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FirebaseRestError";
    this.status = status;
  }
}

function firebaseEnv() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const databaseId =
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() ||
    "madan";

  if (!projectId || !apiKey) {
    throw new FirebaseRestError(
      503,
      "Firebase environment variables are missing from this deployment.",
    );
  }

  return { projectId, apiKey, databaseId };
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [
            key,
            encodeValue(nestedValue),
          ]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields(value.mapValue.fields ?? {});
  }

  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function documentId(document: FirestoreDocument) {
  return document.name?.split("/").at(-1) ?? "";
}

function friendlyFirebaseMessage(message: string) {
  if (/database .* does not exist/i.test(message)) {
    return "The configured Firestore database could not be found. Confirm FIREBASE_DATABASE_ID matches the database name shown in Firebase Console.";
  }

  if (message.toLowerCase().includes("permission denied")) {
    return "Firebase permission denied. Publish the latest Firestore rules and confirm the signed-in admin email is help@wildsaura.com.";
  }

  return message || "Firebase request failed.";
}

async function firestoreFetch(
  documentPath: string,
  init: RequestInit = {},
  idToken?: string,
) {
  const { projectId, apiKey, databaseId } = firebaseEnv();
  const [pathOnly, rawQuery = ""] = documentPath.split("?", 2);
  const safePath = pathOnly
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const query = new URLSearchParams(rawQuery);
  query.set("key", apiKey);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${safePath}?${query.toString()}`;
  const headers = new Headers(init.headers);

  headers.set("content-type", "application/json");
  if (idToken) {
    headers.set("authorization", `Bearer ${idToken}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new FirebaseRestError(
      504,
      error instanceof Error
        ? `Firebase network request failed: ${error.message}`
        : "Firebase network request failed.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new FirebaseRestError(
      response.status,
      friendlyFirebaseMessage(payload.error?.message ?? "Firebase request failed."),
    );
  }

  return payload;
}

export async function getDocument(
  path: string,
  idToken?: string,
): Promise<(Record<string, unknown> & { id: string }) | null> {
  try {
    const document = (await firestoreFetch(path, {}, idToken)) as FirestoreDocument;
    return {
      id: documentId(document),
      ...decodeFields(document.fields ?? {}),
    };
  } catch (error) {
    if (
      error instanceof FirebaseRestError &&
      error.status === 404 &&
      !error.message.includes("configured Firestore database")
    ) {
      return null;
    }
    throw error;
  }
}

export async function listDocuments(path: string, idToken?: string) {
  const documents: Array<Record<string, unknown> & { id: string }> = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({ pageSize: "250" });
    if (pageToken) query.set("pageToken", pageToken);
    const payload = (await firestoreFetch(
      `${path}?${query.toString()}`,
      {},
      idToken,
    )) as FirestoreListResponse;

    documents.push(
      ...(payload.documents ?? []).map((document) => ({
        id: documentId(document),
        ...decodeFields(document.fields ?? {}),
      })),
    );
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return documents;
}

export async function writeDocument(
  path: string,
  data: Record<string, unknown>,
  idToken: string,
) {
  const fields = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeValue(value)]),
  );

  return firestoreFetch(
    path,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
    idToken,
  );
}

export function firebaseErrorResponse(error: unknown) {
  const status = error instanceof FirebaseRestError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error.";

  console.error("[firebase-rest] request failed", { status, message });
  return Response.json({ error: message }, { status });
}
