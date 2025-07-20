import { useState, useEffect } from "react";
import Browser from "webextension-polyfill";

interface Config {
  endpoint: string;
  token: string;
  targetNote: string;
}

const DEFAULT_CONFIG: Config = {
  endpoint: "",
  token: "",
  targetNote: "File.md",
};

async function getConfig(): Promise<Config> {
  const result = await Browser.storage.local.get(["obsidianConfig"]);
  return result.obsidianConfig
    ? { ...DEFAULT_CONFIG, ...result.obsidianConfig }
    : DEFAULT_CONFIG;
}

async function saveConfig(config: Config): Promise<void> {
  await Browser.storage.local.set({ obsidianConfig: config });
}

async function getCurrentTabUrl(): Promise<string> {
  const [tab] = await Browser.tabs.query({ active: true, currentWindow: true });
  return tab.url || "";
}

async function sendToNote(config: Config): Promise<void> {
  if (!config.endpoint) {
    throw new Error("Endpoint not configured");
  }

  const currentUrl = await getCurrentTabUrl();
  if (!currentUrl) {
    throw new Error("Could not get current tab URL");
  }

  const endpointUrl = `${config.endpoint}/vault/${config.targetNote}`;

  const headers: Record<string, string> = {
    "Content-Type": "text/markdown",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: currentUrl,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 ml-2 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}

export default function Popup() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  const handleSendToNote = async () => {
    if (!config.endpoint) {
      setShowConfig(true);
      setError("Please configure the endpoint first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendToNote(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    await saveConfig(config);
    setShowConfig(false);
    setError("");
  };

  if (showConfig) {
    return (
      <div className="p-4 w-80">
        <h3 className="text-lg font-bold mb-4">Configuration</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Endpoint URL</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            placeholder="http://localhost:27123"
            value={config.endpoint}
            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Auth Token (optional)
          </label>
          <input
            type="password"
            className="w-full p-2 border rounded text-sm"
            placeholder="Bearer token"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Target Note</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            placeholder="File.md"
            value={config.targetNote}
            onChange={(e) =>
              setConfig({ ...config, targetNote: e.target.value })
            }
          />
        </div>

        <div className="flex gap-2">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
            onClick={handleSaveConfig}
          >
            Save
          </button>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded text-sm"
            onClick={() => setShowConfig(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-64">
      <div className="flex flex-col gap-3">
        <button
          className={`bg-blue-500 text-white font-bold py-2 px-4 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
          onClick={handleSendToNote}
        >
          <div className="flex items-center justify-center">
            <span>Send to {config.targetNote || "File"}</span>
            {loading && <Spinner />}
          </div>
        </button>

        <button
          className="bg-gray-500 text-white py-1 px-3 rounded text-sm"
          onClick={() => setShowConfig(true)}
        >
          Configure
        </button>

        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        {success && (
          <div className="text-green-600 text-sm text-center">
            URL sent successfully!
          </div>
        )}
      </div>
    </div>
  );
}
